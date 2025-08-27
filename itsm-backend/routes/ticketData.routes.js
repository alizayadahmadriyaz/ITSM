const router = require("express").Router();
const TicketData = require("../models/TicketData");
const uploadToS3 = require("../middlewares/uploadS3");

// Upload ticket dataset (CSV/JSON)
// form-data: file=<file>, toolName=Slack
router.post("/", uploadToS3("ticket-data").single("file"), async (req, res) => {
  try {
    const { toolName } = req.body;
    console.log("file  ",req.file);
    if (!toolName) return res.status(400).json({ message: "toolName is required" });
    if (!req.file) return res.status(400).json({ message: "file is required" });

    const file=req.file;
    const ext = file.originalname.split(".").pop().toLowerCase()
    const doc = await TicketData.create({
      userId: req.user._id,
      toolName,
      fileName: req.file.originalname,
      s3Key: req.file.key,
      filetype:ext,
      status: "uploaded",
      parsedData: null, // will be filled after external analyzer
    });

    res.json({
      message: "Ticket data uploaded",
      ticketData: doc,
      filetype:ext,
      next: "Upload related process docs for this ticketDataId",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Upload failed", error: e.message });
  }
});

// List ticket datasets of current user
// .sort({ createdAt: -1 })
router.get("/", async (req, res) => {
  const items = await TicketData.find({ userId: req.user._id });
  res.json(items);
});

// Get single ticket dataset
router.get("/:id", async (req, res) => {
  const item = await TicketData.findOne({ _id: req.params.id, userId: req.user._id });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

module.exports = router;
