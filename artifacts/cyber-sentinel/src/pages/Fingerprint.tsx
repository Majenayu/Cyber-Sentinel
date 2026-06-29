import React, { useEffect, useState } from 'react';
import { Fingerprint as FingerprintIcon, Copy, Check, RefreshCw } from 'lucide-react';

interface FPData {
  userAgent: string;
  language: string;
  languages: string[];
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  screenWidth: number;
  screenHeight: number;
  screenDepth: number;
  screenAvailWidth: number;
  screenAvailHeight: number;
  pixelRatio: number;
  colorDepth: number;
  timezone: string;
  timezoneOffset: number;
  plugins: string[];
  mimeTypes: string[];
  canvasHash: string;
  webglRenderer: string;
  webglVendor: string;
  webglVersion: string;
  touchPoints: number;
  maxTouchPoints: number;
  pdfViewerEnabled: boolean;
  connection: string;
  fonts: string[];
  indexedDB: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  webGL: boolean;
  audio: boolean;
  battery: string;
  vibration: boolean;
  bluetooth: boolean;
}

function getCanvasHash(): string {
  try {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d')!;
    c.width = 200; c.height = 50;
    ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = '#069'; ctx.font = '14px Arial';
    ctx.fillText('CyberSentinel🔒', 10, 30);
    ctx.strokeStyle = 'rgba(102,204,0,0.7)'; ctx.beginPath(); ctx.arc(100, 25, 20, 0, Math.PI * 2); ctx.stroke();
    const data = c.toDataURL();
    let hash = 0;
    for (let i = 0; i < data.length; i++) { hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0; }
    return (hash >>> 0).toString(16).padStart(8, '0');
  } catch { return 'n/a'; }
}

function getWebGLInfo(): { renderer: string; vendor: string; version: string } {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') as WebGLRenderingContext | null ?? c.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) return { renderer: 'n/a', vendor: 'n/a', version: 'n/a' };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      version: gl.getParameter(gl.VERSION),
    };
  } catch { return { renderer: 'n/a', vendor: 'n/a', version: 'n/a' }; }
}

function getFonts(): string[] {
  const test = ['monospace', 'Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana',
    'Helvetica', 'Comic Sans MS', 'Impact', 'Tahoma', 'Trebuchet MS', 'Palatino', 'Garamond',
    'Bookman', 'Avant Garde', 'Symbol', 'Wingdings', 'Webdings'];
  const found: string[] = [];
  for (const f of test) {
    const el = document.createElement('span');
    el.style.cssText = `position:absolute;visibility:hidden;font-size:72px;font-family:'${f}',monospace`;
    el.textContent = 'mmmmmmmmli';
    document.body.appendChild(el);
    const w1 = el.offsetWidth;
    el.style.fontFamily = `'${f}',sans-serif`;
    const w2 = el.offsetWidth;
    document.body.removeChild(el);
    if (w1 !== 100 || w2 !== 100) found.push(f);
  }
  return found;
}

async function collect(): Promise<FPData> {
  const nav = window.navigator as any;
  const wgl = getWebGLInfo();
  const net = (nav.connection ?? nav.mozConnection ?? nav.webkitConnection);
  let battery = 'n/a';
  try { const b = await nav.getBattery?.(); if (b) battery = `${Math.round(b.level * 100)}% ${b.charging ? '⚡' : '🔋'}`; } catch {}

  return {
    userAgent: nav.userAgent,
    language: nav.language,
    languages: [...(nav.languages ?? [])],
    platform: nav.platform,
    cookieEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory ?? null,
    screenWidth: screen.width,
    screenHeight: screen.height,
    screenDepth: screen.colorDepth,
    screenAvailWidth: screen.availWidth,
    screenAvailHeight: screen.availHeight,
    pixelRatio: window.devicePixelRatio,
    colorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    plugins: Array.from(nav.plugins ?? []).map((p: any) => p.name),
    mimeTypes: Array.from(nav.mimeTypes ?? []).map((m: any) => m.type),
    canvasHash: getCanvasHash(),
    webglRenderer: wgl.renderer,
    webglVendor: wgl.vendor,
    webglVersion: wgl.version,
    touchPoints: nav.msMaxTouchPoints ?? 0,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    pdfViewerEnabled: nav.pdfViewerEnabled ?? false,
    connection: net ? `${net.effectiveType ?? ''} ${net.downlink ?? ''}Mbps` : 'n/a',
    fonts: getFonts(),
    indexedDB: !!window.indexedDB,
    localStorage: !!window.localStorage,
    sessionStorage: !!window.sessionStorage,
    webGL: !!wgl.renderer,
    audio: !!(window.AudioContext ?? (window as any).webkitAudioContext),
    battery,
    vibration: !!nav.vibrate,
    bluetooth: !!nav.bluetooth,
  };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border/40 last:border-0 gap-4 text-xs">
      <span className="text-muted-foreground shrink-0 w-44">{label}</span>
      <span className="text-primary text-right font-mono break-all">{value}</span>
    </div>
  );
}

export default function Fingerprint() {
  const [fp, setFp] = useState<FPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  async function run() {
    setLoading(true);
    const data = await collect();
    setFp(data);
    setLoading(false);
  }

  useEffect(() => { run(); }, []);

  const sections = fp ? [
    { title: 'Browser', rows: [
      ['User Agent', fp.userAgent],
      ['Platform', fp.platform],
      ['Language', `${fp.language} (${fp.languages.join(', ')})`],
      ['Cookie Enabled', String(fp.cookieEnabled)],
      ['Do Not Track', fp.doNotTrack ?? 'null'],
      ['PDF Viewer', String(fp.pdfViewerEnabled)],
      ['Connection', fp.connection],
    ]},
    { title: 'Hardware', rows: [
      ['CPU Cores', String(fp.hardwareConcurrency)],
      ['Device Memory', fp.deviceMemory !== null ? `${fp.deviceMemory} GB` : 'n/a'],
      ['Battery', fp.battery],
      ['Vibration API', String(fp.vibration)],
      ['Bluetooth API', String(fp.bluetooth)],
      ['Touch Points', String(fp.maxTouchPoints)],
    ]},
    { title: 'Display', rows: [
      ['Resolution', `${fp.screenWidth}×${fp.screenHeight}`],
      ['Available', `${fp.screenAvailWidth}×${fp.screenAvailHeight}`],
      ['Pixel Ratio', String(fp.pixelRatio)],
      ['Color Depth', `${fp.colorDepth}-bit`],
    ]},
    { title: 'Time & Location', rows: [
      ['Timezone', fp.timezone],
      ['UTC Offset', `${fp.timezoneOffset > 0 ? '-' : '+'}${Math.abs(fp.timezoneOffset / 60)}h`],
    ]},
    { title: 'Canvas & WebGL', rows: [
      ['Canvas Hash', fp.canvasHash],
      ['WebGL Renderer', fp.webglRenderer],
      ['WebGL Vendor', fp.webglVendor],
      ['WebGL Version', fp.webglVersion],
    ]},
    { title: 'Storage APIs', rows: [
      ['IndexedDB', String(fp.indexedDB)],
      ['localStorage', String(fp.localStorage)],
      ['sessionStorage', String(fp.sessionStorage)],
      ['Web Audio API', String(fp.audio)],
      ['WebGL', String(fp.webGL)],
    ]},
    { title: 'Plugins', rows: fp.plugins.map(p => [p, '✓'] as [string, string]) },
    { title: 'Detected Fonts', rows: fp.fonts.map(f => [f, '✓'] as [string, string]) },
  ] : [];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><FingerprintIcon size={22} /> Browser Fingerprint Inspector</h1>
            <p className="text-muted-foreground text-xs">Your browser's unique identity — what every site can see about you.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={run} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            {fp && (
              <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(fp, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors">
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />} Export JSON
              </button>
            )}
          </div>
        </header>

        {loading ? (
          <div className="text-center py-16 text-primary text-sm animate-pulse">Collecting fingerprint data…</div>
        ) : fp && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map(sec => (
              <div key={sec.title} className={`bg-card/50 border border-border rounded-lg overflow-hidden ${sec.title === 'Browser' || sec.title === 'Canvas & WebGL' ? 'md:col-span-2' : ''}`}>
                <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">{sec.title}</div>
                <div className="px-4 py-1">
                  {sec.rows.length > 0 ? sec.rows.map(([k, v]) => <Row key={k} label={k} value={v} />) : (
                    <p className="text-xs text-muted-foreground py-3">None detected</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
