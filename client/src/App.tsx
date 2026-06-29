import { Suspense, useEffect } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ImagePreviewProvider } from "@/components/ImagePreviewProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollToTop } from "./components/ScrollToTop";
import PwaInstallBanner from "./components/PwaInstallBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import DomainErrorBoundary from "@/components/DomainErrorBoundary";
import { goBack, hasPageBackControl } from "@/lib/navigation";
import { queryClient } from "./lib/queryClient";
import { markRouteNavigation, measureRouteNavigation } from "@/lib/performanceMarks";
import { AppRoutes } from "@/routes/AppRoutes";

const Landing = lazyWithRetry(() => import("@/pages/Landing"));
const ForgotPassword = lazyWithRetry(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("@/pages/ResetPassword"));
const RequestAccess = lazyWithRetry(() => import("@/pages/RequestAccess"));
const AdminTaskDetailPage = lazyWithRetry(() => import("@/pages/AdminTaskDetailPage"));
const TaskDetail = lazyWithRetry(() => import("@/pages/TaskDetail"));
const MobileTaskDetail = lazyWithRetry(() => import("@/components/MobileTaskDetail"));
const NotificationsWidget = lazyWithRetry(() => import("./components/NotificationsWidget"));

function SuspenseFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[40vh]">
      <div className="text-center text-muted-foreground text-sm">Loading...</div>
    </div>
  );
}

function AuthShellSkeleton() {
  const style = {
    "--sidebar-width": "13rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-svh min-h-0 w-full">
        <div className="hidden md:block w-[var(--sidebar-width)] border-r border-border/40 bg-muted/30 animate-pulse" />
        <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
          <header className="flex items-center justify-between px-2 sm:px-6 py-2 sm:py-3 border-b border-border/40 bg-background">
            <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
          </header>
          <main className="flex-1 min-h-0 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 overflow-y-auto">
            <SuspenseFallback />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedApp() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const isMobileView = useIsMobile();
  const [currentPath, setLocation] = useLocation();

  useEffect(() => {
    markRouteNavigation(currentPath);
    const frame = requestAnimationFrame(() => {
      measureRouteNavigation(currentPath);
    });
    return () => cancelAnimationFrame(frame);
  }, [currentPath]);

  const style = {
    "--sidebar-width": "13rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading) {
    return <AuthShellSkeleton />;
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
  const showGlobalBack = user?.role !== "student" &&
    user?.role !== "technician" &&
    !hasPageBackControl(currentPath, user?.role);
  const isAdminTaskDetail = user?.role === "admin" && /^\/tasks\/[^/]+$/.test(currentPath);

  if (isMobileTaskDetail) {
    if (user?.role === "technician") {
      return <Suspense fallback={<SuspenseFallback />}><DomainErrorBoundary domain="Work Orders & Tasks"><TaskDetail /></DomainErrorBoundary></Suspense>;
    }
    if (user?.role === "admin") {
      return <Suspense fallback={<SuspenseFallback />}><DomainErrorBoundary domain="Work Orders & Tasks"><AdminTaskDetailPage /></DomainErrorBoundary></Suspense>;
    }
    return <Suspense fallback={<SuspenseFallback />}><DomainErrorBoundary domain="Work Orders & Tasks"><MobileTaskDetail /></DomainErrorBoundary></Suspense>;
  }

  return (
    <>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-svh min-h-0 w-full">
          <AppSidebar
            userRole={user?.role as "admin" | "staff" | "student" | "technician"}
            userName={userName}
            userInitials={userInitials}
          />
          <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
            <header className={`flex items-center justify-between px-2 sm:px-6 py-2 sm:py-3 border-b border-border/40 bg-background ${(user?.role === "student" || user?.role === "technician") ? "py-1.5" : ""}`}>
              <div className="flex items-center gap-1 sm:gap-3">
                <SidebarTrigger className="md:hidden h-8 w-8 text-muted-foreground" data-testid="button-sidebar-toggle" />
                {showGlobalBack && (
                  <button
                    onClick={() => goBack(setLocation, currentPath, user?.role)}
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
                    <span className="hidden sm:inline">{isAdminTaskDetail ? "Return to Work" : "Back"}</span>
                  </button>
                )}
                {(user?.role === "student" || user?.role === "technician") && (
                  <span className="text-sm font-medium text-muted-foreground" data-testid="text-user-name">
                    {userName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {user?.role !== "student" && user?.role !== "technician" && (
                  <Suspense fallback={null}>
                    <NotificationsWidget />
                  </Suspense>
                )}
                <ThemeToggle />
                {user?.role !== "student" && (
                  <button
                    onClick={async () => {
                      await fetch("/api/logout", { method: "POST" });
                      window.location.href = "/";
                    }}
                    className="min-h-9 min-w-11 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:min-h-0 sm:min-w-0 sm:px-0 sm:py-0 sm:hover:bg-transparent"
                    data-testid="button-logout"
                  >
                    <span className="hidden sm:inline">Sign Out</span>
                    <span className="sm:hidden">Out</span>
                  </button>
                )}
              </div>
            </header>
            <main className={`flex-1 min-h-0 bg-muted/20 ${(user?.role === "student" || user?.role === "technician") ? "px-0 py-0" : "px-3 py-4 sm:px-6 sm:py-6 lg:px-8"} ${/^\/tasks\/[a-f0-9-]+$/i.test(currentPath) ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"}`}>
              {(user?.role === "student" || user?.role === "technician") && (
                <PwaInstallBanner />
              )}
              <ScrollToTop />
              <ErrorBoundary>
                <Suspense fallback={<SuspenseFallback />}>
                  <AppRoutes />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ImagePreviewProvider>
          <AuthenticatedApp />
        </ImagePreviewProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
