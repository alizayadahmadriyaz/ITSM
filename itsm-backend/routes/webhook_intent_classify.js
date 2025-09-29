// Example: POST /projects/:projectId/classify
const express = require("express");
const TicketData = require("../models/TicketData");
const Ticket = require("../models/Ticket");
const Intent = require("../models/Intent");
const IntentCategory = require("../models/IntentCategory");
const { classifyTicketWithGroq } = require("../utils/classifier");
const { classifySpam } = require("../utils/spamClassifier");

const router = express.Router();

router.post("/projects/:projectId/classify", async (req, res) => {
  const { projectId } = req.params;
  const { intents } = req.body; // user provides intents

  if (!intents || intents.length === 0) return res.status(400).send("No intents provided");

  try {
    // Find TicketData for this project
    const ticketData = await TicketData.findOne({ projectId, toolName: "Jira" });
    if (!ticketData) return res.status(404).send("No tickets found for this project");

    // Save user intents
    const intentsMap = {};
    for (const it of intents) {
      intentsMap[it.name] = it.description;
      await Intent.findOneAndUpdate(
        { ticketDataId: ticketData._id, name: it.name },
        { $setOnInsert: { ...it, ticketDataId: ticketData._id, source: "user" } },
        { upsert: true }
      );
    }

    // Fetch all unclassified tickets
    const tickets = await Ticket.find({ ticketDataId: ticketData._id, status: "new" });

    const results = [];
    for (const ticket of tickets) {
      const classification = await classifyTicketWithGroq(ticket.text, intentsMap);
      const spamResult = await classifySpam(ticket.text);

      ticket.category = classification.category;
      ticket.confidence = classification.confidence;
      ticket.isSpam = spamResult.isSpam;
      ticket.status = "classified";
      await ticket.save();

      // Update IntentCategory
      if (classification.category && classification.category !== "unmapped") {
        let cat = await IntentCategory.findOne({ ticketDataId: ticketData._id, name: classification.category });
        if (!cat) {
          cat = new IntentCategory({
            ticketDataId: ticketData._id,
            name: classification.category,
            confidence: classification.confidence,
            tickets: [],
          });
        }
        cat.confidence = Math.max(cat.confidence || 0, classification.confidence);
        if (!cat.tickets.includes(ticket._id)) cat.tickets.push(ticket._id);
        if (spamResult.isSpam) cat.spamCount += 1;
        await cat.save();
      }

      results.push(ticket);
    }

    res.json({ message: "Classification complete", results });
  } catch (err) {
    console.error(err);
    res.status(500).send("Classification failed");
  }
});

module.exports = router;
