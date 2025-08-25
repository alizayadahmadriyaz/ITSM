// models/JiraIntegration.js
const mongoose = require("mongoose");

const jiraIntegrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  domain: { type: String, required: true },   // e.g. alizayad57.atlassian.net
  email: { type: String, required: true },
  apiToken: { type: String, required: true }, // store encrypted in real app
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("JiraIntegration", jiraIntegrationSchema);
