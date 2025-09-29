const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ticketDataId: { type: mongoose.Schema.Types.ObjectId, ref: "TicketData" }, 
  externalId: { type: String },  // Jira issue key, Zendesk ticket ID
  toolName: { type: String, enum: ["Zendesk", "Jira", "ServiceNow"] },

  text: { type: String, required: true },  
  category: { type: String },              
  sentiment: { type: String, enum: ["Frustrated", "Neutral", "Satisfied"] },
  priority: { type: String, enum: ["High", "Normal", "Low"] },
  isSpam: { type: Boolean, default: false },
  tags: [String],
  confidence: { type: Number, default: 0 },

  status: { type: String, enum: ["new", "classified", "resolved"], default: "new" },

  createdAt: { type: Date, default: Date.now }
});

TicketSchema.index({ ticketDataId: 1, text: 1 }, { unique: true });

module.exports = mongoose.model("Ticket", TicketSchema);
