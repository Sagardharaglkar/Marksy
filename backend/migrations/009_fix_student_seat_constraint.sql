-- Migration 009: Fix student seat_no uniqueness scope
-- seat_no should be unique per class, not per college.
-- registration_no remains unique per college (unchanged).

-- Drop old college-scoped seat constraint if it exists
IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_NAME = 'students' AND CONSTRAINT_NAME = 'UQ_student_seat_college'
)
BEGIN
  ALTER TABLE students DROP CONSTRAINT UQ_student_seat_college;
  PRINT 'Dropped constraint: UQ_student_seat_college';
END
ELSE
  PRINT 'Constraint not found (already removed): UQ_student_seat_college';

-- Add class-scoped seat constraint if it doesn't exist
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_NAME = 'students' AND CONSTRAINT_NAME = 'UQ_student_seat_class'
)
BEGIN
  ALTER TABLE students ADD CONSTRAINT UQ_student_seat_class UNIQUE (class_id, seat_no);
  PRINT 'Added constraint: UQ_student_seat_class';
END
ELSE
  PRINT 'Constraint already exists: UQ_student_seat_class';
