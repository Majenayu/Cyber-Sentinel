import React from 'react';
import { Terminal, Database, Wrench, Bot, Activity, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { useGetStats } from '@workspace/api-client-react';

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats();

  if (isLoading) {
    return (
      <div className="flex-1 p-8 font-mono text-primary flex items-center justify-center gap-3">
        <Activity className="animate-spin" size={20} /> initializing_sys.dashboard...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 font-mono">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Terminal className="text-primary" size={28} />
            sys.dashboard
          </h1>
          <p className="text-muted-foreground text-sm">Overview of knowledge and tool statistics.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Knowledge Entries" value={stats?.totalKnowledgeEntries ?? 0} icon={Database} href="/vault" />
          <StatCard title="Tools Logged" value={stats?.totalTools ?? 0} icon={Wrench} href="/tools" />
          <StatCard title="Saved Commands" value={stats?.totalCommands ?? 0} icon={Terminal} href="/commands" />
          <StatCard title="Chat Sessions" value={stats?.totalChatSessions ?? 0} icon={Bot} href="/chat" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border bg-black/20 font-mono font-semibold flex items-center gap-2 text-sm">
              <ShieldCheck className="text-primary" size={18} /> Recent Tags
            </div>
            <div className="p-5">
              {stats?.recentTags && stats.recentTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {stats.recentTags.map((tag: string) => (
                    <span key={tag} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs font-mono rounded border border-primary/20">
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground font-mono">No recent tags found.</p>
              )}
            </div>
          </div>

          <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border bg-black/20 font-mono font-semibold flex items-center gap-2 text-sm">
              <Activity className="text-primary" size={18} /> System Status
            </div>
            <div className="p-5 space-y-4 font-mono text-sm">
              {[['Core Database', 'ONLINE'], ['AI Module (Groq)', 'ONLINE'], ['Encryption', 'AES-256 ACTIVE']].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center border-b border-border pb-3 last:border-0 last:pb-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-primary">{val}</span>
                </div>
              ))}
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
        <div className="bg-card/50 border border-border rounded-lg transition-all duration-300 hover:border-primary/50 hover:bg-secondary/30 p-6 flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-mono font-bold group-hover:text-primary transition-colors">{value}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors">
            <Icon className="text-primary" size={24} />
          </div>
        </div>
      </div>
    </Link>
  );
}
