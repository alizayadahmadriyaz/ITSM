require("dotenv").config();
const express = require("express");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");
const passport = require("passport");
const serverless = require("serverless-http");
require("./config/passport"); // your existing Google OAuth (session-based)

const isAuthenticated = require("./middlewares/isAuthenticated");

// routes
const authRoutes = require("./routes/auth"); // your existing auth
const ticketDataRoutes = require("./routes/ticketData.routes");
const processDocRoutes = require("./routes/processDoc.routes");
const intentRoutes = require("./routes/intent.routes");
const jira = require("./routes/jira");
const zendesk = require("./routes/zendesk");
const onboarding=require("./routes/onboarding.routes")
const testing=require("./routes/testing")
const doc_upload=require("./routes/processDoc.routes")
const dashboard=require("./routes/dashboard")
const webhk_jira=require("./routes/webhook_jira")
const webhk_classify=require("./routes/webhook_intent_classify")
// const webhk=require("./routes/listner")

const app = express();



app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// sessions for passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
      cookie: {
    httpOnly: true,
    secure: false,   // true if using https
    sameSite: "lax",
  }
  })
);

app.use(passport.initialize());
app.use(passport.session());

// auth + feature routes
app.use("/api/auth", authRoutes);
app.use("/api/ticket-data",isAuthenticated,ticketDataRoutes);
app.use("/api/process-docs", isAuthenticated, processDocRoutes);
app.use("/api/intents", isAuthenticated, intentRoutes); // records only; analysis handled elsewhere

// optional: a protected check route
app.get("/api/me", (req, res) => {
  res.json({ user: req.user });
});
app.use("/api/onboarding",onboarding)
app.use("/api",jira)
app.use("/api/zendesk",zendesk)

app.use("/api/testing",testing)

app.use("/api/upload_doc",isAuthenticated,doc_upload)
app.use("/api/dashboard",isAuthenticated,dashboard)
app.use("/api/jira", webhk_jira);
app.use("/api/webhok/classify",webhk_classify);
// db + start

const ssm = new SSMClient({ region: "ap-south-1" });

mongoose
  .connect(process.env.MONGO_URI,
    {useNewUrlParser: true,
    useUnifiedTopology: true
  }
  )
  .then(() => {
    console.log("✅ MongoDB connected");
    const port = process.env.PORT || 5000;
    app.listen(port, () =>
      console.log(`🚀 Server running http://localhost:${port}`)
    );
  })
  .catch((e) => console.error("Mongo error:", e));

  module.exports.handler = serverless(app);