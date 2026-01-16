import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Clock, CheckCircle2, XCircle, TrendingUp, ArrowRightCircle, AlertTriangle, Users } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

export default function ServiceRequestsReport() {
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
    window.open(`/api/analytics/export?type=service-requests-detailed&format=${format}&${queryString}`, "_blank");
  };

  const openDetailDialog = (type: string, title: string) => {
    setDetailDialog({ open: true, type, title });
  };

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

  const statusData = data?.byStatus.map(s => ({
    name: s.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: s.count,
    color: STATUS_COLORS[s.status] || "#9ca3af",
  })) || [];

  const urgencyData = data?.byUrgency.map(u => ({
    name: u.urgency.charAt(0).toUpperCase() + u.urgency.slice(1),
    value: u.count,
    color: URGENCY_COLORS[u.urgency] || "#9ca3af",
  })) || [];

  const trendData = data?.monthlyTrend.map(m => ({
    month: m.month.split('-')[1],
    Submitted: m.submitted,
    Converted: m.converted,
  })) || [];

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { className: string }> = {
      pending: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      under_review: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      converted_to_task: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      rejected: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
    };
    const config = statusMap[status] || { className: "" };
    return (
      <Badge variant="secondary" className={`text-[10px] sm:text-xs ${config.className}`}>
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyMap: Record<string, string> = {
      high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return (
      <Badge variant="secondary" className={`text-[10px] sm:text-xs ${urgencyMap[urgency] || ""}`}>
        {urgency}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        showStatusFilter
        showUrgencyFilter
        exportOptions={["pdf", "xlsx"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="cursor-pointer hover-elevate" onClick={() => openDetailDialog("all", "All Requests")}>
          <KpiCard
            title="Total Requests"
            value={data?.totalRequests || 0}
            subtitle="Click for details"
            icon={FileText}
          />
        </div>
        <div className="cursor-pointer hover-elevate" onClick={() => openDetailDialog("pending", "Pending Requests")}>
          <KpiCard
            title="Pending"
            value={data?.pendingRequests || 0}
            subtitle="Click for details"
            icon={Clock}
            variant="warning"
          />
        </div>
        <div className="cursor-pointer hover-elevate" onClick={() => openDetailDialog("converted", "Converted Requests")}>
          <KpiCard
            title="Converted"
            value={data?.convertedRequests || 0}
            subtitle="Click for details"
            icon={ArrowRightCircle}
            variant="success"
          />
        </div>
        <div className="cursor-pointer hover-elevate" onClick={() => openDetailDialog("rejected", "Rejected Requests")}>
          <KpiCard
            title="Rejected"
            value={data?.rejectedRequests || 0}
            subtitle="Click for details"
            icon={XCircle}
            variant={data?.rejectedRequests && data.rejectedRequests > 0 ? "danger" : "default"}
          />
        </div>
        <KpiCard
          title="Conversion Rate"
          value={`${data?.conversionRate || 0}%`}
          icon={TrendingUp}
          variant={data?.conversionRate && data.conversionRate >= 70 ? "success" : "warning"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">By Status</CardTitle>
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
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">By Urgency</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={urgencyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={50} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {urgencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="Submitted" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Converted" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Requests by Property</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <ScrollArea className="h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Property</TableHead>
                    <TableHead className="text-xs text-right">Count</TableHead>
                    <TableHead className="text-xs w-20">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.byProperty.slice(0, 10).map(item => (
                    <TableRow key={item.propertyId}>
                      <TableCell className="py-2">
                        <Link href={`/properties/${item.propertyId}`}>
                          <span className="text-sm text-primary hover:underline">{item.propertyName}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-right py-2">{item.count}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          <Progress 
                            value={data.totalRequests > 0 ? (item.count / data.totalRequests) * 100 : 0} 
                            className="h-1.5 flex-1" 
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Top Requesters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <ScrollArea className="h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Requester</TableHead>
                    <TableHead className="text-xs text-right">Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.topRequesters.slice(0, 10).map((requester, index) => (
                    <TableRow key={requester.requesterId}>
                      <TableCell className="py-2">
                        {index < 3 ? (
                          <Badge variant={index === 0 ? "default" : "secondary"} className="text-xs px-1.5">
                            {index + 1}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm py-2">{requester.requesterName}</TableCell>
                      <TableCell className="text-sm text-right py-2 font-medium">{requester.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">All Service Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <ScrollArea className="w-full h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Urgency</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Requester</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Property</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.detailedRequests?.map(req => (
                  <TableRow key={req.id} data-testid={`row-request-${req.id}`}>
                    <TableCell className="py-2">
                      <Link href={`/service-requests/${req.id}`}>
                        <span className="text-xs sm:text-sm text-primary hover:underline font-medium">
                          {req.title}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="py-2">{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="py-2">{getUrgencyBadge(req.urgency)}</TableCell>
                    <TableCell className="text-xs sm:text-sm py-2 hidden sm:table-cell">{req.requesterName}</TableCell>
                    <TableCell className="text-xs sm:text-sm py-2 hidden md:table-cell">{req.propertyName}</TableCell>
                    <TableCell className="text-xs py-2 hidden lg:table-cell">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={detailDialog.open} onOpenChange={() => setDetailDialog({ open: false, type: "", title: "" })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{detailDialog.title}</DialogTitle>
            <DialogDescription>
              {detailDialog.type === "all" && "Complete list of all service requests"}
              {detailDialog.type === "pending" && "Service requests awaiting review"}
              {detailDialog.type === "converted" && "Requests converted to work orders"}
              {detailDialog.type === "rejected" && "Rejected service requests"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Urgency</TableHead>
                  <TableHead className="text-xs">Requester</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.detailedRequests
                  ?.filter(req => {
                    if (detailDialog.type === "all") return true;
                    if (detailDialog.type === "pending") return req.status === "pending";
                    if (detailDialog.type === "converted") return req.status === "converted_to_task";
                    if (detailDialog.type === "rejected") return req.status === "rejected";
                    return true;
                  })
                  .map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="text-sm">
                        <Link href={`/service-requests/${req.id}`}>
                          <span className="text-primary hover:underline">{req.title}</span>
                        </Link>
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell>{getUrgencyBadge(req.urgency)}</TableCell>
                      <TableCell>{req.requesterName}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
