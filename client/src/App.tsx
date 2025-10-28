import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Requests from "@/pages/Requests";
import NewRequest from "@/pages/NewRequest";
import Messages from "@/pages/Messages";
import Calendar from "@/pages/Calendar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/requests" component={Requests} />
      <Route path="/my-requests" component={Requests} />
      <Route path="/new-request" component={NewRequest} />
      <Route path="/messages" component={Messages} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/tasks" component={Requests} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  //todo: remove mock functionality - replace with actual auth
  const [userRole] = useState<"admin" | "maintenance" | "staff">("admin");
  const [userName] = useState("John Admin");
  const [userInitials] = useState("JA");

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar userRole={userRole} userName={userName} userInitials={userInitials} />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-4 border-b">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto p-8">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
