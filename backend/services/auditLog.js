const db = require("../db");

/**
 * Persists a privileged action (role/email change, deletion, invitations...)
 * so that admin and developer activity can be reviewed after the fact.
 * Never throws: a logging failure must not break the action itself.
 */
async function logAdminAction(req, action, targetId = null, details = {}) {
  try {
    await db.query(
      `INSERT INTO admin_audit_log (actor_id, actor_role, action, target_id, details, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user?.id ?? null,
        req.user?.role ?? null,
        action,
        targetId,
        JSON.stringify(details),
        req.ip ?? null,
      ],
    );
  } catch (err) {
    console.error(`[audit] failed to record ${action}:`, err.message);
  }
}

module.exports = { logAdminAction };
