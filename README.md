# College Result Portal

A multi-tenant web application for managing college examination marks. Clerks set up classes, subjects, and assignments; faculty enter marks; clerks review, download, and lock the final records.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Database Schema](#4-database-schema)
5. [Backend](#5-backend)
   - [Environment Variables](#51-environment-variables)
   - [Scripts](#52-scripts)
   - [API Routes](#53-api-routes)
   - [Controllers](#54-controllers)
   - [Middleware](#55-middleware)
   - [Database Layer](#56-database-layer)
   - [Services & Utilities](#57-services--utilities)
   - [Migrations](#58-migrations)
6. [Frontend](#6-frontend)
   - [Scripts](#61-scripts)
   - [Routing & Pages](#62-routing--pages)
   - [Auth Context & Idle Timeout](#63-auth-context--idle-timeout)
   - [API Client](#64-api-client)
   - [Components](#65-components)
7. [Authentication Flow](#7-authentication-flow)
8. [Business Workflows](#8-business-workflows)
9. [Security Model](#9-security-model)
10. [Pagination](#10-pagination)
11. [Audit Logging](#11-audit-logging)
12. [Running Locally](#12-running-locally)

---

## 1. Project Overview

The portal is designed for colleges where a **clerk** administers the data and **faculty** enter marks. A single **super-admin** manages all colleges from one account.

### User Roles

| Role | Description |
|---|---|
| `super_admin` | Creates colleges, manages clerks, toggles college active status. No college scope. |
| `clerk` | Manages classes, subjects, students, faculty, and assignments within their college. |
| `faculty` | Views assigned mark-entry tasks, enters marks, and submits them. |

### Key Concepts

- **College** — a tenant. Every piece of data (classes, students, marks) is scoped to a college.
- **Class** — e.g. "B.Com Part I". A college has many classes.
- **Subject** — belongs to a class. Has optional `semester`, `internal_max`, `external_max`.
- **Student** — belongs to a class. Identified by `seat_no` (unique per class) and `registration_no` (unique per college). Has optional `semester`.
- **Assignment** — a unit of mark entry: one subject × one mark type (`internal` or `external`), assigned to a faculty member. Unique per `(subject_id, mark_type)`.
- **Mark** — a decimal value (`DECIMAL(5,2)`) per student per assignment. `NULL` means not yet entered.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js + Express 5 |
| Database | Microsoft SQL Server (mssql driver) |
| Auth | JWT (httpOnly cookie) + bcryptjs |
| OTP delivery | WhatsApp via SMSala API |
| File I/O | ExcelJS (generate), xlsx (parse) |
| Frontend | React 19 + Vite 6 |
| Styling | Tailwind CSS v4 |
| HTTP client | Axios |
| Routing | React Router v7 |

---

## 3. Repository Structure

```
college_result/
├── backend/                  Express API server
│   ├── app.js                Entry point — Express config, routes, static serving
│   ├── package.json
│   ├── .env                  Environment variables (not committed)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── clerkController.js
│   │   ├── facultyController.js
│   │   ├── profileController.js
│   │   ├── studentController.js
│   │   └── superAdminController.js
│   ├── db/
│   │   ├── connection.js     SQL Server connection pool (singleton)
│   │   ├── queries.js        All parameterized SQL functions
│   │   └── audit.js          Audit log writer & reader
│   ├── middleware/
│   │   ├── auth.js           JWT verification + role guard
│   │   └── asyncHandler.js   Wraps async handlers for Express error propagation
│   ├── routes/
│   │   ├── auth.js
│   │   ├── clerk.js
│   │   ├── faculty.js
│   │   ├── profile.js
│   │   └── superAdmin.js
│   ├── services/
│   │   └── whatsapp.js       SMSala WhatsApp OTP integration
│   ├── utils/
│   │   └── validate.js       Password & phone validators
│   ├── migrations/
│   │   ├── 001–015_*.sql     Schema migrations (run in order)
│   │   ├── migrate.js        Migration runner
│   │   ├── seed_super_admin.js
│   │   └── seed_test_data.js
│   └── public/               Built React SPA (output of `npm run build` in frontend)
│
├── frontend/                 React + Vite SPA
│   ├── vite.config.js        Builds to ../backend/public
│   ├── index.html
│   └── src/
│       ├── main.jsx          React entry point
│       ├── App.jsx           Router, session warning toast
│       ├── api/
│       │   └── client.js     Axios instance with interceptors
│       ├── context/
│       │   └── AuthContext.jsx  Auth state, idle timeout logic
│       ├── components/
│       │   ├── ProtectedRoute.jsx
│       │   ├── ProfileModal.jsx
│       │   ├── ErrorBoundary.jsx
│       │   └── Skeleton.jsx
│       └── pages/
│           ├── LoginPage.jsx
│           ├── SuperAdminPage.jsx
│           ├── ClerkPage.jsx
│           └── FacultyPage.jsx
│
└── e2e/                      End-to-end tests
```

---

## 4. Database Schema

All tables use `INT IDENTITY(1,1) PRIMARY KEY`. Foreign keys cascade delete from `colleges` downward. Every query is parameterized — no string interpolation of user input.

### colleges
```
college_id   INT PK
college_code NVARCHAR(8)   UNIQUE        8-character code distributed to users for login
name         NVARCHAR(255)
is_active    BIT           DEFAULT 1     Super-admin can deactivate a college
created_at   DATETIME2     DEFAULT NOW
```

### users
```
user_id       INT PK
college_id    INT NULL FK→colleges       NULL for super_admin
role          NVARCHAR(20)               'super_admin' | 'clerk' | 'faculty'
name          NVARCHAR(255)
phone         NVARCHAR(20)
password_hash NVARCHAR(255)             bcrypt hash
is_blocked    BIT           DEFAULT 0
created_at    DATETIME2

UNIQUE (college_id, phone) WHERE college_id IS NOT NULL
UNIQUE (phone)             WHERE role = 'super_admin'
```

### classes
```
class_id   INT PK
college_id INT FK→colleges
name       NVARCHAR(255)
created_at DATETIME2
```

### subjects
```
subject_id   INT PK
college_id   INT FK→colleges
class_id     INT FK→classes
name         NVARCHAR(255)
subject_code NVARCHAR(20)
semester     INT NULL          Optional; used to filter which students get marks
internal_max INT NULL
external_max INT NULL
created_at   DATETIME2

UNIQUE (college_id, subject_code)
```

### students
```
student_id      INT PK
college_id      INT FK→colleges
class_id        INT FK→classes
seat_no         NVARCHAR(50)
registration_no NVARCHAR(50)
name            NVARCHAR(255)
semester        INT NULL
created_at      DATETIME2

UNIQUE (class_id, seat_no)
UNIQUE (college_id, registration_no)
```

### assignments
```
assignment_id INT PK
college_id    INT FK→colleges
faculty_id    INT FK→users
subject_id    INT FK→subjects
mark_type     NVARCHAR(10)    'internal' | 'external'
status        NVARCHAR(20)    'open' | 'submitted' | 'locked'  DEFAULT 'open'
created_at    DATETIME2

UNIQUE (subject_id, mark_type)   One assignment per subject per mark type
```

### marks
```
mark_id       INT PK
college_id    INT FK→colleges
assignment_id INT FK→assignments
student_id    INT FK→students
value         DECIMAL(5,2) NULL   NULL = not yet entered
updated_at    DATETIME2

UNIQUE (assignment_id, student_id)
```

### audit_logs
```
id          BIGINT PK
college_id  INT NULL
actor_id    INT
actor_name  NVARCHAR(150)
actor_role  NVARCHAR(30)
action      NVARCHAR(80)    e.g. 'FACULTY_CREATED', 'MARKS_SAVED'
entity_type NVARCHAR(50)    e.g. 'faculty', 'assignment'
entity_id   NVARCHAR(50)
entity_name NVARCHAR(200)
meta        NVARCHAR(MAX)   JSON blob for extra context
ip_address  NVARCHAR(60)
user_agent  NVARCHAR(500)
created_at  DATETIME2 UTC
```

### otp_store
```
id         INT PK
user_id    INT
purpose    VARCHAR(20)    'forgot' | 'profile'
code       VARCHAR(6)
expires_at DATETIME2
used       BIT DEFAULT 0
created_at DATETIME2
```

### token_blacklist
```
jti        VARCHAR(36) PK   JWT ID of revoked token
expires_at DATETIME2        Kept until expiry for cleanup
created_at DATETIME2
```

### Entity Relationship Summary

```
colleges ──< users (clerk, faculty)
colleges ──< classes ──< subjects ──< assignments ──< marks
                      ──< students ──────────────────────^
```

---

## 5. Backend

### 5.1 Environment Variables

Create `backend/.env`:

```env
# Database
DB_SERVER=your-sql-server-host
DB_PORT=1433
DB_NAME=college_result_db
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Auth
JWT_SECRET=a-long-random-hex-string

# Server
PORT=5000
NODE_ENV=development

# CORS — comma-separated list of allowed origins
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:5173

# WhatsApp OTP (SMSala)
WHATSAPP_API_TOKEN=your-token
WHATSAPP_OTP_TEMPLATE_ID=your-template-id
```

### 5.2 Scripts

```bash
npm start          # Production: node app.js
npm run dev        # Development: nodemon app.js (auto-reload)
npm run migrate    # Run all SQL migrations + seed super-admin
```

### 5.3 API Routes

All routes are prefixed with `/api`. The frontend build is served as a static SPA from `/` (catch-all).

#### Auth — `/api/auth` (rate-limited: 20 req / 15 min)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/resolve-code` | Validate college code, return college name |
| POST | `/auth/login` | Authenticate, set JWT cookie |
| POST | `/auth/logout` | Blacklist token, clear cookie |
| POST | `/auth/forgot-password/send-otp` | Send OTP via WhatsApp (5 req / 10 min) |
| POST | `/auth/forgot-password/reset` | Reset password with OTP |

#### Super Admin — `/api/super-admin` (requires `super_admin` role)

| Method | Path | Description |
|---|---|---|
| GET | `/colleges` | List all colleges (paginated) |
| POST | `/colleges` | Create college (auto-generates code) |
| PATCH | `/colleges/:id/active` | Toggle college active/inactive |
| GET | `/colleges/:id/clerks` | List clerks in a college (paginated) |
| POST | `/colleges/:id/clerk` | Create first clerk for a college |
| PUT | `/colleges/:id/clerks/:user_id` | Edit clerk details |
| DELETE | `/colleges/:id/clerks/:user_id` | Remove clerk |
| PATCH | `/colleges/:id/clerks/:user_id/block` | Block / unblock clerk |

#### Clerk — `/api/clerk` (requires `clerk` role)

| Method | Path | Description |
|---|---|---|
| GET | `/classes` | List classes (paginated) |
| POST | `/classes` | Create class |
| PUT | `/classes/:class_id` | Rename class |
| DELETE | `/classes/:class_id` | Delete class |
| GET | `/classes/:id/subjects` | List subjects; optional `?semester=` filter (paginated) |
| POST | `/classes/:id/subjects` | Create subject |
| PUT | `/subjects/:subject_id` | Update subject |
| DELETE | `/subjects/:subject_id` | Delete subject |
| GET | `/classes/:id/students` | List students (paginated) |
| POST | `/classes/:id/students` | Add single student |
| POST | `/classes/:id/students/import` | Bulk import from Excel file (max 5 MB) |
| GET | `/faculty` | List faculty (paginated) |
| POST | `/faculty` | Create faculty account |
| PUT | `/faculty/:user_id` | Update faculty details |
| DELETE | `/faculty/:user_id` | Delete faculty |
| GET | `/assignments` | List all assignments (paginated) |
| POST | `/assignments` | Create assignment |
| PUT | `/assignments/:id` | Reassign to different faculty |
| DELETE | `/assignments/:id` | Soft-delete (unassign faculty, reset to open) |
| PATCH | `/assignments/:id/lock` | Lock assignment (terminal state) |
| GET | `/assignments/:id/marks` | View marks with student details (paginated) |
| GET | `/assignments/:id/marks/download` | Download marks as Excel file |

#### Faculty — `/api/faculty` (requires `faculty` role)

| Method | Path | Description |
|---|---|---|
| GET | `/assignments` | List faculty's own assignments (paginated) |
| GET | `/assignments/:id/marks` | Load marks for an assignment (paginated) |
| POST | `/assignments/:id/marks` | Save / upsert marks |
| PATCH | `/assignments/:id/submit` | Submit assignment |
| PATCH | `/assignments/:id/reopen` | Reopen submitted assignment (not if locked) |

#### Profile — `/api/profile` (requires `clerk` or `faculty` role)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Get own profile details |
| POST | `/send-otp` | Request OTP for password change (5 req / 10 min) |
| POST | `/change-password` | Change password (old password or OTP required) |

#### Other

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Returns `{"status":"ok"}` |
| GET | `*` | Serves React `index.html` (SPA fallback) |

### 5.4 Controllers

#### authController.js

- **`resolveCollegeCode`** — Looks up a college by its 8-character code. Returns `{college_id, name}` or 404.
- **`login`** — Verifies college is active, checks user is not blocked, compares bcrypt hash. On success, issues a JWT (8-hour expiry) with payload `{jti, user_id, college_id, role, name}` and sets it as an httpOnly cookie. Audits the login event.
- **`logout`** — Reads the current JWT, adds its `jti` to `token_blacklist`, clears the cookie.
- **`forgotPasswordSendOtp`** — Finds user by phone, generates 6-digit OTP, writes to `otp_store` (TTL 10 min, invalidates old unused OTPs for same user+purpose), sends via WhatsApp.
- **`forgotPasswordReset`** — Verifies OTP (not expired, not used), bcrypt-hashes new password, updates user, marks OTP as used.

#### clerkController.js

- **Classes** — CRUD. Names are title-cased on save.
- **Subjects** — CRUD. `subject_code` is uppercased and must be unique per college. Optional `semester`, `internal_max`, `external_max`.
- **Faculty** — CRUD. Phone validated (Indian 10-digit), password validated (8+ chars, uppercase + digit), bcrypt-hashed on create.
- **Assignments** — CRUD + lock. `deleteAssignment` is a soft delete (sets `faculty_id = NULL`, `status = 'open'`). `lockAssignment` sets `status = 'locked'` — a terminal state.
- **Marks oversight** — `viewMarks` returns `{assignment, marks: {data, total, page, limit, pages}}`. `downloadMarks` generates an ExcelJS workbook with columns Seat No, Reg No, Name, Mark and streams it as an attachment.

#### facultyController.js

- **`listAssignments`** — Returns only assignments where `faculty_id = req.user.user_id`.
- **`getMarks`** — Calls `seedMarksForAssignment` first (creates NULL-value mark rows for all matching students if they don't exist yet), then returns marks paginated.
- **`saveMarks`** — Accepts `marks: [{student_id, value}]`. Upserts each row. Blocked if assignment is `locked`.
- **`submitAssignment`** — Sets status to `submitted`. Blocked if `locked`.
- **`reopenAssignment`** — Sets status back to `open`. Blocked if `locked`.

#### superAdminController.js

- **`createCollege`** — Generates a random unique 8-character alphanumeric code, retries on collision. Audits the action.
- **`listColleges` / `listClerks`** — Paginated lists.
- **`createFirstClerk`** — Creates a `clerk` role user under a college.
- **`editClerk` / `removeClerk` / `blockClerk`** — Clerk management scoped to the given `college_id`.
- **`toggleCollegeActive`** — Sets `is_active` on the college row.

#### studentController.js

- **`importStudents`** — Reads an uploaded Excel buffer with the `xlsx` library. Required columns: `seat_no`, `registration_no`, `name`. Optional: `semester`. Validates all rows first (missing fields, duplicate seat_no / registration_no within the file). If all rows are valid, inserts them one by one and catches DB-level constraint errors. Returns `{imported: N}` or `{errors: [...]}` with per-row line numbers.
- **`addStudent`** — Adds a single student.
- **`listStudents`** — Paginated list ordered by `semester, seat_no`.

#### profileController.js

- **`getProfile`** — Returns user record joined with college name.
- **`requestOtp`** — Generates OTP with `purpose = 'profile'`, sends via WhatsApp.
- **`changePassword`** — Accepts either `old_password` (bcrypt compare) or `otp` (verify against otp_store). Updates password hash.

### 5.5 Middleware

#### auth.js

```
authenticate(req, res, next)
  Reads JWT from req.cookies.token
  Verifies signature with JWT_SECRET
  Checks token_blacklist for jti
  Sets req.user = { jti, user_id, college_id, role, name }

requireRole(...roles)
  Returns middleware that checks req.user.role
  Returns 403 if role not in allowed list
```

`college_id` is always sourced from the verified JWT — never from request body or query params.

#### asyncHandler.js

Wraps an `async` route handler so that any rejected promise is forwarded to the Express global error handler rather than causing an unhandled rejection crash.

### 5.6 Database Layer

#### db/connection.js

Manages a singleton `mssql` connection pool. Config:

```
max connections:  10
min connections:  2
idle timeout:     30 s
acquire timeout:  15 s
request timeout:  30 s
```

Exposes `getPool()` (creates pool on first call, reuses thereafter) and `closePool()` (called on `SIGTERM` / `SIGINT`).

#### db/queries.js

Central query file. Every function uses the `query(sqlText, params)` helper which binds values via `request.input()` — no string concatenation of user data.

Two pagination helpers used by all list functions:

```
paginate(page, limit)
  → { page, limit (capped at 200, default 50), offset }

pageResult(data, total, page, limit)
  → { data, total, page, limit, pages }
```

**Exported functions by section:**

| Section | Functions |
|---|---|
| Colleges | `getCollegeByCode`, `getCollegeById`, `createCollege`, `getAllColleges`, `setCollegeActive` |
| Users | `getUserByPhone`, `getSuperAdminByPhone`, `getUserById`, `createUser`, `updateFaculty`, `updateClerk`, `deleteFaculty`, `deleteClerk`, `setClerkBlocked`, `updateUserPassword`, `getFacultyByCollege`, `getClerksByCollege` |
| Classes | `getClasses`, `createClass`, `updateClass`, `deleteClass` |
| Subjects | `getSubjectByCode`, `getSubjectsByClass`, `getSubjectsByClassAndSemester`, `createSubject`, `updateSubject`, `deleteSubject` |
| Students | `getStudentsByClass`, `createStudent` |
| Assignments | `getAssignmentsByFaculty`, `getAssignmentsByCollege`, `getAssignmentById`, `createAssignment`, `updateAssignmentStatus`, `updateAssignmentFaculty`, `deleteAssignment` |
| Marks | `getMarksByAssignment`, `upsertMark`, `seedMarksForAssignment` |
| OTP | `saveOtp`, `verifyAndConsumeOtp`, `deleteExpiredOtps` |
| Token Blacklist | `blacklistToken`, `isTokenBlacklisted`, `deleteExpiredBlacklistEntries` |

#### db/audit.js

```
audit(req, action, entity = {}, meta = null)
  Fire-and-forget INSERT into audit_logs.
  Never throws — errors are only console.error'd so the main request always succeeds.

getAuditLogs({ college_id?, limit, offset, action?, actor_id? })
  Paginated SELECT with optional WHERE filters.
  Returns newest-first.
```

### 5.7 Services & Utilities

#### services/whatsapp.js

Sends OTP messages via the SMSala WhatsApp API. Normalizes the phone number to `91XXXXXXXXXX` format before sending. Requires `WHATSAPP_API_TOKEN` and `WHATSAPP_OTP_TEMPLATE_ID` in `.env`.

#### utils/validate.js

```
validatePassword(pwd)  → error string | null
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one digit

validatePhone(phone)   → error string | null
  - Exactly 10 digits
  - Must start with 6, 7, 8, or 9  (Indian mobile format)
```

### 5.8 Migrations

Run with `npm run migrate` from the `backend/` directory. The runner reads all `*.sql` files in `migrations/` sorted alphabetically, executes them in order, then seeds the super-admin if absent.

| File | What it does |
|---|---|
| `001_create_colleges.sql` | `colleges` table |
| `002_create_users.sql` | `users` table + unique indexes |
| `003_create_classes.sql` | `classes` table |
| `004_create_subjects.sql` | `subjects` table + unique constraint |
| `005_create_students.sql` | `students` table + unique constraints |
| `006_create_assignments.sql` | `assignments` table + unique constraint |
| `007_create_marks.sql` | `marks` table + unique constraint |
| `008_add_blocked_columns.sql` | Add `is_blocked` to users, `is_active` to colleges |
| `009_fix_student_seat_constraint.sql` | Fix seat_no unique constraint scope |
| `010_add_semester_to_subjects.sql` | Add `semester` column to subjects |
| `011_create_audit_logs.sql` | `audit_logs` table + indexes |
| `012_add_semester_to_students.sql` | Add `semester` column to students |
| `013_create_otp_store.sql` | `otp_store` table + indexes |
| `014_create_token_blacklist.sql` | `token_blacklist` table + index |
| `015_add_indexes.sql` | Composite covering indexes for all list queries |

Default super-admin credentials (change before production):
- Phone: `9999999999`
- Password: `Admin@123`

---

## 6. Frontend

The frontend is a single-page React application. It is built directly into `backend/public/` so the Express server can serve it. There is no separate deployment step.

### 6.1 Scripts

```bash
# From frontend/
npm run dev      # Vite dev server (proxies /api to backend)
npm run build    # Build to ../backend/public
npm run preview  # Preview production build locally
```

The dev server proxy is configured in `vite.config.js`:
```js
proxy: { '/api': { target: 'http://192.168.1.6:5000' } }
```
Change the target IP to match your local backend host during development.

### 6.2 Routing & Pages

```
/           → redirects to /login
/login      → LoginPage         (GuestRoute: redirects logged-in users to their dashboard)
/super-admin → SuperAdminPage   (super_admin role only)
/clerk       → ClerkPage        (clerk role only)
/faculty     → FacultyPage      (faculty role only)
*           → redirects to /
```

#### LoginPage

Three flows handled in one page:

**Normal login:**
1. User enters the 8-character college code → API resolves and displays the college name.
2. User enters phone + password → login API sets JWT cookie.
3. Redirected to role-appropriate dashboard.

> Super-admin skips the college code step and logs in directly.

**Forgot password:**
1. Enter phone number.
2. Click "Send OTP" → OTP arrives on WhatsApp (rate-limited: 5 per 10 min).
3. Enter the 6-digit OTP + new password.
4. On success, user is prompted to log in again.

#### SuperAdminPage

- Lists all colleges in a card/table layout with `is_active` toggle.
- Each college row expands to show its clerks.
- Actions: create college (code shown once after creation), add/edit/delete/block clerks.

#### ClerkPage

Four tabs, all mounted simultaneously (switching tabs does **not** re-fetch data):

| Tab | Content |
|---|---|
| **Classes** | CRUD for classes. Each class can be expanded to manage its subjects and students. Students can be added individually or imported via Excel. |
| **Faculty** | CRUD for faculty accounts. |
| **Assignments** | Create and manage assignments (subject × mark type × faculty). Shows status badge. Clerk can reassign faculty, soft-delete, or lock. |
| **Marks** | Select an assignment to view its marks in a paginated table. Download button exports to Excel. |

#### FacultyPage

- Lists the faculty's assignments with status badges.
- Clicking an assignment opens the mark-entry panel.
- Marks are entered per student row. **Auto-save fires 1.5 s after the last keystroke** — no manual save button needed during entry.
- **Submit** button finalizes the submission (status → `submitted`). Faculty can **Reopen** if needed, unless the clerk has locked it.
- If the assignment is `locked`, all inputs are disabled.

### 6.3 Auth Context & Idle Timeout

`AuthContext` (wraps the whole app) stores:

```js
{
  user: { user_id, name, role, college_name }  // persisted in localStorage
  resolveCode(college_code)  // POST /auth/resolve-code
  login(college_id, phone, password, college_name)
  logout()
}
```

**Idle timeout** — automatically logs out inactive users:

| Role | Timeout |
|---|---|
| `super_admin` | None |
| `clerk` | 30 minutes |
| `faculty` | 60 minutes |

The timer resets on `mousemove`, `mousedown`, `keydown`, `touchstart`, and `scroll`. The expiry timestamp is written to `localStorage['session_expires']`.

**Session warning toast** — a fixed toast appears in the bottom-right corner during the last 2 minutes of the session, showing a live countdown and a "Sign out" button.

### 6.4 API Client

`src/api/client.js` creates an Axios instance:

```js
baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
withCredentials: true   // sends the httpOnly JWT cookie
```

**Response interceptor behaviour:**

| Condition | Action |
|---|---|
| Network error / offline | Sets a human-readable `err.friendlyMessage` |
| HTTP 401 (on non-auth endpoint) | Clears `localStorage['user']`, redirects to `/login` |
| HTTP 401 (on auth endpoint) | Passes through — handled by the page |

### 6.5 Components

| Component | Purpose |
|---|---|
| `ProtectedRoute` | Wraps a route; redirects to `/login` if `user` is null or role doesn't match. |
| `ProfileModal` | Modal for changing password. Supports two methods: enter old password, or request an OTP to WhatsApp. |
| `ErrorBoundary` | React error boundary that catches unexpected render errors and shows a fallback UI. |
| `Skeleton` | `<SkeletonTableRows>` and `<SkeletonCards>` — animated loading placeholders shown while data is fetching. |

---

## 7. Authentication Flow

### Login

```
1. POST /api/auth/resolve-code  { college_code }
   ← { college_id, name }

2. POST /api/auth/login  { college_id, phone, password }
   Backend checks:
     college.is_active == true
     user found by (college_id, phone)
     bcrypt.compare(password, user.password_hash)
     user.is_blocked == false
   Issues JWT:
     payload = { jti (UUID v4), user_id, college_id, role, name }
     signed with JWT_SECRET, expires 8 h
   Sets cookie:  token=<JWT>; HttpOnly; Secure; SameSite=Lax; Max-Age=28800
   ← { user_id, name, role, college_name }
```

### Every Authenticated Request

```
Cookie: token=<JWT>
  → middleware authenticate():
      verify signature
      check token_blacklist for jti
      set req.user = JWT payload
  → middleware requireRole(...):
      check req.user.role
  → controller (college_id is always req.user.college_id)
```

### Logout

```
POST /api/auth/logout
  → INSERT token_blacklist (jti, expires_at)
  → Clear cookie
  → Frontend: localStorage.removeItem('user')
  → Redirect to /login
```

### Forgot Password

```
POST /api/auth/forgot-password/send-otp  { college_id, phone }
  → Look up user
  → Generate 6-digit OTP, save to otp_store (expires in 10 min)
  → Send via WhatsApp (SMSala)

POST /api/auth/forgot-password/reset  { college_id, phone, otp, new_password }
  → verifyAndConsumeOtp(user_id, 'forgot', otp)
  → bcrypt.hash(new_password)
  → UPDATE users SET password_hash = ...
```

---

## 8. Business Workflows

### Assignment Lifecycle

```
           created by clerk
                 │
              [open]
                 │
        faculty enters marks
                 │
     faculty clicks "Submit"
                 │
           [submitted]  ←──── faculty clicks "Reopen" ────┐
                 │                                         │
        clerk reviews                                      │
                 │                                         │
        clerk clicks "Lock"                        (only if not locked)
                 │
            [locked]  ← terminal state, no further changes
```

Status rules:

| From | To | Who | Condition |
|---|---|---|---|
| `open` | `submitted` | Faculty | Assignment not locked |
| `submitted` | `open` | Faculty | Assignment not locked |
| any | `locked` | Clerk | — |
| `locked` | anything | — | **Not allowed** |

### Student Import (Excel)

1. Prepare an `.xlsx` file with columns: `seat_no`, `registration_no`, `name`, *(optional)* `semester`.
2. Upload via **Classes → Students → Import Excel**.
3. Backend validates the whole file first — returns all errors with row numbers before committing anything.
4. If validation passes, inserts all rows. Returns `{ imported: N }`.
5. DB-level uniqueness errors (duplicate seat or reg number) are caught per row and reported.

### Semester Filtering for Marks

When a subject has `semester` set, `seedMarksForAssignment` and `getMarksByAssignment` only include students whose `semester` matches — or students/subjects with `semester = NULL` (treated as "all semesters"). This allows one class to contain students from multiple semesters.

### Mark Download

`GET /api/clerk/assignments/:id/marks/download` streams an ExcelJS workbook with:

| Column | Value |
|---|---|
| Seat No | student.seat_no |
| Reg No | student.registration_no |
| Name | student.name |
| Mark | mark.value (or blank if NULL) |

Filename: `<SubjectName>_<mark_type>.xlsx`

---

## 9. Security Model

| Concern | Approach |
|---|---|
| **SQL injection** | All queries use parameterized `request.input()` — no user input is ever concatenated into SQL |
| **XSS / token theft** | JWT stored in `HttpOnly` cookie — inaccessible to JavaScript |
| **CSRF** | `SameSite=Lax` cookie flag + `credentials: true` Axios setting; only whitelisted origins accepted by CORS |
| **Brute force** | `express-rate-limit`: 20 req/15 min on auth, 5 req/10 min on OTP |
| **Password strength** | Minimum 8 chars, 1 uppercase, 1 digit — enforced server-side |
| **Password storage** | bcrypt with 10 salt rounds |
| **Session revocation** | `token_blacklist` table: every logout blacklists the JWT's `jti` |
| **Idle timeout** | Auto-logout: 30 min (clerk), 60 min (faculty); warning shown at 2 min remaining |
| **Multi-tenancy isolation** | `college_id` is always taken from the verified JWT — a user can never access another college's data by manipulating requests |
| **Role enforcement** | `requireRole()` middleware on every route group |
| **Security headers** | Helmet.js (CSP delegated to reverse proxy/CDN) |

---

## 10. Pagination

All list endpoints support optional `?page=` and `?limit=` query parameters.

**Defaults:** `page=1`, `limit=50`. Maximum `limit` is `200`.

**Response shape** for all list endpoints:

```json
{
  "data":  [ ...records... ],
  "total": 84,
  "page":  1,
  "limit": 50,
  "pages": 2
}
```

The `/assignments/:id/marks` endpoint returns the marks list inside a wrapper:

```json
{
  "assignment": { ...assignment details... },
  "marks": {
    "data":  [ ...mark rows... ],
    "total": 60,
    "page":  1,
    "limit": 50,
    "pages": 2
  }
}
```

---

## 11. Audit Logging

Every state-changing action is logged to `audit_logs`. Logging never fails silently — errors are console-logged but the main request always completes.

Actions logged:

```
COLLEGE_CREATED / COLLEGE_ACTIVATED / COLLEGE_DEACTIVATED
CLERK_CREATED / CLERK_UPDATED / CLERK_DELETED / CLERK_BLOCKED / CLERK_UNBLOCKED
FACULTY_CREATED / FACULTY_UPDATED / FACULTY_DELETED
CLASS_CREATED / CLASS_UPDATED / CLASS_DELETED
SUBJECT_CREATED / SUBJECT_UPDATED / SUBJECT_DELETED
ASSIGNMENT_CREATED / ASSIGNMENT_UPDATED / ASSIGNMENT_LOCKED / ASSIGNMENT_UNASSIGNED
ASSIGNMENT_SUBMITTED / ASSIGNMENT_REOPENED
MARKS_SAVED / MARKS_DOWNLOADED
USER_LOGIN / PASSWORD_CHANGED
```

Each record captures: actor identity, college, action, affected entity, extra metadata (JSON), IP address, user agent, UTC timestamp.

---

## 12. Running Locally

### Prerequisites

- Node.js 18+
- Microsoft SQL Server (local or remote)
- A SMSala account (only needed for OTP features)

### Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd college_result

# 2. Set up the backend
cd backend
cp .env.example .env          # Fill in DB credentials, JWT_SECRET, etc.
npm install
npm run migrate               # Creates all tables and seeds super-admin

# 3. Start the backend
npm run dev                   # Starts on http://localhost:5000

# 4. Set up and build the frontend  (in a second terminal)
cd ../frontend
npm install
npm run build                 # Outputs to ../backend/public

# 5. Open the app
# Visit http://localhost:5000
# Super-admin login: phone 9999999999, password Admin@123
```

### Development (hot reload)

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend dev server (with HMR, proxies /api to backend)
cd frontend && npm run dev
# Visit http://localhost:5173
```

> Update the `proxy.target` in `frontend/vite.config.js` if your backend is on a different IP.
