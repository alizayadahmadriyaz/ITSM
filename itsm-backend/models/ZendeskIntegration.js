// models/ZendeskIntegration.js
const mongoose = require("mongoose");

const zendeskIntegrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  domain: { type: String, required: true },   // e.g. mycompany.zendesk.com
  email: { type: String, required: true },
  apiToken: { type: String, required: true }, // store encrypted in prod
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ZendeskIntegration", zendeskIntegrationSchema);
