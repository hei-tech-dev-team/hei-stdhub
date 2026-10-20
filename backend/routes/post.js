const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");
const storage = require("../services/storage");
const router = express.Router();

const ANNOUNCES_ROLES = ["admin", "bde", "teacher"];
const ALLOWED_REACTIONS = ["like", "haha", "dislike", "sad"];
const MAX_TITLE = 150;
const MAX_CONTENT = 5000;

const isValidId = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

const getClient = () => (db.pool || db).connect();

const POST_SELECT = `
    SELECT
        p.id,
        p.type,
        p.title,
        p.content,
        p.is_pinned,
        p.created_at,
        p.updated_at,
        p.author_id,
        to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_created_at,
        json_build_object(
            'id', u.id,
            'pseudo', u.pseudo,
            'avatar', u.avatar,
            'role', u.role
        ) AS author,
        COALESCE(
            (
                SELECT json_agg(
                    json_build_object(
                        'id', pa.id,
                        'kind', pa.kind,
                        'url', pa.url,
                        'file_name', pa.file_name,
                        'mime_type', pa.mime_type,
                        'size_bytes', pa.size_bytes
                    ) ORDER BY pa.id
                )
                FROM post_attachments pa
                WHERE pa.post_id = p.id
            ), '[]'::json
        ) AS attachments,
        COALESCE(
            (
                SELECT json_object_agg(r.kind, r.count)
                FROM (
                    SELECT kind, COUNT(*)::int AS count
                    FROM post_reactions
                    WHERE post_id = p.id
                    GROUP BY kind
                ) r
            ), '{}'::json
        ) AS reactions_summary,
        (
            SELECT kind
            FROM post_reactions
            WHERE post_id = p.id AND user_id = $1
        ) AS user_reaction
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
`;

async function fetchPost(postId, userId) {
    const { rows } = await db.query(
        `${POST_SELECT} WHERE p.id = $2 AND p.deleted_at IS NULL`,
        [userId, postId]
    );
    const post = rows[0];
    if (post) delete post.cursor_created_at;
    return post;
}

router.get("/", auth, async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
        const rawCursorDate = req.query.cursor_created_at;
        const cursorId = req.query.cursor_id ? parseInt(req.query.cursor_id, 10) : null;

        const queryParams = [req.user.id, limit + 1];
        let cursorCondition = "";

        if (rawCursorDate && !isNaN(Date.parse(rawCursorDate)) && cursorId) {
            queryParams.push(rawCursorDate, cursorId);
            cursorCondition = `AND (p.created_at, p.id) < ($3::timestamptz, $4::integer)`;
        }

        const query = `
            ${POST_SELECT}
            WHERE p.deleted_at IS NULL
            ${cursorCondition}
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT $2;
        `;

        const { rows } = await db.query(query, queryParams);

        let hasNextPage = false;
        let nextCursor = null;

        if (rows.length > limit) {
            hasNextPage = true;
            rows.pop();
        }

        if (rows.length > 0) {
            const lastPost = rows[rows.length - 1];
            nextCursor = {
                created_at: lastPost.cursor_created_at,
                id: lastPost.id
            };
        }

        rows.forEach((r) => delete r.cursor_created_at);

        return res.status(200).json({
            data: rows,
            pagination: {
                hasNextPage,
                nextCursor
            }
        });

    } catch (err) {
        console.error("Erreur GET /posts:", err);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération du feed" });
    }
});

router.post("/", auth, storage.many("files"), async (req, res) => {
    const content = req.body.content?.trim();
    const title = req.body.title?.trim() || null;
    const type = req.body.type === "announcement" ? "announcement" : "post";

    if (!content) {
        return res.status(400).json({ error: "Contenu requis" });
    }
    if (content.length > MAX_CONTENT) {
        return res.status(400).json({ error: `Contenu trop long (${MAX_CONTENT} caractères max)` });
    }
    if (title && title.length > MAX_TITLE) {
        return res.status(400).json({ error: `Titre trop long (${MAX_TITLE} caractères max)` });
    }
    if (type === "announcement") {
        if (!ANNOUNCES_ROLES.includes(req.user.role)) {
            return res.status(403).json({ error: "Réservé au BDE/admin/Enseignant" });
        }
        if (!title) {
            return res.status(400).json({ error: "Titre requis pour une annonce" });
        }
    }

    let savedFiles = [];
    let client;
    let committed = false;

    try {
        if (req.files && req.files.length > 0) {
            savedFiles = await Promise.all(
                req.files.map((f) => storage.saveFile(f, "posts"))
            );
        }

        client = await getClient();
        await client.query("BEGIN");

        const postResult = await client.query(
            `INSERT INTO posts (author_id, type, title, content)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [req.user.id, type, title, content]
        );
        const postId = postResult.rows[0].id;

        for (const f of savedFiles) {
            await client.query(
                `INSERT INTO post_attachments
                    (post_id, kind, url, file_name, mime_type, size_bytes, storage_key, resource_type)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    postId,
                    f.isImage ? "image" : "file",
                    f.url,
                    f.filename,
                    f.mimeType,
                    f.size,
                    f.key,
                    f.resourceType
                ]
            );
        }

        await client.query("COMMIT");
        committed = true;

        const post = await fetchPost(postId, req.user.id);
        return res.status(201).json(post);

    } catch (err) {
        console.error("Erreur POST /posts:", err);
        if (!committed) {
            if (client) await client.query("ROLLBACK").catch(() => {});
            if (savedFiles.length > 0) {
                await Promise.allSettled(
                    savedFiles.map((f) => storage.removeFile(f.key, f.resourceType))
                );
            }
        }
        return res.status(500).json({ error: "Erreur serveur lors de la création de la publication" });
    } finally {
        if (client) client.release();
    }
});

router.patch("/:id", auth, async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: "ID invalide" });

    const content = req.body.content?.trim();
    const title = req.body.title?.trim();

    if (content === undefined && title === undefined) {
        return res.status(400).json({ error: "Aucun champ à modifier fourni" });
    }
    if (content === "") {
        return res.status(400).json({ error: "Le contenu ne peut pas être vide" });
    }
    if (content !== undefined && content.length > MAX_CONTENT) {
        return res.status(400).json({ error: `Contenu trop long (${MAX_CONTENT} caractères max)` });
    }
    if (title !== undefined && title.length > MAX_TITLE) {
        return res.status(400).json({ error: `Titre trop long (${MAX_TITLE} caractères max)` });
    }

    try {
        const check = await db.query(
            "SELECT id, author_id, type FROM posts WHERE id = $1 AND deleted_at IS NULL",
            [id]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ error: "Publication non trouvée" });
        }
        const post = check.rows[0];
        if (post.author_id !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ error: "Action non autorisée" });
        }
        if (post.type === "announcement" && title === "") {
            return res.status(400).json({ error: "Le titre d'une annonce ne peut pas être vide" });
        }
        await db.query(
            `UPDATE posts
             SET title = COALESCE($1, title),
                 content = COALESCE($2, content),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND deleted_at IS NULL`,
            [title !== undefined ? title : null, content !== undefined ? content : null, id]
        );

        const updated = await fetchPost(id, req.user.id);
        return res.status(200).json(updated);

    } catch (err) {
        console.error("Erreur PATCH /posts/:id:", err);
        return res.status(500).json({ error: "Erreur serveur lors de la modification" });
    }
});

router.delete("/:id", auth, async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: "ID invalide" });

    try {
        const check = await db.query(
            "SELECT id, author_id FROM posts WHERE id = $1 AND deleted_at IS NULL",
            [id]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ error: "Publication non trouvée ou déjà supprimée" });
        }

        const post = check.rows[0];

        if (post.author_id !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ error: "Action non autorisée" });
        }

        await db.query(
            "UPDATE posts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1",
            [id]
        );

        return res.status(200).json({ message: "Publication supprimée avec succès" });

    } catch (err) {
        console.error("Erreur DELETE /posts/:id:", err);
        return res.status(500).json({ error: "Erreur serveur lors de la suppression" });
    }
});

router.put("/:id/reaction", auth, async (req, res) => {
    const { id } = req.params;
    const { kind } = req.body;
    if (!isValidId(id)) return res.status(400).json({ error: "ID invalide" });

    if (!kind || !ALLOWED_REACTIONS.includes(kind)) {
        return res.status(400).json({
            error: `Réaction invalide. Valeurs acceptées : ${ALLOWED_REACTIONS.join(", ")}`
        });
    }
    try {
        const postCheck = await db.query(
            "SELECT id FROM posts WHERE id = $1 AND deleted_at IS NULL",
            [id]
        );

        if (postCheck.rows.length === 0) {
            return res.status(404).json({ error: "Publication non trouvée" });
        }

        const reactionResult = await db.query(
            `INSERT INTO post_reactions (user_id, post_id, kind)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, post_id)
             DO UPDATE SET kind = EXCLUDED.kind, created_at = CURRENT_TIMESTAMP
             RETURNING user_id, post_id, kind, created_at`,
            [req.user.id, id, kind]
        );

        return res.status(200).json(reactionResult.rows[0]);

    } catch (err) {
        console.error("Erreur PUT /posts/:id/reaction:", err);
        return res.status(500).json({ error: "Erreur serveur lors de l'ajout de la réaction" });
    }
});

router.delete("/:id/reaction", auth, async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: "ID invalide" });

    try {
        const deleteResult = await db.query(
            `DELETE FROM post_reactions
             WHERE user_id = $1 AND post_id = $2
             RETURNING post_id`,
            [req.user.id, id]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: "Réaction non trouvée" });
        }

        return res.status(200).json({ message: "Réaction retirée avec succès" });

    } catch (err) {
        console.error("Erreur DELETE /posts/:id/reaction:", err);
        return res.status(500).json({ error: "Erreur serveur lors du retrait de la réaction" });
    }
});

module.exports = router;