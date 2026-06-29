import { Router } from "express";
const router = Router();

router.get("/breach", async (req, res) => {
  const email = String(req.query.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) { res.status(400).json({ error: "valid email required" }); return; }

  try {
    const hibpKey = process.env.HIBP_API_KEY ?? "";
    const headers: Record<string, string> = {
      "User-Agent": "CyberSentinel-SecurityDashboard",
      "hibp-api-key": hibpKey,
    };

    const [breachRes, pasteRes] = await Promise.allSettled([
      fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, {
        headers,
        signal: AbortSignal.timeout(10000),
      }),
      fetch(`https://haveibeenpwned.com/api/v3/pasteaccount/${encodeURIComponent(email)}`, {
        headers,
        signal: AbortSignal.timeout(10000),
      }),
    ]);

    let breaches: any[] = [];
    let pastes: any[] = [];
    let error: string | null = null;

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

    res.json({
      email,
      found: breaches.length > 0,
      breachCount: breaches.length,
      pasteCount: pastes.length,
      needsApiKey: !hibpKey,
      error,
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
