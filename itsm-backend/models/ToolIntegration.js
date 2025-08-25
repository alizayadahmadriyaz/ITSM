// models/ToolIntegration.js
const mongoose = require("mongoose");

const toolIntegrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  toolName: { type: String, enum: ["Zendesk", "Jira", "ServiceNow", "Confluence"], required: true },
  status: { type: String, enum: ["connected", "configured", "disconnected"], default: "disconnected" },
  credentials: {
    apiKey: { type: String,required:true },
    subdomain: { type: String,required:true },
    username: { type: String },
    password: { type: String },
    email:{type:string,required:true}
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ToolIntegration", toolIntegrationSchema);
