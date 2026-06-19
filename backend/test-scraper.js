/**
 * Test script: runs a full job hunt using the backend's JobScraper service.
 * Usage: node test-scraper.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { runJobHunt } = require("./services/JobScraper");

async function test() {
  console.log("Starting Real-World Scraper Test...");
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to DB. Starting hunt...");

    const { totalSaved, matches } = await runJobHunt();
    console.log(`🏁 Test Complete. ${totalSaved} new match(es) saved.`);

    if (matches.length > 0) {
      console.log("Sample Result:", matches[0].title, "at", matches[0].company);
    }

    const JobMatch = mongoose.model("JobMatch");
    const total = await JobMatch.countDocuments();
    console.log(`📊 Total matches in DB: ${total}`);
  } catch (err) {
    console.error("❌ Test Failed:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

test();
