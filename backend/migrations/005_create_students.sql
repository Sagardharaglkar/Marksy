-- Migration 005: Create students table
-- student_id is the immutable system PK; seat_no and registration_no are
-- unique but editable business keys. All foreign keys point at student_id.
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'students'
)
BEGIN
  CREATE TABLE students (
    student_id      INT IDENTITY(1,1) PRIMARY KEY,
    college_id      INT           NOT NULL REFERENCES colleges(college_id) ON DELETE CASCADE,
    class_id        INT           NOT NULL REFERENCES classes(class_id),
    seat_no         NVARCHAR(50)  NOT NULL,
    registration_no NVARCHAR(50)  NOT NULL,
    name            NVARCHAR(255) NOT NULL,
    created_at      DATETIME2     NOT NULL DEFAULT GETDATE(),

    -- seat_no unique within a class; registration_no unique within a college
    CONSTRAINT UQ_student_seat_class   UNIQUE (class_id, seat_no),
    CONSTRAINT UQ_student_reg_college  UNIQUE (college_id, registration_no)
  );

  CREATE INDEX IX_students_class ON students (class_id);

  PRINT 'Created table: students';
END
ELSE
  PRINT 'Table already exists: students';
