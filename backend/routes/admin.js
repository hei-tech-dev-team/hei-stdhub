const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// Restrict to admin role
const adminOnly = (req, res, next) => {
  console.log("adminOnly check — role:", req.user?.role);
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Accès réservé à l'admin." });
  next();
};

// Get platform statistics
router.get("/stats", auth, adminOnly, async (req, res) => {
  try {
    const [users, posts, submissions, messages] = await Promise.all([
      db.query("SELECT COUNT(*) FROM users"),
      db.query("SELECT COUNT(*) FROM posts"),
      db.query("SELECT COUNT(*) FROM submissions"),
      db.query("SELECT COUNT(*) FROM messages"),
    ]);
    const byRole = await db.query(
      "SELECT role, COUNT(*) FROM users GROUP BY role",
    );
    res.json({
      total_users: parseInt(users.rows[0].count),
      total_posts: parseInt(posts.rows[0].count),
      total_submissions: parseInt(submissions.rows[0].count),
      total_messages: parseInt(messages.rows[0].count),
      by_role: byRole.rows,
    });
  } catch (err) {
    console.error("ERROR PATCH ROLE:", err.message, err.stack);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// List all users with optional filters
router.get("/users", auth, adminOnly, async (req, res) => {
  try {
    const { q, role } = req.query;
    let query = `
      SELECT id, ref, nom, prenom, email, pseudo, role, level, created_at
      FROM users WHERE 1=1
    `;
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      query += ` AND (ref ILIKE $${params.length} OR pseudo ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    if (role) {
      const roles = role.split(",").map((r) => r.trim()).filter(Boolean);
      if (roles.length > 0) {
        const placeholders = roles.map((r) => {
          params.push(r);
          return `$${params.length}`;
        });
        query += ` AND role IN (${placeholders.join(",")})`;
      }
    }
    query += " ORDER BY ref ASC";
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Change a user's role
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
      return res.status(404).json({ error: "Utilisateur introuvable." });
    res.json(rows[0]);
  } catch (err) {
    console.error("ERREUR PATCH ROLE:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete a user (cannot delete yourself)
router.delete("/users/:id", auth, adminOnly, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res
      .status(400)
      .json({ error: "Impossible de supprimer votre propre compte." });
  try {
    await db.query("DELETE FROM users WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

const generateInviteCode = (role) => {
  const prefixes = { student: "HEI-STD", teacher: "HEI-PROF", alumni: "HEI-ALUM" };
  const random = Array.from({ length: 6 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)],
  ).join("");
  return `${prefixes[role]}-${random}`;
};

// Generate an invitation code
router.post("/invitations", auth, adminOnly, async (req, res) => {
  const { role, max_uses } = req.body;
  if (!["student", "teacher", "alumni"].includes(role))
    return res.status(400).json({ error: "Rôle invalide." });

  const code = generateInviteCode(role);
  const expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
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

// Bulk generate invitation codes
router.post("/invitations/bulk", auth, adminOnly, async (req, res) => {
  const { role, count, max_uses } = req.body;
  if (!["student", "teacher", "alumni"].includes(role))
    return res.status(400).json({ error: "Rôle invalide." });
  const qty = Math.min(Math.max(parseInt(count) || 1, 1), 1000);
  const uses = Math.max(parseInt(max_uses) || 1, 1);

  const expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const codes = [];

  try {
    for (let i = 0; i < qty; i++) {
      const code = generateInviteCode(role);
      const { rows } = await db.query(
        `INSERT INTO invitations (code, role, max_uses, created_by, expires_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [code, role, uses, req.user.id, expires_at],
      );
      codes.push(rows[0]);
    }
    res.status(201).json({ count: codes.length, codes });
  } catch (err) {
    console.error("ERREUR bulk invitations:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// List all invitation codes
router.get("/invitations", auth, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM invitations ORDER BY created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Delete an invitation code
router.delete("/invitations/:id", auth, adminOnly, async (req, res) => {
  try {
    await db.query("DELETE FROM invitations WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
