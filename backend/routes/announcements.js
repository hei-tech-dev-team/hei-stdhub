const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("../db");
const auth = require("../middleware/auth");
const developerOrAdmin = require("../middleware/developerOrAdmin");
const { sendPushToAll } = require("../services/notificationService");

const router = express.Router();

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

// GET / — list all announcements (newest first), paginated
router.get("/", auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const query = `
      SELECT a.*, u.pseudo AS author_pseudo, u.avatar AS author_avatar
      FROM announcements a
      JOIN users u ON u.id = a.author_id
      ORDER BY a.created_at DESC
      LIMIT $1 OFFSET $2`;
    const countQuery = `SELECT COUNT(*) FROM announcements`;

    const [dataResult, countResult] = await Promise.all([
      db.query(query, [limit, offset]),
      db.query(countQuery),
    ]);

    const announcements = dataResult.rows;
    const total = parseInt(countResult.rows[0]?.count || 0);

    // Fetch reactions in a single query with user's reaction
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
router.post("/", auth, developerOrAdmin, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "Fichier trop volumineux." });
      return res.status(400).json({ error: err.message });
    }
    try {
      const { title, content } = req.body;
      if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "Le titre et le contenu sont requis." });
      }

      const imageUrl = req.file
        ? req.file.secure_url || `${req.protocol}://${req.get("host")}/uploads/announcements/${req.file.filename}`
        : null;

      const result = await db.query(`
        INSERT INTO announcements (title, content, image_url, author_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [title.trim(), content.trim(), imageUrl, req.user.id]);

      res.status(201).json(result.rows[0]);

      const ann = result.rows[0];
      const payload = {
        title: "Nouvelle annonce – HEI STDnews",
        body: ann.title,
        tag: `announcement-${ann.id}`,
        url: "/announcements",
        type: "announcement",
      };

      sendPushToAll(payload)
        .catch((err) => console.error("sendPushToAll error (announcements):", err?.message));
    } catch (err) {
      console.error("Error creating announcement:", err);
      res.status(500).json({ error: "Erreur serveur." });
    }
  });
});

// DELETE /:id — admin deletes an announcement
router.delete("/:id", auth, developerOrAdmin, async (req, res) => {
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
