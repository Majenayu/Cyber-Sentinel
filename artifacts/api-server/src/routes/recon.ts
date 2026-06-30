import { Router } from "express";
import dns from "dns/promises";
import net from "net";
const router = Router();

function sanitizeDomain(d: string) {
  return String(d).toLowerCase().replace(/[^a-z0-9.\-_]/g, "").slice(0, 253);
}

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
    const r = await fetch(`https://rdap.org/domain/${encodeURIComponent(sanitized)}`, {
      headers: { Accept: "application/json", "User-Agent": "CyberSentinel/1.0" },
      signal: AbortSignal.timeout(12000),
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
      return [{ roles: e.roles, name, email, org }];
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
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "WHOIS lookup failed" });
  }
});

router.post("/recon/port-check", async (req, res) => {
  const { host, ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 6379, 8080, 8443] } = req.body ?? {};
  if (!host) { res.status(400).json({ error: "host required" }); return; }

  const sanitized = String(host).replace(/[^a-z0-9.\-:]/gi, "");
  const portList = (Array.isArray(ports) ? ports : [ports]).slice(0, 30).map(Number).filter(p => p > 0 && p < 65536);

  const results = await Promise.all(portList.map(port =>
    new Promise<{ port: number; open: boolean; latency: number | null; note?: string }>((resolve) => {
      const start = Date.now();
      const sock = new net.Socket();
      sock.setTimeout(3000);
      sock.on("connect", () => {
        const latency = Date.now() - start;
        sock.destroy();
        resolve({ port, open: true, latency });
      });
      sock.on("timeout", () => { sock.destroy(); resolve({ port, open: false, latency: null }); });
      sock.on("error", (e: any) => {
        sock.destroy();
        const note = e.code === "ECONNREFUSED" ? "refused" : e.code === "ENETUNREACH" ? "unreachable" : undefined;
        resolve({ port, open: false, latency: null, note });
      });
      sock.connect(port, sanitized);
    })
  ));

  res.json({
    host: sanitized,
    results,
    note: "Port checks use TCP connections — results depend on firewall rules. Ports may appear closed behind NAT even if the service is running.",
  });
});

router.post("/recon/subdomains", async (req, res) => {
  const { domain } = req.body ?? {};
  if (!domain) { res.status(400).json({ error: "domain required" }); return; }

  const sanitized = sanitizeDomain(domain);
  if (!sanitized || !sanitized.includes(".")) {
    res.status(400).json({ error: "invalid domain" });
    return;
  }

  try {
    const r = await fetch(`https://crt.sh/?q=%.${encodeURIComponent(sanitized)}&output=json`, {
      headers: { "User-Agent": "CyberSentinel/1.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`crt.sh returned ${r.status} — try again in a moment`);
    const data: any[] = await r.json();
    const subdomains = [...new Set(
      data.flatMap((entry: any) =>
        String(entry.name_value ?? "").split("\n").map((s: string) => s.trim().replace(/^\*\./, ""))
      ).filter((s: string) => s.endsWith(sanitized) && s !== sanitized)
    )].sort();

    res.json({ domain: sanitized, count: subdomains.length, subdomains: subdomains.slice(0, 300) });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Subdomain enumeration failed" });
  }
});

router.post("/recon/ssl", async (req, res) => {
  const { domain } = req.body ?? {};
  if (!domain) { res.status(400).json({ error: "domain required" }); return; }

  const sanitized = String(domain).replace(/[^a-z0-9.\-]/gi, "");
  try {
    const r = await fetch(
      `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(sanitized)}&fromCache=on&maxAge=12`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!r.ok) {
      if (r.status === 429) throw new Error("SSL Labs rate limit — please wait 60 seconds before trying again");
      throw new Error(`SSL Labs returned ${r.status}`);
    }
    const data: any = await r.json();
    res.json({
      domain: sanitized,
      status: data.status,
      statusMessage: data.statusMessage ?? (data.status === "DNS" ? "Resolving DNS — please retry in 30s" : data.status === "IN_PROGRESS" ? "Analysis running — retry in ~60s" : null),
      grade: data.endpoints?.[0]?.grade ?? null,
      gradeTrustIgnored: data.endpoints?.[0]?.gradeTrustIgnored ?? null,
      endpoints: (data.endpoints ?? []).map((e: any) => ({
        ipAddress: e.ipAddress,
        grade: e.grade,
        hasWarnings: e.hasWarnings,
        isExceptional: e.isExceptional,
        progress: e.progress,
        statusMessage: e.statusMessage,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "SSL check failed" });
  }
});

export default router;
