const Groq=require("groq-sdk")

const groq = new Groq({ apiKey:process.env.GROQ_API_KEY  });

async function classifyTicketWithGroq(ticket, intents) {

  const prompt = `
You are an IT support intent classifier.

Available Intents:
${Object.entries(intents).map(([name, desc]) => `- ${name}: ${desc}`).join("\n")}
Ticket:
"${ticket}"

Classify this ticket into one of the above intents.
If none matches, return "unmapped".

Return ONLY valid JSON:
{ "category": "<intent name or unmapped>", "confidence": <number between 0 and 1> }
`;

  const response = await groq.chat.completions.create({
    model: "gemma2-9b-it",   
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    response_format: { type: "json_object" } 
  });

  const content = response.choices[0]?.message?.content?.trim();
  // const content = response.choices[0]?.message?.content?.trim();
  console.log("Raw:", content);
  // if (content.startsWith("```")) {
  //   content = content.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  // }
  // console.log(content)
  // try {
    return JSON.parse(content);
  // } catch {
  //   return { category: "unmapped", confidence: 0 };
  // }
}

module.exports = {classifyTicketWithGroq}
