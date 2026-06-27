const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");
const router = express.Router();

// Subscribe to push notifications
router.post("/subscribe", auth, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription?.endpoint)
    return res.status(400).json({ error: "Subscription requise." });

  try {
    const { rows } = await db.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, auth_key, p256dh_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO NOTHING
       RETURNING id`,
      [
        req.user.id,
        subscription.endpoint,
        subscription.keys?.auth || "",
        subscription.keys?.p256dh || "",
      ],
    );
    res.status(201).json({ subscribed: true });
  } catch (err) {
    console.error("Erreur push/subscribe:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Unsubscribe
router.delete("/subscribe", auth, async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: "Endpoint requis." });

  try {
    await db.query(
      `DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2`,
      [req.user.id, endpoint],
    );
    res.json({ unsubscribed: true });
  } catch (err) {
    console.error("Erreur push/unsubscribe:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Get missed push notifications for the current user
router.get("/notifications", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, type, title, body, data, is_read, created_at
       FROM push_notifications
       WHERE user_id=$1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Mark notifications as read
router.patch("/notifications/read", auth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "IDs requis." });
  }
  try {
    await db.query(
      `UPDATE push_notifications SET is_read=TRUE
       WHERE id = ANY($1::int[]) AND user_id=$2`,
      [ids, req.user.id],
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error marking notifications as read:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Get unread notification count
router.get("/notifications/unread-count", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS count FROM push_notifications
       WHERE user_id=$1 AND is_read=FALSE`,
      [req.user.id],
    );
    res.json({ count: rows[0]?.count || 0 });
  } catch (err) {
    console.error("Error counting unread notifications:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
