CREATE TABLE token_blacklist (
  jti        VARCHAR(36)  NOT NULL PRIMARY KEY,
  expires_at DATETIME2    NOT NULL,
  created_at DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Index to speed up cleanup of expired entries
CREATE INDEX IX_token_blacklist_expires ON token_blacklist (expires_at);
