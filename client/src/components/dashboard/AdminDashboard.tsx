import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Link, useLocation } from "wouter";
import {
  ClipboardList,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  Plus,
  Car,
  BrainCircuit,
  ArrowUpRight,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { format, parseISO, isPast, isToday, startOfDay } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { invalidateDashboard, invalidateTaskLists } from "@/lib/taskQueryInvalidation";
import { getServiceRequestStatusLabel } from "@/lib/serviceRequestLabels";
import { getServiceRequestNumber } from "@shared/recordNumbers";
import type { Task, User as UserType, Property, ServiceRequest, VehicleReservation, AiAgentLog } from "@shared/schema";
import TaskDetailDrawer from "@/components/dashboard/TaskDetailDrawer";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AiStats = {
  pending: number;
  approved: number;
  rejected: number;
  autoApplied: number;
  total: number;
  acceptanceRate: number;
  pendingByAction?: Record<string, number>;
};

interface AdminDashboardProps {
  tasks: Task[];
  users: UserType[];
  properties: Property[];
  requests: ServiceRequest[];
  waitingRequestCount: number;
  vehicleReservations: VehicleReservation[];
  aiStats: AiStats | undefined;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  statusMutationPending: boolean;
}

const statusConfig: Record<string, { label: string }> = {
  not_started: { label: "To Do" },
  needs_estimate: { label: "Needs Estimate" },
  waiting_approval: { label: "Waiting Approval" },
  ready: { label: "Ready" },
  in_progress: { label: "In Progress" },
  completed: { label: "Done" },
  on_hold: { label: "Blocked" },
};

export default function AdminDashboard({
  tasks,
  users,
  properties,
  requests,
  waitingRequestCount,
  vehicleReservations,
  aiStats,
  onStatusChange,
  statusMutationPending,
}: AdminDashboardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [kpiModal, setKpiModal] = useState<{ title: string; tasks: Task[] } | null>(null);
  const [selectedAiLog, setSelectedAiLog] = useState<AiAgentLog | null>(null);

  const { data: pendingAiLogs = [] } = useQuery<AiAgentLog[]>({
    queryKey: ["/api/ai-logs", "pending_review"],
    queryFn: async () => {
      const res = await fetch("/api/ai-logs?status=pending_review&limit=5");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const aiLogMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      await apiRequest("PATCH", `/api/ai-logs/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-stats"] });
      invalidateTaskLists();
      invalidateDashboard();
      toast({ title: "AI recommendation updated" });
      setSelectedAiLog(null);
    },
  });

  const getUserById = (id: string | null) => users.find((u) => u.id === id) || null;
  const getPropertyById = (id: string | null) => properties.find((p) => p.id === id) || null;

  const today = startOfDay(new Date());

  const taskCounts = useMemo(() => {
    const openTasks = tasks.filter(t => t.status !== "completed").length;
    const highPriority = tasks.filter(t => t.urgency === "high" && t.status !== "completed").length;
    const overdue = tasks.filter(t => {
      if (t.status === "completed") return false;
      if (!t.estimatedCompletionDate) return false;
      return isPast(parseISO(t.estimatedCompletionDate as unknown as string));
    }).length;
    const dueToday = tasks.filter(t => {
      if (t.status === "completed") return false;
      if (!t.initialDate) return false;
      const taskDate = startOfDay(parseISO(t.initialDate as unknown as string));
      return taskDate.getTime() === today.getTime();
    }).length;
    const completedToday = tasks.filter(t => {
      if (t.status !== "completed") return false;
      if (!t.actualCompletionDate) return false;
      return isToday(parseISO(t.actualCompletionDate as unknown as string));
    }).length;
    return { openTasks, highPriority, overdue, dueToday, completedToday };
  }, [tasks, today]);

  const kpiCards = [
    { key: "openTasks", title: "Open Tasks", count: taskCounts.openTasks, icon: ClipboardList, cardClass: "border-indigo-200 bg-indigo-50", valueClass: "text-indigo-700", iconClass: "bg-indigo-200 text-indigo-700" },
    { key: "highPriority", title: "High Priority", count: taskCounts.highPriority, icon: AlertTriangle, cardClass: "border-amber-200 bg-amber-50", valueClass: "text-amber-700", iconClass: "bg-amber-200 text-amber-700" },
    { key: "overdue", title: "Overdue", count: taskCounts.overdue, icon: Clock, cardClass: "border-red-200 bg-red-50", valueClass: "text-red-700", iconClass: "bg-red-200 text-red-700" },
    { key: "dueToday", title: "Due Today", count: taskCounts.dueToday, icon: Calendar, cardClass: "border-blue-200 bg-blue-50", valueClass: "text-blue-700", iconClass: "bg-blue-200 text-blue-700" },
    { key: "completedToday", title: "Completed Today", count: taskCounts.completedToday, icon: CheckCircle2, cardClass: "border-emerald-200 bg-emerald-50", valueClass: "text-emerald-700", iconClass: "bg-emerald-200 text-emerald-700" },
  ];

  const getKpiTasks = (key: string): Task[] => {
    switch (key) {
      case "openTasks": return tasks.filter(t => t.status !== "completed");
      case "highPriority": return tasks.filter(t => t.urgency === "high" && t.status !== "completed");
      case "overdue": return tasks.filter(t => {
        if (t.status === "completed" || !t.estimatedCompletionDate) return false;
        return isPast(parseISO(t.estimatedCompletionDate as unknown as string));
      });
      case "dueToday": return tasks.filter(t => {
        if (t.status === "completed" || !t.initialDate) return false;
        return startOfDay(parseISO(t.initialDate as unknown as string)).getTime() === today.getTime();
      });
      case "completedToday": return tasks.filter(t => {
        if (t.status !== "completed" || !t.actualCompletionDate) return false;
        return isToday(parseISO(t.actualCompletionDate as unknown as string));
      });
      default: return [];
    }
  };

  const openRequests = useMemo(() => {
    return requests.filter((request) => request.status === "pending" || request.status === "under_review");
  }, [requests]);

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" data-testid="text-dashboard-title">
            Operations
          </h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <Link href="/tasks/new">
          <Button data-testid="button-new-task">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpiCards.map(kpi => (
          <Card
            key={kpi.key}
            className={cn("cursor-pointer shadow-none hover-elevate", kpi.cardClass)}
            onClick={() => setKpiModal({ title: kpi.title, tasks: getKpiTasks(kpi.key) })}
            data-testid={`kpi-${kpi.key}`}
          >
            <CardContent className="p-4 flex items-center justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">{kpi.title}</p>
                <p className={cn("text-2xl font-bold tabular-nums md:text-3xl", kpi.valueClass)}>
                  {kpi.count}
                </p>
              </div>
              <div className={cn("shrink-0 rounded-full p-2", kpi.iconClass)}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {aiStats && aiStats.pending > 0 && (
          <Card className="shadow-none lg:col-span-3" data-testid="card-ai-insights">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  <BrainCircuit className="w-4 h-4 text-muted-foreground" />
                  AI Insights
                </span>
                <Badge variant="outline" className="text-xs font-normal">
                  {aiStats.pending} pending
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingAiLogs.slice(0, 3).map(log => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-2"
                  data-testid={`ai-suggestion-${log.id}`}
                >
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left"
                    onClick={() => setSelectedAiLog(log)}
                    data-testid={`ai-suggestion-detail-${log.id}`}
                  >
                    <p className="text-sm font-medium truncate capitalize">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.entityType}</p>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => aiLogMutation.mutate({ id: log.id, status: "approved" })}
                      disabled={aiLogMutation.isPending}
                      data-testid={`button-approve-ai-${log.id}`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => aiLogMutation.mutate({ id: log.id, status: "rejected" })}
                      disabled={aiLogMutation.isPending}
                      data-testid={`button-reject-ai-${log.id}`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setLocation("/ai-agent")}
                data-testid="button-review-ai"
              >
                Review recommendations
                <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        <Card
          className="shadow-none lg:col-span-2 cursor-pointer hover-elevate"
          onClick={() => setLocation("/requests")}
          data-testid="card-recent-requests"
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-2 font-medium">
              <span className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                Requests waiting
              </span>
              <Badge variant="outline" className="font-normal" data-testid="badge-pending-requests">
                {waitingRequestCount} waiting
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No requests are waiting for review.</p>
            ) : (
              <div className="divide-y">
                {openRequests.map(req => (
                  <div
                    key={req.id}
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`recent-request-${req.id}`}
                  >
                    <Link href={`/requests/${req.id}`}>
                      <div className="py-3 min-w-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm font-medium truncate">{req.title}</p>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {getServiceRequestNumber(req)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {[
                            req.propertyName || "No building",
                            req.requesterName || "Unknown requester",
                            req.createdAt ? format(new Date(req.createdAt), "MMM d") : null,
                            getServiceRequestStatusLabel(req.status ?? ""),
                          ].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className="shadow-none cursor-pointer hover-elevate"
          onClick={() => setLocation("/vehicles?tab=reservations")}
          data-testid="card-vehicle-activity"
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-medium">
              <Car className="w-4 h-4 text-muted-foreground" />
              Fleet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums" data-testid="text-active-reservations">
              {vehicleReservations.length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Open reservations</p>
            <Button variant="ghost" size="sm" className="mt-3 px-0 text-sm" data-testid="button-manage-reservations">
              Manage reservations
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!kpiModal} onOpenChange={(open) => !open && setKpiModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{kpiModal?.title}</DialogTitle>
            <DialogDescription>
              {kpiModal?.tasks.length} {(kpiModal?.tasks.length || 0) === 1 ? "task" : "tasks"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-1 pr-4">
              {kpiModal?.tasks.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">Nothing in this list.</p>
              )}
              {kpiModal?.tasks.map(task => {
                const assignee = getUserById(task.assignedToId);
                return (
                  <button
                    key={task.id}
                    type="button"
                    className="flex w-full items-center gap-3 p-2 rounded-md hover-elevate text-left"
                    onClick={() => { setKpiModal(null); handleViewDetails(task); }}
                    data-testid={`kpi-modal-task-${task.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {statusConfig[task.status]?.label || task.status}
                        {assignee ? ` · ${assignee.firstName || assignee.username}` : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAiLog} onOpenChange={(open) => !open && setSelectedAiLog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">{selectedAiLog?.action.replace(/_/g, " ")}</DialogTitle>
            <DialogDescription>{selectedAiLog?.entityType}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAiLog?.reasoning && (
              <p className="text-sm" data-testid="text-ai-reasoning">{selectedAiLog.reasoning}</p>
            )}
            {selectedAiLog?.proposedValue != null && (
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40" data-testid="text-ai-proposed">
                {JSON.stringify(selectedAiLog.proposedValue, null, 2)}
              </pre>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => selectedAiLog && aiLogMutation.mutate({ id: selectedAiLog.id, status: "approved" })}
                disabled={aiLogMutation.isPending}
                data-testid="button-approve-ai-detail"
              >
                Approve
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => selectedAiLog && aiLogMutation.mutate({ id: selectedAiLog.id, status: "rejected" })}
                disabled={aiLogMutation.isPending}
                data-testid="button-reject-ai-detail"
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TaskDetailDrawer
        task={selectedTask}
        assignee={selectedTask ? getUserById(selectedTask.assignedToId) : null}
        property={selectedTask ? getPropertyById(selectedTask.propertyId) : null}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTask(null);
        }}
        onStatusChange={onStatusChange}
        isPending={statusMutationPending}
      />
    </div>
  );
}
