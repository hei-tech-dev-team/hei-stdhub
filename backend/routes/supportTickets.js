const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");
const developerOrAdmin = require("../middleware/developerOrAdmin");
const { sendPushToUser } = require("../services/notificationService");

const router = express.Router();

// POST / — create a support ticket (any authenticated user)
router.post("/", auth, async (req, res) => {
  const { title, description, page } = req.body;
  if (!title?.trim() || !description?.trim())
    return res.status(400).json({ error: "Titre et description requis." });

  try {
    const { rows } = await db.query(
      `INSERT INTO support_tickets (reporter_id, title, description, page)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        req.user.id,
        title.trim(),
        description.trim(),
        page || null,
      ],
    );
    res.status(201).json(rows[0]);

    const { rows: devUsers } = await db.query(
      "SELECT id FROM users WHERE role = 'developer'"
    );
    for (const dev of devUsers) {
      sendPushToUser(dev.id, {
        title: "Nouvelle reclamation client",
        body: `${title.trim()}`,
        tag: `support-ticket-${rows[0].id}`,
        url: "/admin",
        type: "support_ticket",
      }).catch(() => {});
    }

    const io = req.app.get("io");
    if (io) {
      io.to("developers").emit("ticket:new", {
        ...rows[0],
        reporter_pseudo: req.user.pseudo,
        reporter_ref: req.user.ref,
      });
    }
  } catch (err) {
    console.error("ERREUR POST /support-tickets:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET / — list tickets (developer only)
router.get("/", auth, developerOrAdmin, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 50, 200);
    const pageOffset = Math.max(parseInt(offset) || 0, 0);
    let whereClause = "WHERE 1=1";
    const params = [];
    if (status) {
      params.push(status);
      whereClause += ` AND st.status = $${params.length}`;
    }
    params.push(pageLimit);
    params.push(pageOffset);
    const { rows } = await db.query(
      `SELECT st.*, u.pseudo AS reporter_pseudo, u.ref AS reporter_ref
       FROM support_tickets st
       LEFT JOIN users u ON st.reporter_id = u.id
       ${whereClause}
       ORDER BY st.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*)::int AS total FROM support_tickets st ${whereClause}`,
      params.slice(0, -2),
    );
    res.json({ tickets: rows, total: countRows[0]?.total || 0 });
  } catch (err) {
    console.error("ERREUR GET /support-tickets:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /:id — get ticket details with responses (developer only)
router.get("/:id", auth, developerOrAdmin, async (req, res) => {
  try {
    const { rows: ticketRows } = await db.query(
      `SELECT st.*, u.pseudo AS reporter_pseudo, u.ref AS reporter_ref, u.email AS reporter_email
       FROM support_tickets st
       LEFT JOIN users u ON st.reporter_id = u.id
       WHERE st.id = $1`,
      [req.params.id],
    );
    if (!ticketRows.length)
      return res.status(404).json({ error: "Ticket introuvable." });

    const { rows: responses } = await db.query(
      `SELECT str.*, u.pseudo AS author_pseudo, u.ref AS author_ref
       FROM support_ticket_responses str
       LEFT JOIN users u ON str.user_id = u.id
       WHERE str.ticket_id = $1
       ORDER BY str.created_at ASC`,
      [req.params.id],
    );
    res.json({ ticket: ticketRows[0], responses });
  } catch (err) {
    console.error("ERREUR GET /support-tickets/:id:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// PATCH /:id — update ticket status (developer only)
router.patch("/:id", auth, developerOrAdmin, async (req, res) => {
  const { status } = req.body;
  if (!["open", "in_progress", "resolved", "closed"].includes(status))
    return res.status(400).json({ error: "Statut invalide." });
  try {
    const { rows } = await db.query(
      `UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Ticket introuvable." });
    res.json(rows[0]);

    if (status === "resolved" || status === "closed") {
      const ticket = rows[0];
      if (ticket.reporter_id !== req.user.id) {
        sendPushToUser(ticket.reporter_id, {
          title: "Reclamation resolue",
          body: `Votre reclamation "${ticket.title}" a ete ${status === "resolved" ? "resolue" : "fermee"}.`,
          tag: `support-ticket-${ticket.id}`,
          url: "/support",
          type: "support_ticket_resolved",
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("ERREUR PATCH /support-tickets:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /:id/respond — add a response to a ticket (developer only)
router.post("/:id/respond", auth, developerOrAdmin, async (req, res) => {
  const { response } = req.body;
  if (!response?.trim())
    return res.status(400).json({ error: "Reponse requise." });
  try {
    const { rows: ticketRows } = await db.query(
      "SELECT id, reporter_id, title FROM support_tickets WHERE id = $1",
      [req.params.id],
    );
    if (!ticketRows.length)
      return res.status(404).json({ error: "Ticket introuvable." });

    const { rows } = await db.query(
      `INSERT INTO support_ticket_responses (ticket_id, user_id, response)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.user.id, response.trim()],
    );
    res.status(201).json(rows[0]);

    const ticket = ticketRows[0];
    if (ticket.reporter_id !== req.user.id) {
      sendPushToUser(ticket.reporter_id, {
        title: "Reponse a votre reclamation",
        body: `${response.trim().slice(0, 200)}`,
        tag: `support-ticket-${ticket.id}`,
        url: "/support",
        type: "support_ticket_response",
      }).catch(() => {});

      const io = req.app.get("io");
      if (io) {
        io.to(`user:${ticket.reporter_id}`).emit("ticket:response", {
          ticket_id: ticket.id,
          ticket_title: ticket.title,
          response: rows[0],
          author_pseudo: req.user.pseudo,
          author_ref: req.user.ref,
        });
      }
    }
  } catch (err) {
    console.error("ERREUR POST /support-tickets/:id/respond:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// DELETE /:id — delete a ticket (developer only)
router.delete("/:id", auth, developerOrAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      "DELETE FROM support_tickets WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Ticket introuvable." });
    res.json({ success: true });
  } catch (err) {
    console.error("ERREUR DELETE /support-tickets:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
