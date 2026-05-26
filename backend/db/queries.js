/**
 * Central query executor. Every function takes college_id from the caller
 * (always sourced from the verified JWT, never from client input) and
 * applies it in parameterized SQL — never string-concatenated.
 */
const { getPool, sql } = require("./connection");

async function query(sqlText, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, { type, value }] of Object.entries(params)) {
    request.input(key, type, value);
  }
  return request.query(sqlText);
}

// ─── colleges ────────────────────────────────────────────────────────────────

async function getCollegeByCode(college_code) {
  const result = await query(
    "SELECT college_id, name, is_active FROM colleges WHERE college_code = @college_code",
    { college_code: { type: sql.NVarChar(8), value: college_code } }
  );
  return result.recordset[0] || null;
}

async function getCollegeById(college_id) {
  const result = await query(
    "SELECT college_id, college_code, name, is_active, created_at FROM colleges WHERE college_id = @college_id",
    { college_id: { type: sql.Int, value: college_id } }
  );
  return result.recordset[0] || null;
}

async function createCollege(name, college_code) {
  const result = await query(
    `INSERT INTO colleges (name, college_code) OUTPUT INSERTED.college_id VALUES (@name, @college_code)`,
    {
      name: { type: sql.NVarChar(255), value: name },
      college_code: { type: sql.NVarChar(8), value: college_code },
    }
  );
  return result.recordset[0].college_id;
}

async function getAllColleges() {
  const result = await query(
    "SELECT college_id, college_code, name, is_active, created_at FROM colleges ORDER BY created_at DESC"
  );
  return result.recordset;
}

// ─── users ────────────────────────────────────────────────────────────────────

async function getUserByPhone(college_id, phone) {
  const result = await query(
    `SELECT user_id, college_id, role, name, phone, password_hash, is_blocked
     FROM users
     WHERE college_id = @college_id AND phone = @phone`,
    {
      college_id: { type: sql.Int, value: college_id },
      phone: { type: sql.NVarChar(20), value: phone },
    }
  );
  return result.recordset[0] || null;
}

async function getSuperAdminByPhone(phone) {
  const result = await query(
    `SELECT user_id, role, name, phone, password_hash
     FROM users
     WHERE role = 'super_admin' AND phone = @phone`,
    { phone: { type: sql.NVarChar(20), value: phone } }
  );
  return result.recordset[0] || null;
}

async function createUser(college_id, role, name, phone, password_hash) {
  const result = await query(
    `INSERT INTO users (college_id, role, name, phone, password_hash)
     OUTPUT INSERTED.user_id
     VALUES (@college_id, @role, @name, @phone, @password_hash)`,
    {
      college_id: { type: sql.Int, value: college_id },
      role: { type: sql.NVarChar(20), value: role },
      name: { type: sql.NVarChar(255), value: name },
      phone: { type: sql.NVarChar(20), value: phone },
      password_hash: { type: sql.NVarChar(255), value: password_hash },
    }
  );
  return result.recordset[0].user_id;
}

async function getClerksByCollege(college_id) {
  const result = await query(
    `SELECT user_id, name, phone, is_blocked FROM users
     WHERE college_id = @college_id AND role = 'clerk'
     ORDER BY name`,
    { college_id: { type: sql.Int, value: college_id } }
  );
  return result.recordset;
}

async function updateFaculty(college_id, user_id, name, phone) {
  await query(
    `UPDATE users SET name = @name, phone = @phone
     WHERE user_id = @user_id AND college_id = @college_id AND role = 'faculty'`,
    {
      name: { type: sql.NVarChar(255), value: name },
      phone: { type: sql.NVarChar(20), value: phone },
      user_id: { type: sql.Int, value: user_id },
      college_id: { type: sql.Int, value: college_id },
    }
  );
}

async function deleteFaculty(college_id, user_id) {
  await query(
    `DELETE FROM users WHERE user_id = @user_id AND college_id = @college_id AND role = 'faculty'`,
    {
      user_id: { type: sql.Int, value: user_id },
      college_id: { type: sql.Int, value: college_id },
    }
  );
}

async function updateClerk(college_id, user_id, name, phone) {
  await query(
    `UPDATE users SET name = @name, phone = @phone
     WHERE user_id = @user_id AND college_id = @college_id AND role = 'clerk'`,
    {
      name: { type: sql.NVarChar(255), value: name },
      phone: { type: sql.NVarChar(20), value: phone },
      user_id: { type: sql.Int, value: user_id },
      college_id: { type: sql.Int, value: college_id },
    }
  );
}

async function deleteClerk(college_id, user_id) {
  await query(
    `DELETE FROM users WHERE user_id = @user_id AND college_id = @college_id AND role = 'clerk'`,
    {
      user_id: { type: sql.Int, value: user_id },
      college_id: { type: sql.Int, value: college_id },
    }
  );
}

async function setClerkBlocked(college_id, user_id, is_blocked) {
  await query(
    `UPDATE users SET is_blocked = @is_blocked
     WHERE user_id = @user_id AND college_id = @college_id AND role = 'clerk'`,
    {
      is_blocked: { type: sql.Bit, value: is_blocked ? 1 : 0 },
      user_id: { type: sql.Int, value: user_id },
      college_id: { type: sql.Int, value: college_id },
    }
  );
}

async function setCollegeActive(college_id, is_active) {
  await query(
    `UPDATE colleges SET is_active = @is_active WHERE college_id = @college_id`,
    {
      is_active: { type: sql.Bit, value: is_active ? 1 : 0 },
      college_id: { type: sql.Int, value: college_id },
    }
  );
}

async function getFacultyByCollege(college_id) {
  const result = await query(
    `SELECT user_id, name, phone FROM users
     WHERE college_id = @college_id AND role = 'faculty'
     ORDER BY name`,
    { college_id: { type: sql.Int, value: college_id } }
  );
  return result.recordset;
}

async function getUserById(college_id, user_id) {
  const result = await query(
    `SELECT user_id, college_id, role, name, phone FROM users
     WHERE college_id = @college_id AND user_id = @user_id`,
    {
      college_id: { type: sql.Int, value: college_id },
      user_id: { type: sql.Int, value: user_id },
    }
  );
  return result.recordset[0] || null;
}

// ─── classes ──────────────────────────────────────────────────────────────────

async function getClasses(college_id) {
  const result = await query(
    `SELECT class_id, name FROM classes WHERE college_id = @college_id ORDER BY name`,
    { college_id: { type: sql.Int, value: college_id } }
  );
  return result.recordset;
}

async function createClass(college_id, name) {
  const result = await query(
    `INSERT INTO classes (college_id, name) OUTPUT INSERTED.class_id VALUES (@college_id, @name)`,
    {
      college_id: { type: sql.Int, value: college_id },
      name: { type: sql.NVarChar(255), value: name },
    }
  );
  return result.recordset[0].class_id;
}

async function updateClass(college_id, class_id, name) {
  await query(
    `UPDATE classes SET name = @name WHERE class_id = @class_id AND college_id = @college_id`,
    {
      name: { type: sql.NVarChar(255), value: name },
      class_id: { type: sql.Int, value: class_id },
      college_id: { type: sql.Int, value: college_id },
    }
  );
}

async function deleteClass(college_id, class_id) {
  await query(
    `DELETE FROM classes WHERE class_id = @class_id AND college_id = @college_id`,
    {
      class_id: { type: sql.Int, value: class_id },
      college_id: { type: sql.Int, value: college_id },
    }
  );
}

// ─── subjects ─────────────────────────────────────────────────────────────────

async function getSubjectByCode(college_id, subject_code) {
  const result = await query(
    `SELECT subject_id FROM subjects WHERE college_id = @college_id AND subject_code = @subject_code`,
    {
      college_id: { type: sql.Int, value: college_id },
      subject_code: { type: sql.NVarChar(20), value: subject_code },
    }
  );
  return result.recordset[0] || null;
}

async function getSubjectsByClass(college_id, class_id) {
  const result = await query(
    `SELECT subject_id, name, subject_code, semester, internal_max, external_max
     FROM subjects
     WHERE college_id = @college_id AND class_id = @class_id
     ORDER BY semester, name`,
    {
      college_id: { type: sql.Int, value: college_id },
      class_id: { type: sql.Int, value: class_id },
    }
  );
  return result.recordset;
}

async function getSubjectsByClassAndSemester(college_id, class_id, semester) {
  const result = await query(
    `SELECT subject_id, name, subject_code, semester, internal_max, external_max
     FROM subjects
     WHERE college_id = @college_id AND class_id = @class_id AND semester = @semester
     ORDER BY name`,
    {
      college_id: { type: sql.Int, value: college_id },
      class_id: { type: sql.Int, value: class_id },
      semester: { type: sql.Int, value: semester },
    }
  );
  return result.recordset;
}

async function createSubject(college_id, class_id, name, subject_code, semester, internal_max, external_max) {
  const result = await query(
    `INSERT INTO subjects (college_id, class_id, name, subject_code, semester, internal_max, external_max)
     OUTPUT INSERTED.subject_id
     VALUES (@college_id, @class_id, @name, @subject_code, @semester, @internal_max, @external_max)`,
    {
      college_id: { type: sql.Int, value: college_id },
      class_id: { type: sql.Int, value: class_id },
      name: { type: sql.NVarChar(255), value: name },
      subject_code: { type: sql.NVarChar(20), value: subject_code },
      semester: { type: sql.Int, value: semester || null },
      internal_max: { type: sql.Int, value: internal_max || null },
      external_max: { type: sql.Int, value: external_max || null },
    }
  );
  return result.recordset[0].subject_id;
}

async function updateSubject(college_id, subject_id, name, subject_code, semester, internal_max, external_max) {
  await query(
    `UPDATE subjects SET name = @name, subject_code = @subject_code,
       semester = @semester, internal_max = @internal_max, external_max = @external_max
     WHERE subject_id = @subject_id AND college_id = @college_id`,
    {
      name: { type: sql.NVarChar(255), value: name },
      subject_code: { type: sql.NVarChar(20), value: subject_code },
      semester: { type: sql.Int, value: semester || null },
      internal_max: { type: sql.Int, value: internal_max || null },
      external_max: { type: sql.Int, value: external_max || null },
      subject_id: { type: sql.Int, value: subject_id },
      college_id: { type: sql.Int, value: college_id },
    }
  );
}

async function deleteSubject(college_id, subject_id) {
  await query(
    `DELETE FROM subjects WHERE subject_id = @subject_id AND college_id = @college_id`,
    {
      subject_id: { type: sql.Int, value: subject_id },
      college_id: { type: sql.Int, value: college_id },
    }
  );
}

// ─── students ─────────────────────────────────────────────────────────────────

async function getStudentsByClass(college_id, class_id) {
  const result = await query(
    `SELECT student_id, seat_no, registration_no, name, semester
     FROM students
     WHERE college_id = @college_id AND class_id = @class_id
     ORDER BY semester, seat_no`,
    {
      college_id: { type: sql.Int, value: college_id },
      class_id: { type: sql.Int, value: class_id },
    }
  );
  return result.recordset;
}

async function createStudent(college_id, class_id, seat_no, registration_no, name, semester) {
  const result = await query(
    `INSERT INTO students (college_id, class_id, seat_no, registration_no, name, semester)
     OUTPUT INSERTED.student_id
     VALUES (@college_id, @class_id, @seat_no, @registration_no, @name, @semester)`,
    {
      college_id:      { type: sql.Int,           value: college_id },
      class_id:        { type: sql.Int,           value: class_id },
      seat_no:         { type: sql.NVarChar(50),  value: seat_no },
      registration_no: { type: sql.NVarChar(50),  value: registration_no },
      name:            { type: sql.NVarChar(255), value: name },
      semester:        { type: sql.Int,           value: semester ?? null },
    }
  );
  return result.recordset[0].student_id;
}

// ─── assignments ──────────────────────────────────────────────────────────────

async function getAssignmentsByFaculty(college_id, faculty_id) {
  const result = await query(
    `SELECT a.assignment_id, a.status, a.mark_type,
            s.name AS subject_name, s.subject_code, s.subject_id, s.semester,
            c.name AS class_name, c.class_id
     FROM assignments a
     JOIN subjects s ON a.subject_id = s.subject_id
     JOIN classes c ON s.class_id = c.class_id
     WHERE a.college_id = @college_id AND a.faculty_id = @faculty_id
     ORDER BY s.name, a.mark_type`,
    {
      college_id: { type: sql.Int, value: college_id },
      faculty_id: { type: sql.Int, value: faculty_id },
    }
  );
  return result.recordset;
}

async function getAssignmentsByCollege(college_id) {
  const result = await query(
    `SELECT a.assignment_id, a.status, a.mark_type, a.created_at,
            s.name AS subject_name, s.subject_code, s.subject_id,
            c.name AS class_name, c.class_id,
            u.name AS faculty_name, u.user_id AS faculty_id
     FROM assignments a
     JOIN subjects s ON a.subject_id = s.subject_id
     JOIN classes c ON s.class_id = c.class_id
     LEFT JOIN users u ON a.faculty_id = u.user_id
     WHERE a.college_id = @college_id
     ORDER BY c.name, s.name, a.mark_type`,
    { college_id: { type: sql.Int, value: college_id } }
  );
  return result.recordset;
}

async function getAssignmentById(college_id, assignment_id) {
  const result = await query(
    `SELECT a.assignment_id, a.status, a.mark_type, a.faculty_id, a.subject_id,
            s.class_id, s.name AS subject_name, s.semester,
            c.name AS class_name
     FROM assignments a
     JOIN subjects s ON a.subject_id = s.subject_id
     JOIN classes c ON s.class_id = c.class_id
     WHERE a.college_id = @college_id AND a.assignment_id = @assignment_id`,
    {
      college_id: { type: sql.Int, value: college_id },
      assignment_id: { type: sql.Int, value: assignment_id },
    }
  );
  return result.recordset[0] || null;
}

async function createAssignment(college_id, faculty_id, subject_id, mark_type) {
  const result = await query(
    `INSERT INTO assignments (college_id, faculty_id, subject_id, mark_type, status)
     OUTPUT INSERTED.assignment_id
     VALUES (@college_id, @faculty_id, @subject_id, @mark_type, 'open')`,
    {
      college_id: { type: sql.Int, value: college_id },
      faculty_id: { type: sql.Int, value: faculty_id },
      subject_id: { type: sql.Int, value: subject_id },
      mark_type: { type: sql.NVarChar(10), value: mark_type },
    }
  );
  return result.recordset[0].assignment_id;
}

async function updateAssignmentStatus(college_id, assignment_id, status) {
  await query(
    `UPDATE assignments SET status = @status
     WHERE assignment_id = @assignment_id AND college_id = @college_id`,
    {
      status: { type: sql.NVarChar(20), value: status },
      assignment_id: { type: sql.Int, value: assignment_id },
      college_id: { type: sql.Int, value: college_id },
    }
  );
}

async function updateAssignmentFaculty(college_id, assignment_id, faculty_id) {
  await query(
    `UPDATE assignments SET faculty_id = @faculty_id
     WHERE assignment_id = @assignment_id AND college_id = @college_id`,
    {
      faculty_id: { type: sql.Int, value: faculty_id },
      assignment_id: { type: sql.Int, value: assignment_id },
      college_id: { type: sql.Int, value: college_id },
    }
  );
}

async function deleteAssignment(college_id, assignment_id) {
  // "Delete" = unassign faculty; marks and the assignment row are kept
  await query(
    `UPDATE assignments SET faculty_id = NULL, status = 'open'
     WHERE assignment_id = @assignment_id AND college_id = @college_id`,
    {
      assignment_id: { type: sql.Int, value: assignment_id },
      college_id:    { type: sql.Int, value: college_id },
    }
  );
}

// ─── marks ────────────────────────────────────────────────────────────────────

async function getMarksByAssignment(college_id, assignment_id) {
  const result = await query(
    `SELECT m.mark_id, m.student_id, m.value, m.updated_at,
            s.seat_no, s.registration_no, s.name AS student_name
     FROM marks m
     JOIN students s ON m.student_id = s.student_id
     JOIN assignments a ON m.assignment_id = a.assignment_id
     JOIN subjects sub ON a.subject_id = sub.subject_id
     WHERE m.college_id = @college_id AND m.assignment_id = @assignment_id
       AND (sub.semester IS NULL OR s.semester = sub.semester OR s.semester IS NULL)
     ORDER BY s.seat_no`,
    {
      college_id: { type: sql.Int, value: college_id },
      assignment_id: { type: sql.Int, value: assignment_id },
    }
  );
  return result.recordset;
}

async function upsertMark(college_id, assignment_id, student_id, value) {
  await query(
    `IF EXISTS (
       SELECT 1 FROM marks
       WHERE assignment_id = @assignment_id AND student_id = @student_id AND college_id = @college_id
     )
     UPDATE marks SET value = @value, updated_at = GETDATE()
     WHERE assignment_id = @assignment_id AND student_id = @student_id AND college_id = @college_id
     ELSE
     INSERT INTO marks (college_id, assignment_id, student_id, value)
     VALUES (@college_id, @assignment_id, @student_id, @value)`,
    {
      college_id: { type: sql.Int, value: college_id },
      assignment_id: { type: sql.Int, value: assignment_id },
      student_id: { type: sql.Int, value: student_id },
      value: { type: sql.Decimal(5, 2), value: value !== undefined ? value : null },
    }
  );
}

async function seedMarksForAssignment(college_id, assignment_id, class_id) {
  // Insert null-value rows only for students matching the assignment's semester
  // (if the subject has no semester set, seed all students in the class)
  await query(
    `INSERT INTO marks (college_id, assignment_id, student_id)
     SELECT @college_id, @assignment_id, s.student_id
     FROM students s
     JOIN assignments a ON a.assignment_id = @assignment_id
     JOIN subjects sub ON a.subject_id = sub.subject_id
     WHERE s.class_id = @class_id AND s.college_id = @college_id
       AND (sub.semester IS NULL OR s.semester = sub.semester OR s.semester IS NULL)
       AND NOT EXISTS (
         SELECT 1 FROM marks m
         WHERE m.assignment_id = @assignment_id AND m.student_id = s.student_id
       )`,
    {
      college_id: { type: sql.Int, value: college_id },
      assignment_id: { type: sql.Int, value: assignment_id },
      class_id: { type: sql.Int, value: class_id },
    }
  );
}

async function getUserById(user_id, college_id) {
  const result = await query(
    `SELECT user_id, college_id, role, name, phone, password_hash
     FROM users
     WHERE user_id = @user_id AND (college_id = @college_id OR college_id IS NULL)`,
    {
      user_id:    { type: sql.Int, value: user_id },
      college_id: { type: sql.Int, value: college_id ?? null },
    }
  );
  return result.recordset[0] || null;
}

async function updateUserPassword(user_id, college_id, password_hash) {
  await query(
    `UPDATE users SET password_hash = @password_hash
     WHERE user_id = @user_id AND (college_id = @college_id OR college_id IS NULL)`,
    {
      user_id:       { type: sql.Int,           value: user_id },
      college_id:    { type: sql.Int,           value: college_id ?? null },
      password_hash: { type: sql.NVarChar(255), value: password_hash },
    }
  );
}

module.exports = {
  getCollegeByCode,
  getSubjectByCode,
  getClerksByCollege,
  getCollegeById,
  createCollege,
  getAllColleges,
  getUserByPhone,
  getSuperAdminByPhone,
  createUser,
  updateFaculty,
  deleteFaculty,
  updateClerk,
  deleteClerk,
  setClerkBlocked,
  setCollegeActive,
  getFacultyByCollege,
  getUserById,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSubjectsByClass,
  getSubjectsByClassAndSemester,
  createSubject,
  updateSubject,
  deleteSubject,
  getStudentsByClass,
  createStudent,
  getAssignmentsByFaculty,
  getAssignmentsByCollege,
  getAssignmentById,
  createAssignment,
  updateAssignmentStatus,
  updateAssignmentFaculty,
  deleteAssignment,
  getMarksByAssignment,
  upsertMark,
  seedMarksForAssignment,
  updateUserPassword,
  saveOtp,
  verifyAndConsumeOtp,
  deleteExpiredOtps,
  blacklistToken,
  isTokenBlacklisted,
  deleteExpiredBlacklistEntries,
};

// ─── OTP store (DB-backed) ───────────────────────────────────────────────────

async function saveOtp(user_id, purpose, code, ttlMs) {
  // Invalidate any existing unused OTP for this user+purpose
  await query(
    `UPDATE otp_store SET used = 1 WHERE user_id = @user_id AND purpose = @purpose AND used = 0`,
    {
      user_id: { type: sql.Int,         value: user_id },
      purpose: { type: sql.VarChar(20), value: purpose },
    }
  );
  const expires_at = new Date(Date.now() + ttlMs);
  await query(
    `INSERT INTO otp_store (user_id, purpose, code, expires_at) VALUES (@user_id, @purpose, @code, @expires_at)`,
    {
      user_id:    { type: sql.Int,          value: user_id },
      purpose:    { type: sql.VarChar(20),  value: purpose },
      code:       { type: sql.VarChar(6),   value: code },
      expires_at: { type: sql.DateTime2(),  value: expires_at },
    }
  );
}

async function verifyAndConsumeOtp(user_id, purpose, code) {
  const result = await query(
    `SELECT id FROM otp_store
     WHERE user_id = @user_id AND purpose = @purpose AND code = @code
       AND used = 0 AND expires_at > SYSUTCDATETIME()`,
    {
      user_id: { type: sql.Int,        value: user_id },
      purpose: { type: sql.VarChar(20), value: purpose },
      code:    { type: sql.VarChar(6),  value: code },
    }
  );
  const row = result.recordset[0];
  if (!row) return false;
  await query(
    `UPDATE otp_store SET used = 1 WHERE id = @id`,
    { id: { type: sql.Int, value: row.id } }
  );
  return true;
}

async function deleteExpiredOtps() {
  await query(`DELETE FROM otp_store WHERE expires_at < SYSUTCDATETIME() OR used = 1`);
}

// ─── Token blacklist ──────────────────────────────────────────────────────────

async function blacklistToken(jti, expiresAt) {
  await query(
    `INSERT INTO token_blacklist (jti, expires_at) VALUES (@jti, @expires_at)`,
    {
      jti:        { type: sql.VarChar(36),   value: jti },
      expires_at: { type: sql.DateTime2(),   value: expiresAt },
    }
  );
}

async function isTokenBlacklisted(jti) {
  const result = await query(
    `SELECT 1 AS found FROM token_blacklist WHERE jti = @jti AND expires_at > SYSUTCDATETIME()`,
    { jti: { type: sql.VarChar(36), value: jti } }
  );
  return result.recordset.length > 0;
}

async function deleteExpiredBlacklistEntries() {
  await query(`DELETE FROM token_blacklist WHERE expires_at < SYSUTCDATETIME()`);
}
