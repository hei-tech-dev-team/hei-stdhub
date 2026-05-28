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

const alumniOnly = (req, res, next) => {
  if (req.user.role !== "alumni")
    return res.status(403).json({ error: "Accès réservé aux alumni." });
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
      folder: "hei-stdhub/alumni-tips",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 1200, crop: "limit" }],
    },
  });
  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }).single("image");
} else {
  const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "alumni-tips");
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

router.get("/", auth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*, u.pseudo AS author_pseudo, u.avatar AS author_avatar, u.ref AS author_ref
      FROM alumni_tips t
      JOIN users u ON u.id = t.author_id
      ORDER BY t.created_at DESC
    `);

    if (rows.length > 0) {
      const ids = rows.map((t) => t.id);
      const reactionsResult = await db.query(`
        SELECT tip_id, reaction_type, COUNT(*)::int AS count
        FROM alumni_tip_reactions
        WHERE tip_id = ANY($1::int[])
        GROUP BY tip_id, reaction_type
      `, [ids]);

      const userReactionsResult = await db.query(`
        SELECT tip_id, reaction_type
        FROM alumni_tip_reactions
        WHERE tip_id = ANY($1::int[]) AND user_id = $2
      `, [ids, req.user.id]);

      const reactionsMap = {};
      for (const r of reactionsResult.rows) {
        if (!reactionsMap[r.tip_id]) reactionsMap[r.tip_id] = {};
        reactionsMap[r.tip_id][r.reaction_type] = r.count;
      }

      const userReactionsMap = {};
      for (const r of userReactionsResult.rows) {
        userReactionsMap[r.tip_id] = r.reaction_type;
      }

      for (const t of rows) {
        t.reactions = reactionsMap[t.id] || {};
        t.user_reaction = userReactionsMap[t.id] || null;
      }
    }

    res.json(rows);
  } catch (err) {
    console.error("Error fetching alumni tips:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/", auth, alumniOnly, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "Fichier trop volumineux (max 10 Mo)." });
      return res.status(400).json({ error: err.message });
    }
    try {
      const { title, content } = req.body;
      if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "Le titre et le contenu sont requis." });
      }
      if (containsProfanity(title) || containsProfanity(content)) {
        return res.status(400).json({ error: "Contenu inapproprié détecté. Veuillez respecter les autres membres." });
      }

      const imageUrl = req.file
        ? req.file.secure_url || `${req.protocol}://${req.get("host")}/uploads/alumni-tips/${req.file.filename}`
        : null;

      const result = await db.query(`
        INSERT INTO alumni_tips (title, content, image_url, author_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [title.trim(), content.trim(), imageUrl, req.user.id]);

      res.status(201).json(result.rows[0]);

      sendPushToAll({
        title: "Nouveau conseil Alumni",
        body: result.rows[0].title,
        tag: `alumni-tip-${result.rows[0].id}`,
        url: "/alumni-tips",
        type: "alumni_tip",
      }).catch(() => {});
    } catch (err) {
      console.error("Error creating alumni tip:", err);
      res.status(500).json({ error: "Erreur serveur." });
    }
  });
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM alumni_tips WHERE id = $1 AND author_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Tip introuvable ou non autorisé." });
    }
    res.json({ message: "Tip supprimé." });
  } catch (err) {
    console.error("Error deleting alumni tip:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/:id/react", auth, async (req, res) => {
  try {
    const { reaction_type } = req.body;
    const valid = ["like", "haha", "dont_like", "sad"];
    if (!valid.includes(reaction_type)) {
      return res.status(400).json({ error: "Type de réaction invalide." });
    }

    const tip = await db.query("SELECT id FROM alumni_tips WHERE id = $1", [req.params.id]);
    if (tip.rowCount === 0) {
      return res.status(404).json({ error: "Tip introuvable." });
    }

    await db.query(`
      INSERT INTO alumni_tip_reactions (tip_id, user_id, reaction_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (tip_id, user_id)
      DO UPDATE SET reaction_type = EXCLUDED.reaction_type
    `, [req.params.id, req.user.id, reaction_type]);

    res.json({ message: "Réaction enregistrée." });
  } catch (err) {
    console.error("Error saving reaction:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.delete("/:id/react", auth, async (req, res) => {
  try {
    await db.query(
      "DELETE FROM alumni_tip_reactions WHERE tip_id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Réaction supprimée." });
  } catch (err) {
    console.error("Error removing reaction:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
