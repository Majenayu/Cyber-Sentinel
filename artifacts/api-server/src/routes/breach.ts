import { Router } from "express";
import { ghostFetch } from "../lib/ghost";
const router = Router();

router.get("/breach", async (req, res) => {
  const email = String(req.query.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) { res.status(400).json({ error: "valid email required" }); return; }

  try {
    const hibpKey = process.env.HIBP_API_KEY ?? "";
    const hibpHeaders: Record<string, string> = {
      "User-Agent": "CyberSentinel-SecurityDashboard",
      "hibp-api-key": hibpKey,
    };

    const [breachRes, pasteRes, xonRes] = await Promise.allSettled([
      ghostFetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, {
        headers: hibpHeaders,
      }),
      ghostFetch(`https://haveibeenpwned.com/api/v3/pasteaccount/${encodeURIComponent(email)}`, {
        headers: hibpHeaders,
      }),
      ghostFetch(`https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`, {
        headers: { "User-Agent": "CyberSentinel-SecurityDashboard" },
      }),
    ]);

    let breaches: any[] = [];
    let pastes: any[] = [];
    let error: string | null = null;
    let xonBreaches: string[] = [];
    let xonFound = false;
    let xonError: string | null = null;

    if (breachRes.status === "fulfilled") {
      if (breachRes.value.status === 200) {
        breaches = await breachRes.value.json();
      } else if (breachRes.value.status === 404) {
        breaches = [];
      } else if (breachRes.value.status === 401) {
        error = "HIBP API key required — add HIBP_API_KEY secret";
      } else if (breachRes.value.status === 429) {
        error = "Rate limited — wait 1 minute";
      }
    }

    if (pasteRes.status === "fulfilled") {
      if (pasteRes.value.status === 200) {
        pastes = await pasteRes.value.json();
      } else {
        pastes = [];
      }
    }

    if (xonRes.status === "fulfilled") {
      if (xonRes.value.status === 200) {
        const xonData: any = await xonRes.value.json();
        if (xonData.exposures && Array.isArray(xonData.exposures)) {
          xonBreaches = xonData.exposures;
          xonFound = xonBreaches.length > 0;
        }
      } else if (xonRes.value.status === 404) {
        xonFound = false;
        xonBreaches = [];
      } else {
        xonError = `XposedOrNot: status ${xonRes.value.status}`;
      }
    } else {
      xonError = "XposedOrNot: " + (xonRes.reason?.message ?? "timeout");
    }

    res.json({
      email,
      found: breaches.length > 0,
      breachCount: breaches.length,
      pasteCount: pastes.length,
      needsApiKey: !hibpKey,
      error,
      xon: {
        found: xonFound,
        breachCount: xonBreaches.length,
        breaches: xonBreaches,
        error: xonError,
      },
      breaches: breaches.map((b: any) => ({
        name: b.Name,
        title: b.Title,
        domain: b.Domain,
        breachDate: b.BreachDate,
        addedDate: b.AddedDate,
        pwnCount: b.PwnCount,
        description: b.Description?.replace(/<[^>]+>/g, "").substring(0, 200),
        dataClasses: b.DataClasses,
        isVerified: b.IsVerified,
        isSensitive: b.IsSensitive,
        logoPath: b.LogoPath,
      })),
      pastes: (pastes ?? []).slice(0, 10).map((p: any) => ({
        source: p.Source,
        id: p.Id,
        title: p.Title,
        date: p.Date,
        emailCount: p.EmailCount,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Breach check failed" });
  }
});

export default router;
