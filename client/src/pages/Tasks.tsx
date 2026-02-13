import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, CheckCircle2, Eye, EyeOff, MapPin, User as UserIcon, ChevronDown, ChevronRight, ExternalLink, Check, X } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { Task, Area, User, Property, Vendor } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const urgencyColors: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  high: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  needs_estimate: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  waiting_approval: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  ready: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

const statusConfig = [
  { key: "not_started", label: "Not Started", color: statusColors.not_started },
  { key: "needs_estimate", label: "Needs Estimate", color: statusColors.needs_estimate },
  { key: "waiting_approval", label: "Waiting Approval", color: statusColors.waiting_approval },
  { key: "in_progress", label: "In Progress", color: statusColors.in_progress },
  { key: "on_hold", label: "On Hold", color: statusColors.on_hold },
  { key: "completed", label: "Completed", color: statusColors.completed },
];

type StatusType = "not_started" | "needs_estimate" | "waiting_approval" | "in_progress" | "on_hold" | "completed";

function EditableTextCell({
  value,
  taskId,
  field,
  onSave,
}: {
  value: string;
  taskId: string;
  field: string;
  onSave: (taskId: string, field: string, value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue.trim() && editValue !== value) {
      onSave(taskId, field, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          onBlur={handleSave}
          className="text-sm"
          data-testid={`input-edit-${field}-${taskId}`}
        />
      </div>
    );
  }

  return (
    <span
      className="cursor-pointer hover:underline decoration-dashed underline-offset-2"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      data-testid={`text-${field}-${taskId}`}
    >
      {value || "-"}
    </span>
  );
}

function EditableDateCell({
  value,
  taskId,
  field,
  onSave,
}: {
  value: string | Date | null;
  taskId: string;
  field: string;
  onSave: (taskId: string, field: string, value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const rawValue = value ? String(value) : null;
  const dateStr = rawValue ? new Date(rawValue).toISOString().split("T")[0] : "";
  const [editValue, setEditValue] = useState(dateStr);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(rawValue ? new Date(rawValue).toISOString().split("T")[0] : "");
  }, [rawValue]);

  const handleSave = () => {
    if (editValue && editValue !== dateStr) {
      onSave(taskId, field, new Date(editValue).toISOString());
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="date"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setEditValue(dateStr);
            setIsEditing(false);
          }
        }}
        className="text-sm"
        data-testid={`input-edit-${field}-${taskId}`}
      />
    );
  }

  return (
    <span
      className="cursor-pointer hover:underline decoration-dashed underline-offset-2 text-sm"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      data-testid={`text-${field}-${taskId}`}
    >
      {rawValue ? new Date(rawValue).toLocaleDateString() : "-"}
    </span>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const navigate = useLocation()[1];
  const { toast } = useToast();
  const [isHoldReasonDialogOpen, setIsHoldReasonDialogOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    taskId: string;
    newStatus: StatusType;
    task: Task;
  } | null>(null);

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    staleTime: 0,
  });

  const { data: areas } = useQuery<Area[]>({ queryKey: ["/api/areas"] });
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: properties } = useQuery<Property[]>({ queryKey: ["/api/properties"] });
  const { data: vendors } = useQuery<Vendor[]>({ queryKey: ["/api/vendors"] });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Record<string, any> }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task updated",
        description: "Changes saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task.",
        variant: "destructive",
      });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({
      taskId,
      newStatus,
      onHoldReason,
      requestId,
      taskName,
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

      if (newStatus === "on_hold" && onHoldReason && requestId) {
        await apiRequest("POST", "/api/messages", {
          requestId,
          content: `Your task "${taskName}" has been placed on hold.\n\nReason: ${onHoldReason}`,
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

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return null;
    const u = users?.find((u: any) => u.id === userId);
    if (!u) return "Unknown";
    if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
    return u.username || "Unknown";
  };

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return null;
    const property = properties?.find((p: any) => p.id === propertyId);
    return property?.name || null;
  };

  const getVendorName = (vendorId: string | null) => {
    if (!vendorId) return null;
    const vendor = vendors?.find((v: any) => v.id === vendorId);
    return vendor?.name || null;
  };

  const groupedTasks =
    tasks?.reduce((acc, task) => {
      const status = task.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(task);
      return acc;
    }, {} as Record<string, Task[]>) || {};

  const handleStatusChange = (taskId: string, newStatus: StatusType) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (!task) return;

    if (task.status === newStatus) return;

    if (newStatus === "on_hold" && task.requestId) {
      setPendingStatusChange({ taskId, newStatus, task });
      setIsHoldReasonDialogOpen(true);
    } else {
      updateTaskStatusMutation.mutate({ taskId, newStatus });
    }
  };

  const handleHoldReasonSubmit = () => {
    if (!holdReason.trim()) {
      toast({
        title: "Please provide a reason",
        description: "A reason is required when placing a task on hold.",
        variant: "destructive",
      });
      return;
    }

    if (pendingStatusChange) {
      updateTaskStatusMutation.mutate({
        taskId: pendingStatusChange.taskId,
        newStatus: pendingStatusChange.newStatus,
        onHoldReason: holdReason,
        requestId: pendingStatusChange.task.requestId,
        taskName: pendingStatusChange.task.name,
      });
    }
  };

  const handleInlineEdit = (taskId: string, field: string, value: string) => {
    updateTaskMutation.mutate({ taskId, data: { [field]: value } });
  };

  const handleUrgencyChange = (taskId: string, urgency: string) => {
    updateTaskMutation.mutate({ taskId, data: { urgency } });
  };

  const handleAssigneeChange = (taskId: string, assignedToId: string) => {
    const data: Record<string, any> = {};
    if (assignedToId === "__none__") {
      data.assignedToId = null;
    } else {
      data.assignedToId = assignedToId;
    }
    updateTaskMutation.mutate({ taskId, data });
  };

  const handlePropertyChange = (taskId: string, propertyId: string) => {
    const data: Record<string, any> = {};
    if (propertyId === "__none__") {
      data.propertyId = null;
    } else {
      data.propertyId = propertyId;
    }
    updateTaskMutation.mutate({ taskId, data });
  };

  const handleTaskTypeChange = (taskId: string, taskType: string) => {
    updateTaskMutation.mutate({ taskId, data: { taskType } });
  };

  const toggleGroup = (statusKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [statusKey]: !prev[statusKey],
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const getPropertyById = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find((p: any) => p.id === propertyId) || null;
  };

  if (user?.role === "student") {
    const studentTasks =
      tasks?.filter((t) => {
        const isAssignedToMe = t.assignedToId === user.id;
        const isStudentPoolTask = t.assignedToId === "student_pool";
        if (!isAssignedToMe && !isStudentPoolTask) return false;
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
              <>
                <EyeOff className="w-4 h-4 mr-2" /> Hide Completed
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" /> Show Completed
              </>
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
                  const statusLabel = statusConfig.find((s) => s.key === task.status)?.label || "Unknown";
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
                              <Badge variant="outline" className={`text-xs ${statusColor}`} data-testid={`badge-status-${task.id}`}>
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
                            {task.status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
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

  const technicianUsers = users?.filter((u) => u.role === "technician" || u.role === "admin") || [];

  return (
    <>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">
              {user?.role === "admin" ? "All Tasks" : "My Tasks"}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {user?.role === "admin"
                ? "Manage tasks by status group. Click cells to edit inline."
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

        <div className="space-y-4">
          {statusConfig.map((status) => {
            const tasksInGroup = groupedTasks[status.key] || [];
            const isCollapsed = collapsedGroups[status.key] ?? false;

            return (
              <Card key={status.key} data-testid={`group-${status.key}`}>
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer select-none"
                  onClick={() => toggleGroup(status.key)}
                  data-testid={`toggle-group-${status.key}`}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <Badge variant="outline" className={`${status.color} text-xs`}>
                    {status.label}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full text-xs">
                    {tasksInGroup.length}
                  </Badge>
                </div>

                {!isCollapsed && (
                  <div className="border-t">
                    {tasksInGroup.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No tasks
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Task Name</TableHead>
                            <TableHead className="w-[200px] hidden lg:table-cell">Description</TableHead>
                            <TableHead className="w-[120px]">Status</TableHead>
                            <TableHead className="w-[100px]">Urgency</TableHead>
                            <TableHead className="w-[110px]">Start Date</TableHead>
                            <TableHead className="w-[110px]">Due Date</TableHead>
                            <TableHead className="w-[140px] hidden md:table-cell">Assigned To</TableHead>
                            <TableHead className="w-[140px] hidden md:table-cell">Property</TableHead>
                            <TableHead className="w-[100px] hidden lg:table-cell">Type</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tasksInGroup.map((task) => (
                            <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                              <TableCell className="font-medium">
                                <EditableTextCell
                                  value={task.name}
                                  taskId={task.id}
                                  field="name"
                                  onSave={handleInlineEdit}
                                />
                              </TableCell>
                              <TableCell className="hidden lg:table-cell max-w-[200px]">
                                <EditableTextCell
                                  value={task.description || ""}
                                  taskId={task.id}
                                  field="description"
                                  onSave={handleInlineEdit}
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={task.status}
                                  onValueChange={(val) => handleStatusChange(task.id, val as StatusType)}
                                >
                                  <SelectTrigger
                                    className="text-xs border-0 bg-transparent p-0"
                                    data-testid={`select-status-${task.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Badge
                                      variant="outline"
                                      className={`${statusColors[task.status] || ""} text-xs`}
                                    >
                                      <SelectValue />
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusConfig.map((s) => (
                                      <SelectItem key={s.key} value={s.key}>
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={task.urgency}
                                  onValueChange={(val) => handleUrgencyChange(task.id, val)}
                                >
                                  <SelectTrigger
                                    className="text-xs border-0 bg-transparent p-0"
                                    data-testid={`select-urgency-${task.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Badge
                                      variant="outline"
                                      className={`${urgencyColors[task.urgency] || ""} text-xs capitalize`}
                                    >
                                      <SelectValue />
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <EditableDateCell
                                  value={task.initialDate}
                                  taskId={task.id}
                                  field="initialDate"
                                  onSave={handleInlineEdit}
                                />
                              </TableCell>
                              <TableCell>
                                <EditableDateCell
                                  value={task.estimatedCompletionDate}
                                  taskId={task.id}
                                  field="estimatedCompletionDate"
                                  onSave={handleInlineEdit}
                                />
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Select
                                  value={task.assignedToId || "__none__"}
                                  onValueChange={(val) => handleAssigneeChange(task.id, val)}
                                >
                                  <SelectTrigger
                                    className="text-xs border-0 bg-transparent p-0"
                                    data-testid={`select-assignee-${task.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <SelectValue placeholder="Unassigned" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Unassigned</SelectItem>
                                    {technicianUsers.map((u) => (
                                      <SelectItem key={u.id} value={u.id}>
                                        {u.firstName && u.lastName
                                          ? `${u.firstName} ${u.lastName}`
                                          : u.username}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Select
                                  value={task.propertyId || "__none__"}
                                  onValueChange={(val) => handlePropertyChange(task.id, val)}
                                >
                                  <SelectTrigger
                                    className="text-xs border-0 bg-transparent p-0"
                                    data-testid={`select-property-${task.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <SelectValue placeholder="No property" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">No property</SelectItem>
                                    {properties?.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <Select
                                  value={task.taskType}
                                  onValueChange={(val) => handleTaskTypeChange(task.id, val)}
                                >
                                  <SelectTrigger
                                    className="text-xs border-0 bg-transparent p-0"
                                    data-testid={`select-type-${task.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="one_time">One Time</SelectItem>
                                    <SelectItem value="recurring">Recurring</SelectItem>
                                    <SelectItem value="reminder">Reminder</SelectItem>
                                    <SelectItem value="project">Project</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Link href={`/tasks/${task.id}`}>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    data-testid={`button-view-task-${task.id}`}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
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
    </>
  );
}
