const mongoose = require("mongoose");

const intentCategorySchema = new mongoose.Schema(
  {
    processDocId: { type: mongoose.Schema.Types.ObjectId, ref: "ProcessDoc" }, // optional
    ticketDataId: { type: mongoose.Schema.Types.ObjectId, ref: "TicketData" }, // optional

    name: { type: String, required: true },  // category name
    confidence: Number,
    tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket" }], // all tickets in this category
    sentimentBreakdown: {
      frustrated: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      satisfied: { type: Number, default: 0 },
    },
    priorityBreakdown: {
      high: { type: Number, default: 0 },
      normal: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
    },
    spamCount: { type: Number, default: 0 },
    tags: [String],
  },
  { timestamps: true }
);

intentCategorySchema.index(
  { processDocId: 1, name: 1 },
  { unique: true, sparse: true }
);
intentCategorySchema.index(
  { ticketDataId: 1, name: 1 },
  { unique: true, sparse: true }
);


module.exports = mongoose.model("IntentCategory", intentCategorySchema);

