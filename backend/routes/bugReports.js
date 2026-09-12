const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");
const developerOrAdmin = require("../middleware/developerOrAdmin");
const { sendPushToUser } = require("../services/notificationService");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  const { title, description, page, severity } = req.body;
  if (!title?.trim() || !description?.trim())
    return res.status(400).json({ error: "Titre et description requis." });
  const validSeverities = ["low", "medium", "high", "critical"];
  if (severity && !validSeverities.includes(severity))
    return res.status(400).json({ error: "Severite invalide." });

  try {
    const { rows } = await db.query(
      `INSERT INTO bug_reports (reporter_id, title, description, page, severity)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        req.user.id,
        title.trim(),
        description.trim(),
        page || null,
        severity || "medium",
      ],
    );
    res.status(201).json(rows[0]);

    const { rows: devUsers } = await db.query(
      "SELECT id FROM users WHERE role = 'developer'"
    );
    for (const dev of devUsers) {
      sendPushToUser(dev.id, {
        title: "Nouveau bug report",
        body: `${title.trim()} (${severity || "medium"})`,
        tag: `bug-report-${rows[0].id}`,
        url: "/admin",
        type: "bug_report",
      }).catch(() => {});
    }
  } catch (err) {
    console.error("ERREUR POST /bug-reports:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.get("/", auth, developerOrAdmin, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 50, 200);
    const pageOffset = Math.max(parseInt(offset) || 0, 0);
    let whereClause = "WHERE 1=1";
    const params = [];
    if (status) {
      params.push(status);
      whereClause += ` AND br.status = $${params.length}`;
    }
    params.push(pageLimit);
    params.push(pageOffset);
    const { rows } = await db.query(
      `SELECT br.*, u.pseudo AS reporter_pseudo, u.ref AS reporter_ref
       FROM bug_reports br
       LEFT JOIN users u ON br.reporter_id = u.id
       ${whereClause}
       ORDER BY br.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*)::int AS total FROM bug_reports br ${whereClause}`,
      params.slice(0, -2),
    );
    res.json({ reports: rows, total: countRows[0]?.total || 0 });
  } catch (err) {
    console.error("ERREUR GET /bug-reports:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.patch("/:id", auth, developerOrAdmin, async (req, res) => {
  const { status } = req.body;
  if (!["open", "in_progress", "resolved", "closed"].includes(status))
    return res.status(400).json({ error: "Statut invalide." });
  try {
    const resolvedAt = status === "resolved" ? new Date() : null;
    const { rows } = await db.query(
      `UPDATE bug_reports SET status = $1, resolved_at = $2 WHERE id = $3 RETURNING *`,
      [status, resolvedAt, req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Report introuvable." });
    res.json(rows[0]);
  } catch (err) {
    console.error("ERREUR PATCH /bug-reports:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.delete("/:id", auth, developerOrAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      "DELETE FROM bug_reports WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Report introuvable." });
    res.json({ success: true });
  } catch (err) {
    console.error("ERREUR DELETE /bug-reports:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
