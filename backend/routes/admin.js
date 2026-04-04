const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// Middleware admin only
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Accès réservé à l'admin." });
  next();
};

// GET /api/admin/stats
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
    console.error("ERROR PATCH ROLE:",err.message,err.stack);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/admin/users
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
      params.push(role);
      query += ` AND role=$${params.length}`;
    }
    query += " ORDER BY ref ASC";
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// PATCH /api/admin/users/:id/role
router.patch("/users/:id/role", auth, adminOnly, async (req, res) => {
  const { role } = req.body;
  const validRoles = ["student", "teacher", "admin", "bde"];
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
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// DELETE /api/admin/users/:id
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

// POST /api/admin/invitations
router.post("/invitations", auth, adminOnly, async (req, res) => {
  const { role } = req.body;
  if (!["student", "teacher"].includes(role))
    return res.status(400).json({ error: "Rôle invalide." });

  // Générer un code unique 8 chars
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

  try {
    const { rows } = await db.query(
      `INSERT INTO invitations (code, role, created_by, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [code, role, req.user.id, expires_at],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/admin/invitations
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

// DELETE /api/admin/invitations/:id
router.delete("/invitations/:id", auth, adminOnly, async (req, res) => {
  try {
    await db.query("DELETE FROM invitations WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
