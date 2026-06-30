import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Marker, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Intrusion {
  _id: string;
  ip: string;
  country: string;
  region: string;
  city: string;
  isp: string;
  org: string;
  lat: number;
  lon: number;
  timezone: string;
  attempts: number;
  attemptedIds: string[];
  browser: string;
  os: string;
  platform: string;
  language: string;
  languages: string[];
  screenResolution: string;
  colorDepth: number;
  cores: number;
  memory: number;
  firstSeen: string;
  lastSeen: string;
  userAgent: string;
  referrer: string;
  canvasHash: string;
  webglRenderer: string;
  webglVendor: string;
  webglVersion: string;
  webglExtensions: number;
  audioHash: string;
  webrtcIps: string[];
  isIncognito: boolean;
  hasAdBlocker: boolean;
  geoPermission: string;
  notificationPermission: string;
  cameraPermission: string;
  micPermission: string;
  connectionType: string;
  downlink: number;
  rtt: number;
  supportedCodecs: string;
  batteryLevel: number;
  batteryCharging: boolean;
  uaData: string;
  typeTimeMs: number;
  usedPaste: boolean;
  darkMode: boolean;
  reducedMotion: boolean;
  devicePixelRatio: number;
  availableScreen: string;
  viewport: string;
  windowSize: string;
  maxTouchPoints: number;
  touchDevice: boolean;
  timezoneOffset: number;
}

const SERVER_LAT = 28.6139;
const SERVER_LON = 77.2090;

function arcPoints(from: [number, number], to: [number, number], steps = 60): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = from[0] + (to[0] - from[0]) * t;
    const lon = from[1] + (to[1] - from[1]) * t;
    const lift = Math.sin(Math.PI * t) * 12;
    pts.push([lat + lift, lon]);
  }
  return pts;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      bounds.extend([SERVER_LAT, SERVER_LON]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [points.length, map]);
  return null;
}

function ServerMarker() {
  const icon = useMemo(() => L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:24px;height:24px">
        <div style="
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          width:10px;height:10px;
          background:#00ff88;border-radius:50%;
          box-shadow:0 0 10px rgba(0,255,136,0.9);
        "></div>
        <div style="
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          width:22px;height:22px;border-radius:50%;
          border:1.5px solid rgba(0,255,136,0.5);
          animation:cyberRing1 2s ease-out infinite;
        "></div>
      </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  }), []);

  return (
    <Marker position={[SERVER_LAT, SERVER_LON]} icon={icon}>
      <Popup maxWidth={200}>
        <div style={{ fontFamily: 'Courier New,monospace', fontSize: 12 }}>
          <div style={{ color: '#00ff88', fontWeight: 'bold', letterSpacing: '0.1em', marginBottom: 4 }}>◉ YOUR SERVER</div>
          <div style={{ color: '#888', fontSize: 11 }}>New Delhi, India</div>
          <div style={{ color: '#555', fontSize: 10, marginTop: 2 }}>28.6139°N, 77.2090°E</div>
        </div>
      </Popup>
    </Marker>
  );
}

interface Props {
  height?: number;
}

export default function ThreatMapLeaflet({ height = 480 }: Props) {
  const { data: intrusions = [], isFetching, refetch } = useQuery<Intrusion[]>({
    queryKey: ['intrusions'],
    queryFn: async () => {
      const r = await fetch('/api/auth/intrusions');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const validIntrusions = intrusions.filter(i => i.lat && i.lon);
  const boundsPoints: [number, number][] = validIntrusions.map(i => [i.lat, i.lon]);

  return (
    <div style={{ height, position: 'relative' }} className="rounded-lg overflow-hidden border border-red-900/40">
      <style>{`
        .cyber-map .leaflet-container { background: #080810 !important; }
        .cyber-map .leaflet-popup-content-wrapper {
          background: rgba(8,8,16,0.97) !important;
          border: 1px solid rgba(255,34,68,0.5) !important;
          border-radius: 6px !important;
          color: #e0e0e0 !important;
          box-shadow: 0 0 24px rgba(255,34,68,0.2) !important;
        }
        .cyber-map .leaflet-popup-tip { background: rgba(8,8,16,0.97) !important; }
        .cyber-map .leaflet-popup-content { margin: 10px 14px !important; }
        .cyber-map .leaflet-control-zoom a {
          background: rgba(8,8,16,0.95) !important;
          border-color: #1a1a2e !important;
          color: #00ff88 !important;
          font-weight: bold;
        }
        .cyber-map .leaflet-control-zoom a:hover { background: rgba(0,255,136,0.08) !important; }
        .cyber-map .leaflet-bar { border-color: #1a1a2e !important; box-shadow: none !important; }
        .cyber-map .leaflet-control-attribution {
          background: rgba(0,0,0,0.7) !important;
          color: #2a2a3a !important;
          font-size: 8px !important;
        }
        .cyber-map .leaflet-control-attribution a { color: #333 !important; }
        @keyframes cyberRing1 {
          0% { opacity: 0.7; transform: translate(-50%,-50%) scale(0.4); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(2.8); }
        }
      `}</style>

      <div className="cyber-map" style={{ height: '100%', width: '100%' }}>
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={2}
          maxZoom={18}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          worldCopyJump={true}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={19}
          />

          {boundsPoints.length > 0 && <FitBounds points={boundsPoints} />}
          <ServerMarker />

          {validIntrusions.map(intrusion => (
            <React.Fragment key={intrusion._id}>
              <Polyline
                positions={arcPoints([intrusion.lat, intrusion.lon], [SERVER_LAT, SERVER_LON])}
                pathOptions={{ color: '#ff2244', weight: 1, opacity: 0.45, dashArray: '5 8' }}
              />
              <CircleMarker
                center={[intrusion.lat, intrusion.lon]}
                radius={Math.min(4 + intrusion.attempts, 15)}
                pathOptions={{
                  color: '#ff4455',
                  fillColor: '#ff2244',
                  fillOpacity: 0.85,
                  weight: 2,
                }}
              >
                <Popup maxWidth={340}>
                  <div style={{ fontFamily: 'Courier New,monospace', fontSize: 11, lineHeight: 1.75, maxHeight: 480, overflowY: 'auto' }}>
                    <div style={{ color: '#ff4455', fontWeight: 'bold', fontSize: 13, marginBottom: 6, letterSpacing: '0.1em' }}>
                      ⚠ INTRUSION DETECTED
                    </div>

                    {/* Section helper */}
                    {(() => {
                      const Section = ({ title, rows }: { title: string; rows: [string, string, string][] }) => (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ color: '#ff4455', fontSize: 9, letterSpacing: '0.2em', fontWeight: 'bold', borderBottom: '1px solid rgba(255,68,85,0.25)', paddingBottom: 2, marginBottom: 4 }}>
                            {title}
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              {rows.map(([k, v, c]) => (
                                <tr key={k}>
                                  <td style={{ color: '#555', paddingRight: 8, paddingBottom: 1, whiteSpace: 'nowrap', verticalAlign: 'top', fontSize: 10 }}>{k}</td>
                                  <td style={{ color: c, paddingBottom: 1, wordBreak: 'break-all', fontSize: 10 }}>{v || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );

                      const fmt = (v: any) => (v == null || v === '' || v === -1) ? '—' : String(v);
                      const bool = (v: boolean | undefined, yes = '✓ YES', no = '✗ NO') => v ? yes : no;
                      const perm = (v: string) => ({ granted: '✓ GRANTED', denied: '✗ DENIED', prompt: '⚠ PROMPT', unknown: '? unknown' }[v] || v);

                      return (
                        <>
                          <Section title="📍 NETWORK IDENTITY" rows={[
                            ['IP', intrusion.ip, '#ff8899'],
                            ['Country', intrusion.country, '#ddd'],
                            ['Region', intrusion.region, '#ddd'],
                            ['City', intrusion.city, '#ddd'],
                            ['Coords', `${intrusion.lat?.toFixed(4)}, ${intrusion.lon?.toFixed(4)}`, '#aaa'],
                            ['Timezone', intrusion.timezone, '#aaa'],
                            ['TZ Offset', intrusion.timezoneOffset != null ? `UTC${intrusion.timezoneOffset <= 0 ? '+' : ''}${-intrusion.timezoneOffset / 60}h` : '—', '#aaa'],
                            ['ISP', intrusion.isp, '#ddd'],
                            ['Org', intrusion.org, '#ddd'],
                          ]} />

                          {(intrusion.webrtcIps?.length > 0) && (
                            <Section title="🔓 WEBRTC IP LEAK" rows={
                              intrusion.webrtcIps.map((ip, i) => [`IP #${i+1}`, ip, '#ff6600'] as [string, string, string])
                            } />
                          )}

                          <Section title="🎯 ATTACK DATA" rows={[
                            ['Attempts', String(intrusion.attempts), '#ffcc44'],
                            ['IDs Tried', (intrusion.attemptedIds || []).map(id => `"${id}"`).join(', ') || '—', '#ff8899'],
                            ['Used Paste', bool(intrusion.usedPaste, '⚠ YES — pasted it', '✓ typed manually'), intrusion.usedPaste ? '#ff6600' : '#aaa'],
                            ['Type Time', intrusion.typeTimeMs > 0 ? `${intrusion.typeTimeMs}ms` : '—', '#aaa'],
                            ['Referrer', fmt(intrusion.referrer) || 'Direct / None', '#aaa'],
                            ['First Seen', intrusion.firstSeen ? new Date(intrusion.firstSeen).toLocaleString() : '—', '#777'],
                            ['Last Seen', intrusion.lastSeen ? new Date(intrusion.lastSeen).toLocaleString() : '—', '#777'],
                          ]} />

                          <Section title="💻 DEVICE" rows={[
                            ['Browser', intrusion.browser, '#ddd'],
                            ['OS', intrusion.os, '#ddd'],
                            ['Platform', intrusion.platform, '#aaa'],
                            ['Language', intrusion.language, '#aaa'],
                            ['All Languages', (intrusion.languages || []).join(', ') || '—', '#aaa'],
                            ['Screen', intrusion.screenResolution, '#aaa'],
                            ['Avail Screen', fmt(intrusion.availableScreen), '#aaa'],
                            ['Viewport', fmt(intrusion.viewport), '#aaa'],
                            ['Window', fmt(intrusion.windowSize), '#aaa'],
                            ['Pixel Ratio', intrusion.devicePixelRatio ? `${intrusion.devicePixelRatio}x` : '—', '#aaa'],
                            ['Color Depth', intrusion.colorDepth ? `${intrusion.colorDepth}-bit` : '—', '#aaa'],
                            ['CPU Cores', String(intrusion.cores || '—'), '#aaa'],
                            ['RAM', intrusion.memory ? `${intrusion.memory} GB` : '—', '#aaa'],
                            ['Touch', intrusion.touchDevice ? `✓ ${intrusion.maxTouchPoints} points` : '✗ No touch', '#aaa'],
                            ['Dark Mode', bool(intrusion.darkMode), '#aaa'],
                            ['Reduced Motion', bool(intrusion.reducedMotion), '#aaa'],
                            ['Cookies', bool(intrusion.cookieEnabled), '#aaa'],
                            ['Do Not Track', fmt(intrusion.doNotTrack), '#aaa'],
                            ['Plugins', (intrusion as any).plugins?.join(', ') || '—', '#777'],
                          ]} />

                          <Section title="🔌 NETWORK" rows={[
                            ['Connection', fmt(intrusion.connectionType), '#ddd'],
                            ['Downlink', intrusion.downlink ? `${intrusion.downlink} Mbps` : '—', '#aaa'],
                            ['RTT', intrusion.rtt ? `${intrusion.rtt} ms` : '—', '#aaa'],
                            ['Codecs', fmt(intrusion.supportedCodecs), '#777'],
                          ]} />

                          {intrusion.batteryLevel != null && intrusion.batteryLevel >= 0 && (
                            <Section title="🔋 BATTERY" rows={[
                              ['Level', `${intrusion.batteryLevel}%`, intrusion.batteryLevel < 20 ? '#ff4455' : '#ddd'],
                              ['Charging', bool(intrusion.batteryCharging, '⚡ Yes', '✗ No'), '#aaa'],
                            ]} />
                          )}

                          <Section title="🧬 FINGERPRINTS" rows={[
                            ['Canvas Hash', fmt(intrusion.canvasHash), '#00cc88'],
                            ['Audio Hash', fmt(intrusion.audioHash), '#00cc88'],
                            ['WebGL GPU', fmt(intrusion.webglRenderer), '#88aaff'],
                            ['WebGL Vendor', fmt(intrusion.webglVendor), '#88aaff'],
                            ['WebGL Ver', fmt(intrusion.webglVersion), '#777'],
                            ['GL Extensions', intrusion.webglExtensions ? String(intrusion.webglExtensions) : '—', '#777'],
                          ]} />

                          <Section title="🔐 PERMISSIONS" rows={[
                            ['Geolocation', perm(intrusion.geoPermission), intrusion.geoPermission === 'granted' ? '#ff4455' : '#aaa'],
                            ['Notifications', perm(intrusion.notificationPermission), '#aaa'],
                            ['Camera', perm(intrusion.cameraPermission), intrusion.cameraPermission === 'granted' ? '#ff6600' : '#aaa'],
                            ['Microphone', perm(intrusion.micPermission), intrusion.micPermission === 'granted' ? '#ff6600' : '#aaa'],
                          ]} />

                          <Section title="🕵️ EVASION" rows={[
                            ['Incognito', bool(intrusion.isIncognito, '⚠ YES — private mode', '✓ Normal browser'), intrusion.isIncognito ? '#ff6600' : '#aaa'],
                            ['Ad Blocker', bool(intrusion.hasAdBlocker, '⚠ YES', '✗ None detected'), intrusion.hasAdBlocker ? '#ffcc44' : '#aaa'],
                          ]} />
                        </>
                      );
                    })()}

                    <a
                      href={`https://www.google.com/maps?q=${intrusion.lat},${intrusion.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#4499ff', fontSize: 10, display: 'block', marginTop: 6 }}
                    >
                      📍 Open in Google Maps →
                    </a>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {/* Top-left badge */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 1000,
        background: 'rgba(8,8,16,0.92)',
        border: '1px solid rgba(255,34,68,0.5)',
        borderRadius: 6,
        padding: '5px 12px',
        fontSize: 10,
        color: '#ff4455',
        fontFamily: 'Courier New,monospace',
        letterSpacing: '0.12em',
        fontWeight: 'bold',
        pointerEvents: 'none',
        backdropFilter: 'blur(4px)',
      }}>
        ⚡ LIVE THREAT MAP &nbsp;·&nbsp; {validIntrusions.length} ATTACKER{validIntrusions.length !== 1 ? 'S' : ''} TRACKED
      </div>

      {/* Refresh button */}
      <button
        onClick={() => refetch()}
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 1000,
          background: 'rgba(8,8,16,0.92)',
          border: '1px solid rgba(255,34,68,0.35)',
          borderRadius: 6,
          padding: '5px 10px',
          fontSize: 10,
          color: isFetching ? '#888' : '#ff4455',
          fontFamily: 'Courier New,monospace',
          cursor: 'pointer',
          letterSpacing: '0.1em',
          backdropFilter: 'blur(4px)',
        }}
      >
        {isFetching ? '⟳ SYNCING...' : '⟳ REFRESH'}
      </button>

      {/* Hint */}
      <div style={{
        position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, pointerEvents: 'none',
        fontSize: 9, color: 'rgba(255,68,85,0.5)',
        fontFamily: 'Courier New,monospace', letterSpacing: '0.12em',
      }}>
        SCROLL TO ZOOM · CLICK ATTACKER FOR DETAILS
      </div>
    </div>
  );
}
