const express = require("express");
const axios = require("axios");
const isAuthenticated = require("../middlewares/isAuthenticated");
const User = require("../models/user");

const TicketData = require("../models/TicketData");
const Ticket = require("../models/Ticket");
const IntentCategory = require("../models/IntentCategory");
const { classifyTicketWithGroq } = require("../utils/classifier");
const { classifySpam } = require("../utils/spamClassifier");


// const requestJira =require("@forge/bridge");

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

router.post('/jira/webhook/register', isAuthenticated, async (req, res) => {
  const { projectKey } = req.body;
  const user           = await User.findById(req.user._id);

  try {
    /* 1. CREATE a new webhook */
    const createRes = await axios.post(
      `https://api.atlassian.com/ex/jira/${user.jira.cloudId}/rest/api/3/webhook`,
      {
        url: `${process.env.BASE_URL}/api/jira/webhook/${user.jira.cloudId}`,
        webhooks: [
          {
            name: `Webhook for ${projectKey}`,
            events:    ['jira:issue_created'],
            jqlFilter: `project = ${projectKey}`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${user.jira.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 🔑 Jira doesn’t return createdWebhookIds. Need to fetch the list.
    const listRes = await axios.get(
      `https://api.atlassian.com/ex/jira/${user.jira.cloudId}/rest/api/3/webhook`,
      {
        headers: {
          Authorization: `Bearer ${user.jira.accessToken}`
        }
      }
    );

    // Grab the latest webhook (last in array)
    const values = listRes.data.values || [];
    if (!values.length) {
      return res.status(500).json({ error: 'No webhook found after creation' });
    }

    const latest = values[values.length - 1];
    const newId = latest.id;
    const expiration = latest.expirationDate;

    /* 2. STORE the new ID + expiry */
    console.log("1000000")
    if (!user.jira.projects.includes(projectKey)) {
        user.jira.projects.push(projectKey);
    }
    console.log("1000000")
    user.jira.webhooks.push({ id: newId, projectKey, expiration });
    console.log("1000000")
    await user.save();

    /* 3. EXTEND every webhook this user has (old + new) */
    const allIds = user.jira.webhooks.map(w => w.id);
    console.log("iddd ",allIds)
    await axios.put(
        `https://api.atlassian.com/ex/jira/${user.jira.cloudId}/rest/api/3/webhook/refresh`,
        { webhookIds: allIds },
        { headers: { Authorization: `Bearer ${user.jira.accessToken}`, 'Content-Type': 'application/json' } }
        );

    res.status(200).send("ok");
  } catch (err) {
    console.error('HTTP status:', err.response?.status);
    console.error('Body:', JSON.stringify(err.response?.data, null, 2));
    res.status(500).send('❌ Webhook registration failed');
  }
});


// Step 4: Webhook receiver
// router.post("/webhook", async (req, res) => {
//   console.log("Webhook payload:", req.body);
//     try{
//         const { issue } = req.body.issue_event_type_name ? req.body : {};
//         // const cloudId = req.body.cloudId;

//         // const user = await User.findOne({ "jira.cloudId": cloudId });

//         // if (user) {/
//             // console.log(`🔔 New issue for ${user.email}:`, issue?.key);
//             // TODO: Save to TicketData / Ticket model
//         // }

//         res.status(200).send("ok");
//     }
//     catch(err){
//         console.log("error ",err.response);
//         res.status(500).send("❌ Webhook registration failed");

//     }
// });


// routes/webhook.


router.post("/webhook/:cloudId", async (req, res) => {
  console.log("Webhook payload:", req.body);

  const cloudId = req.params.cloudId;
  const { issue } = req.body;

  if (!issue) return res.status(400).send("❌ No issue in webhook payload");

  try {
    const user = await User.findOne({ "jira.cloudId": cloudId });
    if (!user) return res.status(404).send("❌ User not found");

    const projectId = issue.fields.project.id;
    const projectKey = issue.fields.project.key;

    // Find or create TicketData
    const ticketData = await TicketData.findOneAndUpdate(
      { userId: user._id, toolName: "Jira", projectId, source: "webhook" },
      {
        $setOnInsert: {
          userId: user._id,
          toolName: "Jira",
          projectId,
          projectKey,
          source: "webhook",
          filetype: "json",
          status: "fetched",
        },
      },
      { upsert: true, new: true }
    );

    // Save the ticket (unclassified)
    let ticket = await Ticket.findOne({ userId: user._id, toolName: "Jira", externalId: issue.key });
    if (!ticket) {
      ticket = await Ticket.create({
        userId: user._id,
        ticketDataId: ticketData._id,
        externalId: issue.key,
        toolName: "Jira",
        text: issue.fields?.description || issue.fields?.summary || "",
        status: "new", // mark as unclassified
      });
    }

    res.status(200).json({ message: "Ticket saved (unclassified)", ticket });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("❌ Webhook processing failed");
  }
});

module.exports = router;
