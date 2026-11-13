import { lazy, Suspense } from "react";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AnalyticsFilterProvider,
  useAnalyticsFilters,
  type ReportTab,
} from "./useAnalyticsFilters";
import AnalyticsToolbar from "./AnalyticsToolbar";
import AnalyticsFocus from "./AnalyticsFocus";
import ReportsBuilder from "./ReportsBuilder";

const AssetsReport = lazy(() => import("./reports/AssetsReport"));
const FleetReport = lazy(() => import("./reports/FleetReport"));
const InventoryReport = lazy(() => import("./reports/InventoryReport"));
const ServiceRequestsReport = lazy(() => import("./reports/ServiceRequestsReport"));
const AlertsReport = lazy(() => import("./reports/AlertsReport"));
const ProjectsReport = lazy(() => import("./reports/ProjectsReport"));
const KeyMetricsReport = lazy(() => import("./reports/KeyMetricsReport"));

const reportTabs = new Set<ReportTab>([
  "key-metrics",
  "assets",
  "fleet",
  "inventory",
  "requests",
  "alerts",
  "projects",
]);

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function AnalyticsDashboardContent() {
  const { activeTab, view } = useAnalyticsFilters();

  const renderActiveReport = () => {
    switch (activeTab) {
      case "key-metrics":
        return <KeyMetricsReport />;
      case "assets":
        return <AssetsReport />;
      case "fleet":
        return <FleetReport />;
      case "inventory":
        return <InventoryReport />;
      case "requests":
        return <ServiceRequestsReport />;
      case "alerts":
        return <AlertsReport />;
      case "projects":
        return <ProjectsReport />;
      default:
        return null;
    }
  };

  const title = view === "analytics" ? "Analytics" : "Reports";

  return (
    <div className="p-3 md:p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
      </div>
      <AnalyticsToolbar />
      {view === "analytics" ? (
        activeTab === "work-orders" || activeTab === "technicians" || activeTab === "facilities" ? (
          <AnalyticsFocus />
        ) : (
          reportTabs.has(activeTab) && (
            <Suspense fallback={<LoadingSkeleton />}>{renderActiveReport()}</Suspense>
          )
        )
      ) : (
        <ReportsBuilder />
      )}
    </div>
  );
}

export default function AnalyticsDashboard() {
  return (
    <AnalyticsFilterProvider>
      <AnalyticsDashboardContent />
    </AnalyticsFilterProvider>
  );
}
