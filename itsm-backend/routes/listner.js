// routes/listner.js
const express = require("express");
const router = express.Router();

const Ticket = require("../models/Ticket");
const TicketData = require("../models/TicketData");
const IntentCategory = require("../models/IntentCategory");

const { classifyTicketWithGroq } = require("../utils/classifier");
const { classifySpam } = require("../utils/spamClassifier");

router.post("/webhook", async (req, res) => {
  try {
    console.log("user ",req.user)
    const { projectId } = req.body.issue.fields.project.id;
    const { issue } = req.body;
    
    if (!issue) {
      return res.status(400).json({ message: "No issue data in payload" });
    }
    // Extract Jira ticket fields
    const description = issue.fields?.description || "";
    const summary = issue.fields?.summary || "";
    const ticketText = `${summary} ${description}`.trim();

    // 1️⃣ Ensure TicketData exists for this project
    let ticketData = await TicketData.findOne({ toolName: "Jira", projectId });
    if (!ticketData) {
      ticketData = await TicketData.create({
        toolName: "Jira",
        projectId,
        filetype: "webhook",
        status: "fetched",
      });
    }

    // 2️⃣ Define intents (in production you’d fetch from DB or config)
    const intents = {
      bug: "System defect or bug report",
      feature: "New feature request",
      support: "Support or help request",
    };

    // 3️⃣ Classify intent + spam
    const classification = await classifyTicketWithGroq(ticketText, intents);
    const isSpam = await classifySpam(ticketText);

    // 4️⃣ Save the ticket
    console.log("isSpam  ",isSpam);
    console.log("user ",req.user)
    const savedTicket = await Ticket.create({
      userId: req.user?._id || null,   // if mapped from Jira reporter
      ticketDataId: ticketData._id,
      text: ticketText,
      category: classification.category,
      confidence: classification.confidence,
      isSpam:isSpam.isSpam
    });

    // 5️⃣ Update / create category
    let cat = await IntentCategory.findOne({
      ticketDataId: ticketData._id,
      name: classification.category,
    });
    if (!cat) {
      cat = new IntentCategory({
        ticketDataId: ticketData._id,
        name: classification.category,
        confidence: classification.confidence,
        tickets: [],
        spamCount: 0,
        sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
        priorityBreakdown: { high: 0, medium: 0, low: 0, normal: 0 },
      });
    }

    cat.confidence = Math.max(cat.confidence, classification.confidence);
    if (!cat.tickets.includes(savedTicket._id)) {
      cat.tickets.push(savedTicket._id);
    }
    if (isSpam.isSpam) cat.spamCount += 1;
    await cat.save();

    // ✅ Respond after saving
    res.status(200).json({
      message: "Ticket classified and saved",
      projectId,
      ticketId: savedTicket._id,
    });

  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ message: "Failed to classify", error: err.message });
  }
});

module.exports = router;
