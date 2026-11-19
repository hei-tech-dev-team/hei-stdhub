const API_URL = (process.env.API_URL || "").replace(/\/+$/, "");
const PROXY_SECRET = process.env.AUTH_PROXY_SECRET || "";
const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE", "OPTIONS"]);
const FORWARDED_HEADERS = [
  "authorization",
  "cookie",
  "origin",
  "referer",
  "user-agent",
  "x-csrf-token",
];

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!API_URL) {
    return res.status(500).json({ error: "API_URL manquante." });
  }

  const segments = req.query.path;
  const path = Array.isArray(segments)
    ? segments.join("/")
    : String(segments || "");

  if (!path || path === "avatar" || path.startsWith("avatar/")) {
    return res.status(404).json({ error: "Route introuvable." });
  }

  if (!/^[a-zA-Z0-9/_-]+$/.test(path)) {
    return res.status(400).json({ error: "Chemin invalide." });
  }

  if (!ALLOWED_METHODS.has(req.method)) {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const headers = {
    "content-type": req.headers["content-type"] || "application/json",
    accept: "application/json",
  };

  FORWARDED_HEADERS.forEach((name) => {
    if (req.headers[name]) headers[name] = req.headers[name];
  });

  const forwarded = req.headers["x-forwarded-for"];
  const clientIp =
    (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") ||
    req.socket?.remoteAddress ||
    "";

  if (clientIp) headers["x-forwarded-for"] = clientIp;
  if (PROXY_SECRET) headers["x-proxy-secret"] = PROXY_SECRET;

  let body;
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    body =
      typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {});
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/${path}`, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    const setCookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [];
    if (setCookies.length) {
      res.setHeader("Set-Cookie", setCookies);
    } else {
      const single = response.headers.get("set-cookie");
      if (single) res.setHeader("Set-Cookie", single);
    }

    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    const text = await response.text();
    res.status(response.status);
    return res.send(text);
  } catch {
    return res.status(502).json({
      error: "Service d'authentification indisponible.",
    });
  }
}
