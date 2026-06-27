import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ChatPage from "@/pages/Chat";
import VaultPage from "@/pages/Vault";
import ToolsPage from "@/pages/Tools";
import CommandsPage from "@/pages/Commands";
import Sidebar from "@/components/Sidebar";

const queryClient = new QueryClient();

function Layout() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden dark">
      <div className="scanline-overlay" />
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0" />
        <div className="flex-1 overflow-y-auto h-full overflow-hidden flex flex-col">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/chat" component={ChatPage} />
            <Route path="/vault" component={VaultPage} />
            <Route path="/tools" component={ToolsPage} />
            <Route path="/commands" component={CommandsPage} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
