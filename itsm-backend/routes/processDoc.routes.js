const router = require("express").Router();
const ProcessDoc = require("../models/ProcessDoc");
const TicketData = require("../models/TicketData");
const uploadToS3 = require("../middlewares/uploadS3");
const mongoose = require("mongoose");
// Upload a process doc linked to a ticketDataId
// form-data: file=<file>, ticketDataId=<id>
router.post("/", uploadToS3("process-docs").single("file"), async (req, res) => {
  try {
    const { ticketDataId } = req.body;
    if (!ticketDataId) return res.status(400).json({ message: "ticketDataId is required" });
    const parent = await TicketData.findOne({ _id: ticketDataId, userId: req.user._id });
    if (!parent) return res.status(404).json({ message: "TicketData not found" });
    if (!req.file) return res.status(400).json({ message: "file is required" });
    console.log("ticket info ",req.body);
    const tickid = new mongoose.Types.ObjectId(ticketDataId)
    const file=req.file;
    const ext = file.originalname.split(".").pop().toLowerCase()
    const doc = await ProcessDoc.create({
      proceeDataId:tickid,
      fileName: req.file.originalname,
      s3Key: req.file.key,
      status: "uploaded",
      parsedData: null,
    });

    res.json({
      message: "Process doc uploaded",
      processDoc: doc,
      filetype:ext,
      next: "Trigger external analysis to generate intents",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Upload failed", error: e.message });
  }
});

// List process docs for a ticketDataId
router.get("/", async (req, res) => {
  const { ticketDataId } = req.query;
  const q = ticketDataId ? { ticketDataId } : {};
  const items = await ProcessDoc.find(q).sort({ createdAt: -1 }).lean();
  res.json(items);
});

// Get a single process doc
router.get("/:id", async (req, res) => {
  const item = await ProcessDoc.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

module.exports = router;
