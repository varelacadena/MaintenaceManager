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
  const mediumSeverityAlerts = alerts.filter(a => a.severity === "medium");
  const overdueAlerts = alerts.filter(a => a.type === "overdue");
  const slaBreaches = alerts.filter(a => a.type === "sla_breach");

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="default" className="bg-yellow-600">Medium</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "overdue":
        return <Badge variant="outline" className="border-red-500 text-red-600">Overdue</Badge>;
      case "sla_breach":
        return <Badge variant="outline" className="border-orange-500 text-orange-600">SLA Breach</Badge>;
      case "high_failure":
        return <Badge variant="outline" className="border-purple-500 text-purple-600">High Failure</Badge>;
      case "recurring_issue":
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Recurring Issue</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
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
        return <Clock className="w-4 h-4" />;
      case "equipment":
        return <Settings className="w-4 h-4" />;
      case "property":
        return <Building2 className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const isLoading = alertsLoading || trendsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Alerts & Exceptions</h1>
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
            <h1 className="text-2xl font-bold">Alerts & Exceptions</h1>
            <p className="text-muted-foreground">System alerts, SLA breaches, and trend analysis</p>
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
          title="Overdue Work Orders"
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

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts" data-testid="tab-alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {highSeverityAlerts.length > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  High Severity Alerts ({highSeverityAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Related</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {highSeverityAlerts.map(alert => (
                      <TableRow key={alert.id}>
                        <TableCell>{getTypeBadge(alert.type)}</TableCell>
                        <TableCell className="font-medium">{alert.title}</TableCell>
                        <TableCell className="max-w-xs truncate">{alert.description}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            {getRelatedIcon(alert.relatedType)}
                            {alert.relatedType}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link href={getRelatedLink(alert)}>
                            <Button size="sm" variant="outline">View</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">All Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active alerts</p>
                  <p className="text-sm">All systems are operating normally</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Related</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map(alert => (
                      <TableRow key={alert.id}>
                        <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                        <TableCell>{getTypeBadge(alert.type)}</TableCell>
                        <TableCell className="font-medium">{alert.title}</TableCell>
                        <TableCell className="max-w-xs truncate">{alert.description}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            {getRelatedIcon(alert.relatedType)}
                            {alert.relatedType}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link href={getRelatedLink(alert)}>
                            <Button size="sm" variant="outline">View</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <WeeklyTrendChart data={trends} title="Weekly Work Order Trends (Last 12 Weeks)" />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Trend Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Work Orders (12 weeks)</p>
                  <p className="text-2xl font-bold">{trends.reduce((sum, t) => sum + t.created, 0)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Completed (12 weeks)</p>
                  <p className="text-2xl font-bold">{trends.reduce((sum, t) => sum + t.completed, 0)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">High Priority (12 weeks)</p>
                  <p className="text-2xl font-bold text-red-600">{trends.reduce((sum, t) => sum + t.high, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
