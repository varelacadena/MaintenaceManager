import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, Clock, Settings, Building2, ArrowLeft, Bell, Shield, TrendingUp } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
import { WeeklyTrendChart } from "@/components/analytics/AnalyticsCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function AlertsExceptions() {
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

  const handleExport = () => {
    const queryString = buildQueryString();
    window.open(`/api/analytics/export?type=alerts&${queryString}`, "_blank");
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
        return <Badge variant="outline" className="border-red-500 text-red-600 text-[10px] sm:text-xs">Overdue</Badge>;
      case "sla_breach":
        return <Badge variant="outline" className="border-orange-500 text-orange-600 text-[10px] sm:text-xs">SLA</Badge>;
      case "high_failure":
        return <Badge variant="outline" className="border-purple-500 text-purple-600 text-[10px] sm:text-xs">Failure</Badge>;
      case "recurring_issue":
        return <Badge variant="outline" className="border-blue-500 text-blue-600 text-[10px] sm:text-xs">Recurring</Badge>;
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
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">Alerts & Exceptions</h1>
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
      <div className="flex items-center gap-2 sm:gap-4">
        <Link href="/analytics">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Alerts & Exceptions</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">System alerts and trend analysis</p>
        </div>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportOptions={["csv"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KpiCard
          title="Total Alerts"
          value={alerts.length}
          icon={Bell}
        />
        <KpiCard
          title="High Severity"
          value={highSeverityAlerts.length}
          icon={AlertTriangle}
          variant={highSeverityAlerts.length > 0 ? "danger" : "default"}
        />
        <KpiCard
          title="Overdue"
          value={overdueAlerts.length}
          icon={Clock}
          variant={overdueAlerts.length > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="SLA Breaches"
          value={slaBreaches.length}
          icon={Shield}
          variant={slaBreaches.length > 0 ? "danger" : "default"}
        />
      </div>

      <Tabs defaultValue="alerts" className="space-y-3 sm:space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="alerts" data-testid="tab-alerts" className="flex-1 sm:flex-none text-xs sm:text-sm">Alerts</TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends" className="flex-1 sm:flex-none text-xs sm:text-sm">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-3 sm:space-y-4">
          {highSeverityAlerts.length > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                  High Severity ({highSeverityAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Title</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Description</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {highSeverityAlerts.slice(0, 5).map(alert => (
                        <TableRow key={alert.id}>
                          <TableCell className="py-2">{getTypeBadge(alert.type)}</TableCell>
                          <TableCell className="text-xs sm:text-sm font-medium py-2 max-w-[100px] sm:max-w-[150px] truncate">{alert.title}</TableCell>
                          <TableCell className="text-xs py-2 max-w-[150px] truncate hidden sm:table-cell">{alert.description}</TableCell>
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
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">All Alerts</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              {alerts.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm">No active alerts</p>
                  <p className="text-xs">All systems operating normally</p>
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Severity</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Title</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Related</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map(alert => (
                        <TableRow key={alert.id}>
                          <TableCell className="py-2">{getSeverityBadge(alert.severity)}</TableCell>
                          <TableCell className="py-2">{getTypeBadge(alert.type)}</TableCell>
                          <TableCell className="text-xs sm:text-sm font-medium py-2 max-w-[80px] sm:max-w-[150px] truncate">{alert.title}</TableCell>
                          <TableCell className="py-2 hidden sm:table-cell">
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
        </TabsContent>

        <TabsContent value="trends" className="space-y-3 sm:space-y-4">
          <WeeklyTrendChart data={trends} title="Weekly Trends (12 Weeks)" />

          <Card>
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                Trend Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-2 sm:p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Total WOs</p>
                  <p className="text-lg sm:text-2xl font-bold">{trends.reduce((sum, t) => sum + t.created, 0)}</p>
                </div>
                <div className="p-2 sm:p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Completed</p>
                  <p className="text-lg sm:text-2xl font-bold">{trends.reduce((sum, t) => sum + t.completed, 0)}</p>
                </div>
                <div className="p-2 sm:p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">High Priority</p>
                  <p className="text-lg sm:text-2xl font-bold text-red-600">{trends.reduce((sum, t) => sum + t.high, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
