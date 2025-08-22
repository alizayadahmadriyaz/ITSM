function isAuthenticated(req, res, next) {
    console.log("req.isAuthenticated()  ",req.isAuthenticated());
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
}

module.exports = isAuthenticated;
