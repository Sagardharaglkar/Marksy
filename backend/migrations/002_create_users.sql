-- Migration 002: Create users table
-- Covers super_admin (college_id NULL), clerk, and faculty
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'users'
)
BEGIN
  CREATE TABLE users (
    user_id       INT IDENTITY(1,1) PRIMARY KEY,
    college_id    INT           NULL REFERENCES colleges(college_id) ON DELETE CASCADE,
    role          NVARCHAR(20)  NOT NULL CHECK (role IN ('super_admin', 'clerk', 'faculty')),
    name          NVARCHAR(255) NOT NULL,
    phone         NVARCHAR(20)  NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    is_blocked    BIT           NOT NULL DEFAULT 0,
    created_at    DATETIME2     NOT NULL DEFAULT GETDATE()
  );

  -- Faculty/clerk uniqueness: one phone per college
  CREATE UNIQUE INDEX UQ_users_college_phone
    ON users (college_id, phone)
    WHERE college_id IS NOT NULL;

  -- Super-admin: phone must be globally unique among super_admins
  CREATE UNIQUE INDEX UQ_superadmin_phone
    ON users (phone)
    WHERE role = 'super_admin';

  PRINT 'Created table: users';
END
ELSE
  PRINT 'Table already exists: users';
