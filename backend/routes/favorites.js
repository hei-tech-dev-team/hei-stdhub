const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.ref, u.pseudo, u.role, u.level, u.avatar
       FROM favorites f
       JOIN users u ON u.id = f.contact_id
       WHERE f.user_id = $1
       ORDER BY u.pseudo`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching favorites:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/", auth, async (req, res) => {
  const { contact_id } = req.body;
  if (!contact_id)
    return res.status(400).json({ error: "contact_id requis." });

  try {
    const { rows } = await db.query(
      `INSERT INTO favorites (user_id, contact_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, contact_id) DO NOTHING
       RETURNING contact_id`,
      [req.user.id, contact_id],
    );
    res.json({ success: true, contact_id });
  } catch (err) {
    console.error("Error adding favorite:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.delete("/:contactId", auth, async (req, res) => {
  try {
    await db.query(
      "DELETE FROM favorites WHERE user_id = $1 AND contact_id = $2",
      [req.user.id, req.params.contactId],
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error removing favorite:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
