import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ChatPage from "@/pages/Chat";
import VaultPage from "@/pages/Vault";
import ToolsPage from "@/pages/Tools";
import CommandsPage from "@/pages/Commands";
import SettingsPage from "@/pages/Settings";
import Sidebar from "@/components/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Menu } from "lucide-react";
import { ThemeProvider } from "@/contexts/ThemeContext";

const queryClient = new QueryClient();

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden dark">
      <div className="scanline-overlay" />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-40 md:static md:z-auto md:flex
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0" />

        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-card/50 shrink-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
          >
            <Menu size={18} />
          </button>
          <span className="font-mono font-bold text-primary text-sm">CyberSentinel_</span>
        </div>

        <div className="flex-1 overflow-y-auto h-full overflow-hidden flex flex-col">
          <Switch>
            <Route path="/" component={() => <ErrorBoundary fallbackTitle="Dashboard failed to load"><Dashboard /></ErrorBoundary>} />
            <Route path="/chat" component={() => <ErrorBoundary fallbackTitle="AI Ops failed to load"><ChatPage /></ErrorBoundary>} />
            <Route path="/vault" component={() => <ErrorBoundary fallbackTitle="Knowledge Base failed to load"><VaultPage /></ErrorBoundary>} />
            <Route path="/tools" component={() => <ErrorBoundary fallbackTitle="Tool Reference failed to load"><ToolsPage /></ErrorBoundary>} />
            <Route path="/commands" component={() => <ErrorBoundary fallbackTitle="Commands failed to load"><CommandsPage /></ErrorBoundary>} />
            <Route path="/settings" component={() => <ErrorBoundary fallbackTitle="Settings failed to load"><SettingsPage /></ErrorBoundary>} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
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
