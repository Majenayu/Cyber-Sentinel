require("dotenv").config();
const aiService = require("./services/AIService");

async function test() {
  console.log("Testing All Providers...");
  try {
    const res = await aiService.generateContent("Say hello");
    console.log("AI SUCCESS:", res.text());
  } catch (err) {
    console.error("AI ERROR:", err.message);
  }
}

test();
