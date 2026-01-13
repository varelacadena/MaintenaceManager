import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, TrendingUp, PauseCircle, CircleDashed } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
import {
  StatusPieChart,
  UrgencyBarChart,
  MonthlyTrendChart,
  PropertyBarChart,
} from "@/components/analytics/AnalyticsCharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
  byArea: { areaId: string; areaName: string; count: number }[];
  monthlyTrend: { month: string; count: number; completed: number }[];
  overdueWorkOrders: number;
}

export default function MaintenanceOverview() {
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

  const { data, isLoading } = useQuery<WorkOrderOverview>({
    queryKey: ["/api/analytics/work-orders", filters],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/work-orders?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const handleExport = (type: string) => {
    const queryString = buildQueryString();
    window.open(`/api/analytics/export?type=work-orders&${queryString}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Maintenance Overview</h1>
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
        <div>
          <h1 className="text-2xl font-bold">Maintenance Overview</h1>
          <p className="text-muted-foreground">Work order analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Link href="/analytics/technicians">
            <Badge variant="outline" className="cursor-pointer hover-elevate">Technician Performance</Badge>
          </Link>
          <Link href="/analytics/assets">
            <Badge variant="outline" className="cursor-pointer hover-elevate">Asset Health</Badge>
          </Link>
        </div>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        showStatusFilter
        showUrgencyFilter
        showTechnicianFilter
        exportOptions={["csv"]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Work Orders"
          value={data?.totalWorkOrders || 0}
          icon={ClipboardList}
        />
        <KpiCard
          title="Completed"
          value={data?.completedWorkOrders || 0}
          subtitle={`${data?.completionRate || 0}% completion rate`}
          icon={CheckCircle2}
          variant="success"
        />
        <KpiCard
          title="In Progress"
          value={data?.inProgressWorkOrders || 0}
          icon={Clock}
        />
        <KpiCard
          title="Overdue"
          value={data?.overdueWorkOrders || 0}
          icon={AlertTriangle}
          variant={data?.overdueWorkOrders && data.overdueWorkOrders > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Not Started"
          value={data?.notStartedWorkOrders || 0}
          icon={CircleDashed}
        />
        <KpiCard
          title="On Hold"
          value={data?.onHoldWorkOrders || 0}
          icon={PauseCircle}
          variant={data?.onHoldWorkOrders && data.onHoldWorkOrders > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="Avg Resolution Time"
          value={`${data?.avgResolutionTimeHours || 0}h`}
          subtitle="Average time to complete"
          icon={TrendingUp}
        />
        <KpiCard
          title="Avg Response Time"
          value={`${data?.avgResponseTimeHours || 0}h`}
          subtitle="Average time to start"
          icon={Clock}
        />
      </div>

      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts" data-testid="tab-charts">Charts</TabsTrigger>
          <TabsTrigger value="breakdown" data-testid="tab-breakdown">Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatusPieChart data={data?.byStatus || []} />
            <UrgencyBarChart data={data?.byUrgency || []} />
          </div>

          <MonthlyTrendChart data={data?.monthlyTrend || []} />

          <PropertyBarChart data={data?.byProperty || []} title="Work Orders by Building" />
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">By Property/Building</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-right">Work Orders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.byProperty.slice(0, 10).map(item => (
                      <TableRow key={item.propertyId}>
                        <TableCell>
                          <Link href={`/properties/${item.propertyId}`}>
                            <span className="text-primary hover:underline cursor-pointer">
                              {item.propertyName}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">By Department/Area</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Work Orders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.byArea.slice(0, 10).map(item => (
                      <TableRow key={item.areaId}>
                        <TableCell>{item.areaName}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
