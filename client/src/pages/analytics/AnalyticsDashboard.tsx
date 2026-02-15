import { useState, lazy, Suspense } from "react";
import { 
  ClipboardList, 
  Users, 
  Settings, 
  Building2, 
  Car, 
  FileText, 
  Bell,
  BarChart3,
  FolderKanban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const WorkOrdersReport = lazy(() => import("./reports/WorkOrdersReport"));
const TechniciansReport = lazy(() => import("./reports/TechniciansReport"));
const AssetsReport = lazy(() => import("./reports/AssetsReport"));
const FacilitiesReport = lazy(() => import("./reports/FacilitiesReport"));
const FleetReport = lazy(() => import("./reports/FleetReport"));
const ServiceRequestsReport = lazy(() => import("./reports/ServiceRequestsReport"));
const AlertsReport = lazy(() => import("./reports/AlertsReport"));
const ProjectsReport = lazy(() => import("./reports/ProjectsReport"));

type ReportTab = "work-orders" | "technicians" | "assets" | "facilities" | "fleet" | "requests" | "alerts" | "projects";

const reportTabs = [
  {
    id: "work-orders" as ReportTab,
    title: "Work Orders",
    description: "Task status and trends",
    icon: ClipboardList,
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  },
  {
    id: "technicians" as ReportTab,
    title: "Team",
    description: "Team performance",
    icon: Users,
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  },
  {
    id: "assets" as ReportTab,
    title: "Assets",
    description: "Equipment health",
    icon: Settings,
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  },
  {
    id: "facilities" as ReportTab,
    title: "Facilities",
    description: "Building analytics",
    icon: Building2,
    color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  },
  {
    id: "fleet" as ReportTab,
    title: "Fleet",
    description: "Vehicle usage",
    icon: Car,
    color: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "requests" as ReportTab,
    title: "Requests",
    description: "Service requests",
    icon: FileText,
    color: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
  },
  {
    id: "alerts" as ReportTab,
    title: "Alerts",
    description: "Issues & overdue",
    icon: Bell,
    color: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  },
  {
    id: "projects" as ReportTab,
    title: "Projects",
    description: "Project overview",
    icon: FolderKanban,
    color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
  },
];

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

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<ReportTab>("work-orders");

  const renderActiveReport = () => {
    switch (activeTab) {
      case "work-orders":
        return <WorkOrdersReport />;
      case "technicians":
        return <TechniciansReport />;
      case "assets":
        return <AssetsReport />;
      case "facilities":
        return <FacilitiesReport />;
      case "fleet":
        return <FleetReport />;
      case "requests":
        return <ServiceRequestsReport />;
      case "alerts":
        return <AlertsReport />;
      case "projects":
        return <ProjectsReport />;
      default:
        return <WorkOrdersReport />;
    }
  };

  return (
    <div className="p-3 md:p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground">Comprehensive maintenance dashboard</p>
          </div>
        </div>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {reportTabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              size="sm"
              className="flex-shrink-0 gap-2"
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.title}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Suspense fallback={<LoadingSkeleton />}>
        {renderActiveReport()}
      </Suspense>
    </div>
  );
}
