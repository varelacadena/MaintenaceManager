import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, CheckCircle2, Clock, Award, TrendingUp, ArrowLeft } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
import { TechnicianPerformanceChart } from "@/components/analytics/AnalyticsCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface TechnicianData {
  technicianId: string;
  technicianName: string;
  tasksCompleted: number;
  tasksAssigned: number;
  totalHoursLogged: number;
  avgCompletionTimeHours: number;
  completionRate: number;
}

export default function TechnicianPerformance() {
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    propertyId: "",
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
    return params.toString();
  };

  const { data = [], isLoading } = useQuery<TechnicianData[]>({
    queryKey: ["/api/analytics/technicians", filters],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/technicians?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const handleExport = () => {
    const queryString = buildQueryString();
    window.open(`/api/analytics/export?type=technicians&${queryString}`, "_blank");
  };

  const totalTasksCompleted = data.reduce((sum, t) => sum + t.tasksCompleted, 0);
  const totalHoursLogged = data.reduce((sum, t) => sum + t.totalHoursLogged, 0);
  const avgCompletionRate = data.length > 0
    ? Math.round(data.reduce((sum, t) => sum + t.completionRate, 0) / data.length)
    : 0;
  const topPerformer = data.length > 0 ? data[0] : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Technician Performance</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/analytics">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Technician Performance</h1>
            <p className="text-muted-foreground">Individual and team performance metrics</p>
          </div>
        </div>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportOptions={["csv"]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Technicians"
          value={data.length}
          icon={Users}
        />
        <KpiCard
          title="Tasks Completed"
          value={totalTasksCompleted}
          icon={CheckCircle2}
          variant="success"
        />
        <KpiCard
          title="Total Hours Logged"
          value={`${totalHoursLogged}h`}
          icon={Clock}
        />
        <KpiCard
          title="Avg Completion Rate"
          value={`${avgCompletionRate}%`}
          icon={TrendingUp}
          variant={avgCompletionRate >= 80 ? "success" : avgCompletionRate >= 50 ? "warning" : "danger"}
        />
      </div>

      {topPerformer && (
        <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Award className="w-10 h-10 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Top Performer</p>
                <p className="text-xl font-bold">{topPerformer.technicianName}</p>
                <p className="text-sm text-muted-foreground">
                  {topPerformer.tasksCompleted} tasks completed | {topPerformer.totalHoursLogged}h logged | {topPerformer.completionRate}% completion rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <TechnicianPerformanceChart data={data} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Technician Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Avg Time</TableHead>
                <TableHead className="w-40">Completion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((tech, index) => (
                <TableRow key={tech.technicianId}>
                  <TableCell>
                    {index < 3 ? (
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        {index + 1}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">{index + 1}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{tech.technicianName}</TableCell>
                  <TableCell className="text-right">{tech.tasksCompleted}</TableCell>
                  <TableCell className="text-right">{tech.tasksAssigned}</TableCell>
                  <TableCell className="text-right">{tech.totalHoursLogged}h</TableCell>
                  <TableCell className="text-right">{tech.avgCompletionTimeHours}h</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={tech.completionRate} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground w-10">{tech.completionRate}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
