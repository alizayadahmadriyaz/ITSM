// routes/tools.js
const express = require("express");
const ToolIntegration = require("../models/ToolIntegration");
const isAuthenticated = require("../middlewares/isAuthenticated");
const router = express.Router();

// Connect tool
router.post("/connect", isAuthenticated, async (req, res) => {
  try {
    const { toolName, credentials } = req.body;
    if (!toolName || !credentials) {
      return res.status(400).json({ message: "toolName and credentials required" });
    }

    const tool = await ToolIntegration.create({
      userId: req.user._id,
      toolName,
      credentials,
      status: "connected"
    });

    res.json({ message: `${toolName} connected successfully`, tool });
  } catch (err) {
    res.status(500).json({ message: "Connection failed", error: err.message });
  }
});

// Configure tool (update credentials/settings)
router.patch("/:id/configure", isAuthenticated, async (req, res) => {
  try {
    const tool = await ToolIntegration.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json({ message: "Tool configured", tool });
  } catch (err) {
    res.status(500).json({ message: "Configuration failed", error: err.message });
  }
});

// Fetch tickets from tool API (example: Zendesk)
router.post("/:id/fetch-tickets", isAuthenticated, async (req, res) => {
  try {
    const tool = await ToolIntegration.findById(req.params.id);
    if (!tool) return res.status(404).json({ message: "Tool not found" });

    if (tool.toolName === "jira") {
      // TODO: call Zendesk API with tool.credentials
      // Example: axios.get(`https://${tool.credentials.subdomain}.zendesk.com/api/v2/tickets.json`, { headers: { Authorization: `Bearer ${tool.credentials.apiKey}` } })
      // Save tickets in TicketData model
    }

    res.json({ message: `Fetched tickets from ${tool.toolName}` });
  } catch (err) {
    res.status(500).json({ message: "Fetching tickets failed", error: err.message });
  }
});

module.exports = router;
