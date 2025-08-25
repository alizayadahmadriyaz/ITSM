const mongoose = require("mongoose");

const ticketDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  toolName: { type: String, enum: ["Zendesk", "Jira", "ServiceNow"], required: true },
  projectId: { type: String },
  queueId: { type: String },
  s3Key: { type: String },       // raw JSON stored in S3
  status: { type: String, enum: ["uploaded", "fetched"], default: "fetched" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("TicketData", ticketDataSchema);