const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("../db");
const auth = require("../middleware/auth");
const multer = require("multer");
const webpush = require("web-push");
const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "chat");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const chatUpload = multer({
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

const CONCURRENCY_LIMIT = 10;

async function* batch(arr, size) {
  for (let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}

async function sendPushWithConcurrency(subscriptions, payload) {
  const results = [];
  for (const batch of await iteratorToArray(batch(subscriptions, CONCURRENCY_LIMIT))) {
    const batchResults = await Promise.allSettled(
      batch.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
          payload,
        ).catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db.query(`DELETE FROM push_subscriptions WHERE endpoint=$1`, [sub.endpoint]);
          }
          throw err;
        })
      ),
    );
    results.push(...batchResults);
  }
  return results;
}

async function iteratorToArray(iter) {
  const arr = [];
  for await (const item of iter) {
    arr.push(item);
  }
  return arr;
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

// List contacts with optional search filter and pagination
router.get("/contacts", auth, async (req, res) => {
  try {
    const { q, limit = 200, offset = 0 } = req.query;
    const params = [req.user.id];
    let whereClause = "WHERE id != $1";
    if (q?.trim()) {
      params.push(`%${q.trim()}%`);
      whereClause += ` AND (pseudo ILIKE $${params.length} OR ref ILIKE $${params.length})`;
    }
    params.push(parseInt(limit) || 200);
    params.push(parseInt(offset) || 0);
    const { rows } = await db.query(
      `SELECT id, ref, pseudo, role, level, avatar
       FROM users
       ${whereClause}
       ORDER BY
         CASE role WHEN 'teacher' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
         pseudo
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*)::int AS total FROM users ${whereClause}`,
      params.slice(0, -2),
    );
    res.json({ users: rows, total: countRows[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Get global chat messages (paginated, last 200 by default, supports before cursor)
router.get("/global", auth, async (req, res) => {
  try {
    const { before, limit = 200 } = req.query;
    const msgLimit = Math.min(parseInt(limit) || 200, 500);
    let query;
    let params;
    if (before) {
      query = `
        SELECT m.*, u.pseudo AS sender_pseudo, u.ref AS sender_ref,
               u.role AS sender_role, u.avatar AS sender_avatar
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.is_global = TRUE AND m.id < $1
        ORDER BY m.created_at DESC
        LIMIT $2`;
      params = [before, msgLimit];
    } else {
      query = `
        SELECT * FROM (
          SELECT m.*, u.pseudo AS sender_pseudo, u.ref AS sender_ref,
                 u.role AS sender_role, u.avatar AS sender_avatar
          FROM messages m
          LEFT JOIN users u ON m.sender_id = u.id
          WHERE m.is_global = TRUE
          ORDER BY m.created_at DESC
          LIMIT $1
        ) sub ORDER BY created_at ASC`;
      params = [msgLimit];
    }
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Get private messages between the caller and another user (paginated)
router.get("/private/:userId", auth, async (req, res) => {
  try {
    const { before, limit = 100 } = req.query;
    const msgLimit = Math.min(parseInt(limit) || 100, 500);
    let query;
    let params;
    if (before) {
      query = `
        SELECT m.*, u.pseudo AS sender_pseudo, u.avatar AS sender_avatar
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.is_global = FALSE
          AND m.id < $1
          AND (
            (m.sender_id = $2 AND m.receiver_id = $3)
            OR
            (m.sender_id = $3 AND m.receiver_id = $2)
          )
        ORDER BY m.created_at DESC
        LIMIT $4`;
      params = [before, req.user.id, req.params.userId, msgLimit];
    } else {
      query = `
        SELECT * FROM (
          SELECT m.*, u.pseudo AS sender_pseudo, u.avatar AS sender_avatar
          FROM messages m
          LEFT JOIN users u ON m.sender_id = u.id
          WHERE m.is_global = FALSE
            AND (
              (m.sender_id = $1 AND m.receiver_id = $2)
              OR
              (m.sender_id = $2 AND m.receiver_id = $1)
            )
          ORDER BY m.created_at DESC
          LIMIT $3
        ) sub ORDER BY created_at ASC`;
      params = [req.user.id, req.params.userId, msgLimit];
    }
    const { rows } = await db.query(query, params);
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
      if (io) io.emit("message:global", fullMsg);

      sendPushToAll({
        title: "HEI STDhub – Chat global",
        body: `${senderName}: ${content.replace(/\[FILE:.+\]/, "[Fichier]").slice(0, 200)}`,
        tag: "global-chat",
        url: "/chat",
      }).catch(() => {});
    } else {
      if (io) {
        io.to(`user:${receiver_id}`).emit("message:private", fullMsg);
        io.to(`user:${req.user.id}`).emit("message:private", fullMsg);

        io.to(`user:${req.user.id}`).emit("unread:update", {
          contactId: receiver_id,
          unread: 0,
          pending: 1,
        });
      }

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

// Mark messages as seen in batch
router.patch("/seen", auth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ error: "IDs requis." });
  try {
    const { rows } = await db.query(
      `UPDATE messages SET seen=TRUE, seen_at=NOW()
       WHERE id = ANY($1::int[]) AND receiver_id=$2
       RETURNING id, sender_id`,
      [ids, req.user.id],
    );
    const io = req.app.get("io");
    if (io) {
      for (const row of rows) {
        io.to(`user:${row.sender_id}`).emit("message:seen", {
          messageId: row.id,
        });
      }
    }
    res.json({ updated: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Mark a single message as seen (kept for backward compatibility)
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
    if (io) {
      io.to(`user:${rows[0].sender_id}`).emit("message:seen", {
        messageId: rows[0].id,
      });
    }

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
    if (io) io.emit("message:deleted", { messageId: msg.id, isGlobal: msg.is_global, receiverId: msg.receiver_id, senderId: msg.sender_id });

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
    const url = req.file.path ? `${req.protocol}://${req.get("host")}/uploads/chat/${req.file.filename}` : null;
    if (!url) return res.status(500).json({ error: "Upload échoué." });

    res.json({
      filename: req.file.originalname || req.file.filename,
      url,
      isImage,
    });
  });
});

async function sendPushToAll({ title, body, tag, url }) {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (endpoint) endpoint, auth_key AS "auth", p256dh_key AS "p256dh"
     FROM push_subscriptions`,
  );
  if (!rows.length) return;

  const payload = JSON.stringify({ title, body, tag, url, icon: "/logo.png" });
  await sendPushWithConcurrency(rows, payload);
}

async function sendPushNotification(userId, { title, body, tag, url }) {
  const { rows } = await db.query(
    `SELECT endpoint, auth_key AS "auth", p256dh_key AS "p256dh"
     FROM push_subscriptions WHERE user_id=$1`,
    [userId],
  );
  if (!rows.length) return;

  const payload = JSON.stringify({ title, body, tag, url, icon: "/logo.png" });
  await sendPushWithConcurrency(rows, payload);
}

module.exports = router;
