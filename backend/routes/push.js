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

module.exports = router;
