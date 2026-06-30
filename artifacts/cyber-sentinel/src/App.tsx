import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useCallback, useEffect, useRef } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ChatPage from "@/pages/Chat";
import VaultPage from "@/pages/Vault";
import ToolsPage from "@/pages/Tools";
import CommandsPage from "@/pages/Commands";
import SettingsPage from "@/pages/Settings";
import IntrusionsPage from "@/pages/Intrusions";
import ReverseShells from "@/pages/ReverseShells";
import JwtDecoder from "@/pages/JwtDecoder";
import Payloads from "@/pages/Payloads";
import HashTools from "@/pages/HashTools";
import DorkBuilder from "@/pages/DorkBuilder";
import Fingerprint from "@/pages/Fingerprint";
import EmailHeader from "@/pages/EmailHeader";
import BreachChecker from "@/pages/BreachChecker";
import CvePage from "@/pages/CvePage";
import IpRepPage from "@/pages/IpRepPage";
import ReconPage from "@/pages/ReconPage";
import OsintPage from "@/pages/OsintPage";
import TyposquatPage from "@/pages/TyposquatPage";
import SkillTree from "@/pages/SkillTree";
import TrackerPage from "@/pages/TrackerPage";
import StealthPage from "@/pages/StealthPage";
import Sidebar from "@/components/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Menu } from "lucide-react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import MatrixRain from "@/components/MatrixRain";
import HackerLoader from "@/components/HackerLoader";
import CommandPalette from "@/components/CommandPalette";
import AlertSiren from "@/components/AlertSiren";
import GlitchScreensaver from "@/components/GlitchScreensaver";
import HackerCinema from "@/components/HackerCinema";
import TypingSound from "@/components/TypingSound";
import { useLocation } from "wouter";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const queryClient = new QueryClient();

function Wrap({ title, children }: { title: string; children: React.ReactNode }) {
  return <ErrorBoundary fallbackTitle={title}>{children}</ErrorBoundary>;
}

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [typingSounds, setTypingSounds] = useState(() => localStorage.getItem('cs-typing-sounds') === 'true');
  const gSequence = useRef<string[]>([]);
  const [, navigate] = useLocation();

  // Global keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ctrl+K or Cmd+K → Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
        return;
      }
      // H → Hack Cinema mode
      if (e.key === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setCinemaMode(m => !m);
        return;
      }
      // G + key shortcuts
      if (e.key === 'g' && !e.ctrlKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        gSequence.current = ['g'];
        return;
      }
      if (gSequence.current[0] === 'g') {
        const shortcuts: Record<string, string> = {
          d: '/', c: '/chat', k: '/vault', t: '/tools', m: '/commands', i: '/intrusions',
        };
        const target = shortcuts[e.key.toLowerCase()];
        if (target) { navigate(target); gSequence.current = []; return; }
        gSequence.current = [];
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden dark">
      <div className="scanline-overlay" />
      <MatrixRain />

      {/* Global effects */}
      <AlertSiren />
      <GlitchScreensaver />
      <HackerCinema active={cinemaMode} onClose={() => setCinemaMode(false)} />
      <TypingSound enabled={typingSounds} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-40 md:static md:z-auto md:flex
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <Sidebar
          onNavigate={() => setSidebarOpen(false)}
          onCommandPalette={() => setCmdOpen(true)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 z-10">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0" />

        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-card/50 shrink-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors">
            <Menu size={18} />
          </button>
          <span className="font-mono font-bold text-primary text-sm">CyberSentinel_</span>
          <button onClick={() => setCmdOpen(true)} className="ml-auto p-2 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors font-mono text-xs">
            Ctrl+K
          </button>
        </div>

        <div className="flex-1 overflow-y-auto h-full overflow-hidden flex flex-col">
          <Switch>
            <Route path="/" component={() => <Wrap title="Dashboard"><Dashboard /></Wrap>} />
            <Route path="/chat" component={() => <Wrap title="AI Ops"><ChatPage /></Wrap>} />
            <Route path="/vault" component={() => <Wrap title="Knowledge Base"><VaultPage /></Wrap>} />
            <Route path="/tools" component={() => <Wrap title="Tool Reference"><ToolsPage /></Wrap>} />
            <Route path="/commands" component={() => <Wrap title="Commands"><CommandsPage /></Wrap>} />
            <Route path="/settings" component={() => <Wrap title="Settings"><SettingsPage /></Wrap>} />
            <Route path="/intrusions" component={() => <Wrap title="Intrusion Log"><IntrusionsPage /></Wrap>} />
            <Route path="/shells" component={() => <Wrap title="Reverse Shells"><ReverseShells /></Wrap>} />
            <Route path="/jwt" component={() => <Wrap title="JWT Decoder"><JwtDecoder /></Wrap>} />
            <Route path="/payloads" component={() => <Wrap title="Payload Library"><Payloads /></Wrap>} />
            <Route path="/hash" component={() => <Wrap title="Hash Tools"><HashTools /></Wrap>} />
            <Route path="/dork" component={() => <Wrap title="Dork Builder"><DorkBuilder /></Wrap>} />
            <Route path="/fingerprint" component={() => <Wrap title="Fingerprint"><Fingerprint /></Wrap>} />
            <Route path="/email-header" component={() => <Wrap title="Email Analyzer"><EmailHeader /></Wrap>} />
            <Route path="/breach" component={() => <Wrap title="Breach Checker"><BreachChecker /></Wrap>} />
            <Route path="/cve" component={() => <Wrap title="CVE Search"><CvePage /></Wrap>} />
            <Route path="/ip-rep" component={() => <Wrap title="IP Reputation"><IpRepPage /></Wrap>} />
            <Route path="/recon" component={() => <Wrap title="Network Recon"><ReconPage /></Wrap>} />
            <Route path="/osint" component={() => <Wrap title="Social OSINT"><OsintPage /></Wrap>} />
            <Route path="/typosquat" component={() => <Wrap title="Typosquat"><TyposquatPage /></Wrap>} />
            <Route path="/skill-tree" component={() => <Wrap title="Skill Tree"><SkillTree /></Wrap>} />
            <Route path="/tracker" component={() => <Wrap title="QR Tracker"><TrackerPage /></Wrap>} />
            <Route path="/stealth" component={() => <Wrap title="Stealth Mode"><StealthPage /></Wrap>} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [loaded, setLoaded] = useState(false);
  const handleDone = useCallback(() => setLoaded(true), []);

  // Register push notifications silently after successful login
  usePushNotifications(loaded);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {!loaded && <HackerLoader onDone={handleDone} />}
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Layout />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
