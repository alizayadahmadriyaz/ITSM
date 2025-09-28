const mongoose = require("mongoose");

const WebhookSchema = new mongoose.Schema({
  id:         Number,    // 68, 69, …
  projectKey: String,    // DEMO, ABC, …
  expiration: Date       // ISO string from Jira
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  provider: { type: String, enum: ["google", "microsoft", "apple", "local"], required: true },
  providerId: String,
  jira: {
    accessToken: String,
    refreshToken: String,
    cloudId: String,
    expiresAt: Date,
    projects: [String], // store projectKeys user has subscribed to
    webhooks:    [WebhookSchema]
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
