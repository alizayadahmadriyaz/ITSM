// routes/intent.js
const express = require("express");
const { getJsonFromS3 } = require("../utils/s3Upload");
const {getFileFromS3}=require("../utils/s3File");
const TicketData = require("../models/TicketData");
const DocData = require("../models/ProcessDoc");
const isAuthenticated = require("../middlewares/isAuthenticated");
const Intent = require("../models/Intent");

const router = express.Router();

router.post("/classify", isAuthenticated, async (req, res) => {
  try {
    // latest ticket data
    const ticketDoc = await TicketData.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    let tickets = null;
    if (ticketDoc) {
      if (ticketDoc.filetype === "csv") {
        tickets = await getCsvFromS3(ticketDoc.s3Key);
      } else {
        tickets = await getJsonFromS3(ticketDoc.s3Key);
      }
    }

    // latest ITSM doc (unchanged)
    // console.log(ticketDoc  )
    const docFile = await DocData.findOne({ proceeDataId: ticketDoc._id }).sort({ createdAt: -1 });
    console.log("doc  ",docFile.fileName)
    let intents = [];
    if(docFile){
      const doc = docFile ? await getFileFromS3(docFile.s3Key) : null;
    // console.log("doc  ",doc)
    // console.log("tickets  ",tickets)
    // intent generation via llm
     
      intents = [
        { name: "Login Issue", description: "Problems logging in" },
        { name: "Password Reset", description: "Reset password requests" },
      ];
      await Intent.insertMany(intents.map((i) => ({
        ...i,
        processDocId: docFile._id,
        ticketDataId: ticketDoc._id,
      })));

    }
    else{
      const { intent } = req.body;
      if (!intent || intent.length === 0) {
        return res.status(400).json({ message: "No intents provided" });
      }
      intents = intent;
      // store intents
      await Intent.insertMany(intent.map((i) => ({
        ...i,
        ticketDataId: ticketDoc._id,
      })));
    }
    // classification api 
    res.json({
      message: "Classification complete"
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to classify", error: err.message });
  }
});

// router.post("/classify", isAuthenticated, async (req, res) => {
//   try {
//     // latest ticket data
//     const ticketDoc = await TicketData.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     let tickets = null;
//     const {intent}=req.body;
//     if (ticketDoc) {
//       if (ticketDoc.filetype === "csv") {
//         tickets = await getCsvFromS3(ticketDoc.s3Key);
//       } else {
//         tickets = await getJsonFromS3(ticketDoc.s3Key);
//       }
//     }

//     // latest ITSM doc (unchanged)
//     // // console.log(ticketDoc  )
//     // const docFile = await DocData.findOne({ proceeDataId: ticketDoc._id }).sort({ createdAt: -1 });
//     // console.log("doc  ",docFile.fileName)
//     // const doc = docFile ? await getFileFromS3(docFile.s3Key) : null;
//     // console.log("doc  ",doc)
//     // console.log("tickets  ",tickets)
//     // run classification
//     res.json({ message: "Classification complete" });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to classify", error: err.message });
//   }
// });


module.exports = router;
