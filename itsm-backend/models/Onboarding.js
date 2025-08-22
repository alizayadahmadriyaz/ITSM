const mongoose = require("mongoose");

const onboardingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teamSize: { type: String, default: null },
  itsmMaturity: { type: String, default: null },
  goals: [{ type: String }],
  currentTools: [{ type: String }],
  automationLevel: { type: String, default: null },
  completed: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Onboarding", onboardingSchema);
