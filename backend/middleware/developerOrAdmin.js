module.exports = function developerOrAdmin(req, res, next) {
  if (!["admin", "developer"].includes(req.user?.role))
    return res.status(403).json({ error: "Acces reserve." });
  next();
};
