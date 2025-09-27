// models/Ticket.js
const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ticketDataId: { type: mongoose.Schema.Types.ObjectId, ref: "TicketData" }, // link to raw file
  text: { type: String, required: true },  // ticket description or message
  category: { type: String },              // classified intent
  sentiment: { type: String, enum: ["Frustrated", "Neutral", "Satisfied"] },
  priority: { type: String, enum: ["High", "Normal", "Low"] },
  isSpam: { type: Boolean, default: false },
  tags: [String],
  confidence: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Ticket", TicketSchema);
