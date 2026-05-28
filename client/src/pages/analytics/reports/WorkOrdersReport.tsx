import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  PauseCircle, 
  CircleDashed,
  ArrowUpRight
} from "lucide-react";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import AnalyticsEmptyState from "@/components/analytics/AnalyticsEmptyState";
import { useAnalyticsFilters } from "../useAnalyticsFilters";
import { useAnalyticsExport } from "../useAnalyticsExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTableScroll } from "@/components/ResponsiveTableScroll";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  StatusPieChart,
  UrgencyBarChart,
  MonthlyTrendChart,
  PropertyBarChart,
  CountBarChart,
} from "@/components/analytics/AnalyticsCharts";
import AnalyticsReportError from "@/components/analytics/AnalyticsReportError";
import AnalyticsDetailFetchBanner from "@/components/analytics/AnalyticsDetailFetchBanner";
import { formatTaskTypeLabel, hasActiveAnalyticsFilters } from "../analyticsReportUtils";

interface DetailedWorkOrder {
  id: string;
  name: string;
  description: string;
  status: string;
  urgency: string;
  initialDate: string | null;
  estimatedCompletionDate: string | null;
  actualCompletionDate: string | null;
  assignedToId: string | null;
  assignedToName: string;
  propertyId: string | null;
  propertyName: string;
  spaceId: string | null;
  spaceName: string;
  areaId: string | null;
  areaName: string;
  equipmentId: string | null;
  equipmentName: string;
  taskType: string;
  createdAt: string | null;
}

interface WorkOrderOverview {
  totalWorkOrders: number;
  completedWorkOrders: number;
  inProgressWorkOrders: number;
  onHoldWorkOrders: number;
  notStartedWorkOrders: number;
  completionRate: number;
  avgResolutionTimeHours: number;
  avgResponseTimeHours: number;
  byStatus: { status: string; count: number }[];
  byUrgency: { urgency: string; count: number }[];
  byProperty: { propertyId: string; propertyName: string; count: number }[];
  bySpace: { spaceId: string; spaceName: string; propertyName: string; count: number }[];
  byArea: { areaId: string; areaName: string; count: number }[];
  monthlyTrend: { month: string; count: number; completed: number }[];
  overdueWorkOrders: number;
  byTaskType?: { taskType: string; count: number }[];
  byCategory?: { category: string; count: number }[];
  byRequesterRole?: { role: string; count: number }[];
  detailedRecords: DetailedWorkOrder[];
}

export default function WorkOrdersReport() {
  const { filters, setFilters, buildQueryString, clearFilters } = useAnalyticsFilters();
  const hasActiveFilters = hasActiveAnalyticsFilters(filters);

  const queryString = buildQueryString();
  const { handleExport, isExporting } = useAnalyticsExport("work-orders-complete", () => buildQueryString());

  const { data: summary, isLoading: summaryLoading, isError, refetch } = useQuery<WorkOrderOverview>({
    queryKey: ["/api/analytics/work-orders/summary", filters],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/work-orders/summary?${queryString}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const { data: details, isLoading: detailsLoading, isError: detailsError, refetch: refetchDetails } = useQuery<WorkOrderOverview>({
    queryKey: ["/api/analytics/work-orders", filters, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/work-orders?${queryString}`);
      if (!response.ok) throw new Error("Failed to fetch work order details");
      return response.json();
    },
  });

  const data = summary;
  const isLoading = summaryLoading;
  const detailedRecords = details?.detailedRecords ?? [];

  if (isError) {
    return (
      <AnalyticsReportError
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportLoading={isExporting}
        exportOptions={["pdf", "xlsx"]}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 md:space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportLoading={isExporting}
        showStatusFilter
        statusFilterVariant="work-order"
        showUrgencyFilter
        showTechnicianFilter
        exportOptions={["pdf", "xlsx"]}
      />

      {detailsError && (
        <AnalyticsDetailFetchBanner onRetry={() => void refetchDetails()} />
      )}

      {data && data.totalWorkOrders === 0 ? (
        <AnalyticsEmptyState
          title="No work orders match these filters"
          description="Adjust the date range or clear filters to see work order analytics."
          onClearFilters={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="col-span-1" data-testid="card-total-work-orders">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.totalWorkOrders || 0}</p>
                <p className="text-xs text-muted-foreground">Total Work Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1" data-testid="card-completed">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.completedWorkOrders || 0}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1" data-testid="card-in-progress">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.inProgressWorkOrders || 0}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1" data-testid="card-overdue">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${(data?.overdueWorkOrders || 0) > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <AlertTriangle className={`w-5 h-5 ${(data?.overdueWorkOrders || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.overdueWorkOrders || 0}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1" data-testid="card-completion-rate">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Completion Rate</p>
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-2xl font-bold">{data?.completionRate || 0}%</p>
              <Progress value={data?.completionRate || 0} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {data && <StatusPieChart data={data.byStatus} title="Work order status" />}
        {data && <UrgencyBarChart data={data.byUrgency} title="Work orders by priority" />}
        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Performance metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <CircleDashed className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Not started</span>
              </div>
              <span className="font-semibold">{data?.notStartedWorkOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">On hold</span>
              </div>
              <span className="font-semibold">{data?.onHoldWorkOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Avg time to start</span>
              </div>
              <span className="font-semibold">{data?.avgResponseTimeHours || 0}h</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-sm">Avg resolution</span>
              </div>
              <span className="font-semibold">{data?.avgResolutionTimeHours || 0}h</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {data?.byTaskType && data.byTaskType.length > 0 && (
          <CountBarChart
            title="By work order type"
            testId="chart-task-type"
            data={data.byTaskType.map((t) => ({ name: formatTaskTypeLabel(t.taskType), value: t.count }))}
          />
        )}
        {data?.byCategory && data.byCategory.length > 0 && (
          <CountBarChart
            title="By request category"
            testId="chart-request-category"
            data={data.byCategory.map((c) => ({ name: c.category, value: c.count }))}
          />
        )}
        {data?.byRequesterRole && data.byRequesterRole.length > 0 && (
          <CountBarChart
            title="By requester role"
            testId="chart-requester-role"
            data={data.byRequesterRole.map((r) => ({ name: r.role, value: r.count }))}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data && <MonthlyTrendChart data={data.monthlyTrend} title="Monthly work order trend" />}
        {data && (
          <PropertyBarChart
            data={data.byProperty.map((p) => ({ propertyName: p.propertyName, count: p.count }))}
            title="Work orders by property"
          />
        )}
      </div>

      <Card>
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between gap-1">
          <div>
            <CardTitle className="text-sm font-medium">Work Orders Detail</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {detailsLoading ? "Loading…" : `${detailedRecords.length} records found`}
            </p>
          </div>
          <Link href="/work">
            <Button variant="outline" size="sm" className="gap-1">
              View All
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ResponsiveTableScroll maxHeight="min(60vh, 400px)">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Work Order</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Assigned To</TableHead>
                  <TableHead className="text-xs">Property</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Space</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Start Date</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedRecords.map(record => (
                  <TableRow key={record.id} data-testid={`row-workorder-${record.id}`}>
                    <TableCell className="py-2">
                      <Link href={`/tasks/${record.id}`}>
                        <span className="text-sm text-primary hover:underline cursor-pointer font-medium">
                          {record.name}
                        </span>
                      </Link>
                      {record.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {record.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant={
                          record.status === "completed"
                            ? "default"
                            : record.status === "in_progress"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs"
                        style={{
                          backgroundColor: record.status === "completed" ? "#22c55e" : 
                                          record.status === "in_progress" ? "#3b82f6" :
                                          record.status === "on_hold" ? "#eab308" : undefined,
                          color: ["completed", "in_progress", "on_hold"].includes(record.status) ? "white" : undefined,
                        }}
                      >
                        {record.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: record.urgency === "high" ? "#ef4444" : record.urgency === "medium" ? "#eab308" : "#22c55e", color: record.urgency === "high" ? "#ef4444" : record.urgency === "medium" ? "#eab308" : "#22c55e",
                        }}
                      >
                        {record.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm py-2">{record.assignedToName}</TableCell>
                    <TableCell className="text-sm py-2">{record.propertyName}</TableCell>
                    <TableCell className="text-sm py-2 hidden md:table-cell">{record.spaceName || "—"}</TableCell>
                    <TableCell className="text-sm py-2 hidden lg:table-cell">
                      {record.initialDate
                        ? new Date(record.initialDate).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-sm py-2 hidden lg:table-cell">
                      {record.estimatedCompletionDate
                        ? new Date(record.estimatedCompletionDate).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableScroll>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
