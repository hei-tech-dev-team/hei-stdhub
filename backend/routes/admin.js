const crypto = require("crypto");
const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");
const { logAdminAction } = require("../services/auditLog");
const {
      revokeUserSessions,
      disconnectUser,
} = require("../services/sessionService");

const router = express.Router();

const PRIVILEGED_ROLES = ["admin", "developer"];

/**
 * Loads the target user and enforces the privileged-account rule:
 * only a developer may act on another admin or developer account.
 * Sends the error response itself and returns null when the action is refused.
 */
const loadManageableTarget = async (req, res) => {
      const targetId = parseInt(req.params.id, 10);
      if (!Number.isInteger(targetId)) {
            res.status(400).json({ error: "Identifiant invalide." });
            return null;
      }
      const { rows } = await db.query(
            "SELECT id, ref, role, email FROM users WHERE id=$1",
            [targetId],
      );
      if (!rows.length) {
            res.status(404).json({ error: "Utilisateur introuvable." });
            return null;
      }
      const target = rows[0];
      // Developer-only rule is enforced here; admin/developer self-mgmt
      // and cross-role edits are handled by the route handler.
      if (
            req.user.role !== "developer" &&
            target.id !== req.user.id &&
            PRIVILEGED_ROLES.includes(target.role)
      ) {
            res.status(403).json({
                  error: "Seul un developpeur peut modifier un compte admin ou developpeur.",
            });
            return null;
      }
      return target;
      };

      router.get("/stats", auth, requirePermission("user:list", "user"), async (req, res) => {
      try {
            const [counts, byRole] = await Promise.all([
                  db.query(`
                    SELECT
                      (SELECT COUNT(*) FROM users) AS total_users,
                      (SELECT COUNT(*) FROM messages) AS total_messages
                  `),
                  db.query("SELECT role, COUNT(*) FROM users GROUP BY role"),
            ]);
            res.json({
                  total_users: parseInt(counts.rows[0].total_users),
                  total_messages: parseInt(counts.rows[0].total_messages),
                  by_role: byRole.rows,
            });
      } catch (err) {
            console.error("ERROR GET STATS:", err.message, err.stack);
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.get("/next-pseudo", auth, requirePermission("user:list", "user"), async (req, res) => {
      try {
            const { rows } = await db.query(
              `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(pseudo, '^new_user0*', '') AS INTEGER)), 0) AS last_num FROM users WHERE pseudo ~ '^new_user[0-9]+$'`
            );
            res.json({ next: parseInt(rows[0]?.last_num || 0) + 1 });
      } catch (err) {
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.get("/users", auth, requirePermission("user:list", "user"), async (req, res) => {
      try {
            const { q, role, limit = 50, offset = 0 } = req.query;
            const pageLimit = Math.min(parseInt(limit) || 50, 200);
            const pageOffset = Math.max(parseInt(offset) || 0, 0);

            let countQuery = "SELECT COUNT(*) FROM users WHERE 1=1";
            let query = `
                  SELECT id, ref, nom, prenom, email, pseudo, role, COALESCE(ues, '{}') AS ues, created_at 
                  FROM users
                  WHERE 1=1
            `;
            const params = [];
            if (q) {
                  params.push(`%${q}%`);
                  const filter = ` AND (ref ILIKE $${params.length} OR pseudo ILIKE $${params.length} OR email ILIKE $${params.length})`;
                  countQuery += filter;
                  query += filter;
            }
            if (role) {
                  const roles = role
                        .split(",")
                        .map((r) => r.trim())
                        .filter(Boolean);
                  if (roles.length > 0) {
                        const placeholders = roles.map((r) => {
                              params.push(r);
                              return `$${params.length}`;
                        });
                        const filter = ` AND role IN (${placeholders.join(",")})`;
                        countQuery += filter;
                        query += filter;
                  }
            }
            query += " ORDER BY ref ASC";
            params.push(pageLimit);
            query += ` LIMIT $${params.length}`;
            params.push(pageOffset);
            query += ` OFFSET $${params.length}`;

            const [dataResult, countResult] = await Promise.all([
                  db.query(query, params),
                  db.query(countQuery, params.slice(0, params.length - 2)),
            ]);
            res.json({
                  users: dataResult.rows,
                  total: parseInt(countResult.rows[0]?.count || 0),
                  limit: pageLimit,
                  offset: pageOffset,
            });
      } catch (err) {
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.patch("/users/:id/role", auth, requirePermission("user:manage", "user"), async (req, res) => {
      const { role } = req.body;
      const validRoles = ["student", "teacher", "admin", "bde", "developer"];
      if (!validRoles.includes(role))
            return res.status(400).json({ error: "Rôle invalide." });
      if (req.user.role === "developer" && parseInt(req.params.id) === req.user.id)
            return res.status(403).json({ error: "Un developpeur ne peut pas modifier son propre rôle." });

      try {
            const target = await loadManageableTarget(req, res);
            if (!target) return;
            const client = await db.pool.connect();
            let updated;
            try {
                  await client.query("BEGIN");
                  if (role === "developer" && req.user.role !== "developer")
                    return res.status(403).json({
                          error: "Seul un developpeur peut attribuer ou modifier le role developpeur.",
                    });
                  const { rows } = await client.query(
                        `UPDATE users SET role=$1, token_version = token_version + 1
                         WHERE id=$2
                         RETURNING id, ref, pseudo, role, token_version`,
                        [role, target.id],
                  );
                  updated = rows[0];
                  await revokeUserSessions(target.id, "role_change", {
                        client,
                        bumpVersion: false,
                  });
                  await client.query("COMMIT");
            } catch (err) {
                  await client.query("ROLLBACK").catch(() => {});
                  throw err;
            } finally {
                  client.release();
            }
            disconnectUser(req.app.get("io"), target.id, "role_change");
            await logAdminAction(req, "user.role.update", target.id, {
                  from: target.role,
                  to: role,
            });
            res.json(updated);
      } catch (err) {
            console.error("ERREUR PATCH ROLE:", err.message);
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.patch("/users/:id/email", auth, requirePermission("user:manage", "user"), async (req, res) => {
      const { email } = req.body;
      if (!email || !email.includes("@"))
            return res.status(400).json({ error: "Email invalide." });
      try {
            const target = await loadManageableTarget(req, res);
            if (!target) return;
            const client = await db.pool.connect();
            let updated;
            try {
                  await client.query("BEGIN");
                  const { rows } = await client.query(
                        `UPDATE users SET email=$1 WHERE id=$2
                         RETURNING id, ref, email`,
                        [email.trim().toLowerCase(), target.id],
                  );
                  updated = rows[0];
                  await revokeUserSessions(target.id, "email_change", {
                        client,
                        bumpVersion: false,
                  });
                  await client.query("COMMIT");
            } catch (err) {
                  await client.query("ROLLBACK").catch(() => {});
                  throw err;
            } finally {
                  client.release();
            }
            disconnectUser(req.app.get("io"), target.id, "email_change");
            await logAdminAction(req, "user.email.update", target.id, {
                  from: target.email,
                  to: updated.email,
            });
            res.json(updated);
      } catch (err) {
            console.error("ERREUR PATCH EMAIL:", err.message);
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.delete("/users/:id", auth, requirePermission("user:delete", "user"), async (req, res) => {
      if (parseInt(req.params.id) === req.user.id)
            return res
                  .status(400)
                  .json({
                        error: "Impossible de supprimer votre propre compte.",
                  });
      try {
            const target = await loadManageableTarget(req, res);
            if (!target) return;
            await db.query("DELETE FROM users WHERE id=$1", [target.id]);
            disconnectUser(req.app.get("io"), target.id, "account_deleted");
            await logAdminAction(req, "user.delete", target.id, {
                  ref: target.ref,
                  role: target.role,
            });
            res.json({ success: true });
      } catch (err) {
            console.error("ERREUR DELETE USER:", err.message);
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.patch("/users/:id/role-upgrade", auth, requirePermission("user:roleUpgrade", "user"), async (req, res) => {
      try {
            const { rows } = await db.query(
                  "SELECT id, role FROM users WHERE id = $1",
                  [req.params.id],
            );
            if (!rows.length)
                  return res.status(404).json({ error: "Utilisateur introuvable." });
            if (rows[0].role !== "student")
                  return res.status(400).json({ error: "Seuls les etudiants peuvent etre upgardes en BDE." });
            const client = await db.pool.connect();
            let updated;
            try {
                  await client.query("BEGIN");
                  const { rows: upgraded } = await client.query(
                        `UPDATE users SET role = 'bde', token_version = token_version + 1
                         WHERE id = $1
                         RETURNING id, ref, role, token_version`,
                        [req.params.id],
                  );
                  updated = upgraded[0];
                  await revokeUserSessions(rows[0].id, "role_change", {
                        client,
                        bumpVersion: false,
                  });
                  await client.query("COMMIT");
            } catch (err) {
                  await client.query("ROLLBACK").catch(() => {});
                  throw err;
            } finally {
                  client.release();
            }
            disconnectUser(req.app.get("io"), rows[0].id, "role_change");
            await logAdminAction(req, "user.role.upgrade", rows[0].id, {
                  from: "student",
                  to: "bde",
            });
            res.json(updated);
      } catch (err) {
            console.error("ERREUR ROLE-UPGRADE:", err.message);
            res.status(500).json({ error: "Erreur serveur." });
      }
});

const INVITE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const INVITE_RANDOM_LENGTH = 10; // "HEI-PROF-" + 10 = 19 chars, fits VARCHAR(20)

const generateInviteCode = (role) => {
      const prefixes = {
            student: "HEI-STD",
            teacher: "HEI-PROF",
      };
      const random = Array.from(
            { length: INVITE_RANDOM_LENGTH },
            () => INVITE_ALPHABET[crypto.randomInt(INVITE_ALPHABET.length)],
      ).join("");
      return `${prefixes[role]}-${random}`;
};

router.post("/invitations", auth, requirePermission("user:inviteCreate", "user"), async (req, res) => {
      const { role, max_uses } = req.body;
      if (!["student", "teacher"].includes(role))
            return res.status(400).json({ error: "Rôle invalide." });

      const code = generateInviteCode(role);
      const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const uses = Math.max(parseInt(max_uses) || 1, 1);

      try {
            const { rows } = await db.query(
                  `INSERT INTO invitations (code, role, max_uses, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                  [code, role, uses, req.user.id, expires_at],
            );
            await logAdminAction(req, "invitation.create", null, {
                  invitation_id: rows[0].id,
                  role,
                  max_uses: uses,
            });
            res.status(201).json(rows[0]);
      } catch (err) {
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.post("/invitations/bulk", auth, requirePermission("user:inviteBulkCreate", "user"), async (req, res) => {
  const { role, count, max_uses } = req.body;
  if (!["student", "teacher"].includes(role))
    return res.status(400).json({ error: "Rôle invalide." });
  const qty = Math.min(Math.max(parseInt(count) || 1, 1), 1000);
  const uses = Math.max(parseInt(max_uses) || 1, 1);

  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    const codes = [];
    const batchSize = 100;
    for (let i = 0; i < qty; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, qty - i);
      const valueStrings = [];
      const valueParams = [];
      let paramIdx = 1;
      for (let j = 0; j < currentBatchSize; j++) {
        const code = generateInviteCode(role);
        codes.push({
          code,
          role,
          max_uses: uses,
          created_by: req.user.id,
          expires_at,
        });
        valueStrings.push(
          `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4})`,
        );
        valueParams.push(
          code,
          role,
          uses,
          req.user.id,
          expires_at,
        );
        paramIdx += 5;
      }
      await db.query(
        `INSERT INTO invitations (code, role, max_uses, created_by, expires_at) VALUES ${valueStrings.join(", ")}`,
        valueParams,
      );
    }
    await logAdminAction(req, "invitation.bulk_create", null, {
      role,
      count: codes.length,
      max_uses: uses,
    });
    res.status(201).json({ count: codes.length, codes });
  } catch (err) {
    console.error("ERREUR bulk invitations:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.get("/invitations", auth, requirePermission("user:list", "user"), async (req, res) => {
      try {
            const { limit = 50, offset = 0 } = req.query;
            const pageLimit = Math.min(parseInt(limit) || 50, 200);
            const pageOffset = Math.max(parseInt(offset) || 0, 0);

            const [dataResult, countResult] = await Promise.all([
                  db.query(
                        `SELECT * FROM invitations ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
                        [pageLimit, pageOffset],
                  ),
                  db.query("SELECT COUNT(*) FROM invitations"),
            ]);
            res.json({
                  invitations: dataResult.rows,
                  total: parseInt(countResult.rows[0]?.count || 0),
                  limit: pageLimit,
                  offset: pageOffset,
            });
      } catch (err) {
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.delete("/invitations/:id", auth, requirePermission("user:delete", "user"), async (req, res) => {
      try {
            await db.query("DELETE FROM invitations WHERE id=$1", [
                  req.params.id,
            ]);
            await logAdminAction(req, "invitation.delete", null, {
                  invitation_id: req.params.id,
            });
            res.json({ success: true });
      } catch (err) {
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.patch("/users/:id/ues", auth, requirePermission("user:ueAssign", "user"), async (req, res) => {
      const { ues } = req.body;

      if (!Array.isArray(ues)) {
            return res.status(400).json({ error: "Le champ UEs doit être un tableau." });
      }

      try {
            const { rows } = await db.query(
                  "UPDATE users SET ues = $1, updated_at = NOW() WHERE id = $2 RETURNING id, ues",
                  [ues, req.params.id]
            );

            if (rows.length === 0) {
                  return res.status(404).json({ error: "Utilisateur non trouvé." });
            }

            res.json(rows[0]);
      } catch (err) {
            console.error("ERREUR PATCH /admin/users/:id/ues:", err);
            res.status(500).json({ error: "Erreur serveur lors de la mise à jour des UEs." });
      }
});

module.exports = router;
