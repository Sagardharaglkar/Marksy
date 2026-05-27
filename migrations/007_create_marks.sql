-- Migration 007: Create marks table
-- value is nullable until entered. State is on the assignment, not the mark row.
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'marks'
)
BEGIN
  CREATE TABLE marks (
    mark_id       INT IDENTITY(1,1) PRIMARY KEY,
    college_id    INT            NOT NULL REFERENCES colleges(college_id) ON DELETE CASCADE,
    assignment_id INT            NOT NULL REFERENCES assignments(assignment_id),
    student_id    INT            NOT NULL REFERENCES students(student_id),
    value         DECIMAL(5,2)   NULL,
    updated_at    DATETIME2      NOT NULL DEFAULT GETDATE(),

    CONSTRAINT UQ_mark_assignment_student UNIQUE (assignment_id, student_id)
  );

  CREATE INDEX IX_marks_assignment ON marks (assignment_id);

  PRINT 'Created table: marks';
END
ELSE
  PRINT 'Table already exists: marks';
