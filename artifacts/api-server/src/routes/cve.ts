import { Router } from "express";
const router = Router();

router.get("/cve/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) { res.status(400).json({ error: "q is required" }); return; }

  try {
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(q)}&resultsPerPage=20`;
    const r = await fetch(url, {
      headers: { "User-Agent": "CyberSentinel/1.0" },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) { res.status(502).json({ error: `NVD returned ${r.status}` }); return; }
    const data: any = await r.json();
    const items = (data.vulnerabilities ?? []).map((v: any) => {
      const cve = v.cve;
      const metrics = cve.metrics?.cvssMetricV31?.[0] ?? cve.metrics?.cvssMetricV30?.[0] ?? cve.metrics?.cvssMetricV2?.[0];
      const score = metrics?.cvssData?.baseScore ?? null;
      const severity = metrics?.cvssData?.baseSeverity ?? null;
      return {
        id: cve.id,
        published: cve.published,
        modified: cve.lastModified,
        description: cve.descriptions?.find((d: any) => d.lang === "en")?.value ?? "",
        score,
        severity,
        vector: metrics?.cvssData?.vectorString ?? null,
        references: (cve.references ?? []).slice(0, 3).map((r: any) => r.url),
      };
    });
    res.json({ total: data.totalResults ?? items.length, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "CVE search failed" });
  }
});

export default router;
