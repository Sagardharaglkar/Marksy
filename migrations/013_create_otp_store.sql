CREATE TABLE otp_store (
  id          INT IDENTITY(1,1) PRIMARY KEY,
  user_id     INT          NOT NULL,
  purpose     VARCHAR(20)  NOT NULL,  -- 'profile' | 'forgot'
  code        VARCHAR(6)   NOT NULL,
  expires_at  DATETIME2    NOT NULL,
  used        BIT          NOT NULL DEFAULT 0,
  created_at  DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX idx_otp_user_purpose ON otp_store (user_id, purpose);
CREATE INDEX idx_otp_expires      ON otp_store (expires_at);
