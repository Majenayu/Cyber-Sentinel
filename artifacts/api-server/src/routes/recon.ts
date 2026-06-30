import { Router } from "express";
import dns from "dns/promises";
import net from "net";
import { ghostFetch } from "../lib/ghost";
const router = Router();

function sanitizeDomain(d: string) {
  return String(d).toLowerCase().replace(/[^a-z0-9.\-_]/g, "").slice(0, 253);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const PORT_SERVICES: Record<number, string> = {
  21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
  80: "HTTP", 110: "POP3", 143: "IMAP", 389: "LDAP", 443: "HTTPS",
  445: "SMB", 465: "SMTPS", 587: "SMTP/TLS", 993: "IMAPS", 995: "POP3S",
  1433: "MSSQL", 1521: "Oracle DB", 3306: "MySQL", 3389: "RDP",
  5432: "PostgreSQL", 5900: "VNC", 6379: "Redis", 8080: "HTTP-Alt",
  8443: "HTTPS-Alt", 8888: "HTTP-Alt2", 9200: "Elasticsearch",
  27017: "MongoDB", 6443: "Kubernetes", 2375: "Docker", 2376: "Docker TLS",
};

const DEFAULT_PORTS = [
  21, 22, 23, 25, 53, 80, 110, 143, 389, 443,
  445, 465, 587, 993, 995, 1433, 3306, 3389,
  5432, 5900, 6379, 8080, 8443, 9200, 27017,
];

router.post("/recon/dns", async (req, res) => {
  const { domain, types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"] } = req.body ?? {};
  if (!domain) { res.status(400).json({ error: "domain required" }); return; }

  const sanitized = sanitizeDomain(domain);
  if (!sanitized || !sanitized.includes(".")) {
    res.status(400).json({ error: "invalid domain — must contain a dot (e.g. google.com)" });
    return;
  }

  const results: Record<string, any> = {};
  const errors: Record<string, string> = {};

  const lookups: Promise<void>[] = (types as string[]).map(async (type) => {
    try {
      switch (type) {
        case "A":    results.A = await dns.resolve4(sanitized); break;
        case "AAAA": results.AAAA = await dns.resolve6(sanitized).catch(() => []); break;
        case "MX":   results.MX = await dns.resolveMx(sanitized); break;
        case "NS":   results.NS = await dns.resolveNs(sanitized); break;
        case "TXT":  results.TXT = (await dns.resolveTxt(sanitized)).map(r => r.join("")); break;
        case "CNAME":results.CNAME = await dns.resolveCname(sanitized).catch(() => []); break;
        case "SOA":  results.SOA = await dns.resolveSoa(sanitized).catch(() => null); break;
        case "PTR":  results.PTR = await dns.resolvePtr(sanitized).catch(() => []); break;
      }
    } catch (e: any) {
      errors[type] = e.code ?? e.message;
    }
  });

  await Promise.allSettled(lookups);
  res.json({ domain: sanitized, results, errors });
});

router.post("/recon/whois", async (req, res) => {
  const { domain } = req.body ?? {};
  if (!domain) { res.status(400).json({ error: "domain required" }); return; }

  const sanitized = sanitizeDomain(domain);
  if (!sanitized || !sanitized.includes(".")) {
    res.status(400).json({ error: "invalid domain — must contain a dot (e.g. google.com)" });
    return;
  }

  try {
    const r = await ghostFetch(`https://rdap.org/domain/${encodeURIComponent(sanitized)}`, {
      headers: { Accept: "application/json", "User-Agent": "CyberSentinel/1.0" },
    });
    if (!r.ok) {
      if (r.status === 404) throw new Error(`Domain "${sanitized}" not found in RDAP. The TLD may not be supported — try a common TLD like .com, .net, .org`);
      throw new Error(`RDAP returned ${r.status} — the registry may be temporarily unavailable`);
    }
    const data: any = await r.json();

    const entities = (data.entities ?? []).flatMap((e: any) => {
      const vcard = e.vcardArray?.[1] ?? [];
      const name = vcard.find((c: any) => c[0] === "fn")?.[3] ?? null;
      const email = vcard.find((c: any) => c[0] === "email")?.[3] ?? null;
      const org = vcard.find((c: any) => c[0] === "org")?.[3] ?? null;
      const phone = vcard.find((c: any) => c[0] === "tel")?.[3] ?? null;
      const address = vcard.find((c: any) => c[0] === "adr")?.[3] ?? null;
      return [{ roles: e.roles, name, email, org, phone, address }];
    });

    res.json({
      domain: sanitized,
      status: data.status,
      registered: data.events?.find((e: any) => e.eventAction === "registration")?.eventDate ?? null,
      expiry: data.events?.find((e: any) => e.eventAction === "expiration")?.eventDate ?? null,
      lastChanged: data.events?.find((e: any) => e.eventAction === "last changed")?.eventDate ?? null,
      nameservers: (data.nameservers ?? []).map((n: any) => n.ldhName),
      entities,
      secureDns: data.secureDNS ?? null,
      handle: data.handle ?? null,
      links: (data.links ?? []).filter((l: any) => l.type?.includes("whois") || l.rel === "related").map((l: any) => l.href),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "WHOIS lookup failed" });
  }
});

router.post("/recon/port-check", async (req, res) => {
  const { host, ports = DEFAULT_PORTS } = req.body ?? {};
  if (!host) { res.status(400).json({ error: "host required" }); return; }

  const sanitized = String(host).replace(/[^a-z0-9.\-:]/gi, "");
  const portList = (Array.isArray(ports) ? ports : [ports]).slice(0, 50).map(Number).filter(p => p > 0 && p < 65536);

  const results = await Promise.all(portList.map(port =>
    new Promise<{ port: number; service: string; open: boolean; latency: number | null; note?: string }>((resolve) => {
      const start = Date.now();
      const sock = new net.Socket();
      sock.setTimeout(3000);
      sock.on("connect", () => {
        const latency = Date.now() - start;
        sock.destroy();
        resolve({ port, service: PORT_SERVICES[port] ?? "unknown", open: true, latency });
      });
      sock.on("timeout", () => { sock.destroy(); resolve({ port, service: PORT_SERVICES[port] ?? "unknown", open: false, latency: null }); });
      sock.on("error", (e: any) => {
        sock.destroy();
        const note = e.code === "ECONNREFUSED" ? "refused" : e.code === "ENETUNREACH" ? "unreachable" : undefined;
        resolve({ port, service: PORT_SERVICES[port] ?? "unknown", open: false, latency: null, note });
      });
      sock.connect(port, sanitized);
    })
  ));

  const open = results.filter(r => r.open).length;
  res.json({
    host: sanitized,
    results,
    openCount: open,
    closedCount: results.length - open,
    note: "Port checks use TCP connections — results depend on firewall rules. Ports may appear closed behind NAT even if the service is running.",
  });
});

async function fetchCrtSh(sanitized: string): Promise<string[]> {
  const r = await ghostFetch(`https://crt.sh/?q=%.${encodeURIComponent(sanitized)}&output=json`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CyberSentinel/1.0; +https://github.com)",
      "Accept": "application/json",
    },
  });
  if (!r.ok) throw new Error(`crt.sh returned ${r.status}`);
  const data: any[] = await r.json();
  return [...new Set(
    data.flatMap((entry: any) =>
      String(entry.name_value ?? "").split("\n").map((s: string) => s.trim().replace(/^\*\./, ""))
    ).filter((s: string) => s.endsWith(sanitized) && s !== sanitized)
  )].sort();
}

async function fetchHackerTarget(sanitized: string): Promise<string[]> {
  const r = await ghostFetch(`https://api.hackertarget.com/hostsearch/?q=${encodeURIComponent(sanitized)}`, {
    headers: { "User-Agent": "CyberSentinel/1.0" },
  });
  if (!r.ok) throw new Error(`HackerTarget returned ${r.status}`);
  const text = await r.text();
  if (text.includes("error") || text.includes("API count")) throw new Error(text.trim());
  const subdomains = [...new Set(
    text.split("\n")
      .map(line => line.split(",")[0]?.trim())
      .filter(s => s && s.endsWith(sanitized) && s !== sanitized)
  )].sort();
  return subdomains;
}

router.post("/recon/subdomains", async (req, res) => {
  const { domain } = req.body ?? {};
  if (!domain) { res.status(400).json({ error: "domain required" }); return; }

  const sanitized = sanitizeDomain(domain);
  if (!sanitized || !sanitized.includes(".")) {
    res.status(400).json({ error: "invalid domain" });
    return;
  }

  const MAX_RETRIES = 3;
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const subdomains = await fetchCrtSh(sanitized);
      res.json({ domain: sanitized, count: subdomains.length, subdomains: subdomains.slice(0, 300), source: "crt.sh" });
      return;
    } catch (err: any) {
      lastError = err.message ?? "crt.sh failed";
      if (attempt < MAX_RETRIES) await sleep(2000 * attempt);
    }
  }

  try {
    const subdomains = await fetchHackerTarget(sanitized);
    res.json({ domain: sanitized, count: subdomains.length, subdomains: subdomains.slice(0, 300), source: "hackertarget.com (crt.sh unavailable)" });
    return;
  } catch (fallbackErr: any) {
    res.status(502).json({
      error: `Subdomain lookup failed — crt.sh: ${lastError}; fallback: ${fallbackErr.message ?? "error"}. Both services are temporarily unavailable. Try again in a minute.`
    });
  }
});

// SSL: polls Qualys until READY or timeout (~90s max)
router.post("/recon/ssl", async (req, res) => {
  const { domain } = req.body ?? {};
  if (!domain) { res.status(400).json({ error: "domain required" }); return; }

  const sanitized = String(domain).replace(/[^a-z0-9.\-]/gi, "");

  const MAX_POLLS = 9;
  const POLL_SLEEP = 10000;

  let lastData: any = null;

  for (let poll = 0; poll < MAX_POLLS; poll++) {
    try {
      const r = await ghostFetch(
        `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(sanitized)}&fromCache=on&maxAge=12&all=done`
      );
      if (!r.ok) {
        if (r.status === 429) {
          res.status(429).json({ error: "SSL Labs rate limit — please wait 60 seconds before trying again" });
          return;
        }
        throw new Error(`SSL Labs returned ${r.status}`);
      }
      const data: any = await r.json();
      lastData = data;

      const status = data.status as string;

      // Terminal states — return immediately
      if (status === "READY" || status === "ERROR") {
        res.json({
          domain: sanitized,
          status,
          statusMessage: status === "ERROR" ? (data.statusMessage ?? "Analysis failed") : null,
          grade: data.endpoints?.[0]?.grade ?? null,
          gradeTrustIgnored: data.endpoints?.[0]?.gradeTrustIgnored ?? null,
          endpoints: (data.endpoints ?? []).map((e: any) => ({
            ipAddress: e.ipAddress,
            grade: e.grade,
            hasWarnings: e.hasWarnings,
            isExceptional: e.isExceptional,
            progress: e.progress,
            statusMessage: e.statusMessage,
            delegation: e.delegation,
          })),
        });
        return;
      }

      // Still running — wait and poll again
      if (poll < MAX_POLLS - 1) {
        await sleep(POLL_SLEEP);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message ?? "SSL check failed" });
      return;
    }
  }

  // Timed out — return whatever we have
  res.json({
    domain: sanitized,
    status: lastData?.status ?? "IN_PROGRESS",
    statusMessage: "Analysis is still running. Click Retry in ~30 seconds for results.",
    grade: lastData?.endpoints?.[0]?.grade ?? null,
    gradeTrustIgnored: null,
    endpoints: (lastData?.endpoints ?? []).map((e: any) => ({
      ipAddress: e.ipAddress,
      grade: e.grade,
      progress: e.progress,
      statusMessage: e.statusMessage,
    })),
    timedOut: true,
  });
});

export default router;
