const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("../db");
const auth = require("../middleware/auth");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const CloudinaryStorage = require("multer-storage-cloudinary");
const webpush = require("web-push");
const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "chat");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const useCloudinary =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

let chatUpload;
if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  chatUpload = multer({
    storage: new CloudinaryStorage({
      cloudinary,
      params: { folder: "hei-stdhub/chat", resource_type: "auto" },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
  }).single("file");
} else {
  chatUpload = multer({
    storage: multer.diskStorage({
      destination: UPLOAD_DIR,
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || "";
        const name = crypto.randomBytes(16).toString("hex") + ext;
        cb(null, name);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
  }).single("file");
}

// Search users by ref or pseudo
router.get("/search", auth, async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) return res.json([]);
  try {
    const { rows } = await db.query(
      `SELECT id, ref, pseudo, role, level, avatar
       FROM users
       WHERE id != $1
         AND (pseudo ILIKE $2 OR ref ILIKE $2)
       ORDER BY pseudo
       LIMIT 10`,
      [req.user.id, `%${q}%`],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// List all users except the caller, for contact selection
router.get("/contacts", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, ref, pseudo, role, level, avatar
       FROM users
       WHERE id != $1
       ORDER BY
         CASE role WHEN 'teacher' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
         pseudo`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Get global chat messages (last 200)
router.get("/global", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, u.pseudo AS sender_pseudo, u.ref AS sender_ref,
              u.role AS sender_role, u.avatar AS sender_avatar
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.is_global = TRUE
       ORDER BY m.created_at ASC
       LIMIT 200`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Get private messages between the caller and another user
router.get("/private/:userId", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, u.pseudo AS sender_pseudo, u.avatar AS sender_avatar
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.is_global = FALSE
         AND (
           (m.sender_id = $1 AND m.receiver_id = $2)
           OR
           (m.sender_id = $2 AND m.receiver_id = $1)
         )
       ORDER BY m.created_at ASC`,
      [req.user.id, req.params.userId],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Send a message (global or private)
router.post("/", auth, async (req, res) => {
  const { content, receiver_id, is_global } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Message vide." });
  if (!is_global && !receiver_id)
    return res.status(400).json({ error: "Destinataire requis." });

  try {
    const { rows } = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content, is_global)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, is_global ? null : receiver_id, content, !!is_global],
    );

    const msg = rows[0];

    const { rows: userRows } = await db.query(
      "SELECT pseudo, avatar FROM users WHERE id=$1",
      [req.user.id],
    );

    const fullMsg = {
      ...msg,
      sender_pseudo: userRows[0]?.pseudo || "Inconnu",
      sender_avatar: userRows[0]?.avatar || null,
    };

    const io = req.app.get("io");
    const senderName = userRows[0]?.pseudo || "Inconnu";

    if (is_global) {
      io.emit("message:global", fullMsg);

      // Send push notification to all subscribed users for global messages
      sendPushToAll({
        title: "HEI STDhub – Chat global",
        body: `${senderName}: ${content.replace(/\[FILE:.+\]/, "[Fichier]").slice(0, 200)}`,
        tag: "global-chat",
        url: "/chat",
      }).catch(() => {});
    } else {
      io.to(`user:${receiver_id}`).emit("message:private", fullMsg);
      io.to(`user:${req.user.id}`).emit("message:private", fullMsg);

      // Notify sender that their message is pending (receiver hasn't seen it)
      io.to(`user:${req.user.id}`).emit("unread:update", {
        contactId: receiver_id,
        unread: 0,
        pending: 1,
      });

      // Send push notification to receiver
      sendPushNotification(receiver_id, {
        title: senderName || "Message",
        body: content.replace(/\[FILE:.+\]/, "[Fichier]").slice(0, 200),
        tag: `private-${req.user.id}`,
        url: "/chat",
      }).catch(() => {});
    }

    res.status(201).json(fullMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Mark a message as seen
router.patch("/:id/seen", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE messages SET seen=TRUE, seen_at=NOW()
       WHERE id=$1 AND receiver_id=$2
       RETURNING *`,
      [req.params.id, req.user.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Message introuvable." });

    const io = req.app.get("io");
    io.to(`user:${rows[0].sender_id}`).emit("message:seen", {
      messageId: rows[0].id,
    });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Get unread counts for the current user
router.get("/unread", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows: globalRows } = await db.query(
      `SELECT COALESCE(g.last_read_msg_id, 0) AS last_read
       FROM global_chat_read g WHERE g.user_id=$1`,
      [userId],
    );
    const lastRead = globalRows[0]?.last_read || 0;
    const { rows: globalUnread } = await db.query(
      `SELECT COUNT(*)::int AS count FROM messages
       WHERE is_global=TRUE AND id > $1`,
      [lastRead],
    );

    const { rows: privateUnread } = await db.query(
      `SELECT
         CASE WHEN sender_id=$1 THEN receiver_id ELSE sender_id END AS contact_id,
         COUNT(*) FILTER (WHERE receiver_id=$1 AND seen=FALSE)::int AS unread,
         COUNT(*) FILTER (WHERE sender_id=$1 AND seen=FALSE)::int AS pending
       FROM messages
       WHERE is_global=FALSE
         AND ($1 IN (sender_id, receiver_id))
       GROUP BY contact_id`,
      [userId],
    );

    const contacts = {};
    for (const row of privateUnread) {
      contacts[row.contact_id] = {
        unread: parseInt(row.unread, 10),
        pending: parseInt(row.pending, 10),
      };
    }

    res.json({
      global: parseInt(globalUnread[0]?.count, 10) || 0,
      contacts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Mark global chat as read up to a given message id
router.post("/global/read", auth, async (req, res) => {
  const { messageId } = req.body;
  if (!messageId) return res.status(400).json({ error: "messageId requis." });
  try {
    await db.query(
      `INSERT INTO global_chat_read (user_id, last_read_msg_id, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET last_read_msg_id = GREATEST(global_chat_read.last_read_msg_id, $2), updated_at = NOW()`,
      [req.user.id, messageId],
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Delete a message (only the sender can delete their own message)
router.delete("/:id", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `DELETE FROM messages WHERE id=$1 AND sender_id=$2
       RETURNING id, is_global, receiver_id, sender_id`,
      [req.params.id, req.user.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Message introuvable ou non autorisé." });

    const msg = rows[0];
    const io = req.app.get("io");
    io.emit("message:deleted", { messageId: msg.id, isGlobal: msg.is_global, receiverId: msg.receiver_id, senderId: msg.sender_id });

    res.json({ message: "Message supprimé." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Upload a file to Cloudinary (or local disk) for chat sharing
router.post("/upload", auth, (req, res) => {
  chatUpload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Fichier requis." });

    const isImage = req.file.mimetype?.startsWith("image/");
    const url = req.file.secure_url
      || (req.file.path ? `${req.protocol}://${req.get("host")}/uploads/chat/${req.file.filename}` : null);
    if (!url) return res.status(500).json({ error: "Upload échoué." });

    res.json({
      filename: req.file.originalname || req.file.filename,
      url,
      isImage,
    });
  });
});

// Send push notification to all subscribed users
async function sendPushToAll({ title, body, tag, url }) {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (endpoint) endpoint, auth_key AS "auth", p256dh_key AS "p256dh"
     FROM push_subscriptions`,
  );
  if (!rows.length) return;

  const payload = JSON.stringify({ title, body, tag, url, icon: "/logo.png" });
  for (const sub of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
        payload,
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        db.query(`DELETE FROM push_subscriptions WHERE endpoint=$1`, [sub.endpoint]).catch(() => {});
      }
    }
  }
}

// Send push notification to a user
async function sendPushNotification(userId, { title, body, tag, url }) {
  const { rows } = await db.query(
    `SELECT endpoint, auth_key AS "auth", p256dh_key AS "p256dh"
     FROM push_subscriptions WHERE user_id=$1`,
    [userId],
  );
  if (!rows.length) return;

  const payload = JSON.stringify({ title, body, tag, url, icon: "/logo.png" });
  for (const sub of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
        payload,
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        db.query(`DELETE FROM push_subscriptions WHERE endpoint=$1`, [sub.endpoint]).catch(() => {});
      }
    }
  }
}

module.exports = router;
