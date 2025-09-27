function isAuthenticated(req, res, next) {

  console.log('↪️', req.path,
              '| cookie?', !!req.headers.cookie,
              '| isAuth', req.isAuthenticated(),
              '| user', req.user?.email);
  // next();
    console.log("req.isAuthenticated()  ",req.isAuthenticated());
    // console.log(req)
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
}

module.exports = isAuthenticated;
