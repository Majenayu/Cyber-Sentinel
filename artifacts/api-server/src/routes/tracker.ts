import { Router, type Request, type Response } from "express";
import mongoose, { Schema, Document } from "mongoose";
const router = Router();

interface ITrack extends Document {
  type: "qr" | "honeypot";
  uid: string;
  label: string;
  redirectUrl?: string;
  hits: Array<{
    ip: string;
    userAgent: string;
    referer: string;
    timestamp: Date;
    country?: string;
    city?: string;
    isp?: string;
  }>;
  createdAt: Date;
}

const TrackSchema = new Schema<ITrack>({
  type: { type: String, enum: ["qr", "honeypot"], required: true },
  uid: { type: String, required: true, unique: true, index: true },
  label: { type: String, default: "" },
  redirectUrl: { type: String },
  hits: [{
    ip: String,
    userAgent: String,
    referer: String,
    timestamp: { type: Date, default: Date.now },
    country: String,
    city: String,
    isp: String,
  }],
  createdAt: { type: Date, default: Date.now },
});

const Track = mongoose.models.Track ?? mongoose.model<ITrack>("Track", TrackSchema);

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function logHit(track: ITrack, req: Request) {
  const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
  const hit: any = {
    ip,
    userAgent: req.headers["user-agent"] ?? "",
    referer: req.headers["referer"] ?? "",
    timestamp: new Date(),
  };
  try {
    const geo = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,isp`, { signal: AbortSignal.timeout(3000) });
    if (geo.ok) {
      const g: any = await geo.json();
      hit.country = g.country;
      hit.city = g.city;
      hit.isp = g.isp;
    }
  } catch {}
  track.hits.push(hit);
  await track.save();
}

router.post("/tracker/qr", async (req, res) => {
  const { label = "QR Code", redirectUrl = "" } = req.body ?? {};
  const id = uid();
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : `http://localhost:${process.env.API_PORT ?? 8080}`;
  const trackUrl = `${baseUrl}/api/tracker/qr/${id}/scan`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(trackUrl)}&size=200x200`;

  try {
    await Track.create({ type: "qr", uid: id, label, redirectUrl });
    res.json({ id, uid: id, label, trackUrl, qrImageUrl, redirectUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tracker/qr/:id/scan", async (req, res) => {
  const track = await Track.findOne({ uid: req.params.id, type: "qr" }).catch(() => null);
  if (!track) { res.status(404).send("Not found"); return; }
  await logHit(track, req);
  const redirect = track.redirectUrl || "https://cybersentinel.app";
  res.redirect(302, redirect);
});

router.get("/tracker/qr/:id/stats", async (req, res) => {
  const track = await Track.findOne({ uid: req.params.id, type: "qr" }).catch(() => null);
  if (!track) { res.status(404).json({ error: "not found" }); return; }
  res.json({ id: track.uid, label: track.label, hits: track.hits.length, log: track.hits, createdAt: track.createdAt });
});

router.post("/tracker/honeypot", async (req, res) => {
  const { label = "Honeypot Pixel" } = req.body ?? {};
  const id = uid();
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : `http://localhost:${process.env.API_PORT ?? 8080}`;
  const pixelUrl = `${baseUrl}/api/tracker/honeypot/${id}/pixel.gif`;
  const linkUrl = `${baseUrl}/api/tracker/honeypot/${id}/visit`;

  try {
    await Track.create({ type: "honeypot", uid: id, label });
    res.json({ id, uid: id, label, pixelUrl, linkUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const TRANSPARENT_GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

router.get("/tracker/honeypot/:id/pixel.gif", async (req, res) => {
  const track = await Track.findOne({ uid: req.params.id, type: "honeypot" }).catch(() => null);
  if (track) await logHit(track, req);
  res.set({ "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache" });
  res.send(TRANSPARENT_GIF);
});

router.get("/tracker/honeypot/:id/visit", async (req, res) => {
  const track = await Track.findOne({ uid: req.params.id, type: "honeypot" }).catch(() => null);
  if (!track) { res.status(404).send("Not found"); return; }
  await logHit(track, req);
  res.send("<html><body style='background:#000;color:#0f0;font-family:monospace'><h1>403 Forbidden</h1></body></html>");
});

router.get("/tracker/honeypot/:id/stats", async (req, res) => {
  const track = await Track.findOne({ uid: req.params.id, type: "honeypot" }).catch(() => null);
  if (!track) { res.status(404).json({ error: "not found" }); return; }
  res.json({ id: track.uid, label: track.label, hits: track.hits.length, log: track.hits, createdAt: track.createdAt });
});

router.get("/tracker/list", async (req, res) => {
  const items = await Track.find({}, { hits: 0 }).sort({ createdAt: -1 }).limit(50).catch(() => []);
  res.json(items.map(t => ({ id: t.uid, type: t.type, label: t.label, hitCount: t.hits?.length ?? 0, createdAt: t.createdAt })));
});

export default router;
