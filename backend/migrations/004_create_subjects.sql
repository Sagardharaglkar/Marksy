-- Migration 004: Create subjects table
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'subjects'
)
BEGIN
  CREATE TABLE subjects (
    subject_id   INT IDENTITY(1,1) PRIMARY KEY,
    college_id   INT           NOT NULL REFERENCES colleges(college_id) ON DELETE CASCADE,
    class_id     INT           NOT NULL REFERENCES classes(class_id),
    name         NVARCHAR(255) NOT NULL,
    subject_code NVARCHAR(20)  NOT NULL,
    internal_max INT           NULL,
    external_max INT           NULL,
    created_at   DATETIME2     NOT NULL DEFAULT GETDATE(),

    -- subject_code unique within a college
    CONSTRAINT UQ_subject_code_college UNIQUE (college_id, subject_code)
  );

  CREATE INDEX IX_subjects_class ON subjects (class_id);

  PRINT 'Created table: subjects';
END
ELSE
  PRINT 'Table already exists: subjects';
