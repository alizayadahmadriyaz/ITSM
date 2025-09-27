const mongoose = require("mongoose");

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
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
