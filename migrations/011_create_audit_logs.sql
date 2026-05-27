CREATE TABLE audit_logs (
  id            BIGINT IDENTITY(1,1) PRIMARY KEY,
  college_id    INT           NULL,   -- NULL for super_admin actions
  actor_id      INT           NOT NULL,
  actor_name    NVARCHAR(150) NOT NULL,
  actor_role    NVARCHAR(30)  NOT NULL,
  action        NVARCHAR(80)  NOT NULL,  -- e.g. FACULTY_CREATED, MARKS_SAVED
  entity_type   NVARCHAR(50)  NULL,      -- e.g. faculty, assignment, marks
  entity_id     NVARCHAR(50)  NULL,      -- the PK of the affected row
  entity_name   NVARCHAR(200) NULL,      -- human-readable label
  meta          NVARCHAR(MAX) NULL,      -- JSON: old/new values or extra context
  ip_address    NVARCHAR(60)  NULL,
  user_agent    NVARCHAR(500) NULL,
  created_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

CREATE INDEX ix_audit_college_created ON audit_logs (college_id, created_at DESC);
CREATE INDEX ix_audit_actor           ON audit_logs (actor_id, created_at DESC);
CREATE INDEX ix_audit_action          ON audit_logs (action, created_at DESC);
