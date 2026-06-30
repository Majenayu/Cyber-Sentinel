import { Router } from "express";
import { ghostFetch } from "../lib/ghost";
const router = Router();

router.get("/ip/reputation", async (req, res) => {
  const ip = String(req.query.ip ?? "").trim();
  if (!ip) { res.status(400).json({ error: "ip is required" }); return; }

  try {
    const [geoRes, abuseRes] = await Promise.allSettled([
      ghostFetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting,query`),
      ghostFetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90&verbose`, {
        headers: {
          Key: process.env.ABUSEIPDB_KEY ?? "",
          Accept: "application/json",
        },
      }),
    ]);

    const geo = geoRes.status === "fulfilled" && geoRes.value.ok ? await geoRes.value.json() : null;
    const abuse = abuseRes.status === "fulfilled" && abuseRes.value.ok && process.env.ABUSEIPDB_KEY
      ? (await abuseRes.value.json())?.data : null;

    const shodanKey = process.env.SHODAN_API_KEY;
    const shodan = shodanKey
      ? await ghostFetch(`https://api.shodan.io/shodan/host/${ip}?key=${shodanKey}&minify=true`)
          .then(r => r.ok ? r.json() : null).catch(() => null)
      : null;

    res.json({
      ip,
      geo: geo?.status === "success" ? {
        country: geo.country,
        countryCode: geo.countryCode,
        region: geo.regionName,
        city: geo.city,
        lat: geo.lat,
        lon: geo.lon,
        timezone: geo.timezone,
        isp: geo.isp,
        org: geo.org,
        asn: geo.as,
        proxy: geo.proxy,
        hosting: geo.hosting,
      } : null,
      abuse: abuse ? {
        abuseScore: abuse.abuseConfidenceScore,
        totalReports: abuse.totalReports,
        numDistinctUsers: abuse.numDistinctUsers,
        lastReportedAt: abuse.lastReportedAt,
        isWhitelisted: abuse.isWhitelisted,
        countryCode: abuse.countryCode,
        usageType: abuse.usageType,
        domain: abuse.domain,
        isTor: abuse.isTor,
      } : null,
      shodan: shodan ? {
        ports: shodan.ports,
        tags: shodan.tags,
        vulns: shodan.vulns ? Object.keys(shodan.vulns).slice(0, 10) : [],
        lastUpdate: shodan.last_update,
        hostnames: shodan.hostnames,
        os: shodan.os,
      } : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "IP lookup failed" });
  }
});

export default router;
