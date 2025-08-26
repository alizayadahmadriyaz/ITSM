const express = require("express");
const Onboarding = require("../models/Onboarding");
const router = express.Router();
const isAuthenticated = require("../middlewares/isAuthenticated");

// ✅ Start onboarding (if not exists, create)
router.post("/start",isAuthenticated, async (req, res) => {
  try {
    let onboarding = await Onboarding.findOne({ userId: req.user._id });

    if (!onboarding) {
      onboarding = new Onboarding({ userId: req.user._id });
      await onboarding.save();
    }

    res.json(onboarding);
  } catch (err) {
    res.status(500).json({ error: "Failed to start onboarding" });
  }
});

// ✅ Save onboarding step
router.post("/step",isAuthenticated, async (req, res) => {
  try {
    const { step, data } = req.body;
    let onboarding = await Onboarding.findOne({ userId: req.user._id });

    if (!onboarding) {
      return res.status(404).json({ error: "Onboarding not started" });
    }

    switch (step) {
      case 1: onboarding.teamSize = data.teamSize; break;
      case 2: onboarding.itsmMaturity = data.itsmMaturity; break;
      case 3: onboarding.goals = data.goals; break;
      case 4: onboarding.currentTools = data.currentTools; break;
      case 5: onboarding.automationLevel = data.automationLevel; break;
      default: return res.status(400).json({ error: "Invalid step" });
    }

    await onboarding.save();
    res.json(onboarding);
  } catch (err) {
    res.status(500).json({ error: "Failed to save step" });
  }
});

// ✅ Complete onboarding
router.post("/complete",isAuthenticated, async (req, res) => {
  try {
    const onboarding = await Onboarding.findOneAndUpdate(
      { userId: req.user._id },
      { completed: true },
      { new: true }
    );

    if (!onboarding) {
      return res.status(404).json({ error: "Onboarding not started" });
    }
    res.json({ message: "Onboarding completed", onboarding });
  } catch (err) {
    res.status(500).json({ error: "Failed to complete onboarding" });
  }
});

module.exports = router;
