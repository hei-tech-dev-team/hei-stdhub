const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("../db");
const auth = require("../middleware/auth");
const multer = require("multer");
const cloudinary = require("cloudinary");
const CloudinaryStorage = require("multer-storage-cloudinary");
const { sendPushToUser } = require("../services/notificationService");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const reactionsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,             // 30 reactions/minute
  standardHeaders: true,
  legacyHeaders: false,
});

const REACTIONS_SUBQUERY = `
  (
    SELECT COALESCE(
      json_agg(json_build_object(
        'userId',   mr.user_id,
        'userName', ru.pseudo,
        'emoji',    mr.emoji
      )),
      '[]'
    )
    FROM message_reactions mr
    LEFT JOIN users ru ON ru.id = mr.user_id
    WHERE mr.message_id = base.id
  ) AS reactions
`;

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "chat");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const useCloudinary =
  process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
  process.env.CLOUDINARY_API_KEY?.trim() &&
  process.env.CLOUDINARY_API_SECRET?.trim();

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
    folder: "hei-stdhub/chat",
    allowedFormats: ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "html", "css", "js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "cs", "php", "rb", "go", "rs", "json", "xml", "yaml", "yml", "csv", "txt", "md", "sh", "bat", "zip", "rar", "7z"],
    resource_type: "raw",
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
    let query, params;

    if (before) {
      query = `
        SELECT base.*, ${REACTIONS_SUBQUERY}
        FROM (
          SELECT m.*, u.pseudo AS sender_pseudo, u.ref AS sender_ref,
                 u.role AS sender_role, u.avatar AS sender_avatar,
                 rm.content AS reply_to_content,
                  rs.pseudo  AS reply_to_sender
          FROM messages m
          LEFT JOIN users u ON m.sender_id = u.id
          LEFT JOIN messages rm ON rm.id = m.reply_to_id
          LEFT JOIN users    rs ON rs.id = rm.sender_id
          WHERE m.is_global = TRUE AND m.id < $1
          ORDER BY m.created_at DESC
          LIMIT $2
        ) base`;
      params = [before, msgLimit];
    } else {
      query = `
        SELECT base.*, ${REACTIONS_SUBQUERY}
        FROM (
          SELECT m.*, u.pseudo AS sender_pseudo, u.ref AS sender_ref,
                 u.role AS sender_role, u.avatar AS sender_avatar,
                 rm.content AS reply_to_content,
                  rs.pseudo  AS reply_to_sender
          FROM messages m
          LEFT JOIN users u ON m.sender_id = u.id
          LEFT JOIN messages rm ON rm.id = m.reply_to_id
          LEFT JOIN users    rs ON rs.id = rm.sender_id
          WHERE m.is_global = TRUE
          ORDER BY m.created_at DESC
          LIMIT $1
        ) base
        ORDER BY base.created_at ASC`;
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
    let query, params;

    if (before) {
      query = `
        SELECT base.*, ${REACTIONS_SUBQUERY}
        FROM (
          SELECT m.*, u.pseudo AS sender_pseudo, u.ref AS sender_ref,
                 u.role AS sender_role, u.avatar AS sender_avatar,
                 rm.content AS reply_to_content,
                  rs.pseudo  AS reply_to_sender
          FROM messages m
          LEFT JOIN users u ON m.sender_id = u.id
          LEFT JOIN messages rm ON rm.id = m.reply_to_id
          LEFT JOIN users    rs ON rs.id = rm.sender_id
          WHERE m.is_global = FALSE
            AND m.id < $1
            AND (
              (m.sender_id = $2 AND m.receiver_id = $3)
              OR
              (m.sender_id = $3 AND m.receiver_id = $2)
            )
          ORDER BY m.created_at DESC
          LIMIT $4
        ) base
        ORDER BY base.created_at ASC`;
      params = [before, req.user.id, req.params.userId, msgLimit];
    } else {
      query = `
        SELECT base.*, ${REACTIONS_SUBQUERY}
        FROM (
          SELECT m.*, u.pseudo AS sender_pseudo, u.ref AS sender_ref,
                 u.role AS sender_role, u.avatar AS sender_avatar,
                  rm.content AS reply_to_content,
                  rs.pseudo  AS reply_to_sender
          FROM messages m
          LEFT JOIN users u ON m.sender_id = u.id
          LEFT JOIN messages rm ON rm.id = m.reply_to_id
          LEFT JOIN users    rs ON rs.id = rm.sender_id
          WHERE m.is_global = FALSE
            AND (
              (m.sender_id = $1 AND m.receiver_id = $2)
              OR
              (m.sender_id = $2 AND m.receiver_id = $1)
            )
          ORDER BY m.created_at DESC
          LIMIT $3
        ) base
        ORDER BY base.created_at ASC`;
      params = [req.user.id, req.params.userId, msgLimit];
    }

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /purge-test —  (admin only, debug)
router.post("/purge-test", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Réservé aux administrateurs." });
  }
  try {
    const { purgeGlobalMessages } = require("../services/messagePurgeJob");
    await purgeGlobalMessages(req.app.get("io"));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la purge." });
  }
});

// Send a message (global or private)
router.post("/", auth, async (req, res) => {
  const { receiver_id, is_global, reply_to_id = null } = req.body;
  const content = typeof req.body.content === "string" ? req.body.content : "";
  if (!content.trim()) return res.status(400).json({ error: "Message vide." });
  if (!is_global && !receiver_id)
    return res.status(400).json({ error: "Destinataire requis." });

  try {
    const { rows } = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content, is_global, reply_to_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, is_global ? null : receiver_id, content, !!is_global, reply_to_id],
    );

    const msg = rows[0];

    const { rows: userRows } = await db.query(
      "SELECT pseudo, avatar, ref, role FROM users WHERE id=$1",
      [req.user.id],
    );

    let replyToContent = null;
    let replyToSender  = null;
    if (reply_to_id) {
      const { rows: replyRows } = await db.query(
        `SELECT rm.content, u.pseudo AS sender_pseudo
         FROM messages rm
         LEFT JOIN users u ON u.id = rm.sender_id
         WHERE rm.id = $1`,
        [reply_to_id],
      );
      if (replyRows.length) {
        replyToContent = replyRows[0].content;
        replyToSender  = replyRows[0].sender_pseudo;
      }
    }

    const fullMsg = {
      ...msg,
      sender_pseudo: userRows[0]?.pseudo || "Inconnu",
      sender_avatar: userRows[0]?.avatar || null,
      sender_ref: userRows[0]?.ref || null,
      sender_role: userRows[0]?.role || null,
      reply_to_content: replyToContent,
      reply_to_sender: replyToSender,
      reactions: [],
    };

    const io = req.app.get("io");
    const senderName = userRows[0]?.pseudo || "Inconnu";

    if (is_global) {
      if (io) io.emit("message:global", fullMsg);
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

      sendPushToUser(receiver_id, {
        title: senderName || "Message",
        body: content.replace(/\[FILE:[^\]]+\]/g, "[Fichier]").slice(0, 200),
        tag: `private-${req.user.id}`,
        url: "/chat",
        type: "private_message",
      }).catch((err) => console.error("sendPushToUser error (messages):", err?.message));
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
          readerId: req.user.id,
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
        readerId: req.user.id,
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

// add reaction to a message (toggle)
router.post("/:id/reactions", reactionsLimiter, auth, async (req, res) => {
  const messageId = parseInt(req.params.id);
  const { emoji } = req.body;
  const userId = req.user.id;

  if (!emoji?.trim()) return res.status(400).json({ error: "emoji requis." });
  if (isNaN(messageId)) return res.status(400).json({ error: "messageId invalide." });

  try {
    const { rows: existing } = await db.query(
      `SELECT id, emoji FROM message_reactions
       WHERE message_id = $1 AND user_id = $2`,
      [messageId, userId],
    );

    let action;
    if (existing.length) {
      if (existing[0].emoji === emoji) {
        await db.query("DELETE FROM message_reactions WHERE id = $1", [existing[0].id]);
        action = "removed";
      } else {
        await db.query(
          "UPDATE message_reactions SET emoji = $1 WHERE id = $2",
          [emoji, existing[0].id],
        );
        action = "updated";
      }
    } else {
      await db.query(
        `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)`,
        [messageId, userId, emoji],
      );
      action = "added";
    }

    const { rows: reactions } = await db.query(
      `SELECT mr.user_id AS "userId", u.pseudo AS "userName", mr.emoji
       FROM message_reactions mr
       LEFT JOIN users u ON u.id = mr.user_id
       WHERE mr.message_id = $1`,
      [messageId],
    );

    const io = req.app.get("io");
    if (io) io.emit("message:reaction", { messageId, reactions });

    res.json({ action, messageId, reactions });
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
       RETURNING id, is_global, receiver_id, sender_id, content`,
      [req.params.id, req.user.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Message introuvable ou non autorisé." });

    const msg = rows[0];

    if (useCloudinary && msg.content) {
      const match = msg.content.match(/\[FILE:[^:]+:([^:]+):/);
      if (match) {
        try {
          const fileUrl = match[1];
          const urlParts = fileUrl.split("/upload/");
          if (urlParts.length === 2) {
            const publicIdWithExt = urlParts[1].replace(/^v\d+\//, "");
            const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
            await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
          }
        } catch (e) {
          console.warn("Cloudinary delete warning:", e.message);
        }
      }
    }

    const io = req.app.get("io");
    if (io) io.emit("message:deleted", {
      messageId: msg.id,
      isGlobal: msg.is_global,
      receiverId: msg.receiver_id,
      senderId: msg.sender_id,
    });

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

router.get("/favorites", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT contact_id FROM chat_favorites WHERE user_id=$1 ORDER BY created_at ASC`,
      [req.user.id],
    );
    res.json(rows.map((r) => r.contact_id));
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/favorites", auth, async (req, res) => {
  const { contact_id } = req.body;
  if (!contact_id) return res.status(400).json({ error: "contact_id requis." });
  try {
    const { rows } = await db.query(
      `INSERT INTO chat_favorites (user_id, contact_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING contact_id`,
      [req.user.id, contact_id],
    );
    res.json(rows.map((r) => r.contact_id));
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.delete("/favorites/:contactId", auth, async (req, res) => {
  try {
    await db.query(
      `DELETE FROM chat_favorites WHERE user_id=$1 AND contact_id=$2`,
      [req.user.id, req.params.contactId],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
