import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ClipboardList, FileText, AlertTriangle, Car, Package, CheckCircle2, Activity, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import AnalyticsReportError from "@/components/analytics/AnalyticsReportError";
import { useAnalyticsFilters } from "../useAnalyticsFilters";
import { useAnalyticsExport } from "../useAnalyticsExport";
import { getServiceRequestStatusLabel } from "@/lib/serviceRequestLabels";

interface MetricComparison {
  current: number;
  previous: number;
  changePercent: number | null;
  isPositive: boolean;
}

interface ExecutiveOverview {
  periodLabel: string;
  previousPeriodLabel: string;
  openTasks: MetricComparison;
  pendingRequests: MetricComparison;
  overdueWorkOrders: MetricComparison;
  fleetAvailable: MetricComparison;
  inventoryLowStock: MetricComparison;
  completionRate: MetricComparison;
  completedInPeriod: MetricComparison;
  convertedInPeriod: MetricComparison;
}

export default function KeyMetricsReport() {
  const [, setLocation] = useLocation();
  const { filters, setFilters, buildQueryString, navigateToReport } = useAnalyticsFilters();
  const { handleExport, isExporting } = useAnalyticsExport("overview", () => buildQueryString());

  const { data: overview, isLoading, isError, refetch } = useQuery<ExecutiveOverview>({
    queryKey: ["/api/analytics/overview", filters],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/overview?${buildQueryString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch overview");
      return res.json();
    },
  });

  if (isError) {
    return (
      <AnalyticsReportError
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportLoading={isExporting}
        exportOptions={["pdf", "xlsx"]}
        message="Could not load overview metrics"
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading || !overview) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full max-w-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportLoading={isExporting}
        exportOptions={["pdf", "xlsx"]}
      />

      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{overview.periodLabel}</span>
        {" · "}
        Compared to {overview.previousPeriodLabel.toLowerCase()}
        {" · "}
        <span className="text-muted-foreground">Click a metric to drill down</span>
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <MetricCard
          testId="metric-open-tasks"
          icon={ClipboardList}
          iconClass="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          value={overview.openTasks.current}
          label="Open Work Orders"
          metric={overview.openTasks}
          onClick={() => navigateToReport("work-orders")}
        />
        <MetricCard
          testId="metric-pending-requests"
          icon={FileText}
          iconClass="text-pink-600 dark:text-pink-400"
          iconBg="bg-pink-100 dark:bg-pink-900/30"
          value={overview.pendingRequests.current}
          label={`${getServiceRequestStatusLabel("pending")} Requests`}
          metric={overview.pendingRequests}
          onClick={() => navigateToReport("requests", { status: "pending" })}
        />
        <MetricCard
          testId="metric-overdue"
          icon={AlertTriangle}
          iconClass={
            overview.overdueWorkOrders.current > 0
              ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground"
          }
          iconBg={
            overview.overdueWorkOrders.current > 0
              ? "bg-red-100 dark:bg-red-900/30"
              : "bg-muted"
          }
          value={overview.overdueWorkOrders.current}
          label="Overdue Work Orders"
          metric={overview.overdueWorkOrders}
          onClick={() => navigateToReport("alerts")}
        />
        <MetricCard
          testId="metric-fleet-available"
          icon={Car}
          iconClass="text-cyan-600 dark:text-cyan-400"
          iconBg="bg-cyan-100 dark:bg-cyan-900/30"
          value={overview.fleetAvailable.current}
          label="Fleet Available"
          metric={overview.fleetAvailable}
          onClick={() => navigateToReport("fleet")}
        />
        <MetricCard
          testId="metric-inventory-low-stock"
          icon={Package}
          iconClass={
            overview.inventoryLowStock.current > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
          }
          iconBg={
            overview.inventoryLowStock.current > 0
              ? "bg-amber-100 dark:bg-amber-900/30"
              : "bg-muted"
          }
          value={overview.inventoryLowStock.current}
          label="Low Stock Items"
          metric={overview.inventoryLowStock}
          onClick={() => setLocation("/inventory?lowStock=1")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          data-testid="metric-completion-rate"
          className="cursor-pointer hover-elevate transition-shadow"
          onClick={() => navigateToReport("work-orders", { status: "completed" })}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Task Completion Rate</p>
                <p className="text-2xl font-bold">{overview.completionRate.current}%</p>
              </div>
            </div>
            <Progress value={overview.completionRate.current} className="h-2" />
            <TrendLine metric={overview.completionRate} />
          </CardContent>
        </Card>

        <Card data-testid="metric-recent-activity" className="cursor-default">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Period Activity</p>
                <p className="text-xs text-muted-foreground">{overview.periodLabel}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ActivityTile
                value={overview.completedInPeriod.current}
                label="Tasks Completed"
                metric={overview.completedInPeriod}
                onClick={() => navigateToReport("work-orders", { status: "completed" })}
              />
              <ActivityTile
                value={overview.convertedInPeriod.current}
                label={`Requests ${getServiceRequestStatusLabel("converted_to_task")}`}
                metric={overview.convertedInPeriod}
                onClick={() => navigateToReport("requests", { status: "converted_to_task" })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TrendLine({ metric }: { metric: MetricComparison }) {
  if (metric.changePercent === null) return null;
  return (
    <p
      className={`text-xs mt-1 ${
        metric.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      }`}
    >
      {metric.changePercent > 0 ? "+" : ""}
      {metric.changePercent}% vs prior period
    </p>
  );
}

function MetricCard({
  testId,
  icon: Icon,
  iconClass,
  iconBg,
  value,
  label,
  metric,
  onClick,
}: {
  testId: string;
  icon: LucideIcon;
  iconClass: string;
  iconBg: string;
  value: number;
  label: string;
  metric: MetricComparison;
  onClick?: () => void;
}) {
  return (
    <Card
      data-testid={testId}
      className={onClick ? "cursor-pointer hover-elevate transition-shadow" : undefined}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconClass}`} />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            <TrendLine metric={metric} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityTile({
  value,
  label,
  metric,
  onClick,
}: {
  value: number;
  label: string;
  metric: MetricComparison;
  onClick?: () => void;
}) {
  return (
    <div
      className={`p-3 rounded-lg bg-muted/50 text-center space-y-1 ${
        onClick ? "cursor-pointer hover-elevate" : ""
      }`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {metric.changePercent !== null && (
        <p
          className={`text-xs ${
            metric.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {metric.changePercent > 0 ? "+" : ""}
          {metric.changePercent}%
        </p>
      )}
    </div>
  );
}

