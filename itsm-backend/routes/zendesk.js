// routes/zendesk.js
const express = require("express");
const axios = require("axios");
const ZendeskIntegration = require("../models/ZendeskIntegration");
const TicketData = require("../models/TicketData");
// const { uploadJsonToS3 } = require("../utils/s3Upload");
const isAuthenticated = require("../middlewares/isAuthenticated");

const router = express.Router();

// 1. Save Zendesk credentials for user
router.post("/connect", isAuthenticated, async (req, res) => {
  try {
    const { domain, email, apiToken } = req.body;
    if (!domain || !email || !apiToken) {
      return res.status(400).json({ message: "domain, email, apiToken are required" });
    }

    const integration = await ZendeskIntegration.findOneAndUpdate(
      { userId: req.user._id },
      { domain, email, apiToken },
      { upsert: true, new: true }
    );

    res.json({ message: "Zendesk connected successfully", integration });
  } catch (err) {
    res.status(500).json({ message: "Failed to connect Zendesk", error: err.message });
  }
});

// Helper: get auth headers for user
async function getAuthHeaders(userId) {
  const integration = await ZendeskIntegration.findOne({ userId });
  if (!integration) throw new Error("Zendesk not connected");
  return {
    baseUrl: `https://${integration.domain}`,
    headers: {
      Authorization: `Basic ${Buffer.from(`${integration.email}/token:${integration.apiToken}`).toString("base64")}`,
      Accept: "application/json"
    }
  };
}

// 2. Get Zendesk tickets
router.get("/tickets", isAuthenticated, async (req, res) => {
  try {
    const { baseUrl, headers } = await getAuthHeaders(req.user._id);

    const { data } = await axios.get(`${baseUrl}/api/v2/tickets.json`, { headers });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tickets", error: err.message });
  }
});

// 3. Fetch tickets & store in S3
router.post("/tickets/store", isAuthenticated, async (req, res) => {
  try {
    const { baseUrl, headers } = await getAuthHeaders(req.user._id);

    const { data } = await axios.get(`${baseUrl}/api/v2/tickets.json`, { headers });

    // Upload raw tickets JSON to S3
    const s3Key = `zendesk/${req.user._id}/tickets-${Date.now()}.json`;
    // await uploadJsonToS3(s3Key, data);

    // Save reference in DB
    const doc = await TicketData.create({
      userId: req.user._id,
      toolName: "Zendesk",
      s3Key,
      status: "fetched"
    });

    res.json({ message: "Tickets fetched & stored", ticketData: doc });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch and store tickets", error: err.message });
  }
});

module.exports = router;
