import { Router } from "express";
const router = Router();

router.get("/stealth/myip", async (_req, res) => {
  try {
    const r = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "CyberSentinel/1.0" },
    });
    if (!r.ok) throw new Error(`ipify returned ${r.status}`);
    const data: any = await r.json();
    res.json({ ip: data.ip });
  } catch (err: any) {
    res.status(503).json({ error: "Could not fetch current IP: " + (err.message ?? "timeout") });
  }
});

const VPN_LOCATIONS = [
  { country: "Netherlands", city: "Amsterdam", code: "NL", lat: 52.3676, lon: 4.9041 },
  { country: "Germany", city: "Frankfurt", code: "DE", lat: 50.1109, lon: 8.6821 },
  { country: "Switzerland", city: "Zurich", code: "CH", lat: 47.3769, lon: 8.5417 },
  { country: "Sweden", city: "Stockholm", code: "SE", lat: 59.3293, lon: 18.0686 },
  { country: "Finland", city: "Helsinki", code: "FI", lat: 60.1699, lon: 24.9384 },
  { country: "Norway", city: "Oslo", code: "NO", lat: 59.9139, lon: 10.7522 },
  { country: "United States", city: "New York", code: "US", lat: 40.7128, lon: -74.0060 },
  { country: "United States", city: "Los Angeles", code: "US", lat: 34.0522, lon: -118.2437 },
  { country: "United States", city: "Chicago", code: "US", lat: 41.8781, lon: -87.6298 },
  { country: "Canada", city: "Toronto", code: "CA", lat: 43.6532, lon: -79.3832 },
  { country: "United Kingdom", city: "London", code: "GB", lat: 51.5074, lon: -0.1278 },
  { country: "France", city: "Paris", code: "FR", lat: 48.8566, lon: 2.3522 },
  { country: "Japan", city: "Tokyo", code: "JP", lat: 35.6762, lon: 139.6503 },
  { country: "Singapore", city: "Singapore", code: "SG", lat: 1.3521, lon: 103.8198 },
  { country: "Australia", city: "Sydney", code: "AU", lat: -33.8688, lon: 151.2093 },
  { country: "Brazil", city: "São Paulo", code: "BR", lat: -23.5505, lon: -46.6333 },
  { country: "Romania", city: "Bucharest", code: "RO", lat: 44.4268, lon: 26.1025 },
  { country: "Iceland", city: "Reykjavik", code: "IS", lat: 64.1265, lon: -21.8174 },
  { country: "Panama", city: "Panama City", code: "PA", lat: 8.9936, lon: -79.5197 },
  { country: "Mexico", city: "Mexico City", code: "MX", lat: 19.4326, lon: -99.1332 },
];

function fakeIp() {
  const blocks = [
    [45, 46, 51, 62, 77, 82, 84, 86, 88, 91],
    Array.from({ length: 254 }, (_, i) => i + 1),
    Array.from({ length: 254 }, (_, i) => i + 1),
    Array.from({ length: 253 }, (_, i) => i + 2),
  ];
  return blocks.map(b => b[Math.floor(Math.random() * b.length)]).join(".");
}

router.get("/stealth/locations", (_req, res) => {
  res.json({ locations: VPN_LOCATIONS });
});

router.post("/stealth/connect", async (req, res) => {
  const { locationIndex } = req.body ?? {};
  const idx = typeof locationIndex === "number" ? Math.max(0, Math.min(locationIndex, VPN_LOCATIONS.length - 1)) : Math.floor(Math.random() * VPN_LOCATIONS.length);
  const location = VPN_LOCATIONS[idx];

  const assignedIp = fakeIp();

  res.json({
    connected: true,
    ip: assignedIp,
    location,
    note: "Simulated VPN connection — shows what a connection through this exit node would look like. For real anonymity use Tor or a paid VPN service.",
  });
});

router.get("/stealth/rotate", (_req, res) => {
  const locations: typeof VPN_LOCATIONS = [];
  const usedIdx = new Set<number>();
  while (locations.length < 5) {
    const idx = Math.floor(Math.random() * VPN_LOCATIONS.length);
    if (!usedIdx.has(idx)) {
      usedIdx.add(idx);
      locations.push(VPN_LOCATIONS[idx]);
    }
  }
  const ips = locations.map(() => fakeIp());
  res.json({
    rotation: locations.map((loc, i) => ({
      minute: i + 1,
      ip: ips[i],
      location: loc,
    })),
  });
});

export default router;
