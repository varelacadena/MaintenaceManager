import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  ArrowUpRight,
  Pause,
  CircleDashed
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import AnalyticsEmptyState from "@/components/analytics/AnalyticsEmptyState";
import AnalyticsReportError from "@/components/analytics/AnalyticsReportError";
import AnalyticsDetailFetchBanner from "@/components/analytics/AnalyticsDetailFetchBanner";
import { StatusPieChart, CountBarChart } from "@/components/analytics/AnalyticsCharts";
import { useAnalyticsFilters } from "../useAnalyticsFilters";
import { useAnalyticsExport } from "../useAnalyticsExport";
import { hasActiveAnalyticsFilters } from "../analyticsReportUtils";

interface ProjectsOverview {
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  onHoldProjects: number;
  planningProjects: number;
  cancelledProjects: number;
  completionRate: number;
  totalBudget: number;
  criticalOpen: number;
  highOpen: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  budgetByStatus: { status: string; budget: number }[];
  projects: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    priority: string;
    propertyName: string;
    targetEndDate: string | null;
    budgetAmount: number;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  in_progress: "#3b82f6",
  on_hold: "#eab308",
  planning: "#9ca3af",
  cancelled: "#ef4444",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ef4444",
  medium: "#eab308",
  low: "#22c55e",
};

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString();
}

export default function ProjectsReport() {
  const { filters, setFilters, buildQueryString, clearFilters } = useAnalyticsFilters();
  const hasActiveFilters = hasActiveAnalyticsFilters(filters);
  const { handleExport, isExporting } = useAnalyticsExport("projects", () => buildQueryString());

  const queryString = buildQueryString();

  const { data: summary, isLoading: summaryLoading, isError, refetch } = useQuery<ProjectsOverview>({
    queryKey: ["/api/analytics/projects/summary", filters],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/projects/summary?${queryString}`);
      if (!response.ok) throw new Error("Failed to fetch project analytics");
      return response.json();
    },
  });

  const { data: details, isError: detailsError, refetch: refetchDetails } = useQuery<ProjectsOverview>({
    queryKey: ["/api/analytics/projects", filters, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/projects?${queryString}`);
      if (!response.ok) throw new Error("Failed to fetch project details");
      return response.json();
    },
  });

  const data = summary ? { ...summary, projects: details?.projects ?? [] } : undefined;
  const isLoading = summaryLoading;

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

  if (isLoading || !data) {
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

  const stats = {
    total: data.totalProjects,
    completed: data.completedProjects,
    inProgress: data.inProgressProjects,
    onHold: data.onHoldProjects,
    planning: data.planningProjects,
    cancelled: data.cancelledProjects,
    totalBudget: data.totalBudget,
    critical: data.criticalOpen,
    high: data.highOpen,
  };

  const completionRate = data.completionRate;

  const statusLabel = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const budgetByStatus = data.budgetByStatus.map((b) => ({
    status: statusLabel(b.status),
    budget: b.budget,
  }));

  const activeProjects = data.projects.filter(
    (p) => p.status === "in_progress" || p.status === "planning",
  );

  return (
    <div className="space-y-3 md:space-y-4">
      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportLoading={isExporting}
        showStatusFilter
        statusFilterVariant="project"
        showUrgencyFilter
        urgencyFilterVariant="project"
        exportOptions={["pdf", "xlsx"]}
      />

      {detailsError && (
        <AnalyticsDetailFetchBanner onRetry={() => void refetchDetails()} />
      )}

      {data.totalProjects === 0 ? (
        <AnalyticsEmptyState
          title="No projects match these filters"
          description="Adjust the date range or clear filters to see project analytics."
          onClearFilters={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold" data-testid="text-projects-report-title">Projects Overview</h2>
        <Link href="/work?tab=projects">
          <Button variant="outline" size="sm" data-testid="button-view-all-projects">
            View All Projects
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card data-testid="card-total-projects">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inProgress} active, {stats.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-completion-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="card-total-budget">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              Filtered portfolio
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-high-priority">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.critical + stats.high}</div>
            <p className="text-xs text-muted-foreground">
              {stats.critical} critical, {stats.high} high
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatusPieChart data={data.byStatus} title="By status" />

        <Card data-testid="card-budget-by-status">
          <CardHeader>
            <CardTitle className="text-base">Budget by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {budgetByStatus.every(d => d.budget === 0) ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No budget data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={budgetByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Budget"]}
                  />
                  <Bar dataKey="budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-active-projects-table">
        <CardHeader>
          <CardTitle className="text-base">Active Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Target Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No active projects
                    </TableCell>
                  </TableRow>
                ) : (
                  activeProjects.slice(0, 10).map((project) => (
                    <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
                      <TableCell>
                        <div className="font-medium">{project.name}</div>
                        {project.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {project.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className="capitalize"
                          style={{ 
                            backgroundColor: STATUS_COLORS[project.status] + "20",
                            color: STATUS_COLORS[project.status]
                          }}
                        >
                          {project.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className="capitalize"
                          style={{ 
                            borderColor: PRIORITY_COLORS[project.priority],
                            color: PRIORITY_COLORS[project.priority]
                          }}
                        >
                          {project.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(project.budgetAmount)}</TableCell>
                      <TableCell>{formatDate(project.targetEndDate)}</TableCell>
                      <TableCell>
                        <Link href={`/projects/${project.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-view-project-${project.id}`}>
                            <ArrowUpRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CountBarChart
          title="By priority"
          testId="chart-project-priority"
          data={data.byPriority.map((p) => ({
            name: p.priority.charAt(0).toUpperCase() + p.priority.slice(1),
            value: p.count,
          }))}
        />

        <Card data-testid="card-project-summary">
          <CardHeader>
            <CardTitle className="text-base">Project Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CircleDashed className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Planning</span>
                </div>
                <span className="font-medium">{stats.planning}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">In Progress</span>
                </div>
                <span className="font-medium">{stats.inProgress}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pause className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">On Hold</span>
                </div>
                <span className="font-medium">{stats.onHold}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Completed</span>
                </div>
                <span className="font-medium">{stats.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm">Cancelled</span>
                </div>
                <span className="font-medium">{stats.cancelled}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
}
