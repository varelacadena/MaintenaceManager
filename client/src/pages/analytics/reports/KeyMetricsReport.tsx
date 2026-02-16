import { useQuery } from "@tanstack/react-query";
import { ClipboardList, FileText, AlertTriangle, Car, CheckCircle2, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function KeyMetricsReport() {
  const { data: workOrders, isLoading: woLoading } = useQuery<any>({
    queryKey: ["/api/analytics/work-orders"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/work-orders", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch work orders");
      return res.json();
    },
  });

  const { data: serviceRequests, isLoading: srLoading } = useQuery<any>({
    queryKey: ["/api/analytics/service-requests"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/service-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch service requests");
      return res.json();
    },
  });

  const { data: fleet, isLoading: fleetLoading } = useQuery<any>({
    queryKey: ["/api/analytics/fleet"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/fleet", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch fleet");
      return res.json();
    },
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<any>({
    queryKey: ["/api/analytics/alerts"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/alerts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
  });

  const isLoading = woLoading || srLoading || fleetLoading || alertsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
    );
  }

  const totalTasks = workOrders?.totalWorkOrders ?? 0;
  const completedTasks = workOrders?.completedWorkOrders ?? 0;
  const openTasks = totalTasks - completedTasks;
  const completionRate = workOrders?.completionRate ?? 0;

  const pendingRequests = serviceRequests?.pendingRequests ?? serviceRequests?.pending ?? 0;

  const overdueItems = Array.isArray(alerts)
    ? alerts.filter((a: any) => a.type === "overdue").length
    : (alerts?.overdueWorkOrders ?? alerts?.overdue ?? 0);

  const fleetAvailable = fleet?.availableVehicles ?? fleet?.available ?? 0;

  const completedThisMonth = workOrders?.monthlyTrend?.length
    ? workOrders.monthlyTrend[workOrders.monthlyTrend.length - 1]?.completed ?? 0
    : 0;

  const resolvedThisMonth = serviceRequests?.resolvedThisMonth
    ?? (serviceRequests?.monthlyTrend?.length
      ? (serviceRequests.monthlyTrend[serviceRequests.monthlyTrend.length - 1]?.resolved ?? 0)
      : 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card data-testid="metric-open-tasks">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openTasks}</p>
                <p className="text-xs text-muted-foreground">Open Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="metric-pending-requests">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                <FileText className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests}</p>
                <p className="text-xs text-muted-foreground">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="metric-overdue">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${overdueItems > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"}`}>
                <AlertTriangle className={`w-5 h-5 ${overdueItems > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueItems}</p>
                <p className="text-xs text-muted-foreground">Overdue Items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="metric-fleet-available">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                <Car className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fleetAvailable}</p>
                <p className="text-xs text-muted-foreground">Fleet Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="metric-completion-rate">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Task Completion Rate</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
            </div>
            <Progress value={completionRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completedTasks} of {totalTasks} tasks completed
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-recent-activity">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recent Activity</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xl font-bold">{completedThisMonth}</p>
                <p className="text-xs text-muted-foreground">Tasks Completed This Month</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xl font-bold">{resolvedThisMonth}</p>
                <p className="text-xs text-muted-foreground">Requests Resolved This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
