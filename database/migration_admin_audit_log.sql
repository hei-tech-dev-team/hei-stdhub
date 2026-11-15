-- Audit trail for privileged admin/developer actions (role, email, deletion, invitations).
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id         SERIAL       PRIMARY KEY,
  actor_id   INTEGER      NULL REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(20)  NULL,
  action     VARCHAR(64)  NOT NULL,
  target_id  INTEGER      NULL,
  details    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  ip         VARCHAR(64)  NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log (target_id);
