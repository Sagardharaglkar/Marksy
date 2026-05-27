-- Migration 003: Create classes table
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'classes'
)
BEGIN
  CREATE TABLE classes (
    class_id   INT IDENTITY(1,1) PRIMARY KEY,
    college_id INT           NOT NULL REFERENCES colleges(college_id) ON DELETE CASCADE,
    name       NVARCHAR(255) NOT NULL,
    created_at DATETIME2     NOT NULL DEFAULT GETDATE()
  );

  CREATE INDEX IX_classes_college ON classes (college_id);

  PRINT 'Created table: classes';
END
ELSE
  PRINT 'Table already exists: classes';
