-- ─── 015_add_indexes.sql ─────────────────────────────────────────────────────
-- Performance indexes derived from actual query patterns in db/queries.js and
-- db/audit.js. Existing indexes are noted where they already cover a pattern.

-- ─── colleges ─────────────────────────────────────────────────────────────────

-- getAllColleges: ORDER BY created_at DESC
-- (college_code already has a UNIQUE index; college_id is PK)
CREATE INDEX IX_colleges_created
  ON colleges (created_at DESC);

-- ─── users ────────────────────────────────────────────────────────────────────

-- getClerksByCollege / getFacultyByCollege:
--   WHERE college_id = ? AND role = ?   ORDER BY name
-- Covers both the filter and the sort; INCLUDE avoids a key-lookup for the
-- SELECT columns (user_id, phone, is_blocked).
CREATE INDEX IX_users_college_role_name
  ON users (college_id, role, name)
  INCLUDE (user_id, phone, is_blocked);

-- ─── classes ──────────────────────────────────────────────────────────────────

-- getClasses: WHERE college_id = ?   ORDER BY name
-- IX_classes_college already exists on (college_id) alone; extend it to cover
-- the ORDER BY so SQL Server can satisfy the sort from the index.
-- Drop old, create covering replacement.
DROP INDEX IF EXISTS IX_classes_college ON classes;

CREATE INDEX IX_classes_college_name
  ON classes (college_id, name)
  INCLUDE (class_id);

-- ─── subjects ─────────────────────────────────────────────────────────────────

-- getSubjectsByClass:
--   WHERE college_id = ? AND class_id = ?   ORDER BY semester, name
-- getSubjectsByClassAndSemester:
--   WHERE college_id = ? AND class_id = ? AND semester = ?   ORDER BY name
-- Single composite index covers both queries; INCLUDE avoids key-lookup for
-- SELECT columns.
-- IX_subjects_class already exists on (class_id) alone — drop and replace.
DROP INDEX IF EXISTS IX_subjects_class ON subjects;

CREATE INDEX IX_subjects_college_class_sem_name
  ON subjects (college_id, class_id, semester, name)
  INCLUDE (subject_id, subject_code, internal_max, external_max);

-- ─── students ─────────────────────────────────────────────────────────────────

-- getStudentsByClass:
--   WHERE college_id = ? AND class_id = ?   ORDER BY semester, seat_no
-- seedMarksForAssignment (inner SELECT):
--   WHERE college_id = ? AND class_id = ?   (semester filter via expression)
-- IX_students_class already exists on (class_id) alone — drop and replace.
DROP INDEX IF EXISTS IX_students_class ON students;

CREATE INDEX IX_students_college_class_sem_seat
  ON students (college_id, class_id, semester, seat_no)
  INCLUDE (student_id, registration_no, name);

-- ─── assignments ──────────────────────────────────────────────────────────────

-- getAssignmentsByFaculty:
--   WHERE college_id = ? AND faculty_id = ?
-- IX_assignments_faculty exists on (faculty_id) alone — extend to cover
-- the college_id leading column used in every assignment query.
DROP INDEX IF EXISTS IX_assignments_faculty ON assignments;

CREATE INDEX IX_assignments_college_faculty
  ON assignments (college_id, faculty_id)
  INCLUDE (assignment_id, subject_id, mark_type, status, created_at);

-- IX_assignments_college already covers getAssignmentsByCollege's WHERE;
-- INCLUDE the join/select columns to avoid key-lookups.
DROP INDEX IF EXISTS IX_assignments_college ON assignments;

CREATE INDEX IX_assignments_college_incl
  ON assignments (college_id)
  INCLUDE (assignment_id, faculty_id, subject_id, mark_type, status, created_at);

-- ─── marks ────────────────────────────────────────────────────────────────────

-- getMarksByAssignment / seedMarksForAssignment:
--   WHERE college_id = ? AND assignment_id = ?   ORDER BY students.seat_no
-- IX_marks_assignment exists on (assignment_id) alone — extend with college_id
-- and INCLUDE select columns.
DROP INDEX IF EXISTS IX_marks_assignment ON marks;

CREATE INDEX IX_marks_college_assignment
  ON marks (college_id, assignment_id)
  INCLUDE (mark_id, student_id, value, updated_at);
