require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

// console.log("process.env.GOOGLE_CLIENT_SECRET  ",process.env.GOOGLE_CLIENT_SECRET);
const passport = require("passport");
require("./config/passport");
const session = require("express-session");
const authRoutes = require("./routes/auth");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const onboardingRoutes = require("./routes/onboarding");
const isAuthenticated = require("./middlewares/isAuthenticated");
const checkOnboarding = require("./middlewares/checkOnboarding");

// Session for passport (needed for OAuth)
app.use(session({
  secret: process.env.SESSION_SECRET || "supersecret", 
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRoutes);
app.use("/api/onboarding", isAuthenticated, onboardingRoutes);

// Protected dashboard
app.get("/api/dashboard", isAuthenticated, checkOnboarding, (req, res) => {
  res.json({ message: `Welcome ${req.user.displayName}, you finished onboarding!` });
});

// Connect DB
console.log(process.env.MONGO_URI)
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(5000, () => console.log("Server running on http://localhost:5000"));
  })
  .catch(err => console.error(err));
