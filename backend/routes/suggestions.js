const express = require("express");
const router = express.Router();
const db = require("../db");
const auth = require("../middleware/auth");
const nodemailer = require("nodemailer");

// Transporter email
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST /api/suggestions — étudiant ou prof soumet une suggestion
router.post("/", auth, async (req, res) => {
  if (!["student", "teacher"].includes(req.user.role))
    return res
      .status(403)
      .json({ error: "Réservé aux étudiants et professeurs." });

  const { titre, contenu, anonyme } = req.body;
  if (!titre?.trim() || !contenu?.trim())
    return res.status(400).json({ error: "Titre et contenu requis." });

  try {
    const { rows } = await db.query(
      `INSERT INTO suggestions (student_id, titre, contenu, anonyme)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, titre.trim(), contenu.trim(), anonyme === true],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/suggestions — BDE voit toutes les suggestions
router.get("/", auth, async (req, res) => {
  if (req.user.role !== "bde")
    return res.status(403).json({ error: "Accès réservé au BDE." });

  try {
    const { rows } = await db.query(
      `SELECT s.*,
        CASE WHEN s.anonyme = true THEN 'Anonyme' ELSE u.nom END AS nom,
        CASE WHEN s.anonyme = true THEN '' ELSE u.prenom END AS prenom,
        CASE WHEN s.anonyme = true THEN '' ELSE u.email END AS email,
        CASE WHEN s.anonyme = true THEN '' ELSE u.ref END AS ref,
        u.role AS auteur_role
       FROM suggestions s
       JOIN users u ON s.student_id = u.id
       ORDER BY s.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// PATCH /api/suggestions/:id — BDE change le statut
router.patch("/:id", auth, async (req, res) => {
  if (req.user.role !== "bde")
    return res.status(403).json({ error: "Accès réservé au BDE." });

  const { statut, justification } = req.body;
  const validStatuts = ["recu", "accepte", "a_discuter", "refuse"];
  if (!validStatuts.includes(statut))
    return res.status(400).json({ error: "Statut invalide." });
  if (statut === "refuse" && !justification?.trim())
    return res
      .status(400)
      .json({ error: "Justification requise pour un refus." });

  try {
    const { rows } = await db.query(
      `UPDATE suggestions SET statut=$1, justification=$2, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [statut, justification || null, req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Suggestion introuvable." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/suggestions/confirm — BDE confirme et envoie les emails
router.post("/confirm", auth, async (req, res) => {
  if (req.user.role !== "bde")
    return res.status(403).json({ error: "Accès réservé au BDE." });

  try {
    const { rows: suggestions } = await db.query(
      `SELECT s.*, u.nom, u.prenom, u.role AS auteur_role
       FROM suggestions s
       JOIN users u ON s.student_id = u.id
       WHERE s.statut != 'recu'`,
    );

    // Envoyer aux étudiants ET aux profs
    const { rows: recipients } = await db.query(
      "SELECT email, nom, prenom FROM users WHERE role IN ('student', 'teacher')",
    );

    const acceptes = suggestions.filter((s) => s.statut === "accepte");
    const aDiscuter = suggestions.filter((s) => s.statut === "a_discuter");
    const refuses = suggestions.filter((s) => s.statut === "refuse");

    const buildSection = (items, color, emoji, title) => {
      if (items.length === 0) return "";
      let html = `
        <h2 style="color:#0F1E33;border-left:4px solid ${color};padding-left:12px;margin-top:24px;">
          ${emoji} ${title} (${items.length})
        </h2>
        <ul style="list-style:none;padding:0;">
      `;
      items.forEach((s) => {
        const auteur = s.anonyme ? "Anonyme" : `${s.prenom} ${s.nom}`;
        html += `
          <li style="background:white;border-radius:8px;padding:16px;margin-bottom:12px;border:1px solid #e2e8f0;border-left:4px solid ${color};">
            <strong style="color:#0F1E33;">${s.titre}</strong>
            <p style="color:#64748b;margin:8px 0 0;font-size:14px;">${s.contenu}</p>
            <p style="color:#94a3b8;margin:6px 0 0;font-size:12px;">— ${auteur}</p>
            ${s.justification ? `<p style="color:${color};margin:8px 0 0;font-size:13px;"><strong>Justification BDE :</strong> ${s.justification}</p>` : ""}
          </li>
        `;
      });
      html += `</ul>`;
      return html;
    };

    const resumeHtml = (prenom, nom) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0F1E33;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="color:#F5A623;margin:0;">HEI STDhub</h1>
          <p style="color:#fff;margin:8px 0 0;">Retour du BDE sur les suggestions</p>
        </div>
        <div style="padding:24px;background:#f8fafc;border-radius:0 0 12px 12px;">
          <p style="color:#0F1E33;font-size:15px;">Bonjour <strong>${prenom} ${nom}</strong>,</p>
          <p style="color:#64748b;font-size:14px;">
            Le BDE a examiné les suggestions soumises. Voici le résumé des décisions prises.
          </p>
          ${buildSection(acceptes, "#10B981", "✅", "Suggestions acceptées")}
          ${buildSection(aDiscuter, "#F59E0B", "💬", "Suggestions à approfondir")}
          ${buildSection(refuses, "#EF4444", "❌", "Suggestions refusées")}
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;text-align:center;">
            Ce message a été envoyé automatiquement par HEI STDhub · Bureau Des Étudiants
          </p>
        </div>
      </div>
    `;

    const emailPromises = recipients.map((r) =>
      transporter.sendMail({
        from: `"BDE — HEI STDhub" <${process.env.EMAIL_USER}>`,
        to: r.email,
        subject: "📬 Retour du BDE sur les suggestions",
        html: resumeHtml(r.prenom, r.nom),
      }),
    );

    await Promise.allSettled(emailPromises);

    res.json({ message: `Emails envoyés à ${recipients.length} personnes.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
