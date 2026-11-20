CREATE TABLE IF NOT EXISTS sessions (
  id                          UUID         PRIMARY KEY,
  user_id                     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash          CHAR(64)     NOT NULL UNIQUE,
  previous_refresh_token_hash CHAR(64)     NULL,
  previous_valid_until        TIMESTAMPTZ  NULL,
  csrf_token_hash             CHAR(64)     NOT NULL,
  token_version               INTEGER      NOT NULL,
  user_agent                  VARCHAR(512) NULL,
  ip                          VARCHAR(64)  NULL,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_used_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at                  TIMESTAMPTZ  NOT NULL,
  revoked_at                  TIMESTAMPTZ  NULL,
  revoked_reason              VARCHAR(32)  NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(revoked_at);
CREATE INDEX IF NOT EXISTS idx_sessions_previous_hash ON sessions(previous_refresh_token_hash);
