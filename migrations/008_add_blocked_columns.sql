-- Migration 008: Add is_blocked to users, is_active to colleges
-- is_blocked on users: super-admin can block a clerk (prevents login)
-- is_active on colleges: super-admin can disable all logins for a college

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'is_blocked'
)
BEGIN
  ALTER TABLE users ADD is_blocked BIT NOT NULL DEFAULT 0;
  PRINT 'Added column: users.is_blocked';
END
ELSE
  PRINT 'Column already exists: users.is_blocked';

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'colleges' AND COLUMN_NAME = 'is_active'
)
BEGIN
  ALTER TABLE colleges ADD is_active BIT NOT NULL DEFAULT 1;
  PRINT 'Added column: colleges.is_active';
END
ELSE
  PRINT 'Column already exists: colleges.is_active';
