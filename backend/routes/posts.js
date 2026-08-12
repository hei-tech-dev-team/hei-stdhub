const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const db = require("../db");
const auth = require("../middleware/auth");
const { sendPushToAll } = require("../services/notificationService");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const useCloudinary =
  process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
  process.env.CLOUDINARY_API_KEY?.trim() &&
  process.env.CLOUDINARY_API_SECRET?.trim();

let upload;
if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      const isImage = file.mimetype?.startsWith("image/");
      const fileName = isImage 
        ? path.parse(file.originalname).name 
        : file.originalname;

      return {
        folder: "hei-stdhub/posts",
        resource_type: isImage ? "image" : "raw",
        public_id: `${crypto.randomBytes(16).toString("hex")}-${fileName}`,
      };
    },
  });

  upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
  });
} else {
  upload = multer({
    storage: multer.diskStorage({
      destination: UPLOAD_DIR,
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || "";
        const name = crypto.randomBytes(16).toString("hex") + ext;
        cb(null, name);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
  });
}

const UES_BY_LEVEL = {
  L1: [
    "WEB1",
    "PROG1",
    "SYS1",
    "DONNEES1",
    "THEORIE1-P1",
    "THEORIE1-P2",
    "WEB2",
    "PROG2-POO",
    "PROG2-API",
    "SYS2",
    "MGT1",
    "LV1",
  ],
  L2: ["WEB3", "PROG3", "MGT2", "PROG4-SYS3", "DONNEES2", "IA1"],
  L3: ["MOB1", "PROG5", "SECU1", "SECU2"],
};

router.get("/", async (req, res) => {
  try {
    const { ue, type, level, limit = 50, offset = 0 } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 50, 200);
    const pageOffset = Math.max(parseInt(offset) || 0, 0);
    let q = `
      SELECT p.*, u.pseudo AS author_pseudo, u.ref AS author_ref
      FROM posts p LEFT JOIN users u ON p.author_id = u.id
      WHERE 1=1
    `;
    let countQ = "SELECT COUNT(*) FROM posts p WHERE 1=1";
    const params = [];

    if (level && UES_BY_LEVEL[level]) {
      const placeholders = UES_BY_LEVEL[level]
        .map((_, i) => `$${params.length + i + 1}`)
        .join(",");
      params.push(...UES_BY_LEVEL[level]);
      const filter = ` AND p.ue IN (${placeholders})`;
      q += filter;
      countQ += filter;
    }
    if (ue) {
      params.push(ue);
      const filter = ` AND p.ue=$${params.length}`;
      q += filter;
      countQ += filter;
    }
    if (type) {
      params.push(type);
      const filter = ` AND p.type=$${params.length}`;
      q += filter;
      countQ += filter;
    }

    q += " ORDER BY p.created_at DESC";
    params.push(pageLimit);
    q += ` LIMIT $${params.length}`;
    params.push(pageOffset);
    q += ` OFFSET $${params.length}`;

    const [dataResult, countResult] = await Promise.all([
      db.query(q, params),
      db.query(countQ, params.slice(0, params.length - 2)),
    ]);
    res.json({
      posts: dataResult.rows,
      total: parseInt(countResult.rows[0]?.count || 0),
      limit: pageLimit,
      offset: pageOffset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/", auth, upload.single("file"), async (req, res) => {
  if (!["teacher", "admin"].includes(req.user.role))
    return res.status(403).json({ error: "Accès refusé." });

  const { title, description, ue, type, link } = req.body;
  if (!title || !ue || !type)
    return res.status(400).json({ error: "Titre, UE et type requis." });

  const file_name = req.file?.originalname || null;
  const file_path = req.file
    ? (req.file.path?.startsWith("http") ? req.file.path : `uploads/${req.file.filename}`)
    : null;

  if (!file_path && !link)
    return res.status(400).json({ error: "Fichier ou lien requis." });

  try {
    const { rows } = await db.query(
      `INSERT INTO posts (title,description,ue,type,file_name,file_path,link,author_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        title,
        description || null,
        ue,
        type,
        file_name,
        file_path,
        link || null,
        req.user.id,
      ],
    );
    res.status(201).json(rows[0]);

    sendPushToAll({
      title: `Nouveau cours – ${ue}`,
      body: `${title} (${type})`,
      tag: `post-${rows[0].id}`,
      url: "/posts",
      type: "new_post",
    }).catch((err) => console.error("sendPushToAll error (posts):", err?.message));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.get("/:id/download", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM posts WHERE id=$1", [req.params.id]);
    const post = rows[0];

    if (!post) return res.status(404).json({ error: "Post introuvable." });
    if (!post.file_path) return res.status(404).json({ error: "Aucun fichier pour ce post." });

    if (post.file_path.startsWith("http")) {
      const forcedUrl = post.file_path.replace(
        "/upload/",
        `/upload/fl_attachment:${encodeURIComponent(post.file_name || "fichier")}/`
      );
      return res.redirect(forcedUrl);
    }

    const absolutePath = path.join(__dirname, "..", post.file_path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Fichier introuvable sur le serveur." });
    }
    res.download(absolutePath, post.file_name || path.basename(absolutePath));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.delete("/:id", auth, async (req, res) => {
  if (!["teacher", "admin"].includes(req.user.role))
    return res.status(403).json({ error: "Accès refusé." });
  try {
    const { rows } = await db.query("SELECT file_path FROM posts WHERE id=$1", [req.params.id]);
    const post = rows[0];

    await db.query("DELETE FROM posts WHERE id=$1", [req.params.id]);

    if (useCloudinary && post?.file_path?.startsWith("http")) {
      const urlParts = post.file_path.split("/upload/");
      if (urlParts.length === 2) {
        const fullPath = urlParts[1].replace(/^v\d+\//, "");
        const publicId = fullPath.replace(/\.[^/.]+$/, "");
        
        const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(post.file_path);
        const resourceType = isImage ? "image" : "raw";

        cloudinary.uploader.destroy(isImage ? publicId : fullPath, { resource_type: resourceType })
          .catch((e) => console.warn("Cloudinary delete warning:", e.message));
      }
    }

    res.json({ message: "Post supprimé." });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
