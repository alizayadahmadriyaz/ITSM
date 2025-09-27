const express = require("express");
const { getJsonFromS3 , getCsvFromS3} = require("../utils/s3Upload");
const { getFileFromS3 } = require("../utils/s3File");
const TicketData = require("../models/TicketData");
const DocData = require("../models/ProcessDoc");
const extractIntentsFromDoc=require("../utils/extractor");
const Intent = require("../models/Intent");
const isAuthenticated = require("../middlewares/isAuthenticated");
const IntentCategory = require("../models/IntentCategory");
const Ticket = require("../models/Ticket");
const mongoose = require("mongoose");


// import our classifier
const { classifyTicketWithGroq } = require("../utils/classifier.js");


const { classifySpam } = require("../utils/spamClassifier.js");


const router = express.Router();


router.post("/classify", isAuthenticated, async (req, res)  => {
  try {
    // latest ticket data
    console.log("body   ",req.body.intents)
    console.log("user  ",req.user)
    const ticketDoc = await TicketData
      .findOne({ userId: req.user._id })
      .sort({ createdAt: -1 });
    let tickets = [];
    console.log("type    ",ticketDoc.filetype)
    if (ticketDoc) {
      if (ticketDoc.filetype === "csv") {

        tickets = await getCsvFromS3(ticketDoc.s3Key);   // make sure this util exists
      } else {
        tickets = await getJsonFromS3(ticketDoc.s3Key);
      }
    }


    // fetch intents (either from doc or request body)
    let intents = [];
    const docFile = await DocData.findOne({ proceeDataId: ticketDoc._id }).sort({ createdAt: -1 });


    // let intents = {};
    console.log("prese  ",req.body.intents.length>0)
  if (req.body && req.body.length > 0 && docFile) {
    // 🥇 Case 1: Both user intents + doc
    // Prefer user intents (override), but also keep doc in DB for reference
    const userIntents = req.body.intents;
    intents = userIntents.reduce((acc, item) => {
      acc[item.name] = item.description;
      return acc;
    }, {});
    for (const it of userIntents) {
      await Intent.findOneAndUpdate(
        { ticketDataId: ticketDoc._id, name: it.name },   // include name!
        { $setOnInsert: { ...it, ticketDataId: ticketDoc._id, source: 'user' } },
        { upsert: true, new: true }
      );
    }


  } else if (req.body.intents && req.body.intents.length > 0) {
    // 🥈 Case 2: Only user intents
    const userIntents = req.body.intents;          // [{ name, description, … }]
     intents = userIntents.reduce((acc, item) => {
      acc[item.name] = item.description;
      return acc;
    }, {});
    for (const it of userIntents) {
      await Intent.findOneAndUpdate(
        { ticketDataId: ticketDoc._id, name: it.name },   // include name!
        { $setOnInsert: { ...it, ticketDataId: ticketDoc._id, source: 'user' } },
        { upsert: true, new: true }
      );
    }

  } else if (docFile) {
    // 🥉 Case 3: Only doc
    const doc = await getFileFromS3(docFile.s3Key);
    const docIntents = extractIntentsFromDoc(doc); // 🔧 implement your parser

     intents = docIntents.reduce((acc, item) => {
      acc[item.name] = item.description;
      return acc;
    }, {});
    for (const it of docIntents) {
      await Intent.findOneAndUpdate(
        { ticketDataId: ticketDoc._id, name: it.name },   // include name!
        { $setOnInsert: { ...it, ticketDataId: ticketDoc._id, source: 'user' } },
        { upsert: true, new: true }
      );
    }
  } else {
    console.log("error")
    return res.status(400).json({ message: "No intents available" });
  }


    const results = [];
    
    console.log("tickets ",tickets)

      for (const ticket of ((ticketDoc.filetype === "csv")?tickets:tickets.tickets)) {
        // console.log("intent ",intents)
        // console.log("description ",ticket.Description ?? ticket.description ?? "")
        const classification = await classifyTicketWithGroq(ticket.Description ?? ticket.description ?? "", intents);
        // console.log(classification)
        const spamResult = await classifySpam(ticket.Description ?? ticket.description ?? "");
        results.push({ ticket, ...classification,...spamResult });
      }


    const validIntentNames = new Set(Object.keys(intents));
      // console.log("vldintent ",validIntentNames)
    for (const instance of results) {
      const { ticket, category, confidence, spamResult } = instance;
      // console.log("instance ",instance)
      // if (category === "unmapped") continue; // skip unmapped tickets
      if (!validIntentNames.has(category) && category!="unmapped") continue;
      // 1. Save ticket
      let savedTicket = await Ticket.findOne({
        userId: req.user._id,
        ticketDataId: ticketDoc._id,
        text: ticket.Description ?? ticket.description ?? "",
        category:category,
      });


      let isNew = false;


      if (!savedTicket) {
        savedTicket = await Ticket.create({
          userId: req.user._id,
          ticketDataId: ticketDoc._id,
          text: ticket.Description ?? ticket.description ?? "",
          isSpam:instance.isSpam,
          category,
          confidence,
        });
        isNew = true;
      } else {
        savedTicket.category = category;
        savedTicket.confidence = confidence;
        await savedTicket.save();
      }


      // 2. Decide whether to use processDocId or ticketDataId
      if(isNew){
      const query = docFile
        ? { processDocId: docFile._id, name: category }
        : { ticketDataId: ticketDoc._id, name: category };


      // 3. Find or create category
      
      let cat = await IntentCategory.findOne(query);
        // console.log("query ",query)
        // console.log("cat ",cat)

      if (!cat) {
          cat = new IntentCategory({
            ...(docFile ? { processDocId: docFile._id } : { ticketDataId: ticketDoc._id }),
            name: category,
            confidence,
            tickets: [],
          });
        }


        // 4. Update category fields
        cat.confidence = Math.max(cat.confidence || 0, confidence); // keep highest confidence


        if (!cat.tickets.includes(savedTicket._id)) {
          cat.tickets.push(savedTicket._id);
        }


        // Sentiment/priority fallbacks
        const sentiment = ticket.sentiment?.toLowerCase() || "neutral";
        // const priority = ticket.priority?.toLowerCase() || "neutral";
        if (cat.sentimentBreakdown[sentiment] !== undefined) {
          cat.sentimentBreakdown[sentiment] += 1;
        }
        let priority =  (ticket.Priority?.toLowerCase() ?? ticket.priority?.toLowerCase() ?? "") || "normal";
        console.log("priority ",priority)
        if(priority==="medium"){
          priority="normal";
        }
        if (cat.priorityBreakdown[priority] !== undefined) {
          cat.priorityBreakdown[priority] += 1;
        }


        if (instance.isSpam) cat.spamCount += 1;
        await cat.save();
    }

    }
    res.json({
      message: "Classification complete",
      results
    });


  } catch (err) {
    res.status(500).json({ message: "Failed to classify", error: err.message });
  }
});


module.exports = router; 