import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Clock, CheckCircle2, XCircle, TrendingUp, ArrowRightCircle, AlertTriangle, Users } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import { useAnalyticsFilters } from "../useAnalyticsFilters";
import { useAnalyticsExport } from "../useAnalyticsExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  StatusPieChart,
  RequestFunnelChart,
  UrgencyBarChart,
  ServiceRequestTrendChart,
  CountBarChart,
} from "@/components/analytics/AnalyticsCharts";
import AnalyticsEmptyState from "@/components/analytics/AnalyticsEmptyState";
import AnalyticsReportError from "@/components/analytics/AnalyticsReportError";
import AnalyticsDetailFetchBanner from "@/components/analytics/AnalyticsDetailFetchBanner";
import { hasActiveAnalyticsFilters } from "../analyticsReportUtils";
import { cn } from "@/lib/utils";
import {
  getServiceRequestStatusLabel,
  getServiceRequestUrgencyLabel,
  serviceRequestStatusBadgeColors,
  serviceRequestUrgencyBadgeColors,
} from "@/lib/serviceRequestLabels";

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
  byCategory?: { category: string; count: number }[];
  funnel?: { stage: string; label: string; count: number; avgHoursInStage: number | null }[];
  detailedRequests: DetailedServiceRequest[];
}

export default function ServiceRequestsReport() {
  const { filters, setFilters, buildQueryString, clearFilters } = useAnalyticsFilters();
  const hasActiveFilters = hasActiveAnalyticsFilters(filters);
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; type: string; title: string }>({
    open: false,
    type: "",
    title: "",
  });

  const queryString = buildQueryString();
  const { handleExport, isExporting } = useAnalyticsExport("service-requests-detailed", () => buildQueryString());

  const { data: summary, isLoading: summaryLoading, isError, refetch } = useQuery<ServiceRequestOverview>({
    queryKey: ["/api/analytics/service-requests/summary", filters],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/service-requests/summary?${queryString}`);
      if (!response.ok) throw new Error("Failed to fetch service request analytics");
      return response.json();
    },
  });

  const { data: details, isLoading: detailsLoading, isError: detailsError, refetch: refetchDetails } = useQuery<ServiceRequestOverview>({
    queryKey: ["/api/analytics/service-requests", filters, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/service-requests?${queryString}`);
      if (!response.ok) throw new Error("Failed to fetch service request details");
      return response.json();
    },
  });

  const data = summary ? { ...summary, detailedRequests: details?.detailedRequests ?? [] } : undefined;
  const isLoading = summaryLoading;

  const openDetailDialog = (type: string, title: string) => {
    setDetailDialog({ open: true, type, title });
  };

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => (
    <Badge
      variant="outline"
      className={cn("text-xs border-0", serviceRequestStatusBadgeColors[status] ?? "")}
    >
      {getServiceRequestStatusLabel(status)}
    </Badge>
  );

  const getUrgencyBadge = (urgency: string) => (
    <Badge
      variant="outline"
      className={cn("text-xs border-0", serviceRequestUrgencyBadgeColors[urgency] ?? "")}
    >
      {getServiceRequestUrgencyLabel(urgency)}
    </Badge>
  );

  return (
    <div className="space-y-3 md:space-y-4">
      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportLoading={isExporting}
        showStatusFilter
        statusFilterVariant="request"
        showUrgencyFilter
        exportOptions={["pdf", "xlsx"]}
      />

      {detailsError && (
        <AnalyticsDetailFetchBanner onRetry={() => void refetchDetails()} />
      )}

      {data && data.totalRequests === 0 ? (
        <AnalyticsEmptyState
          title="No service requests match these filters"
          onClearFilters={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="cursor-pointer hover-elevate" onClick={() => openDetailDialog("all", "All Requests")}>
          <KpiCard
            title="Total Requests"
            value={data?.totalRequests || 0}
            subtitle="Click for details"
            icon={FileText}
          />
        </div>
        <div className="cursor-pointer hover-elevate" onClick={() => openDetailDialog("pending", `${getServiceRequestStatusLabel("pending")} Requests`)}>
          <KpiCard
            title={getServiceRequestStatusLabel("pending")}
            value={data?.pendingRequests || 0}
            subtitle="Click for details"
            icon={Clock}
            variant="warning"
          />
        </div>
        <div className="cursor-pointer hover-elevate" onClick={() => openDetailDialog("converted", `${getServiceRequestStatusLabel("converted_to_task")} Requests`)}>
          <KpiCard
            title={getServiceRequestStatusLabel("converted_to_task")}
            value={data?.convertedRequests || 0}
            subtitle="Click for details"
            icon={ArrowRightCircle}
            variant="success"
          />
        </div>
        <div className="cursor-pointer hover-elevate" onClick={() => openDetailDialog("rejected", `${getServiceRequestStatusLabel("rejected")} Requests`)}>
          <KpiCard
            title={getServiceRequestStatusLabel("rejected")}
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

      {data?.funnel && data.funnel.length > 0 && (
        <RequestFunnelChart
          stages={data.funnel.map((s) => ({
            label: getServiceRequestStatusLabel(s.stage),
            count: s.count,
            avgHoursInStage: s.avgHoursInStage,
          }))}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data && (
          <StatusPieChart
            data={data.byStatus}
            title="By status"
            formatStatusLabel={getServiceRequestStatusLabel}
          />
        )}
        {data && (
          <UrgencyBarChart
            data={data.byUrgency}
            title="By urgency"
            formatUrgencyLabel={getServiceRequestUrgencyLabel}
          />
        )}
      </div>

      {data?.monthlyTrend && data.monthlyTrend.length > 0 && (
        <ServiceRequestTrendChart data={data.monthlyTrend} />
      )}

      {data?.byCategory && data.byCategory.length > 0 && (
        <CountBarChart
          title="By category"
          testId="chart-request-category"
          data={data.byCategory.map((c) => ({
            name: c.category,
            value: c.count,
          }))}
        />
      )}

      {data?.byArea && data.byArea.length > 0 && (
        <CountBarChart
          title="Service requests by department"
          testId="chart-requests-by-department"
          data={data.byArea.map((a) => ({
            name: a.areaName,
            value: a.count,
          }))}
        />
      )}

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
                  <TableHead className="text-xs hidden lg:table-cell">Department</TableHead>
                  <TableHead className="text-xs hidden xl:table-cell">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.detailedRequests?.map(req => (
                  <TableRow key={req.id} data-testid={`row-request-${req.id}`}>
                    <TableCell className="py-2">
                      <Link href={`/requests/${req.id}`}>
                        <span className="text-xs sm:text-sm text-primary hover:underline font-medium">
                          {req.title}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="py-2">{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="py-2">{getUrgencyBadge(req.urgency)}</TableCell>
                    <TableCell className="text-xs sm:text-sm py-2 hidden sm:table-cell">{req.requesterName}</TableCell>
                    <TableCell className="text-xs sm:text-sm py-2 hidden md:table-cell">{req.propertyName}</TableCell>
                    <TableCell className="text-xs sm:text-sm py-2 hidden lg:table-cell">{req.areaName || "—"}</TableCell>
                    <TableCell className="text-xs py-2 hidden xl:table-cell">
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
        <DialogContent className="max-w-3xl max-h-[min(80dvh,calc(100dvh-2rem))] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{detailDialog.title}</DialogTitle>
            <DialogDescription>
              {detailDialog.type === "all" && "Complete list of all service requests"}
              {detailDialog.type === "pending" && `Service requests with status: ${getServiceRequestStatusLabel("pending")}`}
              {detailDialog.type === "converted" && `Requests with status: ${getServiceRequestStatusLabel("converted_to_task")}`}
              {detailDialog.type === "rejected" && `Requests with status: ${getServiceRequestStatusLabel("rejected")}`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 w-full">
            <div className="min-w-[480px]">
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
                        <Link href={`/requests/${req.id}`}>
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
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
