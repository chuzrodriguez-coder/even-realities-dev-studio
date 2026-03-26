import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ModelProvider } from "@/context/ModelContext";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/Layout";
import Simulator from "@/pages/Simulator";
import BLE from "@/pages/BLE";
import Features from "@/pages/Features";
import Reference from "@/pages/Reference";
import BreakTimer from "@/pages/BreakTimer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Simulator} />
        <Route path="/ble" component={BLE} />
        <Route path="/features" component={Features} />
        <Route path="/break-timer" component={BreakTimer} />
        <Route path="/reference" component={Reference} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ModelProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ModelProvider>
    </QueryClientProvider>
  );
}

export default App;
