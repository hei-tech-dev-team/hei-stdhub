const crypto = require("crypto");
const db = require("../db");
const {
  REFRESH_TOKEN_TTL_DAYS,
  REFRESH_REUSE_GRACE_SECONDS,
  AUTH_CACHE_TTL_MS,
  MAX_SESSIONS_PER_USER,
  SESSION_RETENTION_DAYS,
} = require("../config/auth");

const cache = new Map();

const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

const generateToken = () => crypto.randomBytes(32).toString("base64url");

const safeCompare = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const cacheSet = (sid, user) => {
  if (!AUTH_CACHE_TTL_MS) return;
  cache.set(sid, { user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
};

const cacheGet = (sid) => {
  const entry = cache.get(sid);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(sid);
    return null;
  }
  return entry.user;
};

const cacheDelete = (sid) => cache.delete(sid);

const cacheDeleteUser = (userId) => {
  for (const [sid, entry] of cache) {
    if (entry.user.id === userId) cache.delete(sid);
  }
};

const requestMeta = (req) => ({
  userAgent: String(req?.get?.("user-agent") || "").slice(0, 512) || null,
  ip: String(req?.clientIp || req?.ip || "").slice(0, 64) || null,
});

const buildUser = (row) => ({
  id: row.id,
  ref: row.ref,
  nom: row.nom,
  prenom: row.prenom,
  email: row.email,
  pseudo: row.pseudo || "",
  role: row.role,
  ues: row.ues || [],
  avatar: row.avatar || null,
  token_version: row.token_version,
});

const publicUser = (user) => ({
  id: user.id,
  ref: user.ref,
  nom: user.nom,
  prenom: user.prenom,
  email: user.email,
  pseudo: user.pseudo || "",
  role: user.role,
  ues: user.ues || [],
  avatar: user.avatar || null,
});

const createSession = async ({ user, req, client = db }) => {
  const sid = crypto.randomUUID();
  const refreshToken = generateToken();
  const csrfToken = generateToken();
  const tokenVersion = user.token_version ?? 0;
  const { userAgent, ip } = requestMeta(req);

  const limit = Math.max(MAX_SESSIONS_PER_USER, 1);
  const { rows: capped } = await client.query(
    `UPDATE sessions
     SET revoked_at = NOW(), revoked_reason = 'limit'
     WHERE id IN (
       SELECT id FROM sessions
       WHERE user_id = $1 AND revoked_at IS NULL
       ORDER BY created_at ASC
       OFFSET $2
     )
     RETURNING id`,
    [user.id, Math.max(limit - 1, 0)],
  );
  capped.forEach((row) => cacheDelete(row.id));

  await client.query(
    `INSERT INTO sessions
       (id, user_id, refresh_token_hash, csrf_token_hash, token_version,
        user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + ($8 * INTERVAL '1 day'))`,
    [
      sid,
      user.id,
      hashToken(refreshToken),
      hashToken(csrfToken),
      tokenVersion,
      userAgent,
      ip,
      REFRESH_TOKEN_TTL_DAYS,
    ],
  );

  return { id: sid, csrfToken, refreshToken };
};

const rotateSession = async ({ refreshToken, csrfToken, req, io }) => {
  if (!refreshToken) return { error: "invalid" };
  if (!csrfToken) return { error: "csrf" };

  const client = await db.pool.connect();
  let outcome;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT s.id AS session_id,
              s.refresh_token_hash,
              s.previous_refresh_token_hash,
              s.previous_valid_until,
              s.csrf_token_hash,
              s.token_version AS session_token_version,
              s.expires_at,
              s.revoked_at,
              u.id, u.ref, u.nom, u.prenom, u.email, u.pseudo, u.role,
              COALESCE(u.ues, '{}') AS ues, u.avatar, u.first_login,
              u.token_version
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1 OR s.previous_refresh_token_hash = $1
       ORDER BY s.created_at DESC
       LIMIT 1
       FOR UPDATE OF s`,
      [hashToken(refreshToken)],
    );

    const session = rows[0];
    if (!session) {
      await client.query("ROLLBACK");
      return { error: "invalid" };
    }

    if (session.revoked_at) {
      await client.query("ROLLBACK");
      return { error: "revoked", sessionId: session.session_id };
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      await client.query(
        `UPDATE sessions SET revoked_at = NOW(), revoked_reason = 'expired' WHERE id = $1`,
        [session.session_id],
      );
      await client.query("COMMIT");
      cacheDelete(session.session_id);
      outcome = { error: "expired", sessionId: session.session_id };
    } else if (session.session_token_version !== session.token_version) {
      await client.query(
        `UPDATE sessions SET revoked_at = NOW(), revoked_reason = 'version' WHERE id = $1`,
        [session.session_id],
      );
      await client.query("COMMIT");
      cacheDelete(session.session_id);
      outcome = { error: "revoked", sessionId: session.session_id };
    } else if (!safeCompare(hashToken(csrfToken), session.csrf_token_hash)) {
      await client.query("ROLLBACK");
      return { error: "csrf" };
    } else {
      const receivedHash = hashToken(refreshToken);
      const isCurrent = session.refresh_token_hash === receivedHash;

      if (!isCurrent) {
        const graceValid =
          session.previous_valid_until &&
          new Date(session.previous_valid_until).getTime() > Date.now();
        if (!graceValid) {
          await client.query(
            `UPDATE sessions SET revoked_at = NOW(), revoked_reason = 'reuse' WHERE id = $1`,
            [session.session_id],
          );
          await client.query("COMMIT");
          cacheDelete(session.session_id);
          outcome = {
            error: "reuse",
            sessionId: session.session_id,
            userId: session.id,
          };
        } else {
          const { userAgent, ip } = requestMeta(req);
          await client.query(
            `UPDATE sessions SET last_used_at = NOW(), user_agent = $2, ip = $3 WHERE id = $1`,
            [session.session_id, userAgent, ip],
          );
          await client.query("COMMIT");
          outcome = {
            user: buildUser(session),
            sessionId: session.session_id,
            tokenVersion: session.token_version,
            graceful: true,
          };
        }
      } else {
        const nextRefreshToken = generateToken();
        const { userAgent, ip } = requestMeta(req);
        await client.query(
          `UPDATE sessions
           SET refresh_token_hash = $2,
               previous_refresh_token_hash = $3,
               previous_valid_until = NOW() + ($4 * INTERVAL '1 second'),
               last_used_at = NOW(),
               user_agent = $5,
               ip = $6
           WHERE id = $1`,
          [
            session.session_id,
            hashToken(nextRefreshToken),
            session.refresh_token_hash,
            REFRESH_REUSE_GRACE_SECONDS,
            userAgent,
            ip,
          ],
        );
        await client.query("COMMIT");
        outcome = {
          user: buildUser(session),
          sessionId: session.session_id,
          tokenVersion: session.token_version,
          refreshToken: nextRefreshToken,
          graceful: false,
        };
      }
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  if (outcome?.error === "reuse" && outcome.sessionId) {
    if (io) {
      io.to(`session:${outcome.sessionId}`).emit("session:revoked", {
        reason: "reuse",
      });
      io.to(`session:${outcome.sessionId}`).disconnectSockets(true);
    }
  }

  return outcome;
};

const revokeSession = async (sid, reason, io) => {
  cacheDelete(sid);
  const { rows } = await db.query(
    `UPDATE sessions
     SET revoked_at = NOW(), revoked_reason = $2
     WHERE id = $1 AND revoked_at IS NULL
     RETURNING id`,
    [sid, reason],
  );
  if (rows[0] && io) {
    io.to(`session:${sid}`).emit("session:revoked", { reason });
    io.to(`session:${sid}`).disconnectSockets(true);
  }
  return rows[0] || null;
};

const revokeSessionByRefreshToken = async ({
  refreshToken,
  csrfToken,
  reason,
  io,
}) => {
  if (!refreshToken || !csrfToken) return null;
  const { rows } = await db.query(
    `SELECT id, csrf_token_hash
     FROM sessions
     WHERE refresh_token_hash = $1 OR previous_refresh_token_hash = $1
     LIMIT 1`,
    [hashToken(refreshToken)],
  );
  const session = rows[0];
  if (!session) return null;
  if (!safeCompare(hashToken(csrfToken), session.csrf_token_hash)) return null;
  return revokeSession(session.id, reason, io);
};

const revokeOwnedSession = async (userId, sid, io) => {
  cacheDelete(sid);
  const { rows } = await db.query(
    `UPDATE sessions
     SET revoked_at = NOW(), revoked_reason = 'manual'
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
     RETURNING id`,
    [sid, userId],
  );
  if (!rows[0]) return null;
  if (io) {
    io.to(`session:${sid}`).emit("session:revoked", { reason: "manual" });
    io.to(`session:${sid}`).disconnectSockets(true);
  }
  return rows[0];
};

const revokeUserSessions = async (
  userId,
  reason,
  { client = db, bumpVersion = true } = {},
) => {
  const { rows } = await client.query(
    `UPDATE sessions
     SET revoked_at = NOW(), revoked_reason = $2
     WHERE user_id = $1 AND revoked_at IS NULL
     RETURNING id`,
    [userId, reason],
  );
  rows.forEach((row) => cacheDelete(row.id));
  cacheDeleteUser(userId);

  let tokenVersion;
  if (bumpVersion) {
    const result = await client.query(
      "UPDATE users SET token_version = token_version + 1 WHERE id = $1 RETURNING token_version",
      [userId],
    );
    tokenVersion = result.rows[0]?.token_version;
  }

  return { sessionIds: rows.map((row) => row.id), tokenVersion };
};

const disconnectUser = (io, userId, reason, emit = true) => {
  if (!io) return;
  const room = `user:${userId}`;
  if (emit) io.to(room).emit("session:revoked", { reason });
  io.to(room).disconnectSockets(true);
};

const revokeAllForUser = async (userId, reason, io, { emit = true } = {}) => {
  const client = await db.pool.connect();
  let result;
  try {
    await client.query("BEGIN");
    result = await revokeUserSessions(userId, reason, { client });
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  disconnectUser(io, userId, reason, emit);
  return result;
};

const listSessions = async (userId, currentSid) => {
  const { rows } = await db.query(
    `SELECT id, created_at, last_used_at, expires_at, user_agent, ip
     FROM sessions
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY last_used_at DESC`,
    [userId],
  );
  return rows.map((row) => ({ ...row, current: row.id === currentSid }));
};

const verifySession = async (sid, userId) => {
  const cached = cacheGet(sid);
  if (cached && cached.id === userId) return cached;

  const { rows } = await db.query(
    `SELECT s.id AS session_id,
            s.token_version AS session_token_version,
            s.expires_at,
            u.id, u.ref, u.nom, u.prenom, u.email, u.pseudo, u.role,
            COALESCE(u.ues, '{}') AS ues, u.avatar, u.first_login,
            u.token_version
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.user_id = $2
       AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
    [sid, userId],
  );
  const row = rows[0];
  if (!row) return null;

  if (row.session_token_version !== row.token_version) {
    await revokeSession(sid, "version", null);
    return null;
  }

  const user = buildUser(row);
  cacheSet(sid, user);
  return user;
};

const cleanupSessions = async () => {
  const { rows } = await db.query(
    `DELETE FROM sessions
     WHERE expires_at < NOW() - ($1 * INTERVAL '1 day')
        OR (revoked_at IS NOT NULL AND revoked_at < NOW() - ($1 * INTERVAL '1 day'))
     RETURNING id`,
    [SESSION_RETENTION_DAYS],
  );
  return rows.length;
};

module.exports = {
  hashToken,
  publicUser,
  createSession,
  rotateSession,
  revokeSession,
  revokeSessionByRefreshToken,
  revokeOwnedSession,
  revokeUserSessions,
  revokeAllForUser,
  disconnectUser,
  listSessions,
  verifySession,
  cleanupSessions,
  invalidateUserCache: cacheDeleteUser,
};
