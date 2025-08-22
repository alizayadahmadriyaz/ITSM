const Onboarding = require("../models/Onboarding");

async function checkOnboarding(req, res, next) {
  try {
    const onboarding = await Onboarding.findOne({ userId: req.user._id });

    if (!onboarding || !onboarding.completed) {
      return res.status(403).json({ message: "Onboarding not completed" });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = checkOnboarding;
