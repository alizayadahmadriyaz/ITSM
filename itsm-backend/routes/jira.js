// routes/jira.js
const express = require("express");
const axios = require("axios");
const JiraIntegration = require("../models/JiraIntegration");
const TicketData = require("../models/TicketData");
// const { uploadJsonToS3 } = require("../utils/s3Upload");
const isAuthenticated = require("../middlewares/isAuthenticated");

const router = express.Router();

// 1. Save Jira credentials for user
router.post("/connect/jira", isAuthenticated, async (req, res) => {
  try {
    const { domain, email, apiToken } = req.body;
    if (!domain || !email || !apiToken) {
      return res.status(400).json({ message: "domain, email, apiToken are required" });
    }

    const integration = await JiraIntegration.findOneAndUpdate(
      { userId: req.user._id },
      { domain, email, apiToken },
      { upsert: true, new: true }
    );

    res.json({ message: "Jira connected successfully", integration });
  } catch (err) {
    res.status(500).json({ message: "Failed to connect Jira", error: err.message });
  }
});

// Helper: get auth headers for user
async function getAuthHeaders(userId) {
  const integration = await JiraIntegration.findOne({ userId });
  if (!integration) throw new Error("Jira not connected");
  return {
    baseUrl: `https://${integration.domain}.atlassian.net`,
    headers: {
      Authorization: `Basic ${Buffer.from(`${integration.email}:${integration.apiToken}`).toString("base64")}`,
      Accept: "application/json"
    }
  };
}

// 2. Get Jira projects
router.get("/projects/jira", isAuthenticated, async (req, res) => {
  try {
    const { baseUrl, headers } = await getAuthHeaders(req.user._id);
    const { data } = await axios.get(`${baseUrl}/rest/servicedeskapi/servicedesk`, { headers });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch projects", error: err.message });
  }
});

// 3. Get queues for a service desk
router.get("/:serviceDeskId/queues/jira", isAuthenticated, async (req, res) => {
  try {
    const { baseUrl, headers } = await getAuthHeaders(req.user._id);
    const { serviceDeskId } = req.params;
    const { data } = await axios.get(`${baseUrl}/rest/servicedeskapi/servicedesk/${serviceDeskId}/queue`, { headers });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch queues", error: err.message });
  }
});

// 4. Get issues in queue & save to S3
router.get("/:serviceDeskId/queue/:queueId/issues/jira", isAuthenticated, async (req, res) => {
  try {
    const { baseUrl, headers } = await getAuthHeaders(req.user._id);
    const { serviceDeskId, queueId } = req.params;
    // console.log("data ",serviceDeskId)
    const { data } = await axios.get(
      `${baseUrl}/rest/servicedeskapi/servicedesk/${serviceDeskId}/queue/${queueId}/issue`,
      { headers }
    );
    // console.log("data ",data);
    const s3Key = `jira/${req.user._id}/${serviceDeskId}/queue-${queueId}-${Date.now()}.json`;
    // await uploadJsonToS3(s3Key, data);

    const doc = await TicketData.create({
      userId: req.user._id,
      toolName: "Jira",
      projectId: serviceDeskId,
      queueId,
      s3Key,
      status: "fetched"
    });

    res.json({ message: "Issues fetched & stored", ticketData: doc });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch issues", error: err.message });
  }
});

module.exports = router;
