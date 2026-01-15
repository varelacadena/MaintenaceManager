import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Clock, CheckCircle2, XCircle, TrendingUp, ArrowLeft, ArrowRightCircle, AlertTriangle, Users } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface DetailedServiceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
  requesterId: string;
  requesterName: string;
  propertyId: string | null;
  propertyName: string;
  areaId: string | null;
  areaName: string;
  createdAt: string | null;
  updatedAt: string | null;
  rejectionReason: string | null;
}

interface ServiceRequestOverview {
  totalRequests: number;
  pendingRequests: number;
  underReviewRequests: number;
  convertedRequests: number;
  rejectedRequests: number;
  conversionRate: number;
  avgResponseTimeHours: number;
  byUrgency: { urgency: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byProperty: { propertyId: string; propertyName: string; count: number }[];
  byArea: { areaId: string; areaName: string; count: number }[];
  monthlyTrend: { month: string; submitted: number; converted: number }[];
  topRequesters: { requesterId: string; requesterName: string; count: number }[];
  detailedRequests: DetailedServiceRequest[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(45, 93%, 47%)",
  under_review: "hsl(221, 83%, 53%)",
  converted_to_task: "hsl(142, 76%, 36%)",
  rejected: "hsl(0, 84%, 60%)",
};

const URGENCY_COLORS: Record<string, string> = {
  high: "hsl(0, 84%, 60%)",
  medium: "hsl(45, 93%, 47%)",
  low: "hsl(142, 76%, 36%)",
};

export default function ServiceRequestAnalytics() {
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

  const { data, isLoading } = useQuery<ServiceRequestOverview>({
    queryKey: ["/api/analytics/service-requests", filters],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/service-requests?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch service request analytics");
      return response.json();
    },
  });

  const handleExport = (format: string) => {
    const queryString = buildQueryString();
    if (format === "pdf-detailed" || format === "xlsx-detailed") {
      const actualFormat = format.replace("-detailed", "");
      window.open(`/api/analytics/export?type=service-requests-detailed&format=${actualFormat}&${queryString}`, "_blank");
    } else {
      window.open(`/api/analytics/export?type=service-requests&format=${format}&${queryString}`, "_blank");
    }
  };

  const openDetailDialog = (type: string, title: string) => {
    setDetailDialog({ open: true, type, title });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">Service Request Analytics</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const statusChartData = data?.byStatus.map(s => ({
    name: s.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: s.count,
    color: STATUS_COLORS[s.status] || "hsl(var(--chart-1))",
  })) || [];

  const urgencyChartData = data?.byUrgency.map(u => ({
    name: u.urgency.charAt(0).toUpperCase() + u.urgency.slice(1),
    count: u.count,
    fill: URGENCY_COLORS[u.urgency] || "hsl(var(--chart-1))",
  })) || [];

  const trendData = data?.monthlyTrend.map(t => ({
    month: t.month.substring(5),
    Submitted: t.submitted,
    Converted: t.converted,
  })) || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Link href="/analytics">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Service Request Analytics</h1>
          <p className="text-sm text-muted-foreground">Request submission and conversion metrics</p>
        </div>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        showUrgencyFilter
        exportOptions={["pdf", "xlsx", "pdf-detailed", "xlsx-detailed"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("total", "All Requests Breakdown")}
          data-testid="card-total-requests"
        >
          <KpiCard
            title="Total Requests"
            value={data?.totalRequests || 0}
            icon={FileText}
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("pending", "Pending Requests")}
          data-testid="card-pending"
        >
          <KpiCard
            title="Pending"
            value={data?.pendingRequests || 0}
            icon={Clock}
            variant={data?.pendingRequests && data.pendingRequests > 0 ? "warning" : "default"}
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("converted", "Converted to Tasks")}
          data-testid="card-converted"
        >
          <KpiCard
            title="Converted"
            value={data?.convertedRequests || 0}
            subtitle={`${data?.conversionRate || 0}% rate`}
            icon={CheckCircle2}
            variant="success"
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("rejected", "Rejected Requests")}
          data-testid="card-rejected"
        >
          <KpiCard
            title="Rejected"
            value={data?.rejectedRequests || 0}
            icon={XCircle}
            variant={data?.rejectedRequests && data.rejectedRequests > 0 ? "danger" : "default"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Response Time</p>
                <p className="text-xl font-bold">{data?.avgResponseTimeHours || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-xl font-bold">{data?.conversionRate || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Under Review</p>
                <p className="text-xl font-bold">{data?.underReviewRequests || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unique Requesters</p>
                <p className="text-xl font-bold">{data?.topRequesters?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="chart-status">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Requests by Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="chart-urgency">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Requests by Urgency</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={urgencyChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {urgencyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="chart-trend">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Monthly Request Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Submitted" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="Converted" 
                stroke="hsl(142, 76%, 36%)" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="table-by-property">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Requests by Property</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="w-full max-h-[250px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Property</TableHead>
                    <TableHead className="text-xs text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.byProperty.slice(0, 8).map(p => (
                    <TableRow key={p.propertyId}>
                      <TableCell className="text-sm py-2">
                        <Link href={`/properties/${p.propertyId}`}>
                          <span className="text-primary hover:underline cursor-pointer">{p.propertyName}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-right py-2">{p.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </CardContent>
        </Card>

        <Card data-testid="table-top-requesters">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Top Requesters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="w-full max-h-[250px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Requester</TableHead>
                    <TableHead className="text-xs text-right">Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.topRequesters.slice(0, 8).map((r, index) => (
                    <TableRow key={r.requesterId}>
                      <TableCell className="text-sm py-2">
                        {index < 3 ? (
                          <Badge variant={index === 0 ? "default" : "secondary"} className="text-xs px-1.5 py-0.5">
                            {index + 1}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium py-2">{r.requesterName}</TableCell>
                      <TableCell className="text-sm text-right py-2">{r.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="table-all-requests">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            All Service Requests ({data?.detailedRequests?.length || 0} records)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ScrollArea className="w-full h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Urgency</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Requester</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Property</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Area</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.detailedRequests?.map(request => (
                  <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                    <TableCell className="py-2">
                      <Link href={`/requests/${request.id}`}>
                        <span className="text-sm text-primary hover:underline cursor-pointer font-medium">
                          {request.title}
                        </span>
                      </Link>
                      {request.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {request.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant={
                          request.status === "converted_to_task" ? "default"
                          : request.status === "under_review" ? "secondary"
                          : request.status === "rejected" ? "destructive"
                          : "outline"
                        }
                        className="text-xs"
                      >
                        {request.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant={
                          request.urgency === "high" ? "destructive"
                          : request.urgency === "medium" ? "secondary"
                          : "outline"
                        }
                        className="text-xs"
                      >
                        {request.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm py-2 hidden sm:table-cell">{request.requesterName}</TableCell>
                    <TableCell className="text-sm py-2 hidden md:table-cell">{request.propertyName}</TableCell>
                    <TableCell className="text-sm py-2 hidden lg:table-cell">{request.areaName}</TableCell>
                    <TableCell className="text-xs py-2">
                      {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.detailedRequests || data.detailedRequests.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No service requests found in the selected date range
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog({ ...detailDialog, open })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {detailDialog.type === "total" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{data?.pendingRequests || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-muted-foreground">Under Review</p>
                    <p className="text-2xl font-bold text-blue-600">{data?.underReviewRequests || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-muted-foreground">Converted</p>
                    <p className="text-2xl font-bold text-green-600">{data?.convertedRequests || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-2xl font-bold text-red-600">{data?.rejectedRequests || 0}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-3xl font-bold">{data?.conversionRate || 0}%</p>
                  <Progress value={data?.conversionRate || 0} className="mt-2" />
                </div>
                <Link href="/requests">
                  <Button className="w-full" data-testid="button-view-requests">View All Requests</Button>
                </Link>
              </div>
            )}
            {detailDialog.type === "pending" && (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  There are <span className="font-bold text-foreground">{data?.pendingRequests || 0}</span> requests waiting for initial review.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium">By Urgency:</p>
                  {data?.byUrgency.map(u => (
                    <div key={u.urgency} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                      <Badge 
                        variant={u.urgency === "high" ? "destructive" : u.urgency === "medium" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {u.urgency.charAt(0).toUpperCase() + u.urgency.slice(1)}
                      </Badge>
                      <span className="font-medium">{u.count}</span>
                    </div>
                  ))}
                </div>
                <Link href="/requests?status=pending">
                  <Button className="w-full" data-testid="button-view-pending">View Pending Requests</Button>
                </Link>
              </div>
            )}
            {detailDialog.type === "converted" && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                  <p className="text-sm text-muted-foreground">Successfully Converted</p>
                  <p className="text-3xl font-bold text-green-600">{data?.convertedRequests || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    out of {data?.totalRequests || 0} total requests
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground text-center">Conversion Rate</p>
                  <p className="text-2xl font-bold text-center">{data?.conversionRate || 0}%</p>
                  <Progress value={data?.conversionRate || 0} className="mt-2" />
                </div>
                <Link href="/tasks">
                  <Button className="w-full" data-testid="button-view-tasks">View Work Orders</Button>
                </Link>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
