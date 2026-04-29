import { lazy, Suspense } from "react";
import { Route, Switch, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollToTop } from "./components/ScrollToTop";
import RoleGuard from "./components/RoleGuard";
import NotificationsWidget from "./components/NotificationsWidget";
import PwaInstallBanner from "./components/PwaInstallBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import DomainErrorBoundary from "@/components/DomainErrorBoundary";

const Landing = lazy(() => import("@/pages/Landing"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const RequestAccess = lazy(() => import("@/pages/RequestAccess"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Requests = lazy(() => import("@/pages/Requests"));
const RequestDetail = lazy(() => import("@/pages/RequestDetail"));
const NewRequest = lazy(() => import("@/pages/NewRequest"));
const Work = lazy(() => import("@/pages/Work"));
const TaskDetail = lazy(() => import("@/pages/TaskDetail"));
const MobileTaskDetail = lazy(() => import("@/components/MobileTaskDetail"));
const NewTask = lazy(() => import("@/pages/NewTask"));
const EditTask = lazy(() => import("@/pages/EditTask"));
const Messages = lazy(() => import("@/pages/Messages"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const Users = lazy(() => import("@/pages/Users"));
const Credentials = lazy(() => import("@/pages/Credentials"));
const Vendors = lazy(() => import("@/pages/Vendors"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const AdminTaskDetailPage = lazy(() => import("@/pages/AdminTaskDetailPage"));
const Settings = lazy(() => import("@/pages/Settings"));
const PropertyMapPage = lazy(() => import("./pages/PropertyMapPage"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const EquipmentWorkHistory = lazy(() => import("./pages/EquipmentWorkHistory"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const VehicleDetail = lazy(() => import("./pages/VehicleDetail"));
const VehicleQRRedirect = lazy(() => import("./pages/VehicleQRRedirect"));
const VehicleEdit = lazy(() => import("@/pages/VehicleEdit"));
const MyReservations = lazy(() => import("./pages/MyReservations"));
const VehicleCheckOut = lazy(() => import("./pages/VehicleCheckOut"));
const VehicleCheckIn = lazy(() => import("./pages/VehicleCheckIn"));
const VehicleCheckInVerification = lazy(() => import("./pages/VehicleCheckInVerification"));
const VehicleReservations = lazy(() => import("./pages/VehicleReservations"));
const VehicleReservationDetails = lazy(() => import("./pages/VehicleReservationDetails"));
const AnalyticsDashboard = lazy(() => import("./pages/analytics/AnalyticsDashboard"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const EmailManagement = lazy(() => import("./pages/EmailManagement"));
const ResourceLibrary = lazy(() => import("./pages/ResourceLibrary"));
const GrabAJob = lazy(() => import("./pages/GrabAJob"));

function SuspenseFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[40vh]">
      <div className="text-center text-muted-foreground text-sm">Loading...</div>
    </div>
  );
}

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
    if (path === "/forgot-password") return <Suspense fallback={<SuspenseFallback />}><ForgotPassword /></Suspense>;
    if (path === "/reset-password") return <Suspense fallback={<SuspenseFallback />}><ResetPassword /></Suspense>;
    if (path === "/request-access") return <Suspense fallback={<SuspenseFallback />}><RequestAccess /></Suspense>;
    if (path && path !== "/" && path !== "/login") {
      const fullUrl = path + window.location.search + window.location.hash;
      sessionStorage.setItem("returnUrl", fullUrl);
    }
    return <Suspense fallback={<SuspenseFallback />}><Landing /></Suspense>;
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
      return <Suspense fallback={<SuspenseFallback />}><DomainErrorBoundary domain="Work Orders & Tasks"><Route path="/tasks/:id" component={TaskDetail} /></DomainErrorBoundary></Suspense>;
    }
    if (user?.role === "admin") {
      return <Suspense fallback={<SuspenseFallback />}><DomainErrorBoundary domain="Work Orders & Tasks"><Route path="/tasks/:id" component={AdminTaskDetailPage} /></DomainErrorBoundary></Suspense>;
    }
    return <Suspense fallback={<SuspenseFallback />}><DomainErrorBoundary domain="Work Orders & Tasks"><MobileTaskDetail /></DomainErrorBoundary></Suspense>;
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
              <Suspense fallback={<SuspenseFallback />}>
              <Switch>
                {/* Work Orders & Tasks */}
                <Route path="/" component={() => (
                  <DomainErrorBoundary domain="Work Orders & Tasks">
                    {(() => {
                      if (user?.role === "student" || user?.role === "technician") {
                        window.location.replace("/work");
                        return null;
                      }
                      return <Dashboard />;
                    })()}
                  </DomainErrorBoundary>
                )} />
                <Route path="/work" component={() => (
                  <DomainErrorBoundary domain="Work Orders & Tasks"><Work /></DomainErrorBoundary>
                )} />
                <Route path="/grab" component={() => (
                  <DomainErrorBoundary domain="Work Orders & Tasks">
                    <RoleGuard allowedRoles={["student", "technician"]}><GrabAJob /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/tasks" component={() => (
                  <DomainErrorBoundary domain="Work Orders & Tasks">{(() => {
                    window.location.replace("/work");
                    return null;
                  })()}</DomainErrorBoundary>
                )} />
                <Route path="/tasks/new" component={() => (
                  <DomainErrorBoundary domain="Work Orders & Tasks">
                    <RoleGuard allowedRoles={["admin"]}><NewTask /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/tasks/:id/edit" component={() => (
                  <DomainErrorBoundary domain="Work Orders & Tasks">
                    <RoleGuard allowedRoles={["admin"]}><EditTask /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/tasks/:id" component={() => (
                  <DomainErrorBoundary domain="Work Orders & Tasks"><TaskDetailResponsive /></DomainErrorBoundary>
                )} />

                {/* Service Requests */}
                <Route path="/requests" component={() => (
                  <DomainErrorBoundary domain="Service Requests">
                    <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><Requests /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/requests/:id" component={() => (
                  <DomainErrorBoundary domain="Service Requests">
                    <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><RequestDetail /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/new-request" component={() => (
                  <DomainErrorBoundary domain="Service Requests">
                    <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><NewRequest /></RoleGuard>
                  </DomainErrorBoundary>
                )} />

                {/* Messaging */}
                <Route path="/messages" component={() => (
                  <DomainErrorBoundary domain="Messaging"><Messages /></DomainErrorBoundary>
                )} />

                {/* Settings */}
                <Route path="/settings" component={() => (
                  <DomainErrorBoundary domain="Settings"><Settings /></DomainErrorBoundary>
                )} />

                {/* Calendar */}
                <Route path="/calendar" component={() => (
                  <DomainErrorBoundary domain="Calendar">
                    <RoleGuard allowedRoles={["admin", "technician"]}><Calendar /></RoleGuard>
                  </DomainErrorBoundary>
                )} />

                {/* Facilities & Properties */}
                <Route path="/properties" component={() => (
                  <DomainErrorBoundary domain="Facilities & Properties">
                    <RoleGuard allowedRoles={["admin"]}><PropertyMapPage /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/properties/:id" component={() => (
                  <DomainErrorBoundary domain="Facilities & Properties">
                    <RoleGuard allowedRoles={["admin"]}><PropertyDetail /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/equipment/:id/work-history" component={() => (
                  <DomainErrorBoundary domain="Facilities & Properties">
                    <RoleGuard allowedRoles={["admin"]}><EquipmentWorkHistory /></RoleGuard>
                  </DomainErrorBoundary>
                )} />

                {/* Users & Vendors */}
                <Route path="/users" component={() => (
                  <DomainErrorBoundary domain="Users & Vendors">
                    <RoleGuard allowedRoles={["admin"]}><Users /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/credentials" component={() => (
                  <DomainErrorBoundary domain="Users & Vendors">{(() => {
                    window.location.replace("/users");
                    return null;
                  })()}</DomainErrorBoundary>
                )} />
                <Route path="/vendors" component={() => (
                  <DomainErrorBoundary domain="Users & Vendors">
                    <RoleGuard allowedRoles={["admin"]}><Vendors /></RoleGuard>
                  </DomainErrorBoundary>
                )} />

                {/* Inventory */}
                <Route path="/inventory" component={() => (
                  <DomainErrorBoundary domain="Inventory">
                    <RoleGuard allowedRoles={["admin"]}><Inventory /></RoleGuard>
                  </DomainErrorBoundary>
                )} />

                {/* Vehicle Fleet */}
                <Route path="/vehicles" component={() => (
                  <DomainErrorBoundary domain="Vehicle Fleet">
                    <RoleGuard allowedRoles={["admin"]}><Vehicles /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/vehicles/:id" component={() => (
                  <DomainErrorBoundary domain="Vehicle Fleet">
                    {user?.role === "admin" ? <VehicleDetail /> : <VehicleQRRedirect />}
                  </DomainErrorBoundary>
                )} />
                <Route path="/vehicles/:id/edit" component={() => (
                  <DomainErrorBoundary domain="Vehicle Fleet">
                    <RoleGuard allowedRoles={["admin"]}><VehicleEdit /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/my-reservations" component={() => (
                  <DomainErrorBoundary domain="Vehicle Fleet">
                    <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><MyReservations /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/vehicle-reservations" component={() => (
                  <DomainErrorBoundary domain="Vehicle Fleet">{(() => {
                    window.location.replace("/vehicles?tab=reservations");
                    return null;
                  })()}</DomainErrorBoundary>
                )} />
                <Route path="/vehicle-reservation-details/:reservationId" component={() => (
                  <DomainErrorBoundary domain="Vehicle Fleet">
                    <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><VehicleReservationDetails /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/vehicle-checkout/:reservationId" component={() => (
                  <DomainErrorBoundary domain="Vehicle Fleet">
                    <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><VehicleCheckOut /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/vehicle-checkin/:checkOutLogId" component={() => (
                  <DomainErrorBoundary domain="Vehicle Fleet">
                    <RoleGuard allowedRoles={["admin", "staff", "technician", "student"]}><VehicleCheckIn /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/vehicle-checkin-verify/:checkInLogId" component={() => (
                  <DomainErrorBoundary domain="Vehicle Fleet">
                    <RoleGuard allowedRoles={["admin"]}><VehicleCheckInVerification /></RoleGuard>
                  </DomainErrorBoundary>
                )} />

                {/* Analytics */}
                <Route path="/analytics" component={() => (
                  <DomainErrorBoundary domain="Analytics">
                    <RoleGuard allowedRoles={["admin"]}><AnalyticsDashboard /></RoleGuard>
                  </DomainErrorBoundary>
                )} />

                {/* Redirects */}
                <Route path="/emergency-contacts" component={() => (
                  <DomainErrorBoundary domain="Settings">{(() => {
                    window.location.replace("/settings?tab=emergency");
                    return null;
                  })()}</DomainErrorBoundary>
                )} />
                <Route path="/projects" component={() => (
                  <DomainErrorBoundary domain="Projects">{(() => {
                    window.location.replace("/work");
                    return null;
                  })()}</DomainErrorBoundary>
                )} />

                {/* Projects */}
                <Route path="/projects/:id" component={() => (
                  <DomainErrorBoundary domain="Projects">
                    <RoleGuard allowedRoles={["admin"]}><ProjectDetail /></RoleGuard>
                  </DomainErrorBoundary>
                )} />

                {/* Admin Tools */}
                <Route path="/email-management" component={() => (
                  <DomainErrorBoundary domain="Admin Tools">
                    <RoleGuard allowedRoles={["admin"]}><EmailManagement /></RoleGuard>
                  </DomainErrorBoundary>
                )} />
                <Route path="/resources" component={() => (
                  <DomainErrorBoundary domain="Admin Tools">
                    <RoleGuard allowedRoles={["admin"]}><ResourceLibrary /></RoleGuard>
                  </DomainErrorBoundary>
                )} />

                {/* Catch-all */}
                <Route component={() => (
                  <DomainErrorBoundary domain="General"><NotFound /></DomainErrorBoundary>
                )} />
              </Switch>
              </Suspense>
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
