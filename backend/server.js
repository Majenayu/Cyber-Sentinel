const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/vajn_pro")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB:", err));

// ─── Schemas ──────────────────────────────────────────────────────────────
const watcherSchema = new mongoose.Schema({
  url: { type: String, required: true },
  companyName: String,
  targetRole: { type: String, default: "*" },
  keywords: [String],
  negativeKeywords: [String],
  atsType: String,
  lastRun: Date,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const jobMatchSchema = new mongoose.Schema({
  title: String,
  company: String,
  description: String,
  link: String,
  relevanceScore: { type: Number, default: 0 },
  feedbackContext: String,
  feedback: {
    status: { type: String, enum: ['pending', 'positive', 'negative'], default: 'pending' },
    reason: String
  },
  createdAt: { type: Date, default: Date.now }
});

const Watcher = mongoose.model("Watcher", watcherSchema);
const JobMatch = mongoose.model("JobMatch", jobMatchSchema);

const aiService = require("./services/AIService");
const notifier = require("./services/Notifier");
const jobScraper = require("./services/JobScraper");
const companyResolver = require("./services/CompanyResolver");
const pushStore = require("./services/PushStore");

async function createWatcher(input, targetRole) {
  const prepared = await jobScraper.prepareWatcher(input, targetRole);
  const watcher = await new Watcher(prepared).save();
  jobScraper.runJobHunt(watcher._id).catch(e => console.error("Scrape failed:", e.message));
  notifier.notifyNewJobs(0, []);
  return watcher;
}

// --- INTERNAL: Scraper webhook to trigger dashboard updates ---
app.post("/api/internal/notify-jobs", async (req, res) => {
  const { count, matches } = req.body;
  notifier.notifyNewJobs(count, matches);
  res.json({ success: true });
});

// ─── Resolve company name → careers URL (preview) ─────────────────────────
app.post("/api/resolve-company", async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: "input is required" });
    const resolved = await companyResolver.resolve(input);
    res.json(resolved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Watcher Routes ────────────────────────────────────────────────────────
app.get("/api/watchers", async (req, res) => {
  try {
    res.json(await Watcher.find().sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/watchers", async (req, res) => {
  try {
    const { url, company, targetRole, keywords } = req.body;
    const input = (url || company || "").trim();
    if (!input) return res.status(400).json({ error: "company name or careers URL is required" });

    const prepared = await jobScraper.prepareWatcher(input, targetRole);
    if (keywords?.length) prepared.keywords = keywords;

    const watcher = await new Watcher(prepared).save();
    jobScraper.runJobHunt(watcher._id).catch(e => console.error("Scrape failed:", e.message));
    notifier.notifyNewJobs(0, []);
    res.json(watcher);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/watchers/:id", async (req, res) => {
  try {
    const watcher = await Watcher.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!watcher) return res.status(404).json({ error: "Watcher not found" });
    res.json(watcher);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/watchers/:id", async (req, res) => {
  try {
    await Watcher.findByIdAndDelete(req.params.id);
    res.json({ message: "Watcher removed" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Job Match Routes ──────────────────────────────────────────────────────
app.get("/api/matches", async (req, res) => {
  try {
    res.json(await JobMatch.find().sort({ createdAt: -1 }).limit(100));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── THE LEARNING LOOP ─────────────────────────────────────────────────────
app.post("/api/matches/:id/feedback", async (req, res) => {
  const { isPositive, reason } = req.body;
  try {
    const match = await JobMatch.findByIdAndUpdate(
      req.params.id,
      { "feedback.status": isPositive ? "positive" : "negative", "feedback.reason": reason },
      { new: true }
    );
    if (!match) return res.status(404).json({ error: "Match not found" });

    if (!isPositive && reason) {
      const prompt = `A user rejected a job for this reason: "${reason}". Extract 2-3 short exclusion keywords or phrases (like "Java", "5 years experience", "Sales"). Return ONLY a comma-separated list, nothing else.`;
      try {
        const response = await aiService.generateContent(prompt);
        const newExclusions = response.text().split(",").map(k => k.trim().toLowerCase()).filter(Boolean);

        const watchers = await Watcher.find({ isActive: true });
        for (const w of watchers) {
          w.negativeKeywords = [...new Set([...w.negativeKeywords, ...newExclusions])];
          await w.save();
        }
        console.log(`🤖 AI Learnt: Added exclusions [${newExclusions.join(', ')}] to ${watchers.length} watcher(s).`);
      } catch (aiErr) {
        console.warn("AI keyword extraction failed:", aiErr.message);
      }
    }

    res.json({ message: "Feedback recorded and AI updated.", match });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Voice Command ─────────────────────────────────────────────────────────
function parseWatcherIntent(text) {
  const trimmed = text.trim();

  let m = trimmed.match(/(?:watch|monitor|add|track|notify)\s+(?:me\s+)?(.+?)\s+for\s+(.+)/i);
  if (m) {
    return {
      input: m[1].trim().replace(/\s*(careers?|jobs?)\s*$/i, ""),
      role: m[2].trim().replace(/\s*(roles?|positions?|jobs?)\s*$/i, "") || "*",
    };
  }

  m = trimmed.match(/(?:watch|monitor|add|track|notify)\s+(?:me\s+)?(.+?)\s+(?:roles?\s+)?(?:at|on|from|in)\s+(.+)/i);
  if (m) {
    return {
      input: m[2].trim().replace(/\s*(careers?|jobs?)\s*$/i, ""),
      role: m[1].trim().replace(/\s*(roles?|positions?|jobs?)\s*$/i, "") || "*",
    };
  }

  m = trimmed.match(/(?:watch|monitor|add|track|notify)\s+(?:me\s+)?(?:on\s+)?(.+)/i);
  if (m) {
    return {
      input: m[1].trim().replace(/\s*(careers?|jobs?)\s*$/i, ""),
      role: "*",
    };
  }

  return null;
}

app.post("/api/voice-command", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ reply: "No command received." });

  try {
    const recentMatches = await JobMatch.find().sort({ createdAt: -1 }).limit(5);
    const matchContext = recentMatches.map(m => `${m.title} at ${m.company} (${m.relevanceScore}% match)`).join('; ');
    const watchers = await Watcher.find({ isActive: true });

    const intent = parseWatcherIntent(text);
    if (intent) {
      const watcher = await createWatcher(intent.input, intent.role);
      const roleLabel = intent.role === "*" ? "all roles" : intent.role;
      return res.json({
        reply: `Got it! I'm now monitoring ${watcher.companyName || intent.input} for ${roleLabel}. I found their careers page at ${watcher.url} and started scanning.`,
      });
    }

    const prompt = `
You are Sunday Mac 47, an autonomous Job AI.
User: "${text}"

CONTEXT:
Recent Matches: ${matchContext || 'none'}
Active Watchers: ${watchers.length > 0 ? watchers.map(w => `${w.companyName || w.url} (${w.targetRole})`).join(', ') : 'none'}

INSTRUCTIONS:
- If user wants to watch/monitor a company or careers site, return ADD_WATCHER.
- "input" can be a company name (e.g. "Stripe", "Microsoft") OR a full URL.
- "role" is the target job title, or "*" to monitor ALL postings on that site.
- Always include a natural spoken "reply".

RESPONSE FORMAT (JSON ONLY):
{ "action": "ADD_WATCHER" | "NONE", "input": "company or url", "role": "role or *", "reply": "..." }
    `.trim();

    const response = await aiService.generateContent(prompt);
    let result;
    try {
      const cleanJson = response.text().replace(/```json|```/g, "").trim();
      result = JSON.parse(cleanJson);
    } catch (e) {
      result = { action: "NONE", reply: response.text() };
    }

    if (result.action === "ADD_WATCHER" && (result.input || result.url)) {
      const watcher = await createWatcher(result.input || result.url, result.role || "*");
      result.reply = result.reply || `Monitoring ${watcher.companyName} for ${result.role || "all roles"}.`;
    }

    res.json({ reply: result.reply });
  } catch (err) {
    console.error("Voice command error:", err);
    res.status(500).json({ reply: "I had trouble processing that. Please try again." });
  }
});

// ─── Cleanup junk jobs ─────────────────────────────────────────────────────
const JUNK_PATTERNS_SERVER = [
  /^(english|deutsch|français|español|português|nederlands|italiano|日本語|한국어|中文)$/i,
  /^view\s+(open\s+)?roles?$/i, /^view\s+all$/i,
  /^(learn|read)\s+more/i, /^see\s+(open\s+)?roles?/i,
  /^(benefits|university|life at|our opportunity|how we operate)/i,
  /&nbsp;/i, /^(careers?|jobs?)\s*(hiring)?$/i, /^hire\s+/i,
  /^(home|about|contact|faq|blog|press|privacy|terms)/i,
  /^(sign\s*(in|up)|log\s*in|register|subscribe)$/i,
];

app.post("/api/cleanup-junk", async (req, res) => {
  try {
    const allJobs = await JobMatch.find();
    let removed = 0;
    for (const job of allJobs) {
      const t = (job.title || "").trim();
      if (!t || t.length < 5 || t.length > 120 || JUNK_PATTERNS_SERVER.some(p => p.test(t))) {
        await JobMatch.deleteOne({ _id: job._id });
        removed++;
      }
    }
    console.log(`🧹 Cleaned ${removed} junk job(s) from DB.`);
    res.json({ success: true, removed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Daily Briefing ────────────────────────────────────────────────────────
app.get("/api/daily-briefing", async (req, res) => {
  try {
    const matches = await JobMatch.find({ "feedback.status": { $ne: "negative" } })
      .sort({ relevanceScore: -1, createdAt: -1 });
    // Pick top job per company
    const seen = new Set();
    const briefing = [];
    for (const job of matches) {
      const company = (job.company || "Unknown").toLowerCase();
      if (seen.has(company)) continue;
      seen.add(company);
      briefing.push(job);
    }
    res.json(briefing);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Push Notification Endpoints ───────────────────────────────────────────
app.get("/api/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
});

app.post("/api/push-subscribe", async (req, res) => {
  try {
    const sub = await pushStore.subscribe(req.body);
    res.json({ success: true, id: sub._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/push-unsubscribe", async (req, res) => {
  try {
    await pushStore.unsubscribe(req.body.endpoint);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/send-push", async (req, res) => {
  try {
    // Get daily briefing
    const matches = await JobMatch.find({ "feedback.status": { $ne: "negative" } })
      .sort({ relevanceScore: -1, createdAt: -1 });
    const seen = new Set();
    const briefing = [];
    for (const job of matches) {
      const company = (job.company || "Unknown").toLowerCase();
      if (seen.has(company)) continue;
      seen.add(company);
      briefing.push({ title: job.title, company: job.company, relevanceScore: job.relevanceScore, link: job.link });
    }
    const payload = { type: "DAILY_BRIEFING", jobs: briefing, timestamp: new Date() };
    const sent = await pushStore.sendToAll(payload);
    console.log(`📢 Daily briefing pushed to ${sent} device(s).`);
    res.json({ success: true, sent, jobCount: briefing.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Manual scan trigger ───────────────────────────────────────────────────
app.post("/api/scan-now", async (req, res) => {
  try {
    console.log("🔄 Manual scan triggered...");
    const result = await jobScraper.runJobHunt();
    res.json({ success: true, totalSaved: result.totalSaved, matches: result.matches.length });
  } catch (err) {
    console.error("Manual scan error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ──────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", providers: aiService.providers.length }));

// ─── Serve Frontend Static Files (Production) ──────────────────────────────
const DIST_PATH = path.join(__dirname, "../frontend/dist");
app.use(express.static(DIST_PATH));

// SPA Fallback: all non-api routes go to index.html
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api/")) {
    res.sendFile(path.join(DIST_PATH, "index.html"));
  }
});

const server = app.listen(PORT, () => console.log(`🚀 Sunday Mac 47 running on http://localhost:${PORT}`));

notifier.init(server);

// ─── Periodic Job Scanner ──────────────────────────────────────────────────
const SCAN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function periodicScan() {
  try {
    const watchers = await Watcher.countDocuments({ isActive: true });
    if (watchers === 0) {
      console.log("⏸️  No active watchers — skipping scan.");
      return;
    }
    console.log(`🔄 Periodic scan starting for ${watchers} active watcher(s)...`);
    const result = await jobScraper.runJobHunt();
    console.log(`✅ Periodic scan complete: ${result.totalSaved} new match(es) found.`);
  } catch (err) {
    console.error("❌ Periodic scan error:", err.message);
  }
}

// Initial scan after 10 seconds (let server boot fully)
setTimeout(() => {
  console.log("🚀 Running initial startup scan...");
  periodicScan();
}, 10_000);

// Recurring scan every 15 minutes
setInterval(periodicScan, SCAN_INTERVAL_MS);
console.log(`⏰ Periodic scanner armed: every ${SCAN_INTERVAL_MS / 60000} minutes.`);
