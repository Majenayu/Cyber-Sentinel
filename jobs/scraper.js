/**
 * CLI entry point for scheduled job hunts (GitHub Actions / cron).
 * Core logic lives in backend/services/JobScraper.js.
 */
const path = require("path");

module.paths.unshift(path.join(__dirname, "../backend/node_modules"));
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const mongoose = require("mongoose");
const fetch = require("node-fetch");
const { runJobHunt } = require("../backend/services/JobScraper");

async function notifyBackend(count, matches) {
  const base = process.env.BACKEND_URL || process.env.VITE_API_URL || "http://localhost:5000";
  try {
    await fetch(`${base}/api/internal/notify-jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count, matches }),
    });
  } catch (e) {
    console.warn("Could not notify backend dashboard:", e.message);
  }
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Scraper connected to MongoDB");

  const { totalSaved, matches } = await runJobHunt();
  console.log(`🏁 Job hunt complete: ${totalSaved} new match(es)`);

  if (totalSaved > 0) {
    await notifyBackend(totalSaved, matches);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
