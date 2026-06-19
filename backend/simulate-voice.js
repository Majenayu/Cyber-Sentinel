require("dotenv").config();
const aiService = require("./services/AIService");

async function simulate() {
  const text = "Sunday Mac 47, please notify me for Software roles at adobe.com";
  console.log(`Simulating voice command: "${text}"`);
  
  const prompt = `
You are Sunday Mac 47, an autonomous Job AI.
User: "${text}"

CONTEXT:
Recent Matches: none
Watchers: none

INSTRUCTION:
1. If the user wants to add/watch a site/role, set ACTION: "ADD_WATCHER", URL: "site.com", ROLE: "Role Name"
2. Always provide a REPLY for speech.

RESPONSE FORMAT (JSON ONLY):
{ "action": "ADD_WATCHER" | "NONE", "url": "...", "role": "...", "reply": "..." }
    `.trim();

    try {
      const response = await aiService.generateContent(prompt);
      console.log("RAW AI RESPONSE:", response.text());
      const cleanJson = response.text().replace(/```json|```/g, "").trim();
      const result = JSON.parse(cleanJson);
      console.log("PARSED RESULT:", result);
    } catch (e) {
      console.error("SIMULATION ERROR:", e.message);
    }
}

simulate();
