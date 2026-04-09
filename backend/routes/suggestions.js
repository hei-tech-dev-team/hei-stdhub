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

// POST /api/suggestions — étudiant soumet une suggestion
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "student")
    return res.status(403).json({ error: "Réservé aux étudiants." });

  const { titre, contenu } = req.body;
  if (!titre?.trim() || !contenu?.trim())
    return res.status(400).json({ error: "Titre et contenu requis." });

  try {
    const { rows } = await db.query(
      `INSERT INTO suggestions (student_id, titre, contenu)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, titre.trim(), contenu.trim()],
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
      `SELECT s.*, u.nom, u.prenom, u.email, u.ref
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
const validStatuts = ["recu", "accepte", "a_discuter", "refuse"];  if (!validStatuts.includes(statut))
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

// POST /api/suggestions/confirm — BDE confirme et envoie les emails à tous les étudiants
router.post("/confirm", auth, async (req, res) => {
  if (req.user.role !== "bde")
    return res.status(403).json({ error: "Accès réservé au BDE." });

  try {
    // Récupérer toutes les suggestions avec leur statut final
    const { rows: suggestions } = await db.query(
      `SELECT s.*, u.nom, u.prenom, u.email
       FROM suggestions s
       JOIN users u ON s.student_id = u.id
       WHERE s.statut != 'recu'`,
    );

    // Récupérer tous les emails étudiants
    const { rows: students } = await db.query(
      "SELECT email, nom, prenom FROM users WHERE role = 'student'",
    );

    // Construire le résumé des suggestions
    const aDiscuter = suggestions.filter((s) => s.statut === "a_discuter");
    const refuses = suggestions.filter((s) => s.statut === "refuse");

    let resumeHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0F1E33; padding: 24px; text-align: center;">
          <h1 style="color: #F5A623; margin: 0;">HEI STDhub</h1>
          <p style="color: #fff; margin: 8px 0 0;">Retour du BDE sur les suggestions</p>
        </div>
        <div style="padding: 24px; background: #f8fafc;">
    `;

    if (aDiscuter.length > 0) {
      resumeHtml += `
        <h2 style="color: #0F1E33; border-left: 4px solid #00E096; padding-left: 12px;">
          ✅ Suggestions retenues pour discussion (${aDiscuter.length})
        </h2>
        <ul style="list-style: none; padding: 0;">
      `;
      aDiscuter.forEach((s) => {
        resumeHtml += `
          <li style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 1px solid #e2e8f0;">
            <strong style="color: #0F1E33;">${s.titre}</strong>
            <p style="color: #64748b; margin: 8px 0 0; font-size: 14px;">${s.contenu}</p>
          </li>
        `;
      });
      resumeHtml += `</ul>`;
    }

    if (refuses.length > 0) {
      resumeHtml += `
        <h2 style="color: #0F1E33; border-left: 4px solid #FF4D9E; padding-left: 12px;">
          Suggestions refusées (${refuses.length})
        </h2>
        <ul style="list-style: none; padding: 0;">
      `;
      refuses.forEach((s) => {
        resumeHtml += `
          <li style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 1px solid #e2e8f0;">
            <strong style="color: #0F1E33;">${s.titre}</strong>
            <p style="color: #64748b; margin: 8px 0 0; font-size: 14px;">${s.contenu}</p>
            ${s.justification ? `<p style="color: #FF4D9E; margin: 8px 0 0; font-size: 13px;"><strong>Justification BDE :</strong> ${s.justification}</p>` : ""}
          </li>
        `;
      });
      resumeHtml += `</ul>`;
    }

    resumeHtml += `
        <p style="color: #64748b; font-size: 13px; margin-top: 24px; text-align: center;">
          Ce message a été envoyé automatiquement par HEI STDhub.
        </p>
        </div>
      </div>
    `;

    // Envoyer l'email à tous les étudiants
    const emailPromises = students.map((student) =>
      transporter.sendMail({
        from: `"HEI STDhub BDE" <${process.env.EMAIL_USER}>`,
        to: student.email,
        subject: "Retour du BDE sur vos suggestions",
        html: resumeHtml.replace(
          "Cher(e) étudiant(e)",
          `Bonjour ${student.prenom} ${student.nom}`,
        ),
      }),
    );

    await Promise.allSettled(emailPromises);

    res.json({ message: `Emails envoyés à ${students.length} étudiants.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
