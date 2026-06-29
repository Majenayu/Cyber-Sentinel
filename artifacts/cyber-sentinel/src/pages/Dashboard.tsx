import React, { useEffect, useState } from 'react';
import { Terminal, Database, Wrench, Bot, Activity, ShieldCheck, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import { useGetStats } from '@workspace/api-client-react';

interface ProviderSnapshot {
  key: string;
  label: string;
  configured: boolean;
}

interface UsageData {
  providers: ProviderSnapshot[];
}

interface HealthStatus {
  database: string;
  encryption: string;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [providers, setProviders] = useState<ProviderSnapshot[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/health/status').then(r => r.json()).catch(() => null),
      fetch('/api/health/usage').then(r => r.json()).catch(() => null),
    ]).then(([status, usage]: [any, UsageData | null]) => {
      if (status) setHealth({ database: status.database, encryption: status.encryption });
      if (usage?.providers) setProviders(usage.providers);
      setHealthLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 p-8 font-mono text-primary flex items-center justify-center gap-3">
        <Activity className="animate-spin" size={20} /> initializing_sys.dashboard...
      </div>
    );
  }

  const StatusValue = ({ value, ok }: { value: string | undefined; ok?: boolean }) => {
    if (healthLoading || value === undefined) return <Loader2 size={12} className="animate-spin text-muted-foreground" />;
    const isOk = ok ?? (value === 'ONLINE' || value === 'AES-256 ACTIVE');
    return (
      <span className={`flex items-center gap-1.5 font-bold text-xs md:text-sm ${isOk ? 'text-primary' : 'text-red-400'}`}>
        {isOk ? <CheckCircle size={12} /> : <XCircle size={12} />}
        {value}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Terminal className="text-primary" size={24} />
            sys.dashboard
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm">Overview of knowledge and tool statistics.</p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard title="Knowledge" value={stats?.totalKnowledgeEntries ?? 0} icon={Database} href="/vault" />
          <StatCard title="Tools" value={stats?.totalTools ?? 0} icon={Wrench} href="/tools" />
          <StatCard title="Commands" value={stats?.totalCommands ?? 0} icon={Terminal} href="/commands" />
          <StatCard title="Sessions" value={stats?.totalChatSessions ?? 0} icon={Bot} href="/chat" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
            <div className="p-3 md:p-4 border-b border-border bg-black/20 font-mono font-semibold flex items-center gap-2 text-xs md:text-sm">
              <ShieldCheck className="text-primary" size={16} /> Recent Tags
            </div>
            <div className="p-4 md:p-5">
              {stats?.recentTags && stats.recentTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {stats.recentTags.map((tag: string) => (
                    <span key={tag} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs font-mono rounded border border-primary/20">
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-mono">No recent tags found. Add knowledge entries with tags.</p>
              )}
            </div>
          </div>

          <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
            <div className="p-3 md:p-4 border-b border-border bg-black/20 font-mono font-semibold flex items-center gap-2 text-xs md:text-sm">
              <Activity className="text-primary" size={16} /> System Status
            </div>
            <div className="p-4 md:p-5 space-y-3 md:space-y-4 font-mono text-xs md:text-sm">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="text-muted-foreground">Core Database</span>
                <StatusValue value={health?.database} />
              </div>
              {healthLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-xs pb-3 border-b border-border">
                  <Loader2 size={12} className="animate-spin" /> Loading AI providers...
                </div>
              ) : providers.length === 0 ? (
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="text-muted-foreground">AI Module</span>
                  <StatusValue value="NO PROVIDERS" ok={false} />
                </div>
              ) : (
                providers.map(p => (
                  <div key={p.key} className="flex justify-between items-center border-b border-border pb-3 last:border-0 last:pb-0">
                    <span className="text-muted-foreground">AI — {p.label}</span>
                    <StatusValue value={p.configured ? 'ONLINE' : 'NO_KEY'} ok={p.configured} />
                  </div>
                ))
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Encryption</span>
                <StatusValue value={health?.encryption} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, href }: { title: string; value: number; icon: React.ElementType; href: string }) {
  return (
    <Link href={href}>
      <div className="block group cursor-pointer">
        <div className="bg-card/50 border border-border rounded-lg transition-all duration-300 hover:border-primary/50 hover:bg-secondary/30 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] md:text-xs font-mono text-muted-foreground uppercase tracking-wider">{title}</p>
              <p className="text-2xl md:text-3xl font-mono font-bold group-hover:text-primary transition-colors">{value}</p>
            </div>
            <div className="h-9 w-9 md:h-12 md:w-12 rounded-full bg-secondary flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors">
              <Icon className="text-primary" size={18} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
