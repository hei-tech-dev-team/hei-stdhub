const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// Admin only
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin")
    return res.status(403).json({ error: "Accès refusé." });
  next();
};

// GET all custom UEs
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM custom_ues ORDER BY ue ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error("ERREUR GET /custom-ues:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST create a custom UE
router.post("/", auth, adminOnly, async (req, res) => {
  const { ue, level } = req.body;
  if (!ue || !level)
    return res.status(400).json({ error: "UE et niveau requis." });
  if (!["L1", "L2", "L3"].includes(level))
    return res.status(400).json({ error: "Niveau invalide." });

  try {
    const { rows } = await db.query(
      `INSERT INTO custom_ues (ue, level, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (ue) DO NOTHING
       RETURNING *`,
      [ue.toUpperCase(), level, req.user.id]
    );
    if (rows.length === 0)
      return res.status(409).json({ error: "Cette UE existe déjà." });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("ERREUR POST /custom-ues:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// DELETE a custom UE
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    await db.query("DELETE FROM custom_ues WHERE id=$1", [req.params.id]);
    res.json({ message: "UE supprimée." });
  } catch (err) {
    console.error("ERREUR DELETE /custom-ues:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
