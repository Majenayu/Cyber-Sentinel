const fetch = require("node-fetch");
const mongoose = require("mongoose");
const aiService = require("./AIService");
const notifier = require("./Notifier");
const companyResolver = require("./CompanyResolver");
const atsExtractor = require("./ATSExtractor");

const watcherSchema = new mongoose.Schema({
  url: { type: String, required: true },
  companyName: String,
  targetRole: { type: String, default: "*" },
  keywords: [String],
  negativeKeywords: [String],
  atsType: String,
  lastRun: Date,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const jobMatchSchema = new mongoose.Schema({
  title: String,
  company: String,
  description: String,
  link: String,
  relevanceScore: { type: Number, default: 0 },
  feedback: {
    status: { type: String, enum: ["pending", "positive", "negative"], default: "pending" },
    reason: String,
  },
  watcherId: { type: mongoose.Schema.Types.ObjectId, ref: "Watcher" },
  createdAt: { type: Date, default: Date.now },
});

const Watcher = mongoose.models.Watcher || mongoose.model("Watcher", watcherSchema);
const JobMatch = mongoose.models.JobMatch || mongoose.model("JobMatch", jobMatchSchema);

function parseJobMatches(raw) {
  const clean = raw.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  const parsed = JSON.parse(clean.substring(start, end + 1));
  return Array.isArray(parsed) ? parsed : [];
}

async function generateContent(prompt) {
  const response = await aiService.generateContent(prompt);
  return response.text();
}

async function fetchPageContent(watcher) {
  const url = companyResolver.normalizeUrl(watcher.url);
  const companyName = watcher.companyName || watcher.url;

  try {
    const res = await fetch(url, {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Referer: url,
      },
      redirect: "follow",
    });

    if (!res.ok) {
      console.warn(`Fetch returned ${res.status} for ${url}`);
      return { url: res.url || url, html: null, ats: watcher.atsType ? { type: watcher.atsType, url } : null };
    }

    const finalUrl = res.url || url;
    const contentType = res.headers.get("content-type") || "";
    const body = await res.text();
    const ats =
      watcher.atsType && watcher.atsType !== "generic"
        ? detectStoredATS(watcher, finalUrl)
        : companyResolver.detectATS(finalUrl, body);

    return { url: finalUrl, html: body, ats };
  } catch (e) {
    console.warn(`Fetch failed: ${url}`, e.message);
    return { url, html: null, ats: watcher.atsType ? { type: watcher.atsType, url } : null };
  }
}

function detectStoredATS(watcher, url) {
  if (watcher.atsType === "workday") {
    const tenant = url.match(/([^.]+)\.myworkdayjobs\.com/i);
    return { type: "workday", tenant: tenant?.[1] || companyResolver.slugify(watcher.companyName), url };
  }
  if (watcher.atsType === "greenhouse") {
    const board = companyResolver.slugify(watcher.companyName);
    return { type: "greenhouse", board, url };
  }
  if (watcher.atsType === "lever") {
    const company = companyResolver.slugify(watcher.companyName);
    return { type: "lever", company, url };
  }
  return { type: watcher.atsType, url };
}

async function extractJobs(watcher) {
  const companyName = watcher.companyName || watcher.url;
  const targetRole = watcher.targetRole || "*";
  const monitorAll = atsExtractor.isMonitorAll(targetRole);

  const { url, html, ats } = await fetchPageContent(watcher);

  if (ats && ats.type !== "generic") {
    const structured = await atsExtractor.extract(ats, url, html, targetRole, companyName);
    if (structured && structured.length > 0) {
      console.log(`⚡ ATS extract (${ats.type}): ${structured.length} jobs from ${companyName}`);
      return structured;
    }
  }

  if (!html) return [];

  const pageJobs = await atsExtractor.extract({ type: "generic", url }, url, html, targetRole, companyName);
  if (pageJobs && pageJobs.length > 0) {
    console.log(`📄 Page extract: ${pageJobs.length} jobs from ${url}`);
    return pageJobs;
  }

  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").substring(0, 8000);

  const prompt = `
You are a job extraction engine. Extract job postings from this careers page content.

COMPANY: ${companyName}
PAGE URL: ${url}
USER TARGET ROLE: ${monitorAll ? "ANY — return all job postings found" : targetRole}
EXCLUDE KEYWORDS: ${(watcher.negativeKeywords || []).join(", ") || "none"}

PAGE CONTENT:
${text}

Return a JSON array only. Each item must have title, company, description, link (full URL), relevanceScore (0-100).
If monitoring all roles, include every distinct job posting. If targeting a role, score by fit.
[{"title":"...","company":"...","description":"...","link":"https://...","relevanceScore":85}]
  `.trim();

  try {
    const raw = await generateContent(prompt);
    return parseJobMatches(raw);
  } catch (e) {
    console.error("AI extraction failed:", e.message);
    return [];
  }
}

// ── Junk title filter (shared with ATSExtractor) ─────────────────────────────
const JUNK_PATTERNS = [
  /^(english|deutsch|français|español|português|nederlands|italiano|日本語|한국어|中文)$/i,
  /^view\s+(open\s+)?roles?$/i,
  /^view\s+all$/i,
  /^(learn|read)\s+more/i,
  /^see\s+(open\s+)?roles?/i,
  /^(benefits|university|life at|our opportunity|how we operate)/i,
  /&nbsp;/i,
  /^(careers?|jobs?)\s*(hiring)?$/i,
  /^hire\s+/i,
  /^(home|about|contact|faq|blog|press|privacy|terms)/i,
  /^(sign\s*(in|up)|log\s*in|register|subscribe)$/i,
];

function isJunkTitle(title) {
  if (!title || title.trim().length < 5) return true;
  const t = title.trim();
  if (t.length > 120) return true;
  if (JUNK_PATTERNS.some(p => p.test(t))) return true;
  if (/^[\d\s.,!?#@$%^&*()\-_+=]+$/.test(t)) return true;
  return false;
}

async function saveMatches(matches, watcher) {
  const saved = [];
  const exclusions = (watcher.negativeKeywords || []).map((k) => k.toLowerCase());
  const monitorAll = atsExtractor.isMonitorAll(watcher.targetRole);
  const minScore = monitorAll ? 50 : 60;

  for (const m of matches) {
    // Filter junk titles
    if (isJunkTitle(m.title)) continue;

    const score = Number(m.relevanceScore) || (monitorAll ? 70 : 0);
    if (score < minScore) continue;

    const haystack = `${m.title || ""} ${m.description || ""}`.toLowerCase();
    if (exclusions.some((term) => term && haystack.includes(term))) continue;

    const link = m.link && m.link.startsWith("http") ? m.link : companyResolver.normalizeUrl(watcher.url);
    const exists = await JobMatch.findOne({ title: m.title, company: m.company || watcher.companyName, link });
    if (exists) continue;

    const savedMatch = await new JobMatch({
      title: m.title,
      company: m.company || watcher.companyName || "Unknown",
      description: m.description || "",
      link,
      relevanceScore: score,
      feedback: { status: "pending" },
      watcherId: watcher._id,
    }).save();

    saved.push(savedMatch);
    console.log(`✨ Match: ${m.title} @ ${m.company || watcher.companyName}`);
  }

  return saved;
}

async function prepareWatcher(input, targetRole) {
  const resolved = await companyResolver.resolve(input);
  const role = (targetRole || "*").trim() || "*";

  return {
    url: resolved.url,
    companyName: resolved.companyName,
    targetRole: role,
    atsType: resolved.ats?.type || "generic",
    keywords: [],
    negativeKeywords: [],
    isActive: true,
  };
}

async function runJobHunt(specificWatcherId = null) {
  const ownsConnection = mongoose.connection.readyState !== 1;
  if (ownsConnection) {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/vajn_pro");
  }

  const query = specificWatcherId
    ? { _id: specificWatcherId, isActive: true }
    : { isActive: true };
  const watchers = await Watcher.find(query);
  let totalSaved = 0;
  const allSaved = [];

  for (const watcher of watchers) {
    const label = watcher.companyName || watcher.url;
    const roleLabel = atsExtractor.isMonitorAll(watcher.targetRole) ? "all roles" : watcher.targetRole;
    console.log(`📡 Job Hunt: ${roleLabel} @ ${label} (${watcher.url})`);

    let matches = [];
    try {
      matches = await extractJobs(watcher);
    } catch (e) {
      console.error("Extraction failed:", e.message);
      continue;
    }

    const saved = await saveMatches(matches, watcher);
    totalSaved += saved.length;
    allSaved.push(...saved);
    await Watcher.findByIdAndUpdate(watcher._id, { lastRun: new Date() });
  }

  if (totalSaved > 0) {
    notifier.notifyNewJobs(totalSaved, allSaved);
  }

  if (ownsConnection) {
    await mongoose.disconnect();
  }

  return { totalSaved, matches: allSaved };
}

module.exports = { runJobHunt, prepareWatcher, extractJobs, normalizeUrl: companyResolver.normalizeUrl };
