const fetch = require("node-fetch");
const aiService = require("./AIService");

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/json",
};

function normalizeUrl(url) {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function looksLikeUrl(input) {
  return /^https?:\/\//i.test(input) || /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(input);
}

function slugify(name) {
  return (name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function companyToDomainGuess(name) {
  const slug = slugify(name);
  if (!slug) return null;
  return `${slug}.com`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...FETCH_HEADERS, ...(options.headers || {}) },
      signal: controller.signal,
      redirect: "follow",
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function probeUrl(url) {
  try {
    const res = await fetchWithTimeout(normalizeUrl(url), { method: "GET" }, 15000);
    const finalUrl = res.url || normalizeUrl(url);
    const text = res.ok ? await res.text() : "";
    return { ok: res.ok, status: res.status, url: finalUrl, text };
  } catch (e) {
    return { ok: false, status: 0, url: normalizeUrl(url), text: "", error: e.message };
  }
}

function detectATS(url, html = "") {
  const urlLower = url.toLowerCase();

  const workdayHost = url.match(/https?:\/\/([^.]+)\.myworkdayjobs\.com/i);
  if (workdayHost) {
    return { type: "workday", tenant: workdayHost[1], url };
  }

  const greenhouseUrl = urlLower.match(/boards\.greenhouse\.io\/([a-z0-9_-]+)/i);
  if (greenhouseUrl) return { type: "greenhouse", board: greenhouseUrl[1], url };

  const leverUrl = urlLower.match(/jobs\.lever\.co\/([a-z0-9_-]+)/i);
  if (leverUrl) return { type: "lever", company: leverUrl[1], url };

  const haystack = `${url} ${html}`.toLowerCase();

  const embedBoard = html.match(/greenhouse\.io\/embed\/job_board\?for=([a-z0-9_-]+)/i);
  if (embedBoard) return { type: "greenhouse", board: embedBoard[1], url };

  if (html && haystack.includes("myworkdayjobs.com")) {
    const tenant = haystack.match(/([a-z0-9-]+)\.myworkdayjobs\.com/i);
    if (tenant) return { type: "workday", tenant: tenant[1], url };
  }

  const greenhouse = haystack.match(/boards\.greenhouse\.io\/([a-z0-9_-]+)/i);
  if (greenhouse) return { type: "greenhouse", board: greenhouse[1], url };

  const lever = haystack.match(/jobs\.lever\.co\/([a-z0-9_-]+)/i);
  if (lever) return { type: "lever", company: lever[1], url };

  if (haystack.includes("careers.") || haystack.includes("/careers") || haystack.includes("/jobs")) {
    return { type: "generic", url };
  }

  return { type: "generic", url };
}

function buildCandidateUrls(input) {
  const trimmed = input.trim();
  const candidates = new Set();

  if (looksLikeUrl(trimmed)) {
    candidates.add(normalizeUrl(trimmed));
    return [...candidates];
  }

  const slug = slugify(trimmed);
  const domain = companyToDomainGuess(trimmed);

  if (domain) {
    candidates.add(`https://careers.${domain}`);
    candidates.add(`https://jobs.${domain}`);
    candidates.add(`https://www.${domain}/careers`);
    candidates.add(`https://www.${domain}/jobs`);
    candidates.add(`https://${domain}/careers`);
    candidates.add(`https://${domain}/jobs`);
  }

  if (slug) {
    candidates.add(`https://${slug}.myworkdayjobs.com`);
    candidates.add(`https://boards.greenhouse.io/${slug}`);
    candidates.add(`https://jobs.lever.co/${slug}`);
  }

  return [...candidates];
}

async function resolveWithAI(companyName) {
  try {
    const prompt = `Company name: "${companyName}"
Return the official careers or jobs page URL for this company.
Respond with JSON only: {"url":"https://...","company":"Display Name"}
Use a real, working careers/jobs URL. If unsure, use the most likely careers subdomain.`;
    const response = await aiService.generateContent(prompt);
    const clean = response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (parsed.url) {
      return {
        url: normalizeUrl(parsed.url),
        companyName: parsed.company || companyName,
        source: "ai",
      };
    }
  } catch (e) {
    console.warn("AI company resolution failed:", e.message);
  }
  return null;
}

async function probeATSEndpoints(slug, companyName) {
  if (!slug) return null;

  try {
    const ghRes = await fetchWithTimeout(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
      { method: "GET" },
      6000
    );
    if (ghRes.ok) {
      const data = await ghRes.json();
      if (Array.isArray(data.jobs) && data.jobs.length > 0) {
        return {
          url: `https://boards.greenhouse.io/${slug}`,
          companyName,
          ats: { type: "greenhouse", board: slug, url: `https://boards.greenhouse.io/${slug}` },
          source: "greenhouse-api",
        };
      }
    }
  } catch (_) {}

  try {
    const leverRes = await fetchWithTimeout(
      `https://api.lever.co/v0/postings/${slug}?mode=json`,
      { method: "GET" },
      6000
    );
    if (leverRes.ok) {
      const data = await leverRes.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          url: `https://jobs.lever.co/${slug}`,
          companyName,
          ats: { type: "lever", company: slug, url: `https://jobs.lever.co/${slug}` },
          source: "lever-api",
        };
      }
    }
  } catch (_) {}

  try {
    const wdProbe = await probeUrl(`https://${slug}.myworkdayjobs.com`);
    if (wdProbe.ok) {
      const ats = detectATS(wdProbe.url, wdProbe.text);
      if (ats.type === "workday") {
        return {
          url: wdProbe.url,
          companyName,
          ats,
          source: "workday",
        };
      }
    }
  } catch (_) {}

  return null;
}

async function resolve(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) throw new Error("Company name or URL is required");

  if (looksLikeUrl(trimmed)) {
    const url = normalizeUrl(trimmed);
    const probe = await probeUrl(url);
    const ats = detectATS(probe.url, probe.text);
    const companyName =
      trimmed.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "").split(".")[0];

    return {
      url: probe.url,
      companyName: companyName.charAt(0).toUpperCase() + companyName.slice(1),
      ats,
      source: "direct",
    };
  }

  const slug = slugify(trimmed);

  const atsHit = await probeATSEndpoints(slug, trimmed);
  if (atsHit) return atsHit;

  const candidates = buildCandidateUrls(trimmed);
  const probes = await Promise.all(candidates.map((c) => probeUrl(c)));

  for (const probe of probes) {
    if (!probe.ok || !probe.text) continue;
    const ats = detectATS(probe.url, probe.text);
    if (ats.type !== "generic" || probe.url.includes("career") || probe.url.includes("job")) {
      return {
        url: probe.url,
        companyName: trimmed,
        ats,
        source: "probe",
      };
    }
  }

  const aiResult = await resolveWithAI(trimmed);
  if (aiResult) {
    const probe = await probeUrl(aiResult.url);
    const ats = detectATS(probe.url || aiResult.url, probe.text);
    if (ats.type === "generic" && slug) {
      const retryAts = await probeATSEndpoints(slug, aiResult.companyName);
      if (retryAts) return retryAts;
    }
    return {
      url: probe.url || aiResult.url,
      companyName: aiResult.companyName,
      ats,
      source: "ai",
    };
  }

  const fallbackDomain = companyToDomainGuess(trimmed);
  return {
    url: `https://www.${fallbackDomain}/careers`,
    companyName: trimmed,
    ats: { type: "generic", url: `https://www.${fallbackDomain}/careers` },
    source: "fallback",
  };
}

module.exports = {
  resolve,
  normalizeUrl,
  looksLikeUrl,
  slugify,
  detectATS,
  probeUrl,
};
