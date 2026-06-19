const fetch = require("node-fetch");

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json,text/html",
};

// ── Junk title filter ────────────────────────────────────────────────────────
const JUNK_PATTERNS = [
  /^(english|deutsch|français|español|português|nederlands|italiano|日本語|한국어|中文)$/i,
  /^view\s+(open\s+)?roles?$/i,
  /^view\s+all$/i,
  /^(learn|read)\s+more/i,
  /^see\s+(open\s+)?roles?/i,
  /^(benefits|university|life at|our opportunity|how we operate)/i,
  /&nbsp;/i,
  /^(careers?|jobs?)\s*(hiring)?$/i,
  /^hire\s+/i,  // "Hire Web Developers" = service page, not a job posting
  /^(home|about|contact|faq|blog|press|privacy|terms)/i,
  /^(sign\s*(in|up)|log\s*in|register|subscribe)$/i,
];

function isJunkTitle(title) {
  if (!title || title.trim().length < 5) return true;
  const t = title.trim();
  if (t.length > 120) return true;
  if (JUNK_PATTERNS.some(p => p.test(t))) return true;
  // Pure numbers or symbols
  if (/^[\d\s.,!?#@$%^&*()\-_+=]+$/.test(t)) return true;
  return false;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...FETCH_HEADERS, ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function discoverWorkdaySites(html, tenant) {
  const sites = new Set();
  const patterns = [
    /\/wday\/cxs\/[^/]+\/([^/"']+)\/jobs/gi,
    /\/en-US\/([^/"']+)\/job\//gi,
    /myworkdayjobs\.com\/[^/]*\/([a-z0-9_]+)\/job\//gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const site = match[1];
      if (site && !["job", "jobs", "en-US", "wday"].includes(site)) sites.add(site);
    }
  }

  if (sites.size === 0) {
    ["external", "external_experienced", "careers", "global", "university", "campus"].forEach((s) =>
      sites.add(s)
    );
  }

  return [...sites];
}

async function extractWorkday(url, tenant, searchText, companyName) {
  const results = [];
  let sites = [];

  try {
    const pageRes = await fetch(url, { headers: FETCH_HEADERS });
    const html = await pageRes.text();
    sites = discoverWorkdaySites(html, tenant);
  } catch (_) {
    sites = ["external_experienced", "external", "careers"];
  }

  const search = searchText && !isMonitorAll(searchText) ? searchText : "";

  await Promise.all(
    sites.slice(0, 4).map(async (site) => {
      const api = `https://${tenant}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
      try {
        const data = await fetchJson(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appliedFacets: {},
            limit: 20,
            offset: 0,
            searchText: search,
          }),
        });

        if (!Array.isArray(data.jobPostings)) return;

        for (const j of data.jobPostings) {
          results.push({
            title: j.title,
            company: companyName || tenant,
            description: j.locationsText ? `${j.title} — ${j.locationsText}` : j.title,
            link: `https://${tenant}.myworkdayjobs.com/en-US/${site}${j.externalPath}`,
            relevanceScore: search ? 88 : 75,
          });
        }
      } catch (_) {
        /* site may not exist */
      }
    })
  );

  return results;
}

async function extractGreenhouse(board, searchText, companyName) {
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
  if (!Array.isArray(data.jobs)) return [];

  const search = (searchText || "").toLowerCase();
  const monitorAll = isMonitorAll(searchText);

  return data.jobs
    .filter((j) => {
      if (monitorAll) return true;
      const haystack = `${j.title} ${j.content || ""}`.toLowerCase();
      return search.split(/\s+/).some((term) => term && haystack.includes(term));
    })
    .map((j) => ({
      title: j.title,
      company: companyName || board,
      description: (j.content || j.title).replace(/<[^>]+>/g, " ").substring(0, 400),
      link: j.absolute_url,
      relevanceScore: monitorAll ? 75 : 85,
    }));
}

async function extractLever(company, searchText, companyName) {
  const data = await fetchJson(`https://api.lever.co/v0/postings/${company}?mode=json`);
  if (!Array.isArray(data)) return [];

  const search = (searchText || "").toLowerCase();
  const monitorAll = isMonitorAll(searchText);

  return data
    .filter((j) => {
      if (monitorAll) return true;
      const haystack = `${j.text} ${j.description || ""} ${(j.categories?.team || "")}`.toLowerCase();
      return search.split(/\s+/).some((term) => term && haystack.includes(term));
    })
    .map((j) => ({
      title: j.text,
      company: companyName || company,
      description: (j.descriptionPlain || j.description || j.text).substring(0, 400),
      link: j.hostedUrl,
      relevanceScore: monitorAll ? 75 : 85,
    }));
}

function extractJsonLdJobs(html, companyName) {
  const results = [];
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

  for (const script of scripts) {
    const jsonText = script.replace(/<script[^>]*>|<\/script>/gi, "").trim();
    try {
      const data = JSON.parse(jsonText);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "JobPosting") {
          results.push({
            title: item.title,
            company: item.hiringOrganization?.name || companyName || "Unknown",
            description: (item.description || "").replace(/<[^>]+>/g, " ").substring(0, 400),
            link: item.url || item.identifier?.value || "",
            relevanceScore: 80,
          });
        }
      }
    } catch (_) {
      /* skip invalid JSON-LD */
    }
  }

  return results;
}

function isMonitorAll(role) {
  const r = (role || "").trim().toLowerCase();
  return !r || r === "*" || r === "any" || r === "all" || r === "any role" || r === "all roles";
}

function extractJobLinks(html, url, companyName) {
  const results = [];
  const anchorPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(html)) !== null) {
    let link = match[1];
    const rawText = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (isJunkTitle(rawText)) continue;

    // Link must contain a job-related path segment to be a real posting
    const linkLower = link.toLowerCase();
    const hasJobPath = /(job|position|opening|posting|apply|career|requisition|vacancy)\/|\/(job|position|opening|posting|apply|career|requisition|vacancy)/i.test(linkLower);
    const textLower = rawText.toLowerCase();
    const hasJobTitle = /(engineer|developer|manager|analyst|designer|architect|scientist|intern|lead|director|coordinator|specialist|consultant|administrator)/i.test(textLower);
    
    if (!hasJobPath && !hasJobTitle) continue;

    if (link.startsWith("/")) {
      const base = new URL(url);
      link = `${base.origin}${link}`;
    }
    if (!link.startsWith("http")) continue;

    results.push({
      title: rawText,
      company: companyName || "Unknown",
      description: `Found on ${url}`,
      link,
      relevanceScore: 70,
    });
  }

  const seen = new Set();
  return results.filter((r) => {
    const key = `${r.title}|${r.link}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function extractFromPage(html, url, searchText, companyName) {
  const jsonLd = extractJsonLdJobs(html, companyName);
  if (jsonLd.length > 0) return jsonLd;

  const linked = extractJobLinks(html, url, companyName);
  if (linked.length > 0) return linked.slice(0, 20);

  return null;
}

async function extract(ats, url, html, searchText, companyName) {
  if (!ats) return null;

  if (ats.type === "workday" && ats.tenant) {
    const jobs = await extractWorkday(url, ats.tenant, searchText, companyName);
    if (jobs.length > 0) return jobs;
  }

  if (ats.type === "greenhouse" && ats.board) {
    try {
      return await extractGreenhouse(ats.board, searchText, companyName);
    } catch (e) {
      console.warn("Greenhouse extract failed:", e.message);
    }
  }

  if (ats.type === "lever" && ats.company) {
    try {
      return await extractLever(ats.company, searchText, companyName);
    } catch (e) {
      console.warn("Lever extract failed:", e.message);
    }
  }

  if (html) {
    return extractFromPage(html, url, searchText, companyName);
  }

  return null;
}

module.exports = {
  extract,
  extractWorkday,
  extractGreenhouse,
  extractLever,
  isMonitorAll,
};
