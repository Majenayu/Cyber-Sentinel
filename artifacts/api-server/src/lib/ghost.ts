import https from "node:https";
import http from "node:http";
import { HttpsProxyAgent } from "https-proxy-agent";

export interface GhostProxy {
  ip: string;
  port: number;
  country: string;
  countryName: string;
  flag: string;
}

export interface GhostState {
  active: boolean;
  proxy: GhostProxy | null;
  exitIp: string | null;
  activatedAt: Date | null;
  rotationCount: number;
  nextRotation: Date | null;
}

export const ghostState: GhostState = {
  active: false,
  proxy: null,
  exitIp: null,
  activatedAt: null,
  rotationCount: 0,
  nextRotation: null,
};

let rotationTimer: ReturnType<typeof setTimeout> | null = null;
let proxyPool: GhostProxy[] = [];

const FLAG: Record<string, string> = {
  NL: "🇳🇱", DE: "🇩🇪", SE: "🇸🇪", FI: "🇫🇮", NO: "🇳🇴", US: "🇺🇸",
  CA: "🇨🇦", GB: "🇬🇧", FR: "🇫🇷", JP: "🇯🇵", SG: "🇸🇬", AU: "🇦🇺",
  BR: "🇧🇷", RO: "🇷🇴", IS: "🇮🇸", PA: "🇵🇦", UA: "🇺🇦", PL: "🇵🇱",
  HU: "🇭🇺", TR: "🇹🇷", CH: "🇨🇭", MX: "🇲🇽", IN: "🇮🇳", ZA: "🇿🇦",
};
const COUNTRY_NAMES: Record<string, string> = {
  NL: "Netherlands", DE: "Germany", SE: "Sweden", FI: "Finland", NO: "Norway",
  US: "United States", CA: "Canada", GB: "United Kingdom", FR: "France",
  JP: "Japan", SG: "Singapore", AU: "Australia", BR: "Brazil", RO: "Romania",
  IS: "Iceland", PA: "Panama", UA: "Ukraine", PL: "Poland", HU: "Hungary",
  TR: "Turkey", CH: "Switzerland", MX: "Mexico", IN: "India", ZA: "South Africa",
};

// Fetch fresh proxy pool — tries geonode first, falls back to proxyscrape + GitHub list
export async function refreshProxyPool(): Promise<GhostProxy[]> {
  const fresh: GhostProxy[] = [];

  // Source 1: geonode (may be blocked by Replit's datacenter IPs — that's OK, has fallbacks)
  try {
    const r = await fetch(
      "https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc&filterUpTime=50&protocols=http,https",
      { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "CyberSentinel/1.0" } }
    );
    if (r.ok) {
      const d: any = await r.json();
      for (const p of d.data ?? []) {
        if (p.ip && p.port) {
          fresh.push({ ip: p.ip, port: Number(p.port), country: p.country ?? "??", countryName: COUNTRY_NAMES[p.country] ?? p.country ?? "Unknown", flag: FLAG[p.country] ?? "🌐" });
        }
      }
    }
  } catch {}

  // Source 2: ProxyScrape (usually works from any host)
  if (fresh.length < 10) {
    try {
      const r = await fetch(
        "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=3000&country=all&ssl=all&anonymity=all",
        { signal: AbortSignal.timeout(10000), headers: { "User-Agent": "CyberSentinel/1.0" } }
      );
      if (r.ok) {
        const text = await r.text();
        for (const line of text.trim().split("\n").slice(0, 80)) {
          const [ip, portStr] = line.trim().split(":");
          const port = Number(portStr);
          if (ip && port && !isNaN(port)) {
            fresh.push({ ip: ip.trim(), port, country: "??", countryName: "Unknown", flag: "🌐" });
          }
        }
      }
    } catch {}
  }

  // Source 3: GitHub proxy list (raw text, always public)
  if (fresh.length < 10) {
    try {
      const r = await fetch(
        "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
        { signal: AbortSignal.timeout(10000), headers: { "User-Agent": "CyberSentinel/1.0" } }
      );
      if (r.ok) {
        const text = await r.text();
        for (const line of text.trim().split("\n").slice(0, 80)) {
          const [ip, portStr] = line.trim().split(":");
          const port = Number(portStr);
          if (ip && port && !isNaN(port)) {
            fresh.push({ ip: ip.trim(), port, country: "??", countryName: "Unknown", flag: "🌐" });
          }
        }
      }
    } catch {}
  }

  if (fresh.length > 0) proxyPool = fresh;
  return proxyPool;
}

// HTTP proxy forwarding (plain HTTP target) — sends absolute URI to proxy
function fetchHttpViaProxy(targetUrl: string, proxyHost: string, proxyPort: number, timeoutMs = 9000): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const timer = setTimeout(() => { req.destroy(new Error("proxy timeout")); }, timeoutMs);
    const req = http.request({
      host: proxyHost,
      port: proxyPort,
      path: targetUrl,           // absolute URI tells the proxy where to forward
      method: "GET",
      headers: {
        "Host": parsed.hostname,
        "User-Agent": "CyberSentinel/1.0",
        "Accept": "application/json",
        "Proxy-Connection": "close",
      },
    }, (res) => {
      let data = "";
      res.on("data", (c: any) => (data += c));
      res.on("end", () => { clearTimeout(timer); resolve(data); });
    });
    req.on("error", (e: Error) => { clearTimeout(timer); reject(e); });
    req.end();
  });
}

// HTTPS proxy via CONNECT tunnel (for HTTPS targets)
function fetchHttpsViaProxy(targetUrl: string, proxyHost: string, proxyPort: number, timeoutMs = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    const agent = new HttpsProxyAgent(`http://${proxyHost}:${proxyPort}`) as any;
    const timer = setTimeout(() => req.destroy(new Error("proxy tunnel timeout")), timeoutMs);
    const req = https.get(targetUrl, { agent }, (res) => {
      let data = "";
      res.on("data", (c: any) => (data += c));
      res.on("end", () => { clearTimeout(timer); resolve(data); });
    });
    req.on("error", (e: Error) => { clearTimeout(timer); reject(e); });
  });
}

// Raw string fetch through a proxy — uses correct protocol per URL scheme
function fetchRawViaProxy(targetUrl: string, proxyHost: string, proxyPort: number, timeoutMs = 10000): Promise<string> {
  if (targetUrl.startsWith("https://")) {
    return fetchHttpsViaProxy(targetUrl, proxyHost, proxyPort, timeoutMs);
  }
  return fetchHttpViaProxy(targetUrl, proxyHost, proxyPort, timeoutMs);
}

// Test a specific proxy — returns the exit IP if it works, null if it fails
// Uses HTTP (not HTTPS) because most free HTTP proxies don't support CONNECT tunneling
export async function testProxy(proxy: GhostProxy): Promise<string | null> {
  try {
    const raw = await fetchRawViaProxy("http://api.ipify.org?format=json", proxy.ip, proxy.port, 8000);
    const d = JSON.parse(raw);
    return typeof d.ip === "string" ? d.ip : null;
  } catch {
    return null;
  }
}

// Fetch-compatible response object routed through active ghost proxy
export async function ghostFetch(url: string, options: Record<string, any> = {}): Promise<any> {
  // When ghost mode is off, just use native fetch
  if (!ghostState.active || !ghostState.proxy) {
    return fetch(url, options);
  }

  const { ip, port } = ghostState.proxy;
  const agent = new HttpsProxyAgent(`http://${ip}:${port}`) as any;
  const isHttps = url.startsWith("https://");
  const lib = isHttps ? https : http;
  const method = (options.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = options.headers ?? {};
  const body = options.body ?? null;

  return new Promise<any>((resolve, reject) => {
    let parsed: URL;
    try { parsed = new URL(url); }
    catch (e) { reject(e); return; }

    const reqOptions: any = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers,
      agent,
    };

    const timer = setTimeout(() => req.destroy(new Error("ghost fetch timeout")), 15000);

    const req = lib.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (c: any) => (data += c));
      res.on("end", () => {
        clearTimeout(timer);
        const status = res.statusCode ?? 0;
        const responseHeaders = res.headers;
        resolve({
          ok: status >= 200 && status < 300,
          status,
          json: () => { try { return Promise.resolve(JSON.parse(data)); } catch (e) { return Promise.reject(e); } },
          text: () => Promise.resolve(data),
          headers: {
            get: (name: string) => {
              const v = responseHeaders[name.toLowerCase()];
              return Array.isArray(v) ? v[0] : v ?? null;
            },
          },
        });
      });
    });

    req.on("error", (e: Error) => { clearTimeout(timer); reject(e); });
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

// Race all candidates in parallel — first working proxy wins
export async function findAndActivate(): Promise<{ proxy: GhostProxy; exitIp: string } | null> {
  if (proxyPool.length < 5) await refreshProxyPool();
  const candidates = [...proxyPool].sort(() => Math.random() - 0.5).slice(0, 30);
  if (candidates.length === 0) return null;

  return new Promise((resolve) => {
    let resolved = false;
    let settled = 0;
    const total = candidates.length;

    for (const proxy of candidates) {
      testProxy(proxy)
        .then((exitIp) => {
          if (exitIp && !resolved) {
            resolved = true;
            resolve({ proxy, exitIp });
          }
        })
        .catch(() => {})
        .finally(() => {
          settled++;
          if (settled === total && !resolved) resolve(null);
        });
    }
  });
}

const ROTATE_MS = 5 * 60 * 1000; // 5 minutes

function scheduleRotation() {
  if (rotationTimer) clearTimeout(rotationTimer);
  ghostState.nextRotation = new Date(Date.now() + ROTATE_MS);
  rotationTimer = setTimeout(async () => {
    if (!ghostState.active) return;
    const result = await findAndActivate();
    if (result) {
      ghostState.proxy = result.proxy;
      ghostState.exitIp = result.exitIp;
      ghostState.rotationCount++;
    }
    scheduleRotation();
  }, ROTATE_MS);
}

export function enableGhost(proxy: GhostProxy, exitIp: string) {
  ghostState.active = true;
  ghostState.proxy = proxy;
  ghostState.exitIp = exitIp;
  ghostState.activatedAt = new Date();
  ghostState.rotationCount = 0;
  scheduleRotation();
}

export function disableGhost() {
  ghostState.active = false;
  ghostState.proxy = null;
  ghostState.exitIp = null;
  ghostState.activatedAt = null;
  ghostState.nextRotation = null;
  ghostState.rotationCount = 0;
  if (rotationTimer) { clearTimeout(rotationTimer); rotationTimer = null; }
}
