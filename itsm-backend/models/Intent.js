const mongoose = require("mongoose");

const intentSchema = new mongoose.Schema(
  {
    processDocId: { type: mongoose.Schema.Types.ObjectId, ref: "ProcessDoc", },
    ticketDataId: { type: mongoose.Schema.Types.ObjectId, ref: "TicketData", required: true },
    name: { type: String, required: true },
    description: String,
    confidence: Number,
    meta: mongoose.Schema.Types.Mixed, // anything extra from analyzer
  },
  { timestamps: true }
);

intentSchema.index({ processDocId: 1, createdAt: -1 });
intentSchema.index({ ticketDataId: 1, createdAt: -1 });

module.exports = mongoose.model("Intent", intentSchema);
