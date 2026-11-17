const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

const router = express.Router();

// Get support links for a specific UE
router.get("/:ue", auth, requirePermission("support:read", "support"), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.pseudo AS author_pseudo
       FROM supports s LEFT JOIN users u ON s.author_id = u.id
       WHERE s.ue=$1 ORDER BY s.created_at ASC`,
      [req.params.ue],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Teachers and admins can add support links
router.post("/", auth, requirePermission("support:create", "support"), async (req, res) => {
  const { ue, label, url } = req.body;
  if (!ue || !label || !url)
    return res.status(400).json({ error: "UE, label et URL requis." });

  try {
    const { rows } = await db.query(
      `INSERT INTO supports (ue,label,url,author_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [ue, label, url, req.user.id],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Teachers and admins can delete support links
router.delete("/:id", auth, requirePermission("support:delete", "support"), async (req, res) => {
  try {
    await db.query("DELETE FROM supports WHERE id=$1", [req.params.id]);
    res.json({ message: "Support supprimé." });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
