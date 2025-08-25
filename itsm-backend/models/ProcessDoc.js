const mongoose = require("mongoose");

const processDocSchema = new mongoose.Schema({
  proceeDataId: { type: mongoose.Schema.Types.ObjectId, ref: "TicketData", required: true },
  fileName: { type: String },
  s3Key: { type: String },
  parsedData: { type: mongoose.Schema.Types.Mixed }, // Extracted processes & steps
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ProcessDoc", processDocSchema);
