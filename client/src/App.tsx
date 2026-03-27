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
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import RequestAccess from "@/pages/RequestAccess";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Requests from "@/pages/Requests";
import RequestDetail from "@/pages/RequestDetail";
import NewRequest from "@/pages/NewRequest";
import Work from "@/pages/Work";
import TaskDetail from "@/pages/TaskDetail";
import MobileTaskDetail from "@/components/MobileTaskDetail";
import { useIsMobile } from "@/hooks/use-mobile";
import NewTask from "@/pages/NewTask";
import EditTask from "@/pages/EditTask";
import Messages from "@/pages/Messages";
import Calendar from "@/pages/Calendar";
import Users from "@/pages/Users";
import Credentials from "@/pages/Credentials";
import Vendors from "@/pages/Vendors";
import Inventory from "@/pages/Inventory";
import AdminTaskDetailPage from "@/pages/AdminTaskDetailPage";
import Settings from "@/pages/Settings";
import PropertyMapPage from "./pages/PropertyMapPage";
import PropertyDetail from "./pages/PropertyDetail";
import EquipmentWorkHistory from "./pages/EquipmentWorkHistory";
import Vehicles from "./pages/Vehicles";
import VehicleDetail from "./pages/VehicleDetail";
import VehicleQRRedirect from "./pages/VehicleQRRedirect";
import VehicleEdit from "@/pages/VehicleEdit";
import MyReservations from "./pages/MyReservations";
import VehicleCheckOut from "./pages/VehicleCheckOut";
import VehicleCheckIn from "./pages/VehicleCheckIn";
import VehicleCheckInVerification from "./pages/VehicleCheckInVerification";
import VehicleReservations from "./pages/VehicleReservations";
import VehicleReservationDetails from "./pages/VehicleReservationDetails";
import { ScrollToTop } from "./components/ScrollToTop";
import AnalyticsDashboard from "./pages/analytics/AnalyticsDashboard";
import RoleGuard from "./components/RoleGuard";
import NotificationsWidget from "./components/NotificationsWidget";
import ProjectDetail from "./pages/ProjectDetail";
import EmailManagement from "./pages/EmailManagement";
import AiAgentDashboard from "./pages/AiAgentDashboard";
import ResourceLibrary from "./pages/ResourceLibrary";
import PwaInstallBanner from "./components/PwaInstallBanner";
import ErrorBoundary from "@/components/ErrorBoundary";

function AuthenticatedApp() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const isMobileView = useIsMobile();
  const [currentPath] = useLocation();

  const style = {
    "--sidebar-width": "13rem",
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
    const path = window.location.pathname;
    if (path === "/forgot-password") return <ForgotPassword />;
    if (path === "/reset-password") return <ResetPassword />;
    if (path === "/request-access") return <RequestAccess />;
    if (path && path !== "/" && path !== "/login") {
      const fullUrl = path + window.location.search + window.location.hash;
      sessionStorage.setItem("returnUrl", fullUrl);
    }
    return <Landing />;
  }
  const isMobileTaskDetail = isMobileView && /^\/tasks\/[^/]+$/.test(currentPath) && !currentPath.endsWith("/edit") && !currentPath.endsWith("/new") && !window.location.search.includes("view=full");

  const userName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || "User";

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || "U";

  if (isMobileTaskDetail) {
    if (user?.role === "technician") {
      return <Route path="/tasks/:id" component={TaskDetail} />;
    }
    if (user?.role === "admin") {
      return <Route path="/tasks/:id" component={AdminTaskDetailPage} />;
    }
    return <MobileTaskDetail />;
  }

  return (
    <>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar
            userRole={user?.role as "admin" | "staff" | "student" | "technician"}
            userName={userName}
            userInitials={userInitials}
          />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className={`flex items-center justify-between px-2 sm:px-6 py-2 sm:py-3 border-b border-border/40 bg-background ${(user?.role === "student" || user?.role === "technician") ? "py-1.5" : ""}`}>
              <div className="flex items-center gap-1 sm:gap-3">
                <SidebarTrigger className="md:hidden h-8 w-8 text-muted-foreground" data-testid="button-sidebar-toggle" />
                {user?.role !== "student" && user?.role !== "technician" && (
                  <button
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                    aria-label="Go back"
                    data-testid="button-back-global"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    <span className="hidden sm:inline">Back</span>
                  </button>
                )}
                {(user?.role === "student" || user?.role === "technician") && (
                  <span className="text-sm font-medium text-muted-foreground" data-testid="text-user-name">
                    {userName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {user?.role !== "student" && user?.role !== "technician" && <NotificationsWidget />}
                <ThemeToggle />
                {user?.role !== "student" && (
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
                )}
              </div>
            </header>
            <main className={`flex-1 bg-muted/20 ${(user?.role === "student" || user?.role === "technician") ? "px-0 py-0" : "px-8 py-6"} ${/^\/tasks\/[a-f0-9-]+$/i.test(currentPath) ? "overflow-hidden" : "overflow-auto"}`}>
              {(user?.role === "student" || user?.role === "technician") && (
                <PwaInstallBanner />
              )}
              <ScrollToTop />
              <ErrorBoundary>
              <Switch>
                {/* Routes accessible to all authenticated users */}
                <Route path="/" component={() => {
                  if (user?.role === "student" || user?.role === "technician") {
                    window.location.replace("/work");
                    return null;
                  }
                  return <Dashboard />;
                }} />
                <Route path="/work" component={Work} />
                <Route path="/tasks" component={() => {
                  window.location.replace("/work");
                  return null;
                }} />
                <Route path="/tasks/new" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><NewTask /></RoleGuard>
                )} />
                <Route path="/tasks/:id/edit" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><EditTask /></RoleGuard>
                )} />
                <Route path="/tasks/:id" component={TaskDetailResponsive} />
                <Route path="/messages" component={Messages} />
                <Route path="/settings" component={Settings} />

                {/* Protected routes - check user role and redirect students */}
                <Route path="/requests" component={() => (
                  <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><Requests /></RoleGuard>
                )} />
                <Route path="/requests/:id" component={() => (
                  <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><RequestDetail /></RoleGuard>
                )} />
                <Route path="/new-request" component={() => (
                  <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><NewRequest /></RoleGuard>
                )} />
                <Route path="/calendar" component={() => (
                  <RoleGuard allowedRoles={["admin", "technician"]}><Calendar /></RoleGuard>
                )} />
                <Route path="/properties" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><PropertyMapPage /></RoleGuard>
                )} />
                <Route path="/properties/:id" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><PropertyDetail /></RoleGuard>
                )} />
                <Route path="/equipment/:id/work-history" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><EquipmentWorkHistory /></RoleGuard>
                )} />
                <Route path="/users" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><Users /></RoleGuard>
                )} />
                <Route path="/credentials" component={() => {
                  window.location.replace("/users");
                  return null;
                }} />
                <Route path="/vendors" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><Vendors /></RoleGuard>
                )} />
                <Route path="/inventory" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><Inventory /></RoleGuard>
                )} />
                <Route path="/vehicles" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><Vehicles /></RoleGuard>
                )} />
                <Route path="/vehicles/:id" component={() => {
                  if (user?.role === "admin") return <VehicleDetail />;
                  return <VehicleQRRedirect />;
                }} />
                <Route path="/vehicles/:id/edit" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><VehicleEdit /></RoleGuard>
                )} />
                <Route path="/my-reservations" component={() => (
                  <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><MyReservations /></RoleGuard>
                )} />
                <Route path="/vehicle-reservations" component={() => {
                  window.location.replace("/vehicles?tab=reservations");
                  return null;
                }} />
                <Route path="/vehicle-reservation-details/:reservationId" component={() => (
                  <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><VehicleReservationDetails /></RoleGuard>
                )} />
                <Route path="/vehicle-checkout/:reservationId" component={() => (
                  <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><VehicleCheckOut /></RoleGuard>
                )} />
                <Route path="/vehicle-checkin/:checkOutLogId" component={() => (
                  <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><VehicleCheckIn /></RoleGuard>
                )} />
                <Route path="/vehicle-checkin-verify/:checkInLogId" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><VehicleCheckInVerification /></RoleGuard>
                )} />
                <Route path="/analytics" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><AnalyticsDashboard /></RoleGuard>
                )} />
                <Route path="/emergency-contacts" component={() => {
                  window.location.replace("/settings?tab=emergency");
                  return null;
                }} />
                <Route path="/projects" component={() => {
                  window.location.replace("/work");
                  return null;
                }} />
                <Route path="/projects/:id" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><ProjectDetail /></RoleGuard>
                )} />
                <Route path="/email-management" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><EmailManagement /></RoleGuard>
                )} />
                <Route path="/ai-agent" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><AiAgentDashboard /></RoleGuard>
                )} />
                <Route path="/resources" component={() => (
                  <RoleGuard allowedRoles={["admin"]}><ResourceLibrary /></RoleGuard>
                )} />
                <Route component={NotFound} />
              </Switch>
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Toaster />
    </>
  );
}

function TaskDetailResponsive() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const hasFullView = typeof window !== "undefined" && window.location.search.includes("view=full");
  if (user?.role === "admin") return <AdminTaskDetailPage />;
  if (isMobile && !hasFullView && user?.role !== "technician") return <MobileTaskDetail />;
  return <TaskDetail />;
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