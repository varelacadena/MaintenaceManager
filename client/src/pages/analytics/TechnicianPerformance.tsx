import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, CheckCircle2, Clock, Award, TrendingUp, ArrowLeft, GraduationCap, Wrench } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
import { TechnicianPerformanceChart } from "@/components/analytics/AnalyticsCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type RoleFilter = "all" | "technician" | "student";

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
  memberType: "technician" | "student";
  tasksCompleted: number;
  tasksAssigned: number;
  totalHoursLogged: number;
  avgCompletionTimeHours: number;
  completionRate: number;
  taskDetails: TechnicianTaskDetail[];
}

export default function TechnicianPerformance() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    propertyId: "",
    spaceId: "",
    areaId: "",
    technicianId: "",
    status: "",
    urgency: "",
  });

  const buildQueryString = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    if (roleFilter) params.append("roleType", roleFilter);
    return params.toString();
  };

  const { data = [], isLoading } = useQuery<TechnicianData[]>({
    queryKey: ["/api/analytics/technicians", filters, roleFilter],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/technicians?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const getTitle = () => {
    switch (roleFilter) {
      case "technician": return "Technician Performance";
      case "student": return "Student Performance";
      default: return "Team Performance";
    }
  };

  const getSubtitle = () => {
    switch (roleFilter) {
      case "technician": return "Technician performance metrics";
      case "student": return "Student performance metrics";
      default: return "Combined technician and student performance metrics";
    }
  };

  const getMemberLabel = () => {
    switch (roleFilter) {
      case "technician": return "Technicians";
      case "student": return "Students";
      default: return "Team Members";
    }
  };

  const handleExport = (format: string) => {
    const queryString = buildQueryString();
    window.open(`/api/analytics/export?type=technicians-detailed&format=${format}&${queryString}`, "_blank");
  };

  const totalTasksCompleted = data.reduce((sum, t) => sum + t.tasksCompleted, 0);
  const totalHoursLogged = data.reduce((sum, t) => sum + t.totalHoursLogged, 0);
  const avgCompletionRate = data.length > 0
    ? Math.round(data.reduce((sum, t) => sum + t.completionRate, 0) / data.length)
    : 0;
  const topPerformer = data.length > 0 ? data[0] : null;

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">{getTitle()}</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 sm:h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" data-testid="button-back" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{getTitle()}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{getSubtitle()}</p>
          </div>
        </div>
        <div className="sm:ml-auto">
          <ToggleGroup 
            type="single" 
            value={roleFilter} 
            onValueChange={(value) => value && setRoleFilter(value as RoleFilter)}
            className="justify-start"
            data-testid="toggle-role-filter"
          >
            <ToggleGroupItem value="all" aria-label="Show all" data-testid="toggle-all">
              <Users className="h-4 w-4 mr-1" />
              <span className="text-xs sm:text-sm">All</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="technician" aria-label="Show technicians" data-testid="toggle-technicians">
              <Wrench className="h-4 w-4 mr-1" />
              <span className="text-xs sm:text-sm">Technicians</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="student" aria-label="Show students" data-testid="toggle-students">
              <GraduationCap className="h-4 w-4 mr-1" />
              <span className="text-xs sm:text-sm">Students</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportOptions={["pdf", "xlsx"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KpiCard
          title={getMemberLabel()}
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
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600 flex-shrink-0" />
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

      <TechnicianPerformanceChart data={data} title={`${getTitle()} Chart`} />

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">{getMemberLabel()} Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8">#</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  {roleFilter === "all" && <TableHead className="text-xs hidden sm:table-cell">Type</TableHead>}
                  <TableHead className="text-xs text-right">Done</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Assigned</TableHead>
                  <TableHead className="text-xs text-right">Hours</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Avg</TableHead>
                  <TableHead className="text-xs w-24 sm:w-32">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((tech, index) => (
                  <TableRow key={tech.technicianId} data-testid={`row-member-${tech.technicianId}`}>
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
                    {roleFilter === "all" && (
                      <TableCell className="py-2 hidden sm:table-cell">
                        <Badge variant={tech.memberType === "student" ? "secondary" : "outline"} className="text-xs">
                          {tech.memberType === "student" ? "Student" : "Technician"}
                        </Badge>
                      </TableCell>
                    )}
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
              All Task Details by {roleFilter === "student" ? "Student" : roleFilter === "technician" ? "Technician" : "Team Member"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <ScrollArea className="w-full h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{roleFilter === "student" ? "Student" : roleFilter === "technician" ? "Technician" : "Member"}</TableHead>
                    <TableHead className="text-xs">Task</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Urgency</TableHead>
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
    </div>
  );
}
