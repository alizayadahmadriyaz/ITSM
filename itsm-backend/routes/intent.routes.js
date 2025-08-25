const router = require("express").Router();
const Intent = require("../models/Intent");
const ProcessDoc = require("../models/ProcessDoc");

// Create intents for a processDoc (called by your analyzer or your backend after analysis)
router.post("/", async (req, res) => {
  const { processDocId, intents } = req.body;
  if (!processDocId || !Array.isArray(intents)) {
    return res.status(400).json({ message: "processDocId and intents[] required" });
  }

  const proc = await ProcessDoc.findById(processDocId);
  if (!proc) return res.status(404).json({ message: "ProcessDoc not found" });

  const docs = intents.map((i) => ({
    processDocId,
    name: i.name,
    description: i.description,
    confidence: i.confidence,
    meta: i.meta || null,
  }));

  const created = await Intent.insertMany(docs);
  res.json({ message: "Intents saved", count: created.length, intents: created });
});

// List intents for a processDoc
router.get("/", async (req, res) => {
  const { processDocId } = req.query;
  const q = processDocId ? { processDocId } : {};
  const items = await Intent.find(q).sort({ createdAt: -1 });
  res.json(items);
});

module.exports = router;
