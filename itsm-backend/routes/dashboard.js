// routes/intent.js
const express = require("express");
const isAuthenticated = require("../middlewares/isAuthenticated");
const TicketData = require("../models/TicketData");
const Ticket = require("../models/Ticket");
const IntentCategory = require("../models/IntentCategory");

const router = express.Router();

router.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    // 1. Get the latest uploaded ticket dataset for this user
    const ticketDoc = await TicketData.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!ticketDoc) {
      return res.json({ message: "No ticket data available" });
    }

    // 2. Build summary
    console.log(ticketDoc)
    const totalTickets = await Ticket.countDocuments({ ticketDataId: ticketDoc._id });
    const spamTickets = await Ticket.countDocuments({ ticketDataId: ticketDoc._id, isSpam: true });
    const unmappedTickets = await Ticket.countDocuments({ ticketDataId: ticketDoc._id, category: "unmapped" });

    // avg confidence score
    const confidenceAgg = await Ticket.aggregate([
      { $match: { ticketDataId: ticketDoc._id } },
      { $group: { _id: null, avg: { $avg: "$confidence" } } }
    ]);
    const confidenceScore = confidenceAgg.length > 0 ? confidenceAgg[0].avg : 0;

    const intentCategories = await IntentCategory.find({ ticketDataId: ticketDoc._id }).lean();


    // 3. Map categories to frontend format
    const intents = intentCategories.map(cat => ({
      name: cat.name,
      tickets: cat.tickets.length,
      confidence: cat.confidence || confidenceScore,
      sentiment: cat.sentimentBreakdown,
      priority: cat.priorityBreakdown,
      spam: cat.spamCount,
      tags: cat.tags
    }));

    res.json({
      summary: {
        totalTickets,
        confidenceScore: Number(confidenceScore.toFixed(2)),
        spamTickets,
        unmappedTickets,
        intentCategories: intents.length
      },
      intents
    });

  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Failed to load dashboard", error: err.message });
  }
});

module.exports = router;
