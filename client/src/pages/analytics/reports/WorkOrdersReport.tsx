import { useState } from "react";
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
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

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
  detailedRecords: DetailedWorkOrder[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  in_progress: "#3b82f6",
  on_hold: "#eab308",
  not_started: "#9ca3af",
};

const URGENCY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#eab308",
  low: "#22c55e",
};

export default function WorkOrdersReport() {
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

  const handleExport = (format: string) => {
    const queryString = buildQueryString();
    window.open(`/api/analytics/export?type=work-orders-complete&format=${format}&${queryString}`, "_blank");
  };

  const statusData = data?.byStatus.map(s => ({
    name: s.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: s.count,
    color: STATUS_COLORS[s.status] || "#9ca3af",
    percentage: data.totalWorkOrders > 0 ? Math.round((s.count / data.totalWorkOrders) * 100) : 0,
  })) || [];

  const urgencyData = data?.byUrgency.map(u => ({
    name: u.urgency.charAt(0).toUpperCase() + u.urgency.slice(1),
    value: u.count,
    color: URGENCY_COLORS[u.urgency] || "#9ca3af",
    percentage: data.totalWorkOrders > 0 ? Math.round((u.count / data.totalWorkOrders) * 100) : 0,
  })) || [];

  const trendData = data?.monthlyTrend.map(m => ({
    month: m.month.split('-')[1],
    Created: m.count,
    Completed: m.completed,
  })) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        showStatusFilter
        showUrgencyFilter
        showTechnicianFilter
        exportOptions={["pdf", "xlsx"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
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
        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Work Order Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-4">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {statusData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-xs">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.value}</span>
                      <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Priority Levels</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-4">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={urgencyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {urgencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {urgencyData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-xs">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.value}</span>
                      <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <CircleDashed className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Not Started</span>
              </div>
              <span className="font-semibold">{data?.notStartedWorkOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">On Hold</span>
              </div>
              <span className="font-semibold">{data?.onHoldWorkOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Avg Resolution</span>
              </div>
              <span className="font-semibold">{data?.avgResolutionTimeHours || 0}h</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="Created" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Completed" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between gap-1">
            <CardTitle className="text-sm font-medium">Work Orders by Building</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Building</TableHead>
                    <TableHead className="text-xs text-right">Count</TableHead>
                    <TableHead className="text-xs text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.byProperty.slice(0, 8).map((item) => (
                    <TableRow key={item.propertyId}>
                      <TableCell className="py-2">
                        <Link href={`/properties/${item.propertyId}`}>
                          <span className="text-sm text-primary hover:underline cursor-pointer">
                            {item.propertyName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-right py-2 font-medium">{item.count}</TableCell>
                      <TableCell className="text-sm text-right py-2 text-muted-foreground">
                        {data.totalWorkOrders > 0 ? Math.round((item.count / data.totalWorkOrders) * 100) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between gap-1">
          <div>
            <CardTitle className="text-sm font-medium">Work Orders Detail</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.detailedRecords?.length || 0} records found
            </p>
          </div>
          <Link href="/tasks">
            <Button variant="outline" size="sm" className="gap-1">
              View All
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Work Order</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Assigned To</TableHead>
                  <TableHead className="text-xs">Building</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Space</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Start Date</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.detailedRecords?.map(record => (
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
                          borderColor: URGENCY_COLORS[record.urgency],
                          color: URGENCY_COLORS[record.urgency],
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
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
