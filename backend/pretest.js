require("dotenv").config();
const mongoose = require("mongoose");
const aiService = require("./services/AIService");

async function runPreTests() {
  console.log("🔍 Starting VAJN Pre-Flight Checks...\n");

  // 1. Check MongoDB
  console.log("1. Checking MongoDB Connection...");
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/vajn_assistant");
    console.log("✅ MongoDB: Connected Successfully.\n");
  } catch (err) {
    console.error("❌ MongoDB: Connection Failed. Ensure MongoDB is running.");
    console.error(err.message + "\n");
  }

  // 2. Check AI Service & Provider Count
  console.log("2. Checking AI Providers...");
  const providerCount = aiService.providers.length;
  if (providerCount > 0) {
    console.log(`✅ AI Service: ${providerCount} keys/providers detected.\n`);
  } else {
    console.warn("⚠️ AI Service: No providers configured in .env!\n");
  }

  // 3. Test AI Response (Mock Prompt)
  if (providerCount > 0) {
    console.log("3. Testing AI Response (Live)...");
    try {
      const response = await aiService.generateContent("Say 'System Ready' if you can hear me.");
      console.log(`✅ AI Response: "${response.text()}"\n`);
    } catch (err) {
      console.error("❌ AI Test: Failed to get response from any provider.");
      console.error(err.message + "\n");
    }
  }

  // 4. File Integrity
  console.log("4. Checking Folder Structure...");
  const fs = require('fs');
  const folders = ['../backend', '../frontend', '../jobs', '../mobile'];
  folders.forEach(f => {
    if (fs.existsSync(f)) {
      console.log(`✅ Folder ${f} exists.`);
    } else {
      console.error(`❌ Folder ${f} is missing!`);
    }
  });

  console.log("\n🏁 Pre-Flight Checks Complete.");
  process.exit();
}

runPreTests();
