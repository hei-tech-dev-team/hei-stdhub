const express = require("express");
const router = express.Router();
const db = require("../db");
const auth = require("../middleware/auth");
const { Resend } = require("resend");

let resend;
const getResend = () => {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
};

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

// POST /api/suggestions/confirm — BDE confirme, envoie les emails et supprime les suggestions
router.post("/confirm", auth, async (req, res) => {
  if (req.user.role !== "bde")
    return res.status(403).json({ error: "Accès réservé au BDE." });

  try {
    // Récupérer toutes les suggestions traitées
    const { rows: suggestions } = await db.query(
      `SELECT s.*, u.nom, u.prenom, u.role AS auteur_role
       FROM suggestions s
       JOIN users u ON s.student_id = u.id
       WHERE s.statut != 'recu'`,
    );

    if (suggestions.length === 0)
      return res
        .status(400)
        .json({ error: "Aucune suggestion traitée à confirmer." });

    // Récupérer tous les destinataires (étudiants + profs)
    const { rows: recipients } = await db.query(
      "SELECT email, nom, prenom FROM users WHERE role IN ('student', 'teacher')",
    );

    const acceptes = suggestions.filter((s) => s.statut === "accepte");
    const aDiscuter = suggestions.filter((s) => s.statut === "a_discuter");
    const refuses = suggestions.filter((s) => s.statut === "refuse");

    const buildSection = (items, color, emoji, title) => {
      if (items.length === 0) return "";
      let html = `
        <h2 style="color:#0F1E33;border-left:4px solid ${color};padding-left:12px;margin-top:28px;font-size:16px;">
          ${emoji} ${title} (${items.length})
        </h2>
        <ul style="list-style:none;padding:0;margin:0;">
      `;
      items.forEach((s) => {
        const auteur = s.anonyme ? "Anonyme" : `${s.prenom} ${s.nom}`;
        html += `
          <li style="background:white;border-radius:10px;padding:16px;margin-bottom:10px;border:1px solid #e2e8f0;border-left:4px solid ${color};">
            <strong style="color:#0F1E33;font-size:14px;">${s.titre}</strong>
            <p style="color:#64748b;margin:8px 0 0;font-size:13px;line-height:1.5;">${s.contenu}</p>
            <p style="color:#94a3b8;margin:6px 0 0;font-size:12px;">— ${auteur}</p>
            ${s.justification ? `<div style="margin-top:10px;padding:10px;background:#fef2f2;border-radius:6px;"><p style="color:#ef4444;margin:0;font-size:12px;"><strong>Justification BDE :</strong> ${s.justification}</p></div>` : ""}
          </li>
        `;
      });
      html += `</ul>`;
      return html;
    };

    const buildEmail = (prenom, nom) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:32px auto;background:#f8fafc;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <div style="background:#0F1E33;padding:32px 24px;text-align:center;">
            <h1 style="color:#F5A623;margin:0;font-size:28px;letter-spacing:2px;">HEI STDhub</h1>
            <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px;">Bureau Des Étudiants — Retour officiel</p>
          </div>

          <!-- Body -->
          <div style="padding:32px 24px;">
            <p style="color:#0F1E33;font-size:15px;margin:0 0 8px;">Bonjour <strong>${prenom} ${nom}</strong>,</p>
            <p style="color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.6;">
              Le BDE a examiné l'ensemble des suggestions soumises et vous communique ses décisions.
            </p>

            ${buildSection(acceptes, "#10B981", "✅", "Suggestions acceptées")}
            ${buildSection(aDiscuter, "#F59E0B", "💬", "Suggestions à approfondir")}
            ${buildSection(refuses, "#EF4444", "❌", "Suggestions refusées")}

            <!-- Stats -->
            <div style="display:flex;gap:12px;margin-top:28px;flex-wrap:wrap;">
              ${acceptes.length > 0 ? `<div style="flex:1;min-width:120px;background:#f0fdf4;border-radius:10px;padding:14px;text-align:center;border:1px solid #bbf7d0;"><p style="color:#10B981;font-size:24px;font-weight:bold;margin:0;">${acceptes.length}</p><p style="color:#166534;font-size:12px;margin:4px 0 0;">Acceptée(s)</p></div>` : ""}
              ${aDiscuter.length > 0 ? `<div style="flex:1;min-width:120px;background:#fffbeb;border-radius:10px;padding:14px;text-align:center;border:1px solid #fde68a;"><p style="color:#F59E0B;font-size:24px;font-weight:bold;margin:0;">${aDiscuter.length}</p><p style="color:#92400e;font-size:12px;margin:4px 0 0;">À discuter</p></div>` : ""}
              ${refuses.length > 0 ? `<div style="flex:1;min-width:120px;background:#fef2f2;border-radius:10px;padding:14px;text-align:center;border:1px solid #fecaca;"><p style="color:#EF4444;font-size:24px;font-weight:bold;margin:0;">${refuses.length}</p><p style="color:#991b1b;font-size:12px;margin:4px 0 0;">Refusée(s)</p></div>` : ""}
            </div>
          </div>

          <!-- Footer -->
          <div style="background:#0F1E33;padding:20px 24px;text-align:center;">
            <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;">
              Cet email a été envoyé automatiquement par HEI STDhub · Ne pas répondre à cet email
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Envoyer les emails via Resend
    const emailPromises = recipients.map((r) =>
      getResend().emails.send({
        from: "HEI STDhub BDE <noreply@hei-stdhub.com>",
        to: r.email,
        subject: "📬 Retour du BDE sur les suggestions",
        html: buildEmail(r.prenom, r.nom),
      }),
    );

    await Promise.allSettled(emailPromises);

    // Supprimer toutes les suggestions après confirmation
    await db.query("DELETE FROM suggestions");

    res.json({
      message: `Emails envoyés à ${recipients.length} personnes. Suggestions supprimées.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
