const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const router = express.Router();

// Start Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google OAuth Callback
router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", successRedirect: "/dashboard" })
);

// Logout
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/"); // after logout redirect
  });
});

module.exports = router;
