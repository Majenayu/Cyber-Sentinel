import { Router } from "express";
import https from "node:https";
import http from "node:http";
import { HttpsProxyAgent } from "https-proxy-agent";
import { ghostState, enableGhost, disableGhost, findAndActivate } from "../lib/ghost";

const router = Router();

const FLAG: Record<string, string> = {
  NL: "🇳🇱", DE: "🇩🇪", CH: "🇨🇭", SE: "🇸🇪", FI: "🇫🇮", NO: "🇳🇴",
  US: "🇺🇸", CA: "🇨🇦", GB: "🇬🇧", FR: "🇫🇷", JP: "🇯🇵", SG: "🇸🇬",
  AU: "🇦🇺", BR: "🇧🇷", RO: "🇷🇴", IS: "🇮🇸", PA: "🇵🇦", MX: "🇲🇽",
  UA: "🇺🇦", PL: "🇵🇱", HU: "🇭🇺", CZ: "🇨🇿", TR: "🇹🇷", IN: "🇮🇳",
  KR: "🇰🇷", HK: "🇭🇰", TW: "🇹🇼", TH: "🇹🇭", VN: "🇻🇳", ID: "🇮🇩",
  ZA: "🇿🇦", AR: "🇦🇷", CL: "🇨🇱", CO: "🇨🇴", RU: "🇷🇺",
};

const COUNTRY_NAMES: Record<string, string> = {
  NL: "Netherlands", DE: "Germany", CH: "Switzerland", SE: "Sweden",
  FI: "Finland", NO: "Norway", US: "United States", CA: "Canada",
  GB: "United Kingdom", FR: "France", JP: "Japan", SG: "Singapore",
  AU: "Australia", BR: "Brazil", RO: "Romania", IS: "Iceland",
  PA: "Panama", MX: "Mexico", UA: "Ukraine", PL: "Poland",
  HU: "Hungary", CZ: "Czech Republic", TR: "Turkey", IN: "India",
  KR: "South Korea", HK: "Hong Kong", TW: "Taiwan", TH: "Thailand",
  VN: "Vietnam", ID: "Indonesia", ZA: "South Africa", AR: "Argentina",
  CL: "Chile", CO: "Colombia", RU: "Russia",
};

function fetchViaProxy(targetUrl: string, proxyHost: string, proxyPort: number, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proxyUrl = `http://${proxyHost}:${proxyPort}`;
    const agent = new HttpsProxyAgent(proxyUrl);

    const isHttps = targetUrl.startsWith("https://");
    const lib = isHttps ? https : http;

    const timer = setTimeout(() => {
      req.destroy(new Error("proxy timeout"));
    }, timeoutMs);

    const req = lib.get(targetUrl, { agent: agent as any }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    req.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function getMyIpDirect(): Promise<string> {
  const r = await fetch("https://api.ipify.org?format=json", {
    signal: AbortSignal.timeout(5000),
    headers: { "User-Agent": "CyberSentinel/1.0" },
  });
  const d: any = await r.json();
  return d.ip;
}

async function getMyIpViaProxy(proxyHost: string, proxyPort: number): Promise<string> {
  const raw = await fetchViaProxy("https://api.ipify.org?format=json", proxyHost, proxyPort, 9000);
  const d = JSON.parse(raw);
  return d.ip;
}

// Cache proxy list for 5 minutes
let proxyCache: { proxies: any[]; fetchedAt: number } | null = null;

async function fetchProxies(): Promise<any[]> {
  if (proxyCache && Date.now() - proxyCache.fetchedAt < 5 * 60 * 1000) {
    return proxyCache.proxies;
  }

  const results: any[] = [];

  // Source 1: Geonode free API
  try {
    const r = await fetch(
      "https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc&filterUpTime=50&protocols=http,https",
      { signal: AbortSignal.timeout(10000), headers: { "User-Agent": "CyberSentinel/1.0" } }
    );
    if (r.ok) {
      const d: any = await r.json();
      for (const p of d.data ?? []) {
        if (p.ip && p.port && p.country) {
          results.push({
            ip: p.ip,
            port: Number(p.port),
            country: p.country,
            countryName: COUNTRY_NAMES[p.country] ?? p.country,
            flag: FLAG[p.country] ?? "🌐",
            uptime: p.upTime ?? 0,
            speed: p.speed ?? 0,
            anonymity: p.anonymityLevel ?? "unknown",
            protocols: p.protocols ?? ["http"],
          });
        }
      }
    }
  } catch {}

  // Source 2: ProxyScrape fallback if geonode returned nothing
  if (results.length < 10) {
    try {
      const r2 = await fetch(
        "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=elite",
        { signal: AbortSignal.timeout(10000), headers: { "User-Agent": "CyberSentinel/1.0" } }
      );
      if (r2.ok) {
        const text = await r2.text();
        const lines = text.trim().split("\n");
        for (const line of lines.slice(0, 50)) {
          const [ip, port] = line.trim().split(":");
          if (ip && port && !isNaN(Number(port))) {
            results.push({
              ip: ip.trim(),
              port: Number(port.trim()),
              country: "??",
              countryName: "Unknown",
              flag: "🌐",
              uptime: null,
              speed: null,
              anonymity: "elite",
              protocols: ["http"],
            });
          }
        }
      }
    } catch {}
  }

  proxyCache = { proxies: results, fetchedAt: Date.now() };
  return results;
}

// GET /api/stealth/myip — real server IP
router.get("/stealth/myip", async (_req, res) => {
  try {
    const ip = await getMyIpDirect();
    res.json({ ip });
  } catch (err: any) {
    res.status(503).json({ error: "Could not fetch IP: " + (err.message ?? "timeout") });
  }
});

// GET /api/stealth/proxies — real live proxy list
router.get("/stealth/proxies", async (_req, res) => {
  try {
    const proxies = await fetchProxies();
    res.json({ proxies: proxies.slice(0, 80), total: proxies.length });
  } catch (err: any) {
    res.status(503).json({ error: "Failed to fetch proxy list: " + (err.message ?? "unknown") });
  }
});

// POST /api/stealth/connect — test a real proxy and return its IP
router.post("/stealth/connect", async (req, res) => {
  const { ip, port } = req.body ?? {};
  if (!ip || !port) {
    res.status(400).json({ error: "ip and port required" });
    return;
  }

  const proxyPort = Number(port);
  if (isNaN(proxyPort)) {
    res.status(400).json({ error: "invalid port" });
    return;
  }

  try {
    const proxyIp = await getMyIpViaProxy(String(ip), proxyPort);
    res.json({
      connected: true,
      exitIp: proxyIp,
      proxyHost: ip,
      proxyPort,
      note: "Traffic routed through real proxy — external services now see this IP.",
    });
  } catch (err: any) {
    res.status(502).json({
      connected: false,
      error: `Proxy ${ip}:${port} failed — ${err.message ?? "connection refused or timeout"}. Try another proxy.`,
    });
  }
});

// POST /api/stealth/rotate-test — test 5 proxies for rotation schedule
router.post("/stealth/rotate-test", async (req, res) => {
  const { proxies: candidates } = req.body ?? {};
  if (!Array.isArray(candidates) || candidates.length === 0) {
    res.status(400).json({ error: "proxies array required" });
    return;
  }

  const results: any[] = [];

  for (const p of candidates.slice(0, 10)) {
    if (results.length >= 5) break;
    try {
      const exitIp = await getMyIpViaProxy(String(p.ip), Number(p.port));
      results.push({
        minute: results.length + 1,
        exitIp,
        proxyHost: p.ip,
        proxyPort: Number(p.port),
        country: p.countryName ?? p.country ?? "Unknown",
        flag: p.flag ?? "🌐",
        working: true,
      });
    } catch {
      // skip broken proxies
    }
  }

  res.json({
    rotation: results,
    found: results.length,
  });
});

// ─── Ghost Mode Endpoints ────────────────────────────────────────────────────

// POST /api/ghost/on — find a working proxy and activate ghost mode
router.post("/ghost/on", async (_req, res) => {
  try {
    const result = await findAndActivate();
    if (!result) {
      res.status(503).json({ error: "Could not find a working proxy right now. Try again in a minute." });
      return;
    }
    enableGhost(result.proxy, result.exitIp);
    res.json({
      active: true,
      exitIp: result.exitIp,
      proxy: result.proxy,
      message: "Ghost Mode activated. All recon, OSINT, IP lookup, and breach check calls now exit through this proxy IP.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to activate Ghost Mode" });
  }
});

// POST /api/ghost/off — deactivate ghost mode
router.post("/ghost/off", (_req, res) => {
  disableGhost();
  res.json({ active: false, message: "Ghost Mode deactivated. Server is using its own IP again." });
});

// GET /api/ghost/status — current ghost state (for polling)
router.get("/ghost/status", (_req, res) => {
  res.json({
    active: ghostState.active,
    exitIp: ghostState.exitIp,
    proxy: ghostState.proxy,
    activatedAt: ghostState.activatedAt,
    rotationCount: ghostState.rotationCount,
    nextRotation: ghostState.nextRotation,
  });
});

export default router;
