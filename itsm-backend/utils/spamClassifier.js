const Groq=require("groq-sdk")

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY  });

/**
 * Classifies a ticket as spam or not.
 * @param {string} text - Ticket description
 * @returns {Promise<{ isSpam: boolean, confidence: number }>}
 */
async function classifySpam(text) {
  const prompt = `
You are a spam detector for IT support tickets.

Spam includes:
- Irrelevant messages like "hello", "test", or random text
- Advertisements, promotions, or phishing attempts
- Anything not related to IT issues or support requests

Not spam includes:
- Real IT issues (e.g. "camera not working")
- Service requests (e.g. "please reset my password")
- Bug/error reports (e.g. "app crashes when I click submit")

Decide whether the following ticket is spam or not:
"${text}"

Return ONLY valid JSON:
{ "isSpam": true/false, "confidence": <number between 0 and 1> }
  `;

  const response = await groq.chat.completions.create({
    model: "gemma2-9b-it",
    messages: [
      { role: "system", content: "You must respond with a single valid JSON object." },
      { role: "user", content: prompt }
    ],
    temperature: 0,
    response_format: { type: "json_object" }, // Groq supports JSON forcing
  });

  const raw = response.choices?.[0]?.message?.content?.trim();
  console.log("spam ",raw);
  try {
    return JSON.parse(raw);
  } catch (err) {
    return { isSpam: false };
  }
}

module.exports = {classifySpam}