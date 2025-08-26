// routes/intent.js
const express = require("express");
const { getJsonFromS3, getFileFromS3 } = require("../utils/s3Upload");
const TicketData = require("../models/TicketData");
const DocData = require("../models/ProcessDoc");
const isAuthenticated = require("../middlewares/isAuthenticated");

const router = express.Router();

router.post("/classify", isAuthenticated, async (req, res) => {
  try {
    // 1. Latest ticket data
    const ticketDoc = await TicketData.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    const tickets = ticketDoc ? await getJsonFromS3(ticketDoc.s3Key) : null;

    // 2. Latest ITSM doc
    const docFile = await DocData.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    const doc = docFile ? await getFileFromS3(docFile.s3Key) : null;

    // 3. Run classification (your ML/NLP pipeline)
    // const results = await classifyIntents(tickets, doc);

    res.json({ message: "Classification complete" });
  } catch (err) {
    res.status(500).json({ message: "Failed to classify", error: err.message });
  }
});

module.exports = router;
