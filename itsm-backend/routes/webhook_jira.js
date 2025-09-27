const express = require("express");
const axios = require("axios");
const isAuthenticated = require("../middlewares/isAuthenticated");
const User = require("../models/user");

const router = express.Router();

router.get("/jira/connect", isAuthenticated, (req, res) => {
  const state = req.user._id.toString(); // tie Atlassian OAuth to current user
  console.log("state ",state);
  const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${
    process.env.JIRA_CLIENT_ID
  }&scope=read:jira-user read:jira-work manage:jira-webhook offline_access&redirect_uri=${
    process.env.JIRA_REDIRECT_URI
  }&response_type=code&prompt=consent&state=${state}`;

  res.redirect(authUrl);
});

// Step 2: Handle callback (no isAuthenticated!)
router.get("/jira/callback", async (req, res) => {
  const { code, state } = req.query;
  const userId = state; // recovered from the "state" param

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post("https://auth.atlassian.com/oauth/token", {
      grant_type: "authorization_code",
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      code,
      redirect_uri: process.env.JIRA_REDIRECT_URI,
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // Get cloudId
    const resourcesRes = await axios.get(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const cloudId = resourcesRes.data[0].id;

    // Save to user
    await User.findByIdAndUpdate(userId, {
      jira: {
        accessToken: access_token,
        refreshToken: refresh_token,
        cloudId,
        expiresAt: Date.now() + expires_in * 1000,
      },
    });

    res.send("✅ Jira connected successfully!");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("❌ Jira OAuth failed");
  }
});

// Step 3: Register webhook for a project
router.post("/jira/webhook/register", isAuthenticated, async (req, res) => {
  const projectKey = req.body.projectKey;
  const user = await User.findById(req.user._id);
    console.log("proj ",projectKey);
  try {
    const webhookRes = await axios.post(
      `https://api.atlassian.com/ex/jira/${user.jira.cloudId}/rest/api/3/webhook`,
      {
        url: `https://webhook.site/722824e2-6364-4a2e-b547-16dde298cfa9`,
        webhooks: [
          {
            events: ["jira:issue_created"],
            jqlFilter: `project = ${projectKey}`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${user.jira.accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    // Save projectKey in user profile
    console.log("10000000000");
    if (!user.jira.projects.includes(projectKey)) {
      user.jira.projects.push(projectKey);
      await user.save();
    }

    res.json(webhookRes.data);
  } catch (err) {
    console.error("HTTP status:", err.response?.status);
    console.error("Response body:", JSON.stringify(err.response?.data, null, 2));
    res.status(500).send("❌ Webhook registration failed");
  }
});

// Step 4: Webhook receiver
router.post("/webhook", async (req, res) => {
  console.log("Webhook payload:", req.body);
    try{
        const { issue } = req.body.issue_event_type_name ? req.body : {};
        // const cloudId = req.body.cloudId;

        // const user = await User.findOne({ "jira.cloudId": cloudId });

        // if (user) {/
            // console.log(`🔔 New issue for ${user.email}:`, issue?.key);
            // TODO: Save to TicketData / Ticket model
        // }

        res.status(200).send("ok");
    }
    catch(err){
        console.log("error ",err.response);
        res.status(500).send("❌ Webhook registration failed");

    }
});

module.exports = router;
