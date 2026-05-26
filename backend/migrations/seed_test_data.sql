-- ============================================================
-- TEST SEED DATA
-- Run AFTER migrate.js (which creates tables and super-admin).
-- Creates one college + clerk + faculty + class + subjects +
-- students + assignments so all E2E tests can run immediately.
--
-- Usage:  node -e "
--   require('dotenv').config();
--   const sql = require('mssql');
--   const fs  = require('fs');
--   sql.connect(require('./db/pool').config || {
--     server:   process.env.DB_SERVER,
--     database: process.env.DB_NAME,
--     user:     process.env.DB_USER,
--     password: process.env.DB_PASS,
--     options:  { trustServerCertificate: true }
--   }).then(pool => pool.request().batch(fs.readFileSync('./migrations/seed_test_data.sql','utf8')))
--     .then(() => { console.log('Seeded'); process.exit(0); })
--     .catch(e  => { console.error(e); process.exit(1); });
-- "
--
-- Or just paste into SSMS / Azure Data Studio.
-- ============================================================

-- ── 1. College ───────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM colleges WHERE college_code = 'TESTCOL1')
BEGIN
  INSERT INTO colleges (college_code, name, is_active)
  VALUES ('TESTCOL1', 'Test College E2E', 1);
END
GO

-- ── 2. Clerk  (password: Clerk@123) ─────────────────────────
--   bcrypt hash for "Clerk@123" with saltRounds=10
DECLARE @college_id INT = (SELECT college_id FROM colleges WHERE college_code = 'TESTCOL1');

IF NOT EXISTS (
  SELECT 1 FROM users
  WHERE college_id = @college_id AND phone = '9100000000' AND role = 'clerk'
)
BEGIN
  INSERT INTO users (college_id, role, name, phone, password_hash, is_blocked)
  VALUES (
    @college_id, 'clerk', 'Test Clerk',
    '9100000000',
    '$2a$10$Rix6SHBo84U5pCmzP.TxIuY7cT.cPXI2XqO5z5naMREGG9WzJY9Gy',
    0
  );
END
GO

-- ── 3. Faculty  (password: Faculty@123) ─────────────────────
DECLARE @college_id2 INT = (SELECT college_id FROM colleges WHERE college_code = 'TESTCOL1');

IF NOT EXISTS (
  SELECT 1 FROM users
  WHERE college_id = @college_id2 AND phone = '9200000000' AND role = 'faculty'
)
BEGIN
  INSERT INTO users (college_id, role, name, phone, password_hash, is_blocked)
  VALUES (
    @college_id2, 'faculty', 'Test Faculty',
    '9200000000',
    '$2a$10$Rix6SHBo84U5pCmzP.TxIuY7cT.cPXI2XqO5z5naMREGG9WzJY9Gy',
    0
  );
END
GO

-- ── 4. Class ─────────────────────────────────────────────────
DECLARE @cid INT = (SELECT college_id FROM colleges WHERE college_code = 'TESTCOL1');

IF NOT EXISTS (
  SELECT 1 FROM classes WHERE college_id = @cid AND name = 'FY B.Sc.'
)
BEGIN
  INSERT INTO classes (college_id, name) VALUES (@cid, 'FY B.Sc.');
END
GO

-- ── 5. Second class (for filter tests) ───────────────────────
DECLARE @cid2 INT = (SELECT college_id FROM colleges WHERE college_code = 'TESTCOL1');

IF NOT EXISTS (
  SELECT 1 FROM classes WHERE college_id = @cid2 AND name = 'SY B.Sc.'
)
BEGIN
  INSERT INTO classes (college_id, name) VALUES (@cid2, 'SY B.Sc.');
END
GO

-- ── 6. Subjects ───────────────────────────────────────────────
DECLARE @cid3   INT = (SELECT college_id FROM colleges WHERE college_code = 'TESTCOL1');
DECLARE @cls_id INT = (SELECT class_id   FROM classes  WHERE college_id = @cid3 AND name = 'FY B.Sc.');

IF NOT EXISTS (SELECT 1 FROM subjects WHERE college_id = @cid3 AND subject_code = 'PHY101')
BEGIN
  INSERT INTO subjects (college_id, class_id, name, subject_code, internal_max, external_max)
  VALUES (@cid3, @cls_id, 'Physics', 'PHY101', 30, 70);
END

IF NOT EXISTS (SELECT 1 FROM subjects WHERE college_id = @cid3 AND subject_code = 'CHM101')
BEGIN
  INSERT INTO subjects (college_id, class_id, name, subject_code, internal_max, external_max)
  VALUES (@cid3, @cls_id, 'Chemistry', 'CHM101', 30, 70);
END
GO

-- ── 7. Students ───────────────────────────────────────────────
DECLARE @cid4   INT = (SELECT college_id FROM colleges WHERE college_code = 'TESTCOL1');
DECLARE @cls_id2 INT = (SELECT class_id  FROM classes  WHERE college_id = @cid4 AND name = 'FY B.Sc.');

IF NOT EXISTS (SELECT 1 FROM students WHERE college_id = @cid4 AND registration_no = 'REG2024001')
BEGIN
  INSERT INTO students (college_id, class_id, seat_no, registration_no, name)
  VALUES (@cid4, @cls_id2, '001', 'REG2024001', 'Alice Sharma');
END

IF NOT EXISTS (SELECT 1 FROM students WHERE college_id = @cid4 AND registration_no = 'REG2024002')
BEGIN
  INSERT INTO students (college_id, class_id, seat_no, registration_no, name)
  VALUES (@cid4, @cls_id2, '002', 'REG2024002', 'Bob Patil');
END

IF NOT EXISTS (SELECT 1 FROM students WHERE college_id = @cid4 AND registration_no = 'REG2024003')
BEGIN
  INSERT INTO students (college_id, class_id, seat_no, registration_no, name)
  VALUES (@cid4, @cls_id2, '003', 'REG2024003', 'Carol Desai');
END
GO

-- ── 8. Assignments ────────────────────────────────────────────
DECLARE @cid5      INT = (SELECT college_id FROM colleges WHERE college_code = 'TESTCOL1');
DECLARE @fac_id    INT = (SELECT user_id    FROM users    WHERE college_id = @cid5 AND phone = '9200000000');
DECLARE @phy_id    INT = (SELECT subject_id FROM subjects WHERE college_id = @cid5 AND subject_code = 'PHY101');
DECLARE @chm_id    INT = (SELECT subject_id FROM subjects WHERE college_id = @cid5 AND subject_code = 'CHM101');

-- Physics internal (open — faculty can enter marks)
IF NOT EXISTS (
  SELECT 1 FROM assignments WHERE college_id = @cid5 AND subject_id = @phy_id AND mark_type = 'internal'
)
BEGIN
  INSERT INTO assignments (college_id, faculty_id, subject_id, mark_type, status)
  VALUES (@cid5, @fac_id, @phy_id, 'internal', 'open');
END

-- Physics external (submitted — clerk can lock)
IF NOT EXISTS (
  SELECT 1 FROM assignments WHERE college_id = @cid5 AND subject_id = @phy_id AND mark_type = 'external'
)
BEGIN
  INSERT INTO assignments (college_id, faculty_id, subject_id, mark_type, status)
  VALUES (@cid5, @fac_id, @phy_id, 'external', 'submitted');
END

-- Chemistry internal (locked — view only)
IF NOT EXISTS (
  SELECT 1 FROM assignments WHERE college_id = @cid5 AND subject_id = @chm_id AND mark_type = 'internal'
)
BEGIN
  INSERT INTO assignments (college_id, faculty_id, subject_id, mark_type, status)
  VALUES (@cid5, @fac_id, @chm_id, 'internal', 'locked');
END
GO

-- ── 9. Seed marks for locked assignment ──────────────────────
DECLARE @cid6   INT = (SELECT college_id FROM colleges WHERE college_code = 'TESTCOL1');
DECLARE @chm_id2 INT = (SELECT subject_id FROM subjects WHERE college_id = @cid6 AND subject_code = 'CHM101');
DECLARE @locked_id INT = (
  SELECT assignment_id FROM assignments
  WHERE college_id = @cid6 AND subject_id = @chm_id2 AND mark_type = 'internal'
);

-- Insert mark rows for each student if not present
INSERT INTO marks (college_id, assignment_id, student_id, value)
SELECT @cid6, @locked_id, s.student_id,
  CASE s.seat_no WHEN '001' THEN 22 WHEN '002' THEN 18 WHEN '003' THEN 25 END
FROM students s
WHERE s.college_id = @cid6
  AND NOT EXISTS (
    SELECT 1 FROM marks m
    WHERE m.assignment_id = @locked_id AND m.student_id = s.student_id
  );
GO

-- ── Done ──────────────────────────────────────────────────────
-- Summary of seeded data:
--   College code : TESTCOL1
--   Clerk        : phone 9100000000 / password Clerk@123
--   Faculty      : phone 9200000000 / password Faculty@123
--   Class        : FY B.Sc. (3 students: 001/REG2024001, 002/REG2024002, 003/REG2024003)
--   Class        : SY B.Sc. (empty, for filter tests)
--   Subjects     : Physics (PHY101), Chemistry (CHM101)
--   Assignments  : PHY101 internal=open, PHY101 external=submitted, CHM101 internal=locked
