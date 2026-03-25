import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
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
  Wrench,
  BrainCircuit,
  Activity,
  AlertCircle,
  MapPin,
  User,
  ArrowUpRight,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { format, parseISO, isPast, isToday, startOfDay, startOfWeek, endOfWeek } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Task, User as UserType, Property, Project, ServiceRequest, VehicleReservation, AiAgentLog } from "@shared/schema";
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
  projects: Project[];
  requests: ServiceRequest[];
  vehicleReservations: VehicleReservation[];
  aiStats: AiStats | undefined;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  statusMutationPending: boolean;
}

const urgencyColors: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

const statusConfig: Record<string, { label: string; dotColor: string }> = {
  not_started: { label: "To Do", dotColor: "bg-slate-400" },
  needs_estimate: { label: "Needs Estimate", dotColor: "bg-amber-400" },
  waiting_approval: { label: "Waiting Approval", dotColor: "bg-purple-400" },
  ready: { label: "Ready", dotColor: "bg-teal-400" },
  in_progress: { label: "In Progress", dotColor: "bg-blue-500" },
  completed: { label: "Done", dotColor: "bg-emerald-500" },
  on_hold: { label: "Blocked", dotColor: "bg-red-500" },
};

const requestStatusColors: Record<string, string> = {
  pending: "bg-amber-500",
  under_review: "bg-blue-500",
  converted_to_task: "bg-emerald-500",
  rejected: "bg-red-500",
};

function RadialProgress({ completed, total, strokeColor }: { completed: number; total: number; strokeColor: string }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-10 h-10 shrink-0">
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="3" className="stroke-muted" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold tabular-nums">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

function TaskRowPopover({
  task,
  assignee,
  property,
}: {
  task: Task;
  assignee: UserType | null;
  property: Property | null;
}) {
  const isOverdue =
    task.estimatedCompletionDate &&
    isPast(parseISO(task.estimatedCompletionDate as unknown as string)) &&
    task.status !== "completed";

  return (
    <div className="space-y-3 text-sm" data-testid={`popover-task-${task.id}`}>
      <div>
        <p className="font-semibold leading-tight">{task.name}</p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span className="capitalize">{task.urgency} priority</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <div className={cn("w-2 h-2 rounded-full shrink-0", statusConfig[task.status]?.dotColor || "bg-muted")} />
          <span>{statusConfig[task.status]?.label || task.status}</span>
        </div>
        {assignee && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{assignee.firstName} {assignee.lastName}</span>
          </div>
        )}
        {task.estimatedCompletionDate && (
          <div className={cn("flex items-center gap-1.5", isOverdue ? "text-red-500" : "text-muted-foreground")}>
            <Clock className="w-3 h-3 shrink-0" />
            <span>{isOverdue ? "Overdue: " : "Due: "}{format(parseISO(task.estimatedCompletionDate as unknown as string), "MMM d")}</span>
          </div>
        )}
        {property && (
          <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{property.name}{property.address ? ` - ${property.address}` : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard({
  tasks,
  users,
  properties,
  projects,
  requests,
  vehicleReservations,
  aiStats,
  onStatusChange,
  statusMutationPending,
}: AdminDashboardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [boardFilter, setBoardFilter] = useState<"today" | "weekly">("today");
  const [kpiModal, setKpiModal] = useState<{ title: string; tasks: Task[] } | null>(null);
  const [techModal, setTechModal] = useState<{ name: string; tasks: Task[] } | null>(null);
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
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
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
    { key: "openTasks", title: "Open Tasks", count: taskCounts.openTasks, icon: ClipboardList, color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/20" },
    { key: "highPriority", title: "High Priority", count: taskCounts.highPriority, icon: AlertTriangle, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/20" },
    { key: "overdue", title: "Overdue", count: taskCounts.overdue, icon: Clock, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/20" },
    { key: "dueToday", title: "Due Today", count: taskCounts.dueToday, icon: Calendar, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/20" },
    { key: "completedToday", title: "Completed Today", count: taskCounts.completedToday, icon: CheckCircle2, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/20" },
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

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const boardTasks = useMemo(() => {
    let filtered = [...tasks];
    if (boardFilter === "today") {
      filtered = filtered.filter(t => {
        if (!t.initialDate) return false;
        const taskDate = startOfDay(parseISO(t.initialDate as unknown as string));
        return taskDate.getTime() === today.getTime();
      });
    } else {
      filtered = filtered.filter(t => {
        if (!t.initialDate) return true;
        const taskDate = startOfDay(parseISO(t.initialDate as unknown as string));
        return taskDate.getTime() >= weekStart.getTime() && taskDate.getTime() <= weekEnd.getTime();
      });
    }

    const todo = filtered.filter(t => t.status === "not_started" || t.status === "needs_estimate" || t.status === "waiting_approval" || t.status === "ready");
    const inProgress = filtered.filter(t => t.status === "in_progress");
    const completed = filtered.filter(t => t.status === "completed");
    const blocked = filtered.filter(t => t.status === "on_hold");

    return { todo, inProgress, completed, blocked };
  }, [tasks, boardFilter, today, weekStart, weekEnd]);

  const technicianStats = useMemo(() => {
    const techs = users.filter(u => u.role === "technician");
    return techs.map(tech => {
      const techTasks = tasks.filter(t => t.assignedToId === tech.id);
      const completed = techTasks.filter(t => t.status === "completed").length;
      const total = techTasks.length;
      const inProgress = techTasks.filter(t => t.status === "in_progress").length;
      const currentTask = techTasks.find(t => t.status === "in_progress");
      const initials = (tech.firstName?.[0] || "") + (tech.lastName?.[0] || tech.username?.[0] || "");
      return {
        id: tech.id,
        name: `${tech.firstName || ""} ${tech.lastName || ""}`.trim() || tech.username,
        initials: initials.toUpperCase() || "?",
        completed,
        total,
        inProgress,
        currentTask: currentTask?.name || null,
        allTasks: techTasks,
      };
    }).filter(t => t.total > 0).sort((a, b) => {
      const aPct = a.total > 0 ? a.completed / a.total : 0;
      const bPct = b.total > 0 ? b.completed / b.total : 0;
      return bPct - aPct;
    });
  }, [users, tasks]);

  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [requests]);

  const projectStats = useMemo(() => {
    return projects.slice(0, 3).map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      progress: typeof p.progress === "number" ? p.progress : 0,
      budget: Number(p.budgetAmount) || 0,
    }));
  }, [projects]);

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const strokeColors = ["stroke-blue-500", "stroke-emerald-500", "stroke-violet-500", "stroke-amber-500", "stroke-rose-500", "stroke-cyan-500", "stroke-orange-500"];

  const renderTaskRow = (task: Task, variant: "todo" | "inProgress" | "completed" | "blocked") => {
    const assignee = getUserById(task.assignedToId);
    const property = getPropertyById(task.propertyId);
    const firstName = assignee?.firstName || assignee?.username || "Unassigned";

    const rowClasses = cn(
      "flex items-center gap-2 py-1.5 rounded-md cursor-pointer hover-elevate",
      variant === "inProgress" ? "pl-3 pr-2 bg-blue-50/40 dark:bg-blue-900/10" : "px-2",
      variant === "completed" && "opacity-75",
      variant === "blocked" ? "pl-3 pr-2 bg-red-50/40 dark:bg-red-900/10" : ""
    );

    const content = (
      <div className={rowClasses} onClick={() => handleViewDetails(task)} data-testid={`task-row-${task.id}`}>
        {variant === "completed" ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
        ) : variant === "blocked" ? (
          <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
        ) : (
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", urgencyColors[task.urgency] || "bg-muted")} />
        )}
        <p className={cn(
          "text-xs font-medium leading-tight truncate flex-1",
          variant === "completed" && "line-through text-muted-foreground",
          variant === "blocked" && "text-red-700 dark:text-red-400"
        )}>
          {task.name}
        </p>
        <span className="text-[10px] text-muted-foreground shrink-0">{firstName.split(" ")[0]}</span>
      </div>
    );

    return (
      <HoverCard key={task.id} openDelay={300} closeDelay={100}>
        <HoverCardTrigger asChild>
          {content}
        </HoverCardTrigger>
        <HoverCardContent side="right" align="start" className="w-72 p-3" sideOffset={8}>
          <TaskRowPopover task={task} assignee={assignee} property={property} />
        </HoverCardContent>
      </HoverCard>
    );
  };

  const columnConfig = [
    { key: "todo" as const, title: "To Do", tasks: boardTasks.todo, bgClass: "bg-muted/10", titleClass: "text-muted-foreground", badgeClass: "" },
    { key: "inProgress" as const, title: "In Progress", tasks: boardTasks.inProgress, bgClass: "bg-blue-50/30 dark:bg-blue-900/5", titleClass: "text-blue-600 dark:text-blue-400", badgeClass: "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800" },
    { key: "completed" as const, title: "Done", tasks: boardTasks.completed, bgClass: "bg-emerald-50/30 dark:bg-emerald-900/5", titleClass: "text-emerald-600 dark:text-emerald-400", badgeClass: "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800" },
    { key: "blocked" as const, title: "Blocked", tasks: boardTasks.blocked, bgClass: "bg-red-50/30 dark:bg-red-900/5", titleClass: "text-red-600 dark:text-red-400", badgeClass: "text-red-600 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800" },
  ];

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Operations Overview
          </h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/tasks/new">
            <Button data-testid="button-new-task">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {kpiCards.map(kpi => (
          <Card
            key={kpi.key}
            className="shadow-sm cursor-pointer hover-elevate"
            onClick={() => setKpiModal({ title: kpi.title, tasks: getKpiTasks(kpi.key) })}
            data-testid={`kpi-${kpi.key}`}
          >
            <CardContent className="p-4 md:p-5 flex items-center justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{kpi.title}</p>
                <p className={cn("text-2xl md:text-3xl font-bold", kpi.color)}>{kpi.count}</p>
              </div>
              <div className={cn("p-2 rounded-full shrink-0", kpi.bgColor)}>
                <kpi.icon className={cn("w-5 h-5", kpi.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card className="flex flex-col shadow-sm" style={{ minHeight: "380px" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5 text-muted-foreground" />
                Technician Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pr-2">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {technicianStats.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No technicians with tasks</p>
                  ) : (
                    technicianStats.map((tech, idx) => (
                      <div
                        key={tech.id}
                        className="flex items-center gap-3 cursor-pointer hover-elevate rounded-md p-1 -m-1"
                        onClick={() => setTechModal({ name: tech.name, tasks: tech.allTasks })}
                        data-testid={`tech-card-${tech.id}`}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-muted text-xs font-medium">{tech.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{tech.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{tech.completed} / {tech.total} tasks</p>
                        </div>
                        <RadialProgress
                          completed={tech.completed}
                          total={tech.total}
                          strokeColor={strokeColors[idx % strokeColors.length]}
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="flex flex-col shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-muted-foreground" />
                Project Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No projects</p>
              ) : (
                <div className="space-y-5">
                  {projectStats.map(project => (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div className="space-y-1.5 cursor-pointer hover-elevate rounded-md p-2 -m-2" data-testid={`project-card-${project.id}`}>
                        <div className="flex justify-between items-center text-sm gap-2">
                          <span className="font-medium truncate">{project.name}</span>
                          <span className="text-muted-foreground tabular-nums shrink-0">
                            ${(project.budget / 1000).toFixed(1)}k
                          </span>
                        </div>
                        <Progress value={project.progress} className="h-2 bg-muted" />
                        <div className="flex justify-between items-center text-xs text-muted-foreground gap-2">
                          <span className="capitalize">{project.status?.replace("_", " ")}</span>
                          <span>{project.progress}%</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {projects.length > 3 && (
                <Link href="/work">
                  <Button variant="link" size="sm" className="w-full mt-3 text-xs" data-testid="button-view-all-projects">
                    View All Projects
                    <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-6 flex flex-col">
          <Card className="flex-1 flex flex-col border-2 border-primary/5 shadow-md">
            <CardHeader className="pb-2 bg-muted/20 border-b">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-xl" data-testid="text-task-board-title">Task Board</CardTitle>
                <Tabs value={boardFilter} onValueChange={(v) => setBoardFilter(v as "today" | "weekly")}>
                  <TabsList className="h-8">
                    <TabsTrigger value="today" className="text-xs px-3" data-testid="tab-today">
                      Today
                    </TabsTrigger>
                    <TabsTrigger value="weekly" className="text-xs px-3" data-testid="tab-weekly">
                      Weekly
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <div className="hidden md:grid grid-cols-4 min-h-[500px]">
                {columnConfig.map((col, colIdx) => (
                  <div
                    key={col.key}
                    className={cn(
                      "p-2 overflow-y-auto",
                      col.bgClass,
                      colIdx < columnConfig.length - 1 && "border-r"
                    )}
                  >
                    <div className="flex items-center justify-between pb-2 px-1">
                      <h4 className={cn("text-xs font-semibold uppercase tracking-wider", col.titleClass)}>{col.title}</h4>
                      <Badge
                        variant={col.key === "todo" ? "secondary" : "outline"}
                        className={cn(
                          "px-1.5 py-0 min-w-5 h-5 flex items-center justify-center text-xs rounded-full",
                          col.badgeClass
                        )}
                      >
                        {col.tasks.length}
                      </Badge>
                    </div>
                    <div className="space-y-0.5">
                      {col.tasks.map(task => renderTaskRow(task, col.key))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory">
                {columnConfig.map((col, colIdx) => (
                  <div
                    key={col.key}
                    className={cn(
                      "min-w-[280px] w-[80vw] snap-center p-3 flex-shrink-0",
                      col.bgClass,
                      colIdx < columnConfig.length - 1 && "border-r"
                    )}
                  >
                    <div className="flex items-center justify-between pb-2 px-1">
                      <h4 className={cn("text-xs font-semibold uppercase tracking-wider", col.titleClass)}>{col.title}</h4>
                      <Badge
                        variant={col.key === "todo" ? "secondary" : "outline"}
                        className={cn(
                          "px-1.5 py-0 min-w-5 h-5 flex items-center justify-center text-xs rounded-full",
                          col.badgeClass
                        )}
                      >
                        {col.tasks.length}
                      </Badge>
                    </div>
                    <div className="space-y-0.5">
                      {col.tasks.map(task => renderTaskRow(task, col.key))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {aiStats && aiStats.total > 0 && (
            <Card className="shadow-sm" data-testid="card-ai-insights">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-muted-foreground" />
                    AI Insights
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {aiStats.pending} pending
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background rounded-md p-3 text-center border shadow-sm">
                    <p className="text-2xl font-bold text-indigo-600" data-testid="text-ai-pending">{aiStats.pending}</p>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Pending</p>
                  </div>
                  <div className="bg-background rounded-md p-3 text-center border shadow-sm">
                    <p className="text-2xl font-bold text-indigo-600" data-testid="text-ai-auto-applied">{aiStats.autoApplied}</p>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Auto-Applied</p>
                  </div>
                </div>
                {pendingAiLogs.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Suggestions</p>
                    {pendingAiLogs.slice(0, 3).map(log => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate"
                        data-testid={`ai-suggestion-${log.id}`}
                      >
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setSelectedAiLog(log)}
                          data-testid={`ai-suggestion-detail-${log.id}`}
                        >
                          <p className="text-sm font-medium truncate capitalize">{log.action.replace(/_/g, " ")}</p>
                          <p className="text-xs text-muted-foreground truncate">{log.entityType} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-emerald-600"
                            onClick={() => aiLogMutation.mutate({ id: log.id, status: "approved" })}
                            disabled={aiLogMutation.isPending}
                            data-testid={`button-approve-ai-${log.id}`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => aiLogMutation.mutate({ id: log.id, status: "rejected" })}
                            disabled={aiLogMutation.isPending}
                            data-testid={`button-reject-ai-${log.id}`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setLocation("/ai-agent")}
                  data-testid="button-review-ai"
                >
                  View All Recommendations
                  <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          <Card
            className="flex flex-col shadow-sm cursor-pointer hover-elevate"
            onClick={() => setLocation("/requests")}
            data-testid="card-recent-requests"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                <span className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  Recent Requests
                </span>
                <Badge variant="outline" data-testid="badge-pending-requests">
                  {requests.filter(r => r.status === "pending").length} pending
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No requests yet</p>
              ) : (
                <div className="space-y-3">
                  {recentRequests.map(req => (
                    <div
                      key={req.id}
                      className="flex items-start gap-3"
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`recent-request-${req.id}`}
                    >
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", requestStatusColors[req.status] || "bg-muted")} />
                      <Link href={`/requests/${req.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{req.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {req.createdAt ? format(new Date(req.createdAt), "MMM d") : "N/A"}
                            </span>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {req.status?.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            className="flex flex-col shadow-sm cursor-pointer hover-elevate"
            onClick={() => setLocation("/vehicles?tab=reservations")}
            data-testid="card-vehicle-activity"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="w-4 h-4 text-muted-foreground" />
                Fleet Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-2">
                <div className="text-3xl font-bold" data-testid="text-active-reservations">{vehicleReservations.length}</div>
                <p className="text-sm text-muted-foreground mb-2">Active Reservations</p>
                <Button variant="ghost" size="sm" className="text-xs" data-testid="button-manage-reservations">
                  Manage Reservations
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!kpiModal} onOpenChange={(open) => !open && setKpiModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{kpiModal?.title}</DialogTitle>
            <DialogDescription>{kpiModal?.tasks.length} {(kpiModal?.tasks.length || 0) === 1 ? "task" : "tasks"}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-4">
              {kpiModal?.tasks.map(task => {
                const assignee = getUserById(task.assignedToId);
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                    onClick={() => { setKpiModal(null); handleViewDetails(task); }}
                    data-testid={`kpi-modal-task-${task.id}`}
                  >
                    <div className={cn("w-2 h-2 rounded-full shrink-0", urgencyColors[task.urgency] || "bg-muted")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {statusConfig[task.status]?.label || task.status}
                        {assignee ? ` · ${assignee.firstName || assignee.username}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!techModal} onOpenChange={(open) => !open && setTechModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{techModal?.name}</DialogTitle>
            <DialogDescription>{techModal?.tasks.length} assigned {(techModal?.tasks.length || 0) === 1 ? "task" : "tasks"}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-4">
              {techModal?.tasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                  onClick={() => { setTechModal(null); handleViewDetails(task); }}
                  data-testid={`tech-modal-task-${task.id}`}
                >
                  <div className={cn("w-2 h-2 rounded-full shrink-0", urgencyColors[task.urgency] || "bg-muted")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {statusConfig[task.status]?.label || task.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAiLog} onOpenChange={(open) => !open && setSelectedAiLog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">{selectedAiLog?.action.replace(/_/g, " ")}</DialogTitle>
            <DialogDescription>
              {selectedAiLog?.entityType} {selectedAiLog?.entityId ? `#${selectedAiLog.entityId.slice(0, 8)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAiLog?.reasoning && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Reasoning</p>
                <p className="text-sm" data-testid="text-ai-reasoning">{selectedAiLog.reasoning}</p>
              </div>
            )}
            {selectedAiLog?.proposedValue && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Proposed Change</p>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40" data-testid="text-ai-proposed">
                  {JSON.stringify(selectedAiLog.proposedValue, null, 2)}
                </pre>
              </div>
            )}
            {selectedAiLog?.createdAt && (
              <p className="text-xs text-muted-foreground">
                Suggested {format(new Date(selectedAiLog.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 text-emerald-600"
                onClick={() => selectedAiLog && aiLogMutation.mutate({ id: selectedAiLog.id, status: "approved" })}
                disabled={aiLogMutation.isPending}
                data-testid="button-approve-ai-detail"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-red-500"
                onClick={() => selectedAiLog && aiLogMutation.mutate({ id: selectedAiLog.id, status: "rejected" })}
                disabled={aiLogMutation.isPending}
                data-testid="button-reject-ai-detail"
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
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
