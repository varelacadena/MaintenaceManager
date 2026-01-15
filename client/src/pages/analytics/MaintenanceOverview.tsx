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
  Car,
  FileText,
  Users,
  Building2,
  Settings,
  Bell,
  ChevronRight,
  BarChart3
} from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
import {
  StatusPieChart,
  UrgencyBarChart,
  MonthlyTrendChart,
  PropertyBarChart,
} from "@/components/analytics/AnalyticsCharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  byArea: { areaId: string; areaName: string; count: number }[];
  monthlyTrend: { month: string; count: number; completed: number }[];
  overdueWorkOrders: number;
  detailedRecords: DetailedWorkOrder[];
}

const reportCategories = [
  {
    id: "work-orders",
    title: "Work Orders",
    description: "Task status, completion rates, and trends",
    icon: ClipboardList,
    href: "/analytics",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
    active: true,
  },
  {
    id: "technicians",
    title: "Technician Performance",
    description: "Productivity and task completion metrics",
    icon: Users,
    href: "/analytics/technicians",
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
  },
  {
    id: "assets",
    title: "Asset Health",
    description: "Equipment maintenance and reliability",
    icon: Settings,
    href: "/analytics/assets",
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600",
  },
  {
    id: "facilities",
    title: "Facility Insights",
    description: "Property-level work order analytics",
    icon: Building2,
    href: "/analytics/facilities",
    color: "bg-green-100 dark:bg-green-900/30 text-green-600",
  },
  {
    id: "fleet",
    title: "Fleet Management",
    description: "Vehicle utilization and reservations",
    icon: Car,
    href: "/analytics/fleet",
    color: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600",
  },
  {
    id: "requests",
    title: "Service Requests",
    description: "Request metrics and conversion rates",
    icon: FileText,
    href: "/analytics/requests",
    color: "bg-pink-100 dark:bg-pink-900/30 text-pink-600",
  },
  {
    id: "alerts",
    title: "Alerts & Exceptions",
    description: "Overdue tasks and SLA breaches",
    icon: Bell,
    href: "/analytics/alerts",
    color: "bg-red-100 dark:bg-red-900/30 text-red-600",
  },
];

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
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; type: string; title: string }>({
    open: false,
    type: "",
    title: "",
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
    window.open(`/api/analytics/export?type=work-orders-detailed&format=${format}&${queryString}`, "_blank");
  };

  const openDetailDialog = (type: string, title: string) => {
    setDetailDialog({ open: true, type, title });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Reports & Analytics</h1>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground">Comprehensive reporting dashboard</p>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-none bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Available Reports</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {reportCategories.map((category) => (
              <Link key={category.id} href={category.href}>
                <Card 
                  className={`h-full cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${category.active ? 'ring-2 ring-primary' : ''}`}
                  data-testid={`report-${category.id}`}
                >
                  <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-2">
                    <div className={`p-2 rounded-lg ${category.color}`}>
                      <category.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium line-clamp-1">{category.title}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 hidden sm:block">{category.description}</p>
                    </div>
                    {category.active && (
                      <Badge variant="secondary" className="text-[10px]">Active</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        showStatusFilter
        showUrgencyFilter
        showTechnicianFilter
        exportOptions={["pdf", "xlsx"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("total", "Work Order Summary")}
          data-testid="card-total-work-orders"
        >
          <KpiCard
            title="Total Work Orders"
            value={data?.totalWorkOrders || 0}
            icon={ClipboardList}
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("completed", "Completed Work Orders")}
          data-testid="card-completed"
        >
          <KpiCard
            title="Completed"
            value={data?.completedWorkOrders || 0}
            subtitle={`${data?.completionRate || 0}% completion rate`}
            icon={CheckCircle2}
            variant="success"
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("progress", "In Progress Work Orders")}
          data-testid="card-in-progress"
        >
          <KpiCard
            title="In Progress"
            value={data?.inProgressWorkOrders || 0}
            icon={Clock}
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("overdue", "Overdue Work Orders")}
          data-testid="card-overdue"
        >
          <KpiCard
            title="Overdue"
            value={data?.overdueWorkOrders || 0}
            icon={AlertTriangle}
            variant={data?.overdueWorkOrders && data.overdueWorkOrders > 0 ? "danger" : "default"}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <CircleDashed className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Not Started</p>
              <p className="text-lg font-bold">{data?.notStartedWorkOrders || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <PauseCircle className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">On Hold</p>
              <p className="text-lg font-bold">{data?.onHoldWorkOrders || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Resolution</p>
              <p className="text-lg font-bold">{data?.avgResolutionTimeHours || 0}h</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Clock className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Response</p>
              <p className="text-lg font-bold">{data?.avgResponseTimeHours || 0}h</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="charts" data-testid="tab-charts" className="flex-1 sm:flex-none">
            Charts
          </TabsTrigger>
          <TabsTrigger value="breakdown" data-testid="tab-breakdown" className="flex-1 sm:flex-none">
            Detailed Breakdown
          </TabsTrigger>
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
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  By Property/Building
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Property</TableHead>
                        <TableHead className="text-xs text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.byProperty.slice(0, 10).map(item => (
                        <TableRow key={item.propertyId}>
                          <TableCell className="py-2">
                            <Link href={`/properties/${item.propertyId}`}>
                              <span className="text-sm text-primary hover:underline cursor-pointer">
                                {item.propertyName}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm text-right py-2">{item.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  By Department/Area
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Department</TableHead>
                        <TableHead className="text-xs text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.byArea.slice(0, 10).map(item => (
                        <TableRow key={item.areaId}>
                          <TableCell className="text-sm py-2">{item.areaName}</TableCell>
                          <TableCell className="text-sm text-right py-2">{item.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                All Work Orders ({data?.detailedRecords?.length || 0} records)
              </CardTitle>
              <CardDescription className="text-xs">
                Complete list of work orders within the selected date range
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Urgency</TableHead>
                      <TableHead className="text-xs">Assigned To</TableHead>
                      <TableHead className="text-xs">Property</TableHead>
                      <TableHead className="text-xs">Area</TableHead>
                      <TableHead className="text-xs">Start Date</TableHead>
                      <TableHead className="text-xs">Due Date</TableHead>
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
                          >
                            {record.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant={
                              record.urgency === "high"
                                ? "destructive"
                                : record.urgency === "medium"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {record.urgency}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm py-2">{record.assignedToName}</TableCell>
                        <TableCell className="text-sm py-2">{record.propertyName}</TableCell>
                        <TableCell className="text-sm py-2">{record.areaName}</TableCell>
                        <TableCell className="text-sm py-2">
                          {record.initialDate
                            ? new Date(record.initialDate).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm py-2">
                          {record.estimatedCompletionDate
                            ? new Date(record.estimatedCompletionDate).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data?.detailedRecords || data.detailedRecords.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No work orders found in the selected date range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog({ ...detailDialog, open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {detailDialog.type === "total" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-xl font-bold text-green-600">{data?.completedWorkOrders || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-muted-foreground">In Progress</p>
                    <p className="text-xl font-bold text-blue-600">{data?.inProgressWorkOrders || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-muted-foreground">On Hold</p>
                    <p className="text-xl font-bold text-yellow-600">{data?.onHoldWorkOrders || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-muted-foreground">Not Started</p>
                    <p className="text-xl font-bold">{data?.notStartedWorkOrders || 0}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-3xl font-bold">{data?.completionRate || 0}%</p>
                </div>
                <Link href="/tasks">
                  <Button className="w-full" data-testid="button-view-all-tasks">
                    View All Work Orders
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </>
            )}
            {detailDialog.type === "completed" && (
              <>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                  <p className="text-sm text-muted-foreground">Successfully Completed</p>
                  <p className="text-4xl font-bold text-green-600">{data?.completedWorkOrders || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {data?.completionRate || 0}% of all work orders
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Average Resolution Time</p>
                  <p className="text-lg font-bold">{data?.avgResolutionTimeHours || 0} hours</p>
                </div>
                <Link href="/tasks?status=completed">
                  <Button className="w-full" variant="outline" data-testid="button-view-completed">
                    View Completed Work Orders
                  </Button>
                </Link>
              </>
            )}
            {detailDialog.type === "progress" && (
              <>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center">
                  <p className="text-sm text-muted-foreground">Currently In Progress</p>
                  <p className="text-4xl font-bold text-blue-600">{data?.inProgressWorkOrders || 0}</p>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  These work orders are actively being worked on by technicians.
                </p>
                <Link href="/tasks?status=in_progress">
                  <Button className="w-full" data-testid="button-view-in-progress">
                    View In Progress Work Orders
                  </Button>
                </Link>
              </>
            )}
            {detailDialog.type === "overdue" && (
              <>
                <div className={`p-4 rounded-lg text-center ${data?.overdueWorkOrders ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}>
                  <p className="text-sm text-muted-foreground">Overdue Work Orders</p>
                  <p className={`text-4xl font-bold ${data?.overdueWorkOrders ? 'text-red-600' : 'text-green-600'}`}>
                    {data?.overdueWorkOrders || 0}
                  </p>
                </div>
                {data?.overdueWorkOrders && data.overdueWorkOrders > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      These work orders have passed their estimated completion date and require immediate attention.
                    </p>
                    <Link href="/analytics/alerts">
                      <Button className="w-full" variant="destructive" data-testid="button-view-overdue">
                        View Alerts & Overdue Items
                      </Button>
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-center text-green-600">
                    All work orders are on schedule. Great job!
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
