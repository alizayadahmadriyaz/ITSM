const express = require("express");
const uploadToS3 = require("../middlewares/uploadS3");

const router = express.Router();

router.post("/test-upload", uploadToS3("test").single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({
    message: "✅ File uploaded successfully",
    file: req.file,
  });
});

module.exports = router;