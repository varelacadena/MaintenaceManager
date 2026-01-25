import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Calendar, User as UserIcon, MapPin, Repeat, Play, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { Task, Area, User, Property } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";

const urgencyColors = {
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  high: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

const statusConfig = [
  { key: "not_started", label: "Not Started", color: statusColors.not_started },
  { key: "in_progress", label: "In Progress", color: statusColors.in_progress },
  { key: "on_hold", label: "On Hold", color: statusColors.on_hold },
  { key: "completed", label: "Completed", color: statusColors.completed },
];

type StatusType = "not_started" | "in_progress" | "on_hold" | "completed";

function DraggableTaskCard({ task, children }: { task: Task; children: React.ReactNode }) {
  const isCompleted = task.status === "completed";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: isCompleted,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={isDragging ? "opacity-50" : ""}
      style={{ position: 'relative' }}
    >
      {!isCompleted && (
        <div
          {...listeners}
          className="absolute inset-0 cursor-move"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.preventDefault()}
        />
      )}
      <div style={{ position: 'relative', pointerEvents: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function DroppableColumn({ status, children }: { status: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-3 flex-1 min-h-[200px] ${isOver ? "bg-primary/5 rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const navigate = useLocation()[1];
  const { toast } = useToast();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isHoldReasonDialogOpen, setIsHoldReasonDialogOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    taskId: string;
    newStatus: StatusType;
    task: Task;
  } | null>(null);

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    staleTime: 0, // Always refetch on mount to ensure we have the latest tasks
  });

  const { data: areas } = useQuery<Area[]>({ queryKey: ["/api/areas"] });
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: properties } = useQuery<Property[]>({ queryKey: ["/api/properties"] });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ 
      taskId, 
      newStatus, 
      onHoldReason,
      requestId,
      taskName
    }: { 
      taskId: string; 
      newStatus: StatusType;
      onHoldReason?: string;
      requestId?: string | null;
      taskName?: string;
    }) => {
      const updateData: any = { status: newStatus };
      if (newStatus === "on_hold" && onHoldReason) {
        updateData.onHoldReason = onHoldReason;
      }
      
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}`, updateData);

      // If status is on_hold and task has a requestId, send message to requester
      if (newStatus === "on_hold" && onHoldReason && requestId) {
        await apiRequest("POST", "/api/messages", {
          requestId,
          content: `Your task "${taskName}" has been placed on hold.\n\nReason: ${onHoldReason}`
        });
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Task updated",
        description: "Task status has been updated successfully.",
      });
      setIsHoldReasonDialogOpen(false);
      setHoldReason("");
      setPendingStatusChange(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      });
    },
  });

  const getAreaName = (areaId: string | null) => {
    if (!areaId) return "General";
    const area = areas?.find((a: any) => a.id === areaId);
    return area?.name || "General";
  };

  const getAssigneeName = (userId: string) => {
    const user = users?.find((u: any) => u.id === userId);
    if (!user) return "Unknown";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || "Unknown";
  };

  const getAssigneeInitials = (userId: string) => {
    const user = users?.find((u: any) => u.id === userId);
    if (!user) return "?";
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  };

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return null;
    const property = properties?.find((p: any) => p.id === propertyId);
    return property?.name || null;
  };

  // Debug: log tasks received from API
  console.log("[DEBUG Tasks.tsx] Received tasks:", tasks?.length, tasks?.map(t => ({ id: t.id, name: t.name, status: t.status })));

  const groupedTasks = tasks?.reduce((acc, task) => {
    const status = task.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(task);
    return acc;
  }, {} as Record<string, Task[]>) || {};
  
  console.log("[DEBUG Tasks.tsx] Grouped tasks:", Object.keys(groupedTasks).map(k => `${k}: ${groupedTasks[k]?.length}`));

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task;
    setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as StatusType;
    const task = tasks?.find((t) => t.id === taskId);

    if (!task) return;

    // Only update if the status changed
    if (task.status !== newStatus) {
      // If changing to on_hold and task has a requestId, show dialog for reason
      if (newStatus === "on_hold" && task.requestId) {
        setPendingStatusChange({ taskId, newStatus, task });
        setIsHoldReasonDialogOpen(true);
      } else {
        updateTaskStatusMutation.mutate({ taskId, newStatus });
      }
    }
  };

  const handleHoldReasonSubmit = () => {
    if (!holdReason.trim()) {
      toast({
        title: "Please provide a reason",
        description: "A reason is required when placing a task on hold.",
        variant: "destructive"
      });
      return;
    }

    if (pendingStatusChange) {
      updateTaskStatusMutation.mutate({
        taskId: pendingStatusChange.taskId,
        newStatus: pendingStatusChange.newStatus,
        onHoldReason: holdReason,
        requestId: pendingStatusChange.task.requestId,
        taskName: pendingStatusChange.task.name
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const getPropertyById = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find((p: any) => p.id === propertyId) || null;
  };

  const handleStudentStatusChange = (taskId: string, newStatus: StatusType) => {
    updateTaskStatusMutation.mutate({ taskId, newStatus });
  };

  if (user?.role === "student") {
    const studentTasks = tasks?.filter(t => {
      // Only show tasks assigned to this student or to the student pool
      const isAssignedToMe = t.assignedToId === user.id;
      const isStudentPoolTask = t.assignedToId === "student_pool";
      if (!isAssignedToMe && !isStudentPoolTask) return false;
      
      // Filter by completed status if not showing completed
      if (!showCompleted && t.status === "completed") return false;
      
      return true;
    }) || [];

    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">
              My Tasks
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              View and complete your assigned tasks
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-sm"
            data-testid="toggle-completed-tasks"
          >
            {showCompleted ? (
              <><EyeOff className="w-4 h-4 mr-2" /> Hide Completed</>
            ) : (
              <><Eye className="w-4 h-4 mr-2" /> Show Completed</>
            )}
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            {studentTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="font-medium">No tasks to show</p>
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {studentTasks.map((task) => {
                  const property = getPropertyById(task.propertyId);
                  const statusLabel = statusConfig.find(s => s.key === task.status)?.label || "Unknown";
                  const statusColor = statusColors[task.status] || statusColors.not_started;
                  
                  return (
                    <Card
                      key={task.id}
                      className="hover-elevate cursor-pointer"
                      data-testid={`student-task-card-${task.id}`}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-2">
                            <h3 className="font-medium text-base" data-testid={`text-task-name-${task.id}`}>
                              {task.name}
                            </h3>
                            {property && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{property.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-xs ${statusColor}`}
                                data-testid={`badge-status-${task.id}`}
                              >
                                {statusLabel}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs capitalize ${urgencyColors[task.urgency]}`}
                                data-testid={`badge-urgency-${task.id}`}
                              >
                                {task.urgency}
                              </Badge>
                            </div>
                            {!task.assignedToId && (
                              <div className="flex items-center gap-1.5 text-sm text-orange-500">
                                <UserIcon className="w-3.5 h-3.5" />
                                <span>Unassigned</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {task.status === "completed" && (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">
              {user?.role === "admin" ? "All Tasks" : "My Tasks"}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {user?.role === "admin"
                ? "Drag tasks to change their status"
                : "View and manage your assigned tasks"}
            </p>
          </div>
          <Link href="/tasks/new">
            <Button data-testid="button-create-task" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {statusConfig.map((status) => {
            const tasksInColumn = groupedTasks[status.key] || [];

            return (
              <div key={status.key} className="flex flex-col">
                <div className="mb-3 md:mb-4">
                  <h2 className="font-semibold text-base md:text-lg flex items-center gap-2">
                    {status.label}
                    <Badge variant="secondary" className="rounded-full text-xs">
                      {tasksInColumn.length}
                    </Badge>
                  </h2>
                </div>

                <DroppableColumn status={status.key}>
                  {tasksInColumn.map((task) => (
                    <DraggableTaskCard key={task.id} task={task}>
                      <Link href={`/tasks/${task.id}`}>
                        <Card
                          className="hover-elevate cursor-move transition-all active:scale-[0.98]"
                          data-testid={`card-task-${task.id}`}
                        >
                          <CardHeader className="p-3 md:p-4 pb-2 md:pb-3">
                            <div className="space-y-2">
                              <CardTitle className="text-sm md:text-base leading-tight" data-testid={`text-task-name-${task.id}`}>
                                {task.name}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {task.description}
                              </p>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 md:p-4 pt-0 space-y-2">
                            <div className="flex gap-1.5 md:gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`${urgencyColors[task.urgency]} text-xs`}
                                data-testid={`badge-urgency-${task.id}`}
                              >
                                {task.urgency}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`${status.color} text-xs`}
                                data-testid={`badge-status-${task.id}`}
                              >
                                {status.label}
                              </Badge>
                            </div>

                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span className="truncate">
                                  Start: {new Date(task.initialDate).toLocaleDateString()}
                                </span>
                              </div>
                              {task.estimatedCompletionDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 shrink-0" />
                                  <span className="truncate">
                                    Due: {new Date(task.estimatedCompletionDate).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              {task.assignedToId && (
                                <div className="flex items-center gap-1">
                                  <UserIcon className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{getAssigneeName(task.assignedToId)}</span>
                                </div>
                              )}
                              {getPropertyName(task.propertyId) && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{getPropertyName(task.propertyId)}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Repeat className="w-3 h-3 shrink-0" />
                                <span className="truncate">{task.taskType.replace('_', ' ')}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </DraggableTaskCard>
                  ))}

                  {tasksInColumn.length === 0 && (
                    <Card className="border-dashed">
                      <CardContent className="py-6 md:py-8">
                        <p className="text-center text-xs md:text-sm text-muted-foreground">
                          No tasks
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </DroppableColumn>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <Card className="shadow-lg opacity-90">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base leading-tight">
                  {activeTask.name}
                </CardTitle>
              </CardHeader>
            </Card>
          ) : null}
        </DragOverlay>
      </div>

      <Dialog open={isHoldReasonDialogOpen} onOpenChange={setIsHoldReasonDialogOpen}>
        <DialogContent data-testid="dialog-hold-reason">
          <DialogHeader>
            <DialogTitle>Hold Task</DialogTitle>
            <DialogDescription>
              Please provide a reason for putting this task on hold. This reason will be sent to the requester.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter reason for holding the task..."
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              rows={4}
              data-testid="textarea-hold-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsHoldReasonDialogOpen(false);
                setHoldReason("");
                setPendingStatusChange(null);
              }}
              data-testid="button-cancel-hold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleHoldReasonSubmit}
              disabled={!holdReason.trim() || updateTaskStatusMutation.isPending}
              data-testid="button-submit-hold"
            >
              {updateTaskStatusMutation.isPending ? "Holding..." : "Hold Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}