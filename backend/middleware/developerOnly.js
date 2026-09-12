module.exports = function developerOnly(req, res, next) {
  if (req.user?.role !== "developer")
    return res.status(403).json({ error: "Acces reserve aux developpeurs." });
  next();
};
