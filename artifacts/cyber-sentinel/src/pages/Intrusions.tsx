import { useQuery } from '@tanstack/react-query';
import { Shield, AlertTriangle, Globe, Monitor, Clock, RefreshCw, Wifi } from 'lucide-react';

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
  screenResolution: string;
  colorDepth: number;
  cores: number;
  memory: number;
  cookieEnabled: boolean;
  doNotTrack: string;
  plugins: string[];
  userAgent: string;
  firstSeen: string;
  lastSeen: string;
}

export default function IntrusionsPage() {
  const { data: intrusions = [], isLoading, refetch, isFetching } = useQuery<Intrusion[]>({
    queryKey: ['intrusions'],
    queryFn: async () => {
      const r = await fetch('/api/auth/intrusions');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const totalAttempts = intrusions.reduce((s, x) => s + x.attempts, 0);
  const uniqueCountries = new Set(intrusions.map(x => x.country)).size;

  return (
    <div className="flex-1 p-4 md:p-6 space-y-5 overflow-y-auto font-mono">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-primary" />
            <h1 className="text-lg font-bold tracking-widest uppercase text-primary">
              INTRUSION LOG
            </h1>
            <span className="text-[10px] tracking-widest text-muted-foreground border border-border px-2 py-0.5">
              LIVE
            </span>
          </div>
          <p className="text-xs text-muted-foreground tracking-wider">
            UNAUTHORIZED ACCESS ATTEMPTS // ALL THREATS LOGGED
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 border border-primary/40 text-primary text-xs tracking-widest uppercase hover:border-primary hover:bg-primary/10 transition-all"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          REFRESH
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'UNIQUE IPs', value: intrusions.length, icon: Wifi, color: 'text-primary' },
          { label: 'TOTAL ATTEMPTS', value: totalAttempts, icon: AlertTriangle, color: 'text-red-500' },
          { label: 'COUNTRIES', value: uniqueCountries, icon: Globe, color: 'text-yellow-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="border border-border bg-card/50 p-3 text-center">
            <Icon size={16} className={`${color} mx-auto mb-1`} />
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-[9px] tracking-[0.3em] text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-primary text-xs tracking-widest animate-pulse">
          SCANNING DATABASE...
        </div>
      ) : intrusions.length === 0 ? (
        <div className="border border-border bg-card/30 p-10 text-center">
          <Shield size={32} className="text-primary/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-xs tracking-widest">NO INTRUSION ATTEMPTS LOGGED</p>
          <p className="text-muted-foreground/50 text-[10px] tracking-wider mt-1">System is secure. All clear.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {intrusions.map((item) => (
            <div key={item._id}
              className="border border-border bg-card/40 hover:border-primary/40 hover:bg-card/60 transition-all"
            >
              {/* IP header row */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-base font-bold text-red-400 tracking-widest">{item.ip}</span>
                  <span className="text-[10px] border border-red-500/30 text-red-400/70 px-2 py-0.5 tracking-widest">
                    {item.attempts} ATTEMPT{item.attempts !== 1 ? 'S' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground tracking-wider">
                  <Clock size={10} />
                  {new Date(item.lastSeen).toLocaleString()}
                </div>
              </div>

              {/* Data grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-border/30">
                {/* Geo */}
                <div className="p-3 space-y-1.5">
                  <div className="text-[9px] text-primary tracking-[0.3em] mb-2 flex items-center gap-1">
                    <Globe size={8} /> LOCATION
                  </div>
                  <InfoRow label="COUNTRY" value={item.country} />
                  <InfoRow label="REGION" value={item.region} />
                  <InfoRow label="CITY" value={item.city} />
                  <InfoRow label="TZ" value={item.timezone} />
                  {item.lat !== 0 && (
                    <a
                      href={`https://www.google.com/maps?q=${item.lat},${item.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-primary/60 hover:text-primary tracking-wider underline block mt-1"
                    >
                      {item.lat.toFixed(2)}, {item.lon.toFixed(2)} → MAPS ↗
                    </a>
                  )}
                </div>

                {/* Network */}
                <div className="p-3 space-y-1.5">
                  <div className="text-[9px] text-primary tracking-[0.3em] mb-2 flex items-center gap-1">
                    <Wifi size={8} /> NETWORK
                  </div>
                  <InfoRow label="ISP" value={item.isp} />
                  <InfoRow label="ORG" value={item.org} />
                  <InfoRow label="COOKIES" value={item.cookieEnabled ? 'ON' : 'OFF'} />
                  <InfoRow label="DNT" value={item.doNotTrack} />
                </div>

                {/* Device */}
                <div className="p-3 space-y-1.5">
                  <div className="text-[9px] text-primary tracking-[0.3em] mb-2 flex items-center gap-1">
                    <Monitor size={8} /> DEVICE
                  </div>
                  <InfoRow label="BROWSER" value={item.browser} />
                  <InfoRow label="OS" value={item.os} />
                  <InfoRow label="PLATFORM" value={item.platform} />
                  <InfoRow label="LANGUAGE" value={item.language} />
                  <InfoRow label="SCREEN" value={item.screenResolution} />
                  <InfoRow label="CORES" value={String(item.cores)} />
                  <InfoRow label="RAM" value={`${item.memory}GB`} />
                </div>

                {/* Intel */}
                <div className="p-3 space-y-1.5">
                  <div className="text-[9px] text-primary tracking-[0.3em] mb-2 flex items-center gap-1">
                    <AlertTriangle size={8} /> INTEL
                  </div>
                  <div className="text-[9px] text-muted-foreground tracking-wider mb-1">TRIED IDs:</div>
                  {item.attemptedIds.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground/50">—</span>
                  ) : (
                    item.attemptedIds.map((id, i) => (
                      <div key={i} className="text-[10px] text-yellow-400/80 font-bold tracking-widest">
                        "{id}"
                      </div>
                    ))
                  )}
                  <div className="text-[9px] text-muted-foreground tracking-wider mt-2 mb-1">FIRST SEEN:</div>
                  <div className="text-[9px] text-muted-foreground">{new Date(item.firstSeen).toLocaleString()}</div>
                </div>
              </div>

              {/* User agent footer */}
              {item.userAgent && (
                <div className="px-4 py-2 border-t border-border/30 bg-black/20">
                  <div className="text-[8px] text-muted-foreground/50 tracking-wider truncate">
                    UA: {item.userAgent}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[9px] text-muted-foreground tracking-widest shrink-0">{label}</span>
      <span className="text-[9px] text-foreground/80 truncate text-right max-w-[120px]" title={value}>{value || '—'}</span>
    </div>
  );
}
