const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// Send a ping to another user
router.post("/", auth, async (req, res) => {
  const { receiver_id } = req.body;
  if (!receiver_id)
    return res.status(400).json({ error: "Destinataire requis." });
  if (receiver_id === req.user.id)
    return res.status(400).json({ error: "Vous ne pouvez pas vous envoyer un ping à vous-même." });

  try {
    const { rows: existing } = await db.query(
      "SELECT id, status FROM pings WHERE sender_id=$1 AND receiver_id=$2",
      [req.user.id, receiver_id],
    );
    if (existing.length) {
      if (existing[0].status === "pending")
        return res.status(400).json({ error: "Ping déjà envoyé en attente." });
      if (existing[0].status === "accepted")
        return res.status(400).json({ error: "Ping déjà accepté." });
      await db.query("DELETE FROM pings WHERE id=$1", [existing[0].id]);
    }

    const { rows } = await db.query(
      `INSERT INTO pings (sender_id, receiver_id) VALUES ($1, $2)
       RETURNING id, sender_id, receiver_id, status, created_at`,
      [req.user.id, receiver_id],
    );

    const io = req.app.get("io");
    if (io) {
      const { rows: sender } = await db.query(
        "SELECT id, pseudo, avatar, role FROM users WHERE id=$1",
        [req.user.id],
      );
      io.to(`user:${receiver_id}`).emit("ping:new", {
        id: rows[0].id,
        sender: sender[0],
        created_at: rows[0].created_at,
      });
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Get all pings for current user
router.get("/", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.sender_id, p.receiver_id, p.status, p.created_at, p.responded_at,
              s.pseudo AS sender_pseudo, s.avatar AS sender_avatar, s.role AS sender_role, s.ref AS sender_ref,
              r.pseudo AS receiver_pseudo, r.avatar AS receiver_avatar, r.role AS receiver_role, r.ref AS receiver_ref
       FROM pings p
       JOIN users s ON s.id = p.sender_id
       JOIN users r ON r.id = p.receiver_id
       WHERE p.sender_id=$1 OR p.receiver_id=$1
       ORDER BY p.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Accept a ping
router.patch("/:id/accept", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM pings WHERE id=$1 AND receiver_id=$2 AND status='pending'",
      [req.params.id, req.user.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Ping introuvable ou déjà traité." });

    await db.query(
      "UPDATE pings SET status='accepted', responded_at=NOW() WHERE id=$1",
      [req.params.id],
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${rows[0].sender_id}`).emit("ping:accepted", {
        id: rows[0].id,
        receiver_id: req.user.id,
      });
    }

    res.json({ success: true, status: "accepted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Refuse a ping
router.patch("/:id/refuse", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM pings WHERE id=$1 AND receiver_id=$2 AND status='pending'",
      [req.params.id, req.user.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Ping introuvable ou déjà traité." });

    await db.query(
      "UPDATE pings SET status='refused', responded_at=NOW() WHERE id=$1",
      [req.params.id],
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${rows[0].sender_id}`).emit("ping:refused", {
        id: rows[0].id,
        receiver_id: req.user.id,
      });
    }

    res.json({ success: true, status: "refused" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;