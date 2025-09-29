const mongoose = require("mongoose");

const ticketDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  toolName: { type: String, enum: ["Zendesk", "Jira", "ServiceNow"] },
  projectId: { type: String },
  projectKey: { type: String },
  queueId: { type: String },
  s3Key: { type: String },
  filetype: { type: String, required: true },
  source: { type: String, enum: ["upload", "webhook"], default: "upload" }, // ✅ must exist
  status: { type: String, enum: ["uploaded", "fetched"], default: "fetched" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("TicketData", ticketDataSchema);