import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

// Pages
import Dashboard from "@/pages/dashboard";
import CommandCenter from "@/pages/command-center";
import Actions from "@/pages/actions";
import Agents from "@/pages/agents";
import Approvals from "@/pages/approvals";
import Artifacts from "@/pages/artifacts";
import ObsidianMemory from "@/pages/obsidian-memory";
import ScheduledJobs from "@/pages/scheduled-jobs";
import WorkstreamsCommand from "@/pages/workstreams-command";
import Workflows from "@/pages/workflows";
import Threads from "@/pages/threads";
import ThreadView from "@/pages/thread-view";
import Settings from "@/pages/settings";
import Layout from "@/components/layout";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={CommandCenter} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/actions" component={Actions} />
        <Route path="/agents" component={Agents} />
        <Route path="/approvals" component={Approvals} />
        <Route path="/artifacts" component={Artifacts} />
        <Route path="/obsidian" component={ObsidianMemory} />
        <Route path="/scheduled-jobs" component={ScheduledJobs} />
        <Route path="/workstreams" component={WorkstreamsCommand} />
        <Route path="/workflows" component={Workflows} />
        <Route path="/threads" component={Threads} />
        <Route path="/threads/:id" component={ThreadView} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
