require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");
const passport = require("passport");
require("./config/passport"); // your existing Google OAuth (session-based)

const isAuthenticated = require("./middlewares/isAuthenticated");

// routes
const authRoutes = require("./routes/auth"); // your existing auth
const ticketDataRoutes = require("./routes/ticketData.routes");
const processDocRoutes = require("./routes/processDoc.routes");
const intentRoutes = require("./routes/intent.routes");
const jira = require("./routes/jira");
const zendesk = require("./routes/zendesk");
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// sessions for passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// auth + feature routes
app.use("/auth", authRoutes);
app.use("/api/ticket-data", isAuthenticated,ticketDataRoutes);
app.use("/api/process-docs", isAuthenticated, processDocRoutes);
app.use("/api/intents", isAuthenticated, intentRoutes); // records only; analysis handled elsewhere

// optional: a protected check route
app.get("/api/me", isAuthenticated, (req, res) => {
  res.json({ user: req.user });
});

app.use("/api",jira)
app.use("/api/zendesk",zendesk)

// db + start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    const port = process.env.PORT || 5000;
    app.listen(port, () =>
      console.log(`🚀 Server running http://localhost:${port}`)
    );
  })
  .catch((e) => console.error("Mongo error:", e));
