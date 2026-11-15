const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_ALGORITHMS = ["HS256"];
const TOKEN_TTL = "7d";

/** Signs an access token. `tv` (token_version) lets the server revoke it. */
function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      ref: user.ref,
      role: user.role,
      pseudo: user.pseudo || "",
      ues: user.ues || [],
      tv: user.token_version ?? 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL, algorithm: "HS256" },
  );
}

/**
 * Verifies the signature AND the account's current state in the database:
 * a deleted account, or a token issued before the last token_version bump
 * (password change/reset), is rejected. Role, pseudo and UEs always come
 * from the database, so a demotion takes effect immediately.
 * Returns the user or null.
 */
async function verifyAccessToken(token) {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: JWT_ALGORITHMS });
  } catch {
    return null;
  }
  if (!Number.isInteger(decoded?.id)) return null;

  const { rows } = await db.query(
    `SELECT id, ref, role, pseudo, COALESCE(ues, '{}') AS ues, token_version
     FROM users WHERE id = $1`,
    [decoded.id],
  );
  const user = rows[0];
  if (!user) return null;
  if ((decoded.tv ?? 0) !== user.token_version) return null;

  return {
    ...decoded,
    id: user.id,
    ref: user.ref,
    role: user.role,
    pseudo: user.pseudo || "",
    ues: user.ues,
  };
}

/** Invalidates every token previously issued to this user. */
async function revokeUserTokens(userId, client = db) {
  const { rows } = await client.query(
    "UPDATE users SET token_version = token_version + 1 WHERE id = $1 RETURNING token_version",
    [userId],
  );
  return rows[0]?.token_version;
}

module.exports = { signAccessToken, verifyAccessToken, revokeUserTokens, JWT_ALGORITHMS };
