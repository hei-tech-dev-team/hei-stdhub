const proxySecret = process.env.AUTH_PROXY_SECRET;

module.exports = function clientIp(req, res, next) {
  const forwarded = req.headers["x-forwarded-for"];
  const secret = req.headers["x-proxy-secret"];

  if (proxySecret && secret === proxySecret && typeof forwarded === "string") {
    req.clientIp = forwarded.split(",")[0].trim().slice(0, 64);
  } else {
    req.clientIp = String(req.ip || req.socket?.remoteAddress || "").slice(0, 64);
  }

  next();
};
