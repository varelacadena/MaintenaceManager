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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import type { Project } from "@shared/schema";

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
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  if (isLoading) {
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

  const projectList = projects || [];

  const stats = {
    total: projectList.length,
    completed: projectList.filter(p => p.status === "completed").length,
    inProgress: projectList.filter(p => p.status === "in_progress").length,
    onHold: projectList.filter(p => p.status === "on_hold").length,
    planning: projectList.filter(p => p.status === "planning").length,
    cancelled: projectList.filter(p => p.status === "cancelled").length,
    totalBudget: projectList.reduce((sum, p) => sum + (Number(p.budgetAmount) || 0), 0),
    critical: projectList.filter(p => p.priority === "critical" && p.status !== "completed").length,
    high: projectList.filter(p => p.priority === "high" && p.status !== "completed").length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const statusData = [
    { name: "Completed", value: stats.completed, color: STATUS_COLORS.completed },
    { name: "In Progress", value: stats.inProgress, color: STATUS_COLORS.in_progress },
    { name: "On Hold", value: stats.onHold, color: STATUS_COLORS.on_hold },
    { name: "Planning", value: stats.planning, color: STATUS_COLORS.planning },
    { name: "Cancelled", value: stats.cancelled, color: STATUS_COLORS.cancelled },
  ].filter(d => d.value > 0);

  const priorityData = [
    { name: "Critical", value: projectList.filter(p => p.priority === "critical").length, color: PRIORITY_COLORS.critical },
    { name: "High", value: projectList.filter(p => p.priority === "high").length, color: PRIORITY_COLORS.high },
    { name: "Medium", value: projectList.filter(p => p.priority === "medium").length, color: PRIORITY_COLORS.medium },
    { name: "Low", value: projectList.filter(p => p.priority === "low").length, color: PRIORITY_COLORS.low },
  ].filter(d => d.value > 0);

  const budgetByStatus = [
    { status: "Planning", budget: projectList.filter(p => p.status === "planning").reduce((sum, p) => sum + (Number(p.budgetAmount) || 0), 0) },
    { status: "In Progress", budget: projectList.filter(p => p.status === "in_progress").reduce((sum, p) => sum + (Number(p.budgetAmount) || 0), 0) },
    { status: "On Hold", budget: projectList.filter(p => p.status === "on_hold").reduce((sum, p) => sum + (Number(p.budgetAmount) || 0), 0) },
    { status: "Completed", budget: projectList.filter(p => p.status === "completed").reduce((sum, p) => sum + (Number(p.budgetAmount) || 0), 0) },
  ];

  const activeProjects = projectList.filter(p => p.status === "in_progress" || p.status === "planning");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold" data-testid="text-projects-report-title">Projects Overview</h2>
        <Link href="/work">
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
              Across all projects
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
        <Card data-testid="card-status-distribution">
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No project data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-budget-by-status">
          <CardHeader>
            <CardTitle className="text-base">Budget by Status</CardTitle>
          </CardHeader>
          <CardContent>
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
        <Card data-testid="card-priority-distribution">
          <CardHeader>
            <CardTitle className="text-base">Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No project data available
              </div>
            )}
          </CardContent>
        </Card>

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
    </div>
  );
}
