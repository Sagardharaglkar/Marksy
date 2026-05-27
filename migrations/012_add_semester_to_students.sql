IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'students' AND COLUMN_NAME = 'semester'
)
BEGIN
  ALTER TABLE students ADD semester INT NULL;
  PRINT 'Added column: students.semester';
END
ELSE
  PRINT 'Column already exists: students.semester';
