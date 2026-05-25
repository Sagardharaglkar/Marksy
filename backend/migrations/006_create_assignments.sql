-- Migration 006: Create assignments table
-- The spine of the system: subject × mark_type is the unit of entry.
-- One assignment per (subject_id, mark_type) — enforced by unique constraint.
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'assignments'
)
BEGIN
  CREATE TABLE assignments (
    assignment_id INT IDENTITY(1,1) PRIMARY KEY,
    college_id    INT          NOT NULL REFERENCES colleges(college_id) ON DELETE CASCADE,
    faculty_id    INT          NOT NULL REFERENCES users(user_id),
    subject_id    INT          NOT NULL REFERENCES subjects(subject_id),
    mark_type     NVARCHAR(10) NOT NULL CHECK (mark_type IN ('internal', 'external')),
    status        NVARCHAR(20) NOT NULL DEFAULT 'open'
                               CHECK (status IN ('open', 'submitted', 'locked')),
    created_at    DATETIME2    NOT NULL DEFAULT GETDATE(),

    -- One owner per enterable unit
    CONSTRAINT UQ_assignment_subject_type UNIQUE (subject_id, mark_type)
  );

  CREATE INDEX IX_assignments_faculty ON assignments (faculty_id);
  CREATE INDEX IX_assignments_college ON assignments (college_id);

  PRINT 'Created table: assignments';
END
ELSE
  PRINT 'Table already exists: assignments';
