import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { lazy, Suspense, useState, useMemo } from "react";
import type { ServiceRequest, Task, VehicleReservation, User as UserType, Property } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { invalidateTaskAfterMutation } from "@/lib/taskQueryInvalidation";
import TaskCard from "@/components/dashboard/TaskCard";
import TaskDetailDrawer from "@/components/dashboard/TaskDetailDrawer";
import EmptyState from "@/components/dashboard/EmptyState";
import EmergencyContactBanner from "@/components/EmergencyContactBanner";
import { parseISO, format, isSameDay } from "date-fns";

const AdminDashboard = lazy(() => import("@/components/dashboard/AdminDashboard"));

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  type AiStats = {
    pending: number;
    approved: number;
    rejected: number;
    autoApplied: number;
    total: number;
    acceptanceRate: number;
    pendingByAction?: Record<string, number>;
  };

  type DashboardPayload = {
    tasks?: Task[];
    requests?: ServiceRequest[];
    waitingRequestCount?: number;
    users?: UserType[];
    properties?: Property[];
    vehicleReservations?: VehicleReservation[];
    aiStats?: AiStats;
  };

  const { data: dashboard, isLoading: dashboardLoading } = useQuery<DashboardPayload>({
    queryKey: ["/api/dashboard"],
    refetchOnMount: "always",
    queryFn: async () => {
      const res = await fetch("/api/dashboard", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });

  const tasks = dashboard?.tasks ?? [];
  const requests = dashboard?.requests ?? [];
  const waitingRequestCount = dashboard?.waitingRequestCount ?? requests.filter((request) => request.status === "pending" || request.status === "under_review").length;
  const users = dashboard?.users ?? [];
  const properties = dashboard?.properties ?? [];
  const vehicleReservations = dashboard?.vehicleReservations ?? [];
  const aiStats = dashboard?.aiStats;

  const statusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task["status"] }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, { status });
      return res;
    },
    onSuccess: (_data, variables) => {
      invalidateTaskAfterMutation(variables.taskId, { patch: { status: variables.status } });
      toast({
        title: "Task updated",
        description: "Task status has been changed",
      });
    },
    onError: async (error: any) => {
      let message = "Failed to update task status";
      if (error?.message) {
        message = error.message;
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const getUserById = (id: string | null) => users.find((u) => u.id === id) || null;
  const getPropertyById = (id: string | null) => properties.find((p) => p.id === id) || null;

  // Filter tasks for students - only show tasks assigned to them or student_pool AND only for TODAY
  const studentTodayTasks = useMemo(() => {
    if (user?.role !== "student") return tasks;
    
    const today = new Date();
    
    return tasks.filter((t) => {
      // Only show tasks assigned to this student or to the student pool
      const isAssignedToMe = t.assignedToId === user.id;
      const isStudentPoolTask = t.assignedToId === "student_pool";
      if (!isAssignedToMe && !isStudentPoolTask) return false;
      
      // Only show tasks for today (using isSameDay for better timezone handling)
      if (!t.initialDate) return false;
      return isSameDay(parseISO(t.initialDate as unknown as string), today);
    });
  }, [tasks, user?.role, user?.id]);

  // Use student-filtered tasks for students, all tasks for other roles
  const baseTasks = user?.role === "student" ? studentTodayTasks : tasks;

  const handleStatusChange = (taskId: string, status: Task["status"]) => {
    statusMutation.mutate({ taskId, status });
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const isLoading = dashboardLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const recentRequests = requests
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 3);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "under_review": return "bg-blue-500";
      case "converted_to_task": return "bg-green-500";
      case "rejected": return "bg-red-500";
      default: return "bg-muted";
    }
  };

  if (user?.role === "staff") {
    return (
      <div className="space-y-4 p-4 max-w-lg">
        <h1 className="text-xl font-semibold" data-testid="text-dashboard-title">Campus requests</h1>
        <p className="text-sm text-muted-foreground">
          Service reports and car requests no longer use a staff login.
        </p>
        <div className="flex flex-col gap-2">
          <a href="/report" className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary text-primary-foreground text-base font-medium">Report a problem</a>
          <a href="/request-car" className="inline-flex h-12 w-full items-center justify-center rounded-md border text-base font-medium">Request a car</a>
        </div>
      </div>
    );
  }

  // Student Dashboard - simplified view with just today's task list
  if (user?.role === "student") {
    const studentTasks = baseTasks.filter((t) =>
      showCompleted ? true : t.status !== "completed"
    ).sort((a, b) => {
      const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      if ((urgencyOrder[a.urgency] ?? 2) !== (urgencyOrder[b.urgency] ?? 2)) {
        return (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2);
      }
      if (!a.estimatedCompletionDate) return 1;
      if (!b.estimatedCompletionDate) return -1;
      return new Date(a.estimatedCompletionDate as unknown as string).getTime() -
             new Date(b.estimatedCompletionDate as unknown as string).getTime();
    });

    const activeCount = baseTasks.filter((t) => t.status !== "completed").length;

    return (
      <div className="space-y-4 pb-6">
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">
            Welcome, {user?.firstName || "Student"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground" data-testid="text-active-task-count">
            {activeCount} {activeCount === 1 ? "task" : "tasks"} for today
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-xs"
            data-testid="toggle-completed"
          >
            {showCompleted ? (
              <><EyeOff className="w-3 h-3 mr-1" /> Hide Completed</>
            ) : (
              <><Eye className="w-3 h-3 mr-1" /> Show Completed</>
            )}
          </Button>
        </div>

        {studentTasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={CheckCircle2}
                title="No tasks for today"
                description="You don't have any tasks assigned for today"
                testId="empty-student-tasks"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {studentTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={getUserById(task.assignedToId)}
                property={getPropertyById(task.propertyId)}
                onStatusChange={handleStatusChange}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}

        <TaskDetailDrawer
          task={selectedTask}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          assignee={selectedTask ? getUserById(selectedTask.assignedToId) : null}
          property={selectedTask ? getPropertyById(selectedTask.propertyId) : null}
          onStatusChange={handleStatusChange}
        />
      </div>
    );
  }

  // Technician Dashboard - simplified view with just task list
  if (user?.role === "technician") {
    const techTasks = baseTasks.filter((t) =>
      showCompleted ? true : t.status !== "completed"
    ).sort((a, b) => {
      const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      if ((urgencyOrder[a.urgency] ?? 2) !== (urgencyOrder[b.urgency] ?? 2)) {
        return (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2);
      }
      if (!a.estimatedCompletionDate) return 1;
      if (!b.estimatedCompletionDate) return -1;
      return new Date(a.estimatedCompletionDate as unknown as string).getTime() -
             new Date(b.estimatedCompletionDate as unknown as string).getTime();
    });

    const activeCount = baseTasks.filter((t) => t.status !== "completed").length;

    return (
      <div className="space-y-4 pb-6">
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">
            Welcome, {user?.firstName || "Technician"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground" data-testid="text-active-task-count">
            {activeCount} active {activeCount === 1 ? "task" : "tasks"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-xs"
            data-testid="toggle-completed"
          >
            {showCompleted ? (
              <><EyeOff className="w-3 h-3 mr-1" /> Hide Completed</>
            ) : (
              <><Eye className="w-3 h-3 mr-1" /> Show Completed</>
            )}
          </Button>
        </div>

        {techTasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={CheckCircle2}
                title="No tasks assigned"
                description="You don't have any tasks at the moment"
                testId="empty-technician-tasks"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {techTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={getUserById(task.assignedToId)}
                property={getPropertyById(task.propertyId)}
                onStatusChange={handleStatusChange}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}

        <TaskDetailDrawer
          task={selectedTask}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          assignee={selectedTask ? getUserById(selectedTask.assignedToId) : null}
          property={selectedTask ? getPropertyById(selectedTask.propertyId) : null}
          onStatusChange={handleStatusChange}
        />
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    }>
      <AdminDashboard
        tasks={baseTasks}
        users={users}
        properties={properties}
        requests={requests}
        waitingRequestCount={waitingRequestCount}
        vehicleReservations={vehicleReservations}
        aiStats={aiStats}
        onStatusChange={handleStatusChange}
        statusMutationPending={statusMutation.isPending}
      />
    </Suspense>
  );
}
