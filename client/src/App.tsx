import { Route, Switch, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Requests from "@/pages/Requests";
import RequestDetail from "@/pages/RequestDetail";
import NewRequest from "@/pages/NewRequest";
import Tasks from "@/pages/Tasks";
import TaskDetail from "@/pages/TaskDetail";
import NewTask from "@/pages/NewTask";
import EditTask from "@/pages/EditTask";
import Messages from "@/pages/Messages";
import Calendar from "@/pages/Calendar";
import Users from "@/pages/Users";
import Areas from "@/pages/Areas";
import Credentials from "@/pages/Credentials";
import Vendors from "@/pages/Vendors";
import Inventory from "@/pages/Inventory";
import Settings from "@/pages/Settings";
import PropertyMapPage from "./pages/PropertyMapPage";
import PropertyDetail from "./pages/PropertyDetail";
import EquipmentWorkHistory from "./pages/EquipmentWorkHistory";
import Vehicles from "./pages/Vehicles";
import VehicleDetail from "./pages/VehicleDetail";
import MyReservations from "./pages/MyReservations";
import VehicleCheckOut from "./pages/VehicleCheckOut";
import VehicleCheckIn from "./pages/VehicleCheckIn";
import VehicleReservations from "./pages/VehicleReservations";
import { ScrollToTop } from "./components/ScrollToTop";

function AuthenticatedApp() {
  const { user, isLoading, isAuthenticated } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  const userName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || "User";

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0].toUpperCase() || "U";

  return (
    <>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar
            userRole={user?.role as "admin" | "maintenance" | "staff"}
            userName={userName}
            userInitials={userInitials}
          />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between px-8 py-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <button
                  onClick={async () => {
                    await fetch("/api/logout", { method: "POST" });
                    window.location.href = "/";
                  }}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-logout"
                >
                  Sign Out
                </button>
              </div>
            </header>
            <main className="flex-1 overflow-auto px-8 py-6 bg-muted/20">
              <ScrollToTop />
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/requests" component={Requests} />
                <Route path="/requests/:id" component={RequestDetail} />
                <Route path="/new-request" component={NewRequest} />
                <Route path="/tasks/new" component={NewTask} />
                <Route path="/tasks/:id/edit" component={EditTask} />
                <Route path="/tasks" component={Tasks} />
                <Route path="/tasks/:id" component={TaskDetail} />
                <Route path="/messages" component={Messages} />
                <Route path="/calendar" component={Calendar} />
                <Route path="/properties" component={PropertyMapPage} />
                <Route path="/properties/:id" component={PropertyDetail} />
                <Route path="/equipment/:id/work-history" component={EquipmentWorkHistory} />
                <Route path="/settings" component={Settings} />
                <Route path="/users" component={Users} />
                <Route path="/credentials" component={Credentials} />
                <Route path="/vendors" component={Vendors} />
                <Route path="/inventory" component={Inventory} />
                <Route path="/vehicles" component={Vehicles} />
                <Route path="/vehicles/:id" component={VehicleDetail} />
                <Route path="/my-reservations" component={MyReservations} />
                <Route path="/vehicle-reservations" component={VehicleReservations} />
                <Route path="/vehicle-checkout/:reservationId" component={VehicleCheckOut} />
                <Route path="/vehicle-checkin/:reservationId" component={VehicleCheckIn} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthenticatedApp />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;