const jwt = require("jsonwebtoken");
const db = require("../db");
const { verifySession } = require("./sessionService");
const {
  ACCESS_TOKEN_TTL_SECONDS,
  JWT_ISSUER,
  JWT_AUDIENCE,
} = require("../config/auth");

const JWT_ALGORITHMS = ["HS256"];

function signAccessToken(user) {
  const sessionId = user.session_id || user.sid;
  if (!sessionId) throw new Error("session_id requis");
  return jwt.sign(
    { sid: sessionId, tv: user.token_version ?? 0 },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      subject: String(user.id),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );
}

async function verifyAccessToken(token) {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: JWT_ALGORITHMS,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      clockTolerance: 5,
    });
  } catch {
    return null;
  }

  const userId = Number(decoded?.sub);
  const sid = decoded?.sid;
  if (!Number.isInteger(userId) || typeof sid !== "string" || !sid) return null;

  const user = await verifySession(sid, userId);
  if (!user) return null;
  if ((decoded.tv ?? 0) !== user.token_version) return null;

  return {
    ...user,
    sid,
    tv: user.token_version,
    exp: decoded.exp,
    iat: decoded.iat,
  };
}

async function revokeUserTokens(userId, client = db) {
  const { rows } = await client.query(
    "UPDATE users SET token_version = token_version + 1 WHERE id = $1 RETURNING token_version",
    [userId],
  );
  return rows[0]?.token_version;
}

module.exports = { signAccessToken, verifyAccessToken, revokeUserTokens, JWT_ALGORITHMS };
