const { verifyAccessToken } = require("../services/tokenAuth");

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "Token manquant." });

  try {
    const user = await verifyAccessToken(header.split(" ")[1]);
    if (!user) return res.status(401).json({ error: "Token invalide." });
    req.user = user;
    next();
  } catch (err) {
    console.error("[auth] token verification failed:", err.message);
    return res.status(500).json({ error: "Erreur serveur." });
  }
};
