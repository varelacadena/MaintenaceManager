import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, Clock, Settings, Building2, Bell, Shield, TrendingUp } from "lucide-react";
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
import { WeeklyTrendChart } from "@/components/analytics/AnalyticsCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Alert {
  id: string;
  type: "overdue" | "sla_breach" | "high_failure" | "recurring_issue";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  relatedId: string;
  relatedType: "task" | "equipment" | "property";
  createdAt: string;
}

interface TrendData {
  week: string;
  created: number;
  completed: number;
  high: number;
}

export default function AlertsReport() {
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    propertyId: "",
    areaId: "",
    technicianId: "",
    status: "",
    urgency: "",
    spaceId: "",
  });

  const buildQueryString = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString();
  };

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<Alert[]>({
    queryKey: ["/api/analytics/alerts", filters],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/alerts?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch alerts");
      return response.json();
    },
  });

  const { data: trends = [], isLoading: trendsLoading } = useQuery<TrendData[]>({
    queryKey: ["/api/analytics/trends", filters],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/trends?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch trends");
      return response.json();
    },
  });

  const handleExport = (format: string) => {
    const queryString = buildQueryString();
    window.open(`/api/analytics/export?type=alerts&format=${format}&${queryString}`, "_blank");
  };

  const highSeverityAlerts = alerts.filter(a => a.severity === "high");
  const overdueAlerts = alerts.filter(a => a.type === "overdue");
  const slaBreaches = alerts.filter(a => a.type === "sla_breach");

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive" className="text-[10px] sm:text-xs">High</Badge>;
      case "medium":
        return <Badge variant="default" className="bg-yellow-600 text-[10px] sm:text-xs">Medium</Badge>;
      case "low":
        return <Badge variant="secondary" className="text-[10px] sm:text-xs">Low</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] sm:text-xs">{severity}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "overdue":
        return <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400 text-[10px] sm:text-xs">Overdue</Badge>;
      case "sla_breach":
        return <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-400 text-[10px] sm:text-xs">SLA</Badge>;
      case "high_failure":
        return <Badge variant="outline" className="border-purple-500 text-purple-600 dark:text-purple-400 text-[10px] sm:text-xs">Failure</Badge>;
      case "recurring_issue":
        return <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400 text-[10px] sm:text-xs">Recurring</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] sm:text-xs">{type}</Badge>;
    }
  };

  const getRelatedLink = (alert: Alert) => {
    switch (alert.relatedType) {
      case "task":
        return `/tasks/${alert.relatedId}`;
      case "equipment":
        return `/equipment/${alert.relatedId}/work-history`;
      case "property":
        return `/properties/${alert.relatedId}`;
      default:
        return "#";
    }
  };

  const getRelatedIcon = (type: string) => {
    switch (type) {
      case "task":
        return <Clock className="w-3 h-3" />;
      case "equipment":
        return <Settings className="w-3 h-3" />;
      case "property":
        return <Building2 className="w-3 h-3" />;
      default:
        return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const isLoading = alertsLoading || trendsLoading;

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
      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportOptions={["pdf", "xlsx"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card data-testid="card-total-alerts">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alerts.length}</p>
                <p className="text-xs text-muted-foreground">Total Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-high-severity">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${highSeverityAlerts.length > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"}`}>
                <AlertTriangle className={`w-5 h-5 ${highSeverityAlerts.length > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{highSeverityAlerts.length}</p>
                <p className="text-xs text-muted-foreground">High Severity</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-overdue">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${overdueAlerts.length > 0 ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-muted"}`}>
                <Clock className={`w-5 h-5 ${overdueAlerts.length > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueAlerts.length}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-sla-breaches">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${slaBreaches.length > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"}`}>
                <Shield className={`w-5 h-5 ${slaBreaches.length > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{slaBreaches.length}</p>
                <p className="text-xs text-muted-foreground">SLA Breaches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" data-testid="card-trend-summary">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              Weekly Trend Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
              <div className="p-2 sm:p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-[10px] sm:text-sm text-muted-foreground">Total Created</p>
                <p className="text-lg sm:text-2xl font-bold">{trends.reduce((sum, t) => sum + t.created, 0)}</p>
              </div>
              <div className="p-2 sm:p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-[10px] sm:text-sm text-muted-foreground">Completed</p>
                <p className="text-lg sm:text-2xl font-bold">{trends.reduce((sum, t) => sum + t.completed, 0)}</p>
              </div>
              <div className="p-2 sm:p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-[10px] sm:text-sm text-muted-foreground">High Priority</p>
                <p className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{trends.reduce((sum, t) => sum + t.high, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {highSeverityAlerts.length > 0 && (
          <Card className="border-red-200 dark:border-red-800" data-testid="card-high-severity-list">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                Critical ({highSeverityAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {highSeverityAlerts.slice(0, 5).map(alert => (
                    <div key={alert.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{alert.title}</p>
                        <p className="text-[10px] text-muted-foreground">{getTypeBadge(alert.type)}</p>
                      </div>
                      <Link href={getRelatedLink(alert)}>
                        <Button size="sm" variant="ghost" className="text-xs h-6 px-2">View</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      <WeeklyTrendChart data={trends} title="12-Week Work Order Trends" />

      <Card data-testid="card-all-alerts">
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">All Alerts ({alerts.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {alerts.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm">No active alerts</p>
              <p className="text-xs">All systems operating normally</p>
            </div>
          ) : (
            <ScrollArea className="w-full h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Severity</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Description</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Related</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map(alert => (
                    <TableRow key={alert.id} data-testid={`row-alert-${alert.id}`}>
                      <TableCell className="py-2">{getSeverityBadge(alert.severity)}</TableCell>
                      <TableCell className="py-2">{getTypeBadge(alert.type)}</TableCell>
                      <TableCell className="text-xs sm:text-sm font-medium py-2 max-w-[80px] sm:max-w-[150px] truncate">{alert.title}</TableCell>
                      <TableCell className="text-xs py-2 max-w-[150px] truncate hidden sm:table-cell">{alert.description}</TableCell>
                      <TableCell className="py-2 hidden md:table-cell">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {getRelatedIcon(alert.relatedType)}
                          {alert.relatedType}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <Link href={getRelatedLink(alert)}>
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
