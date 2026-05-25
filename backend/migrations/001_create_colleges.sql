-- Migration 001: Create colleges table
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'colleges'
)
BEGIN
  CREATE TABLE colleges (
    college_id   INT IDENTITY(1,1) PRIMARY KEY,
    college_code NVARCHAR(8)   NOT NULL UNIQUE,
    name         NVARCHAR(255) NOT NULL,
    is_active    BIT           NOT NULL DEFAULT 1,
    created_at   DATETIME2     NOT NULL DEFAULT GETDATE()
  );

  PRINT 'Created table: colleges';
END
ELSE
  PRINT 'Table already exists: colleges';
