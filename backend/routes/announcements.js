const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("../db");
const auth = require("../middleware/auth");
const { containsProfanity } = require("../middleware/profanity");
const { sendPushToAll } = require("../services/notificationService");

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Accès réservé à l'admin." });
  next();
};

const useCloudinary =
  process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
  process.env.CLOUDINARY_API_KEY?.trim() &&
  process.env.CLOUDINARY_API_SECRET?.trim();

let upload;
if (useCloudinary) {
  const cloudinary = require("cloudinary");
  const CloudinaryStorage = require("multer-storage-cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "hei-stdhub/announcements",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 1200, crop: "limit" }],
    },
  });
  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }).single("image");
} else {
  const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "announcements");
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      cb(null, crypto.randomBytes(16).toString("hex") + ext);
    },
  });
  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }).single("image");
}

// GET / — list all announcements (newest first), optional ?level filter, paginated
router.get("/", auth, async (req, res) => {
  try {
    const level = req.query.level;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    let query, countQuery, params;
    if (level && ["L1", "L2", "L3"].includes(level)) {
      query = `
        SELECT a.*, u.pseudo AS author_pseudo, u.avatar AS author_avatar
        FROM announcements a
        JOIN users u ON u.id = a.author_id
        WHERE a.target_level IS NULL OR a.target_level = $1
        ORDER BY a.created_at DESC
        LIMIT $2 OFFSET $3`;
      countQuery = `SELECT COUNT(*) FROM announcements WHERE target_level IS NULL OR target_level = $1`;
      params = [level];
    } else {
      query = `
        SELECT a.*, u.pseudo AS author_pseudo, u.avatar AS author_avatar
        FROM announcements a
        JOIN users u ON u.id = a.author_id
        ORDER BY a.created_at DESC
        LIMIT $1 OFFSET $2`;
      countQuery = `SELECT COUNT(*) FROM announcements`;
      params = [];
    }

    const [dataResult, countResult] = await Promise.all([
      db.query(query, level ? [level, limit, offset] : [limit, offset]),
      db.query(countQuery, params),
    ]);

    const announcements = dataResult.rows;
    const total = parseInt(countResult.rows[0]?.count || 0);

    // Fetch reactions for each announcement
    if (announcements.length > 0) {
      const ids = announcements.map((a) => a.id);
      const [reactionsResult, userReactionsResult] = await Promise.all([
        db.query(`
          SELECT announcement_id, reaction_type, COUNT(*)::int AS count
          FROM announcement_reactions
          WHERE announcement_id = ANY($1::int[])
          GROUP BY announcement_id, reaction_type
        `, [ids]),
        db.query(`
          SELECT announcement_id, reaction_type
          FROM announcement_reactions
          WHERE announcement_id = ANY($1::int[]) AND user_id = $2
        `, [ids, req.user.id]),
      ]);

      const reactionsMap = {};
      for (const r of reactionsResult.rows) {
        if (!reactionsMap[r.announcement_id]) reactionsMap[r.announcement_id] = {};
        reactionsMap[r.announcement_id][r.reaction_type] = r.count;
      }

      const userReactionsMap = {};
      for (const r of userReactionsResult.rows) {
        userReactionsMap[r.announcement_id] = r.reaction_type;
      }

      for (const a of announcements) {
        a.reactions = reactionsMap[a.id] || {};
        a.user_reaction = userReactionsMap[a.id] || null;
      }
    }

    res.json({ announcements, total, limit, offset });
  } catch (err) {
    console.error("Error fetching announcements:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST / — admin creates an announcement (optional image)
router.post("/", auth, adminOnly, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "Fichier trop volumineux." });
      return res.status(400).json({ error: err.message });
    }
    try {
      const { title, content, target_level } = req.body;
      if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "Le titre et le contenu sont requis." });
      }
      if (containsProfanity(title) || containsProfanity(content)) {
        return res.status(400).json({ error: "Contenu inapproprié détecté." });
      }
      if (target_level && !["L1", "L2", "L3"].includes(target_level)) {
        return res.status(400).json({ error: "Niveau cible invalide." });
      }

      const imageUrl = req.file
        ? req.file.secure_url || `${req.protocol}://${req.get("host")}/uploads/announcements/${req.file.filename}`
        : null;

      const result = await db.query(`
        INSERT INTO announcements (title, content, image_url, author_id, target_level)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [title.trim(), content.trim(), imageUrl, req.user.id, target_level || null]);

      res.status(201).json(result.rows[0]);

      sendPushToAll({
        title: "Nouvelle annonce – HEI STDnews",
        body: result.rows[0].title,
        tag: `announcement-${result.rows[0].id}`,
        url: "/announcements",
        type: "announcement",
      }).catch((err) => console.error("sendPushToAll error (announcements):", err?.message));
    } catch (err) {
      console.error("Error creating announcement:", err);
      res.status(500).json({ error: "Erreur serveur." });
    }
  });
});

// DELETE /:id — admin deletes an announcement
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM announcements WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Annonce introuvable." });
    }
    res.json({ message: "Annonce supprimée." });
  } catch (err) {
    console.error("Error deleting announcement:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /:id/react — upsert reaction
router.post("/:id/react", auth, async (req, res) => {
  try {
    const { reaction_type } = req.body;
    const valid = ["like", "haha", "dont_like", "sad"];
    if (!valid.includes(reaction_type)) {
      return res.status(400).json({ error: "Type de réaction invalide." });
    }

    const ann = await db.query("SELECT id FROM announcements WHERE id = $1", [req.params.id]);
    if (ann.rowCount === 0) {
      return res.status(404).json({ error: "Annonce introuvable." });
    }

    await db.query(`
      INSERT INTO announcement_reactions (announcement_id, user_id, reaction_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (announcement_id, user_id)
      DO UPDATE SET reaction_type = EXCLUDED.reaction_type
    `, [req.params.id, req.user.id, reaction_type]);

    res.json({ message: "Réaction enregistrée." });
  } catch (err) {
    console.error("Error saving reaction:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// DELETE /:id/react — remove reaction
router.delete("/:id/react", auth, async (req, res) => {
  try {
    await db.query(
      "DELETE FROM announcement_reactions WHERE announcement_id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Réaction supprimée." });
  } catch (err) {
    console.error("Error removing reaction:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
