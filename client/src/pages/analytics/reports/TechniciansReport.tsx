import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, CheckCircle2, Clock, Award, TrendingUp, GraduationCap, Wrench } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import { useAnalyticsFilters, type RoleFilter } from "../useAnalyticsFilters";
import { useAnalyticsExport } from "../useAnalyticsExport";
import { TechnicianPerformanceChart } from "@/components/analytics/AnalyticsCharts";
import AnalyticsEmptyState from "@/components/analytics/AnalyticsEmptyState";
import AnalyticsReportError from "@/components/analytics/AnalyticsReportError";
import AnalyticsDetailFetchBanner from "@/components/analytics/AnalyticsDetailFetchBanner";
import { hasActiveAnalyticsFilters } from "../analyticsReportUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface TechnicianTaskDetail {
  taskId: string;
  taskName: string;
  description: string;
  status: string;
  urgency: string;
  initialDate: string | null;
  completionDate: string | null;
  propertyName: string;
  areaName: string;
  hoursLogged: number;
}

interface TechnicianData {
  technicianId: string;
  technicianName: string;
  memberType?: "technician" | "student";
  tasksCompleted: number;
  tasksAssigned: number;
  totalHoursLogged: number;
  avgCompletionTimeHours: number;
  completionRate: number;
  taskDetails: TechnicianTaskDetail[];
}

export default function TechniciansReport() {
  const { filters, setFilters, buildQueryString, roleFilter, setRoleFilter, clearFilters } = useAnalyticsFilters();
  const hasActiveFilters = hasActiveAnalyticsFilters(filters);

  const technicianQueryString = () =>
    buildQueryString(roleFilter !== "all" ? { roleType: roleFilter } : undefined);

  const memberLabel =
    roleFilter === "technician" ? "Technicians" : roleFilter === "student" ? "Students" : "Team Members";

  const techQuery = technicianQueryString();
  const { handleExport, isExporting } = useAnalyticsExport("technicians-detailed", technicianQueryString);

  const { data: summary = [], isLoading: summaryLoading, isError, refetch } = useQuery<TechnicianData[]>({
    queryKey: ["/api/analytics/technicians/summary", filters, roleFilter],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/technicians/summary?${techQuery}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const { data: details = [], isError: detailsError, refetch: refetchDetails } = useQuery<TechnicianData[]>({
    queryKey: ["/api/analytics/technicians", filters, roleFilter, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/technicians?${techQuery}`);
      if (!response.ok) throw new Error("Failed to fetch team details");
      return response.json();
    },
  });

  const detailsById = new Map(details.map((t) => [t.technicianId, t]));
  const data = summary.map((tech) => ({
    ...tech,
    taskDetails: detailsById.get(tech.technicianId)?.taskDetails ?? [],
  }));
  const isLoading = summaryLoading;

  const totalTasksCompleted = data.reduce((sum, t) => sum + t.tasksCompleted, 0);
  const totalHoursLogged = data.reduce((sum, t) => sum + t.totalHoursLogged, 0);
  const avgCompletionRate = data.length > 0
    ? Math.round(data.reduce((sum, t) => sum + t.completionRate, 0) / data.length)
    : 0;
  const topPerformer = data.length > 0 ? data[0] : null;

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 sm:h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <ToggleGroup
        type="single"
        value={roleFilter}
        onValueChange={(value) => value && setRoleFilter(value as RoleFilter)}
        className="justify-start"
        data-testid="toggle-role-filter"
      >
        <ToggleGroupItem value="all" data-testid="toggle-all">
          <Users className="h-4 w-4 mr-1" />
          <span className="text-xs sm:text-sm">All</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="technician" data-testid="toggle-technicians">
          <Wrench className="h-4 w-4 mr-1" />
          <span className="text-xs sm:text-sm">Technicians</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="student" data-testid="toggle-students">
          <GraduationCap className="h-4 w-4 mr-1" />
          <span className="text-xs sm:text-sm">Students</span>
        </ToggleGroupItem>
      </ToggleGroup>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportLoading={isExporting}
        exportOptions={["pdf", "xlsx"]}
      />

      {detailsError && (
        <AnalyticsDetailFetchBanner onRetry={() => void refetchDetails()} />
      )}

      {data.length === 0 ? (
        <AnalyticsEmptyState
          title={`No ${memberLabel.toLowerCase()} match these filters`}
          onClearFilters={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KpiCard
          title={memberLabel}
          value={data.length}
          icon={Users}
        />
        <KpiCard
          title="Tasks Done"
          value={totalTasksCompleted}
          icon={CheckCircle2}
          variant="success"
        />
        <KpiCard
          title="Hours Logged"
          value={`${totalHoursLogged}h`}
          icon={Clock}
        />
        <KpiCard
          title="Avg Rate"
          value={`${avgCompletionRate}%`}
          icon={TrendingUp}
          variant={avgCompletionRate >= 80 ? "success" : avgCompletionRate >= 50 ? "warning" : "danger"}
        />
      </div>

      {topPerformer && (
        <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Top Performer</p>
                <p className="text-base sm:text-xl font-bold truncate">{topPerformer.technicianName}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {topPerformer.tasksCompleted} tasks | {topPerformer.totalHoursLogged}h | {topPerformer.completionRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <TechnicianPerformanceChart data={data} />

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Technician Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8">#</TableHead>
                  <TableHead className="text-xs">Technician</TableHead>
                  <TableHead className="text-xs text-right">Done</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Assigned</TableHead>
                  <TableHead className="text-xs text-right">Hours</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Avg</TableHead>
                  <TableHead className="text-xs w-24 sm:w-32">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((tech, index) => (
                  <TableRow key={tech.technicianId}>
                    <TableCell className="text-xs py-2">
                      {index < 3 ? (
                        <Badge variant={index === 0 ? "default" : "secondary"} className="text-xs px-1.5 py-0.5">
                          {index + 1}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">{index + 1}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm font-medium py-2 max-w-[100px] sm:max-w-none truncate">{tech.technicianName}</TableCell>
                    <TableCell className="text-xs sm:text-sm text-right py-2">{tech.tasksCompleted}</TableCell>
                    <TableCell className="text-xs sm:text-sm text-right py-2 hidden sm:table-cell">{tech.tasksAssigned}</TableCell>
                    <TableCell className="text-xs sm:text-sm text-right py-2">{tech.totalHoursLogged}h</TableCell>
                    <TableCell className="text-xs sm:text-sm text-right py-2 hidden sm:table-cell">{tech.avgCompletionTimeHours}h</TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        <Progress value={tech.completionRate} className="h-1.5 sm:h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-8">{tech.completionRate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              All Task Details by Technician
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <ScrollArea className="w-full h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Technician</TableHead>
                    <TableHead className="text-xs">Task</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Property</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Area</TableHead>
                    <TableHead className="text-xs text-right">Hours</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.flatMap(tech => 
                    tech.taskDetails?.map(task => (
                      <TableRow key={task.taskId} data-testid={`row-task-${task.taskId}`}>
                        <TableCell className="text-xs sm:text-sm py-2">{tech.technicianName}</TableCell>
                        <TableCell className="py-2">
                          <Link href={`/tasks/${task.taskId}`}>
                            <span className="text-xs sm:text-sm text-primary hover:underline cursor-pointer font-medium">
                              {task.taskName}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant={task.status === "completed" ? "default" : task.status === "in_progress" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {task.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant={task.urgency === "high" ? "destructive" : task.urgency === "medium" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {task.urgency}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 hidden sm:table-cell">{task.propertyName}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 hidden md:table-cell">{task.areaName}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 text-right">{task.hoursLogged}h</TableCell>
                        <TableCell className="text-xs py-2 hidden lg:table-cell">
                          {task.completionDate ? new Date(task.completionDate).toLocaleDateString() : "N/A"}
                        </TableCell>
                      </TableRow>
                    )) || []
                  )}
                  {data.every(tech => !tech.taskDetails || tech.taskDetails.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No tasks found in the selected date range
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
}
