-- Migration 010: Add semester column to subjects
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'subjects' AND COLUMN_NAME = 'semester'
)
BEGIN
  ALTER TABLE subjects ADD semester INT NULL;
  PRINT 'Added column: subjects.semester';
END
ELSE
  PRINT 'Column already exists: subjects.semester';
