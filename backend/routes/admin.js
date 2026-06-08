const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

const adminOnly = (req, res, next) => {
      if (req.user.role !== "admin")
            return res.status(403).json({ error: "Accès réservé à l'admin." });
      next();
};

router.get("/stats", auth, adminOnly, async (req, res) => {
      try {
            const [counts, byRole] = await Promise.all([
                  db.query(`
                    SELECT
                      (SELECT COUNT(*) FROM users) AS total_users,
                      (SELECT COUNT(*) FROM posts) AS total_posts,
                      (SELECT COUNT(*) FROM submissions) AS total_submissions,
                      (SELECT COUNT(*) FROM messages) AS total_messages
                  `),
                  db.query("SELECT role, COUNT(*) FROM users GROUP BY role"),
            ]);
            res.json({
                  total_users: parseInt(counts.rows[0].total_users),
                  total_posts: parseInt(counts.rows[0].total_posts),
                  total_submissions: parseInt(counts.rows[0].total_submissions),
                  total_messages: parseInt(counts.rows[0].total_messages),
                  by_role: byRole.rows,
            });
      } catch (err) {
            console.error("ERROR PATCH ROLE:", err.message, err.stack);
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.get("/next-pseudo", auth, adminOnly, async (req, res) => {
      try {
            const { rows } = await db.query(
              `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(pseudo, '^new_user0*', '') AS INTEGER)), 0) AS last_num FROM users WHERE pseudo ~ '^new_user[0-9]+$'`
            );
            res.json({ next: parseInt(rows[0]?.last_num || 0) + 1 });
      } catch (err) {
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.get("/users", auth, adminOnly, async (req, res) => {
      try {
            const { q, role, limit = 50, offset = 0 } = req.query;
            const pageLimit = Math.min(parseInt(limit) || 50, 200);
            const pageOffset = Math.max(parseInt(offset) || 0, 0);

            let countQuery = "SELECT COUNT(*) FROM users WHERE 1=1";
            let query = `
      SELECT id, ref, nom, prenom, email, pseudo, role, level, groupe, created_at
      FROM users WHERE 1=1
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

router.patch("/users/:id/role", auth, adminOnly, async (req, res) => {
      console.log(
            "PATCH ROLE appelé — user:",
            req.user,
            "body:",
            req.body,
            "id:",
            req.params.id,
      );
      const { role } = req.body;
      const validRoles = ["student", "teacher", "admin", "bde", "alumni"];
      if (!validRoles.includes(role))
            return res.status(400).json({ error: "Rôle invalide." });
      try {
            const { rows } = await db.query(
                  "UPDATE users SET role=$1 WHERE id=$2 RETURNING id, ref, pseudo, role",
                  [role, req.params.id],
            );
            if (!rows.length)
                  return res
                        .status(404)
                        .json({ error: "Utilisateur introuvable." });
            res.json(rows[0]);
      } catch (err) {
            console.error("ERREUR PATCH ROLE:", err.message);
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.patch("/users/:id/email", auth, adminOnly, async (req, res) => {
      const { email } = req.body;
      if (!email || !email.includes("@"))
            return res.status(400).json({ error: "Email invalide." });
      try {
            const { rows } = await db.query(
                  "UPDATE users SET email=$1 WHERE id=$2 RETURNING id, ref, email",
                  [email.trim().toLowerCase(), req.params.id],
            );
            if (!rows.length)
                  return res.status(404).json({ error: "Utilisateur introuvable." });
            res.json(rows[0]);
      } catch (err) {
            console.error("ERREUR PATCH EMAIL:", err.message);
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.delete("/users/:id", auth, adminOnly, async (req, res) => {
      if (parseInt(req.params.id) === req.user.id)
            return res
                  .status(400)
                  .json({
                        error: "Impossible de supprimer votre propre compte.",
                  });
      try {
            await db.query("DELETE FROM users WHERE id=$1", [req.params.id]);
            res.json({ success: true });
      } catch (err) {
            res.status(500).json({ error: "Erreur serveur." });
      }
});

// Passage en alumni : L3->alumni uniquement
router.post("/alumni-upgrade", auth, adminOnly, async (req, res) => {
  const { failed_refs } = req.body;
  try {
    const result = await db.query(
      "UPDATE users SET level = 'alumni', role = 'alumni' WHERE level = 'L3' AND ref != ALL($1::text[]) RETURNING id, ref, level, role",
      [failed_refs || []]
    );
    res.json({ upgraded: result.rows.length, users: result.rows });
  } catch (err) {
    console.error("ERREUR alumni-upgrade:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Passage de classe : L1->L2, L2->L3, L3->alumni
router.post("/class-upgrade", auth, adminOnly, async (req, res) => {
  const { failed_refs } = req.body;
  try {
    const result = await db.query("UPDATE users SET level = CASE WHEN level = 'L1' THEN 'L2' WHEN level = 'L2' THEN 'L3' WHEN level = 'L3' THEN 'alumni' ELSE level END, role = CASE WHEN level = 'L3' THEN 'alumni' ELSE role END WHERE level IN ('L1', 'L2', 'L3') AND ref != ALL($1::text[]) RETURNING id, ref, level, role", [failed_refs || []]);
    res.json({ upgraded: result.rows.length, users: result.rows });
  } catch (err) {
    console.error("ERREUR class-upgrade:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

const generateInviteCode = (role) => {
      const prefixes = {
            student: "HEI-STD",
            teacher: "HEI-PROF",
            alumni: "HEI-ALUM",
      };
      const random = Array.from(
            { length: 6 },
            () =>
                  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[
                        Math.floor(Math.random() * 36)
                  ],
      ).join("");
      return `${prefixes[role]}-${random}`;
};

router.post("/invitations", auth, adminOnly, async (req, res) => {
      const { role, max_uses } = req.body;
      if (!["student", "teacher", "alumni"].includes(role))
            return res.status(400).json({ error: "Rôle invalide." });

      const code = generateInviteCode(role);
      const expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const uses = Math.max(parseInt(max_uses) || 1, 1);

      try {
            const { rows } = await db.query(
                  `INSERT INTO invitations (code, role, max_uses, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                  [code, role, uses, req.user.id, expires_at],
            );
            res.status(201).json(rows[0]);
      } catch (err) {
            res.status(500).json({ error: "Erreur serveur." });
      }
});

router.post("/invitations/bulk", auth, adminOnly, async (req, res) => {
  const { role, count, max_uses } = req.body;
  if (!["student", "teacher", "alumni"].includes(role))
    return res.status(400).json({ error: "Rôle invalide." });
  const qty = Math.min(Math.max(parseInt(count) || 1, 1), 1000);
  const uses = Math.max(parseInt(max_uses) || 1, 1);

  const expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

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
    res.status(201).json({ count: codes.length, codes });
  } catch (err) {
    console.error("ERREUR bulk invitations:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.get("/invitations", auth, adminOnly, async (req, res) => {
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

router.delete("/invitations/:id", auth, adminOnly, async (req, res) => {
      try {
            await db.query("DELETE FROM invitations WHERE id=$1", [
                  req.params.id,
            ]);
            res.json({ success: true });
      } catch (err) {
            res.status(500).json({ error: "Erreur serveur." });
      }
});

module.exports = router;
