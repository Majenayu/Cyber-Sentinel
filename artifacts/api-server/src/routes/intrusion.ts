import { Router, type Request, type Response } from 'express';
import nodemailer from 'nodemailer';
import connectToDatabase from '../lib/mongodb';
import Intrusion from '../lib/models/Intrusion';

const router = Router();

function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = 'Unknown';
  let os = 'Unknown';

  if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/MSIE|Trident/.test(ua)) browser = 'Internet Explorer';
  else if (/Chromium/.test(ua)) browser = 'Chromium';

  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6\.1/.test(ua)) os = 'Windows 7';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) {
    const v = ua.match(/Mac OS X ([\d_]+)/);
    os = v ? `macOS ${v[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/Android/.test(ua)) {
    const v = ua.match(/Android ([\d.]+)/);
    os = v ? `Android ${v[1]}` : 'Android';
  } else if (/iPhone|iPad/.test(ua)) {
    const v = ua.match(/OS ([\d_]+)/);
    os = v ? `iOS ${v[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/Linux/.test(ua)) os = 'Linux';

  return { browser, os };
}

function isPrivateIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  // 172.16.0.0 – 172.31.255.255 (RFC 1918) — NOT the full 172.x.x.x range
  const m = ip.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // IPv6 ULA
  return false;
}

async function getIpInfo(ip: string) {
  try {
    const cleanIp = ip.replace('::ffff:', '').split(',')[0].trim();
    if (isPrivateIp(cleanIp)) {
      return { country: 'Local Network', region: 'Local', city: 'Local', isp: 'localhost', org: 'localhost', lat: 0, lon: 0, timezone: 'Local', ip: cleanIp };
    }
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city,isp,org,lat,lon,timezone,query`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('ip-api error');
    const data = await res.json();
    if (data.status !== 'success') throw new Error('ip-api failed');
    return { country: data.country || 'Unknown', region: data.regionName || 'Unknown', city: data.city || 'Unknown', isp: data.isp || 'Unknown', org: data.org || 'Unknown', lat: data.lat || 0, lon: data.lon || 0, timezone: data.timezone || 'Unknown', ip: data.query || cleanIp };
  } catch {
    return { country: 'Unknown', region: 'Unknown', city: 'Unknown', isp: 'Unknown', org: 'Unknown', lat: 0, lon: 0, timezone: 'Unknown', ip };
  }
}

async function sendAlertEmail(intrusion: any, isNew: boolean) {
  const smtpEmail = process.env.SMTP_EMAIL;
  const smtpPass = process.env.SMTP_PASSWORD;
  if (!smtpEmail || !smtpPass) return;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpEmail, pass: smtpPass },
    });

    const subject = isNew
      ? `🚨 [CYBERSENTINEL] NEW INTRUSION ATTEMPT — ${intrusion.ip}`
      : `⚠️ [CYBERSENTINEL] REPEAT INTRUSION — ${intrusion.ip} (${intrusion.attempts} attempts)`;

    const mapsLink = `https://www.google.com/maps?q=${intrusion.lat},${intrusion.lon}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #0a0a0a; color: #e0e0e0; font-family: 'Courier New', monospace; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; border: 1px solid #cc0000; background: #0f0f0f; }
    .header { background: #cc0000; padding: 20px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: 4px; }
    .header p { color: rgba(255,255,255,0.7); margin: 5px 0 0; font-size: 11px; letter-spacing: 2px; }
    .body { padding: 24px; }
    .section { margin-bottom: 20px; border-left: 2px solid #cc0000; padding-left: 12px; }
    .section h3 { color: #cc0000; font-size: 11px; letter-spacing: 3px; margin: 0 0 10px; text-transform: uppercase; }
    .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .label { color: #888; font-size: 11px; }
    .value { color: #e0e0e0; font-size: 11px; font-weight: bold; }
    .ip { font-size: 24px; color: #cc0000; font-weight: bold; letter-spacing: 3px; text-align: center; padding: 16px; border: 1px solid #cc0000; margin: 16px 0; }
    .attempts { background: #cc000022; border: 1px solid #cc0000; padding: 12px; text-align: center; margin: 16px 0; }
    .attempts .num { font-size: 36px; color: #cc0000; font-weight: bold; }
    .attempts .label { color: #888; font-size: 10px; letter-spacing: 3px; display: block; }
    .btn { display: block; background: #cc0000; color: #fff; text-decoration: none; text-align: center; padding: 12px; letter-spacing: 3px; font-size: 12px; margin: 16px 0; }
    .footer { background: #050505; padding: 12px; text-align: center; color: #444; font-size: 9px; letter-spacing: 2px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠ CYBERSENTINEL</h1>
      <p>${isNew ? 'NEW INTRUSION ATTEMPT DETECTED' : 'REPEAT INTRUSION DETECTED'} — ${new Date().toUTCString()}</p>
    </div>
    <div class="body">
      <div class="ip">${intrusion.ip}</div>
      <div class="attempts">
        <span class="num">${intrusion.attempts}</span>
        <span class="label">TOTAL AUTHENTICATION ATTEMPTS FROM THIS IP</span>
      </div>

      <div class="section">
        <h3>📍 Geolocation</h3>
        <div class="row"><span class="label">Country</span><span class="value">${intrusion.country}</span></div>
        <div class="row"><span class="label">Region</span><span class="value">${intrusion.region}</span></div>
        <div class="row"><span class="label">City</span><span class="value">${intrusion.city}</span></div>
        <div class="row"><span class="label">ISP</span><span class="value">${intrusion.isp}</span></div>
        <div class="row"><span class="label">Organization</span><span class="value">${intrusion.org}</span></div>
        <div class="row"><span class="label">Coordinates</span><span class="value">${intrusion.lat}, ${intrusion.lon}</span></div>
        <div class="row"><span class="label">Timezone</span><span class="value">${intrusion.timezone}</span></div>
        <a class="btn" href="${mapsLink}">📍 VIEW ON GOOGLE MAPS</a>
      </div>

      <div class="section">
        <h3>💻 Device Fingerprint</h3>
        <div class="row"><span class="label">Browser</span><span class="value">${intrusion.browser}</span></div>
        <div class="row"><span class="label">OS</span><span class="value">${intrusion.os}</span></div>
        <div class="row"><span class="label">Platform</span><span class="value">${intrusion.platform}</span></div>
        <div class="row"><span class="label">Language</span><span class="value">${intrusion.language}</span></div>
        <div class="row"><span class="label">Screen</span><span class="value">${intrusion.screenResolution}</span></div>
        <div class="row"><span class="label">CPU Cores</span><span class="value">${intrusion.cores}</span></div>
        <div class="row"><span class="label">Memory</span><span class="value">${intrusion.memory} GB</span></div>
        <div class="row"><span class="label">Color Depth</span><span class="value">${intrusion.colorDepth}-bit</span></div>
        <div class="row"><span class="label">Cookies</span><span class="value">${intrusion.cookieEnabled ? 'Enabled' : 'Disabled'}</span></div>
        <div class="row"><span class="label">Do Not Track</span><span class="value">${intrusion.doNotTrack}</span></div>
      </div>

      <div class="section">
        <h3>🕵️ Attempted IDs</h3>
        ${(intrusion.attemptedIds || []).map((id: string) => `<div class="row"><span class="value">"${id}"</span></div>`).join('')}
      </div>

      <div class="section">
        <h3>🌐 User Agent</h3>
        <div style="background:#050505;padding:8px;font-size:10px;color:#888;word-break:break-all">${intrusion.userAgent}</div>
      </div>

      <div class="section">
        <h3>⏱ Timeline</h3>
        <div class="row"><span class="label">First Seen</span><span class="value">${new Date(intrusion.firstSeen).toUTCString()}</span></div>
        <div class="row"><span class="label">Last Seen</span><span class="value">${new Date(intrusion.lastSeen).toUTCString()}</span></div>
      </div>
    </div>
    <div class="footer">CYBERSENTINEL INTRUSION DETECTION SYSTEM // CLASSIFIED // LEVEL-5</div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"CyberSentinel IDS" <${smtpEmail}>`,
      to: 'pgayushrai@gmail.com',
      subject,
      html,
    });
  } catch (err) {
    console.warn('[intrusion] Email send failed:', err);
  }
}

router.post('/auth/intrusion', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const rawIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'Unknown';

    const ip = rawIp.replace('::ffff:', '');
    const ua = req.headers['user-agent'] || '';
    const { browser, os } = parseUserAgent(ua);
    const body = req.body || {};

    const ipInfo = await getIpInfo(ip);

    const existing = await Intrusion.findOne({ ip });
    const isNew = !existing;

    const attemptedId = (body.attemptedId as string || '').slice(0, 100);

    let intrusion;
    if (existing) {
      existing.attempts += 1;
      existing.lastSeen = new Date();
      if (attemptedId && !existing.attemptedIds.includes(attemptedId)) {
        existing.attemptedIds.push(attemptedId);
      }
      existing.userAgent = ua;
      existing.browser = browser;
      existing.os = os;
      existing.platform = body.platform || existing.platform;
      existing.language = body.language || existing.language;
      existing.screenResolution = body.screenResolution || existing.screenResolution;
      existing.colorDepth = body.colorDepth || existing.colorDepth;
      existing.cores = body.cores || existing.cores;
      existing.memory = body.memory || existing.memory;
      existing.cookieEnabled = body.cookieEnabled ?? existing.cookieEnabled;
      existing.doNotTrack = body.doNotTrack || existing.doNotTrack;
      if (body.plugins?.length) existing.plugins = body.plugins;
      await existing.save();
      intrusion = existing;
    } else {
      intrusion = await Intrusion.create({
        ip,
        ...ipInfo,
        attempts: 1,
        attemptedIds: attemptedId ? [attemptedId] : [],
        userAgent: ua,
        browser,
        os,
        platform: body.platform || 'Unknown',
        language: body.language || 'Unknown',
        screenResolution: body.screenResolution || 'Unknown',
        colorDepth: body.colorDepth || 0,
        cores: body.cores || 0,
        memory: body.memory || 0,
        cookieEnabled: body.cookieEnabled ?? false,
        doNotTrack: body.doNotTrack || 'Unknown',
        plugins: body.plugins || [],
        emailSent: false,
      });
    }

    sendAlertEmail(intrusion, isNew).catch(() => {});

    res.json({ logged: true, attempts: intrusion.attempts });
  } catch (err: any) {
    console.error('[intrusion] Error:', err);
    res.status(500).json({ error: 'Failed to log intrusion' });
  }
});

router.get('/auth/intrusions', async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const intrusions = await Intrusion.find().sort({ lastSeen: -1 }).limit(100);
    res.json(intrusions);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch intrusions' });
  }
});

export default router;
