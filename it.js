import Groq from "groq-sdk";
import assert from "node:assert/strict";

const groq = new Groq({
  apiKey: apikey,
});

const SYSTEM_PROMPT = `
You are an intent-extraction assistant.
• Read the support document.
• Identify every distinct user intent.
• Keys = 1-2 words, all lowercase. If the raw phrase exceeds two words, compress to the two most specific words (e.g., “customer cannot sign in” → “login issue”).
• Values = concise description (≤10 words).
• Output valid JSON with double-quoted keys and values—no markdown, no code fences.
`.trim();


async function extractIntentsFromDoc(supportDoc) {
  const completion = await groq.chat.completions.create({
    model: "gemma2-9b-it",          // any Groq model works
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: supportDoc    },
    ],
    response_format: { type: "json_object" } 
  });

  const raw = completion.choices[0].message.content;

  // Basic validation
  let intents;
  try {
    intents = JSON.parse(raw);
    assert(typeof intents === "object" && !Array.isArray(intents));
  } catch {
    throw new Error("Model returned invalid JSON:\n" + raw);
  }

  return intents;
}

/* ---------- Example usage ---------- */

// .
