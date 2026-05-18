const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "submissions");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      const name = crypto.randomBytes(16).toString("hex") + ext;
      cb(null, name);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/", auth, upload.single("file"), async (req, res) => {
  const { nom, prenom, email, ref, level, groupe, ue, type, link } = req.body;

  if (!nom || !prenom || !email || !ref || !level || !groupe || !ue || !type)
    return res.status(400).json({ error: "Tous les champs sont requis." });

  const file_name = req.file?.originalname || null;
  const file_path = req.file?.path ? `${req.protocol}://${req.get("host")}/uploads/submissions/${req.file.filename}` : null;

  if (!file_path && !link)
    return res.status(400).json({ error: "Fichier ou lien requis." });

  try {
    const { rows } = await db.query(
      `INSERT INTO submissions
         (student_id, nom, prenom, email, ref, level, groupe, ue, type, file_name, file_path, link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        req.user.id,
        nom,
        prenom,
        email,
        ref,
        level,
        groupe,
        ue,
        type,
        file_name,
        file_path,
        link || null,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.get("/", auth, async (req, res) => {
  if (!["teacher", "admin"].includes(req.user.role))
    return res.status(403).json({ error: "Accès refusé." });

  try {
    const { type, groupe, ue, search, limit = 50, offset = 0 } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 50, 200);
    const pageOffset = Math.max(parseInt(offset) || 0, 0);
    const params = [];
    const countParams = [];

    let q = `
      SELECT s.*, u.pseudo AS student_pseudo
      FROM submissions s
      LEFT JOIN users u ON s.student_id = u.id
      WHERE 1=1
    `;
    let countQ = "SELECT COUNT(*) FROM submissions s WHERE 1=1";

    if (req.user.role === "teacher") {
      const teacherUes = req.user.ues || [];
      if (teacherUes.length === 0) {
        return res.json({ submissions: [], total: 0, limit: pageLimit, offset: pageOffset });
      }
      params.push(teacherUes);
      countParams.push(teacherUes);
      const filter = ` AND s.ue = ANY($${params.length})`;
      q += filter;
      countQ += filter;
    }

    if (type) {
      params.push(type);
      countParams.push(type);
      const filter = ` AND s.type=$${params.length}`;
      q += filter;
      countQ += filter;
    }
    if (groupe) {
      params.push(groupe);
      countParams.push(groupe);
      const filter = ` AND s.groupe=$${params.length}`;
      q += filter;
      countQ += filter;
    }
    if (ue) {
      params.push(ue);
      countParams.push(ue);
      const filter = ` AND s.ue=$${params.length}`;
      q += filter;
      countQ += filter;
    }
    if (search) {
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      const filter = ` AND (s.ref ILIKE $${params.length} OR s.nom ILIKE $${params.length} OR s.prenom ILIKE $${params.length} OR s.email ILIKE $${params.length} OR s.groupe ILIKE $${params.length})`;
      q += filter;
      countQ += filter;
    }

    q += " ORDER BY s.created_at DESC";
    params.push(pageLimit);
    q += ` LIMIT $${params.length}`;
    params.push(pageOffset);
    q += ` OFFSET $${params.length}`;

    const [dataResult, countResult] = await Promise.all([
      db.query(q, params),
      db.query(countQ, countParams),
    ]);
    res.json({
      submissions: dataResult.rows,
      total: parseInt(countResult.rows[0]?.count || 0),
      limit: pageLimit,
      offset: pageOffset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
