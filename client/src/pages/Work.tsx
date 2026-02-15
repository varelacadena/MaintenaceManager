import { useState, useRef, useEffect, useMemo } from "react";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Plus,
  CheckCircle2,
  Eye,
  EyeOff,
  MapPin,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Wrench,
  FolderKanban,
  Search,
  DollarSign,
  Calendar,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { Task, Area, User, Property, Vendor, Project, Space } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

const urgencyColors: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  high: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

const taskStatusColors: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  needs_estimate: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  waiting_approval: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

const projectStatusColors: Record<string, string> = {
  planning: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const unifiedStatusConfig = [
  { key: "not_started", label: "Not Started" },
  { key: "needs_estimate", label: "Needs Estimate" },
  { key: "waiting_approval", label: "Waiting Approval" },
  { key: "in_progress", label: "In Progress" },
  { key: "on_hold", label: "On Hold" },
  { key: "completed", label: "Completed" },
];

const unifiedStatusColors: Record<string, string> = {
  not_started: taskStatusColors.not_started,
  needs_estimate: taskStatusColors.needs_estimate,
  waiting_approval: taskStatusColors.waiting_approval,
  in_progress: taskStatusColors.in_progress,
  on_hold: taskStatusColors.on_hold,
  completed: taskStatusColors.completed,
};

const projectStatusMapping: Record<string, string> = {
  planning: "not_started",
  in_progress: "in_progress",
  on_hold: "on_hold",
  completed: "completed",
  cancelled: "completed",
};

const taskStatusConfig = [
  { key: "not_started", label: "Not Started" },
  { key: "needs_estimate", label: "Needs Estimate" },
  { key: "waiting_approval", label: "Waiting Approval" },
  { key: "in_progress", label: "In Progress" },
  { key: "on_hold", label: "On Hold" },
  { key: "completed", label: "Completed" },
];

type StatusType = "not_started" | "needs_estimate" | "waiting_approval" | "in_progress" | "on_hold" | "completed";

type WorkItem =
  | { type: "task"; data: Task }
  | { type: "project"; data: Project };

const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]).default("planning"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  propertyId: z.string().nullable().optional(),
  spaceId: z.string().nullable().optional(),
  budgetAmount: z.coerce.number().default(0),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

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

function TaskTableRow({
  task,
  technicianUsers,
  properties,
  handleStatusChange,
  handleUrgencyChange,
  handleAssigneeChange,
  handlePropertyChange,
  handleTaskTypeChange,
  handleInlineEdit,
  isChildTask,
}: {
  task: Task;
  technicianUsers: User[];
  properties: Property[] | undefined;
  handleStatusChange: (taskId: string, newStatus: StatusType) => void;
  handleUrgencyChange: (taskId: string, urgency: string) => void;
  handleAssigneeChange: (taskId: string, assignedToId: string) => void;
  handlePropertyChange: (taskId: string, propertyId: string) => void;
  handleTaskTypeChange: (taskId: string, taskType: string) => void;
  handleInlineEdit: (taskId: string, field: string, value: string) => void;
  isChildTask?: boolean;
}) {
  return (
    <TableRow
      key={task.id}
      data-testid={`row-task-${task.id}`}
      className={isChildTask ? "bg-muted/30" : ""}
    >
      <TableCell className="font-medium">
        <div className={`flex items-center gap-2 ${isChildTask ? "pl-6" : ""}`}>
          {!isChildTask && (
            <span className="flex items-center gap-1 text-muted-foreground shrink-0">
              <Wrench className="w-3.5 h-3.5" />
            </span>
          )}
          {isChildTask && (
            <span className="text-muted-foreground shrink-0 text-xs">└</span>
          )}
          <EditableTextCell
            value={task.name}
            taskId={task.id}
            field="name"
            onSave={handleInlineEdit}
          />
        </div>
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
              className={`${taskStatusColors[task.status] || ""} text-xs`}
            >
              <SelectValue />
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {taskStatusConfig.map((s) => (
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
  );
}

export default function Work() {
  const { user } = useAuth();
  const navigate = useLocation()[1];
  const { toast } = useToast();
  const [isHoldReasonDialogOpen, setIsHoldReasonDialogOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    taskId: string;
    newStatus: StatusType;
    task: Task;
  } | null>(null);

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    staleTime: 0,
  });

  const isAdmin = user?.role === "admin";

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAdmin,
  });

  const { data: areas } = useQuery<Area[]>({ queryKey: ["/api/areas"] });
  const { data: allUsers } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: properties } = useQuery<Property[]>({ queryKey: ["/api/properties"] });
  const { data: vendors } = useQuery<Vendor[]>({ queryKey: ["/api/vendors"] });

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "planning",
      priority: "medium",
      propertyId: null,
      spaceId: null,
      budgetAmount: 0,
      notes: "",
      startDate: "",
      targetEndDate: "",
    },
  });

  const selectedPropertyId = form.watch("propertyId");

  const { data: spaces } = useQuery<Space[]>({
    queryKey: ["/api/spaces", { propertyId: selectedPropertyId }],
    queryFn: async () => {
      if (!selectedPropertyId) return [];
      const response = await fetch(`/api/spaces?propertyId=${selectedPropertyId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedPropertyId,
  });

  const selectedProperty = properties?.find(p => p.id === selectedPropertyId);
  const isBuildingProperty = selectedProperty?.type === "building";

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

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      return await apiRequest("POST", "/api/projects", {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate).toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setProjectDialogOpen(false);
      form.reset();
      toast({
        title: "Project created",
        description: "The project has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return null;
    const u = allUsers?.find((u: any) => u.id === userId);
    if (!u) return "Unknown";
    if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
    return u.username || "Unknown";
  };

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return null;
    const property = properties?.find((p: any) => p.id === propertyId);
    return property?.name || null;
  };

  const getPropertyById = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find((p: any) => p.id === propertyId) || null;
  };

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

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const standaloneTasks = useMemo(
    () => tasks?.filter((t) => !t.projectId) || [],
    [tasks]
  );

  const projectTasksMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks?.forEach((t) => {
      if (t.projectId) {
        if (!map[t.projectId]) map[t.projectId] = [];
        map[t.projectId].push(t);
      }
    });
    return map;
  }, [tasks]);

  const filteredStandaloneTasks = useMemo(() => {
    let filtered = standaloneTasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }
    if (typeFilter === "projects") return [];
    return filtered;
  }, [standaloneTasks, searchQuery, typeFilter]);

  const filteredProjects = useMemo(() => {
    if (typeFilter === "tasks") return [];
    let filtered = projects || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [projects, searchQuery, typeFilter]);

  const unifiedGroups = useMemo(() => {
    const groups: Record<string, WorkItem[]> = {};
    unifiedStatusConfig.forEach((s) => {
      groups[s.key] = [];
    });

    filteredStandaloneTasks.forEach((task) => {
      const status = task.status === "ready" ? "not_started" : task.status;
      if (groups[status]) {
        groups[status].push({ type: "task", data: task });
      }
    });

    filteredProjects.forEach((project) => {
      const unifiedStatus = projectStatusMapping[project.status] || "not_started";
      if (groups[unifiedStatus]) {
        groups[unifiedStatus].push({ type: "project", data: project });
      }
    });

    return groups;
  }, [filteredStandaloneTasks, filteredProjects]);

  const technicianUsers = allUsers?.filter((u) => u.role === "technician" || u.role === "admin") || [];

  const isLoading = tasksLoading || projectsLoading;

  if (isLoading) {
    return (
      <div className="p-3 md:p-4 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

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
      <div className="p-3 md:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">
              My Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
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
                  const statusLabel = taskStatusConfig.find((s) => s.key === task.status)?.label || "Unknown";
                  const statusColor = taskStatusColors[task.status] || taskStatusColors.not_started;

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

  const onProjectSubmit = (data: ProjectFormValues) => {
    createProjectMutation.mutate(data);
  };

  return (
    <>
      <div className="p-3 md:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">
              {user?.role === "admin" ? "Work" : "My Tasks"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user?.role === "admin"
                ? "Manage tasks and projects in one place. Click cells to edit inline."
                : "View and manage your assigned tasks"}
            </p>
          </div>
          {user?.role === "admin" && (
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/tasks/new">
                <Button data-testid="button-create-task">
                  <Plus className="w-4 h-4 mr-2" />
                  New Task
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setProjectDialogOpen(true)}
                data-testid="button-new-project"
              >
                <FolderKanban className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>
          )}
          {user?.role !== "admin" && (
            <Link href="/tasks/new">
              <Button data-testid="button-create-task" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            </Link>
          )}
        </div>

        {user?.role === "admin" && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks and projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-work"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-type-filter">
                <SelectValue placeholder="Filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="tasks">Tasks Only</SelectItem>
                <SelectItem value="projects">Projects Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          {unifiedStatusConfig.map((status) => {
            const itemsInGroup = unifiedGroups[status.key] || [];
            const isCollapsed = collapsedGroups[status.key] ?? false;

            return (
              <Card key={status.key} data-testid={`group-${status.key}`}>
                <div
                  className="flex items-center gap-3 p-2.5 cursor-pointer select-none"
                  onClick={() => toggleGroup(status.key)}
                  data-testid={`toggle-group-${status.key}`}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <Badge variant="outline" className={`${unifiedStatusColors[status.key]} text-xs`}>
                    {status.label}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full text-xs">
                    {itemsInGroup.length}
                  </Badge>
                </div>

                {!isCollapsed && (
                  <div className="border-t">
                    {itemsInGroup.length === 0 ? (
                      <div className="py-3 text-center text-sm text-muted-foreground">
                        No items
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Name</TableHead>
                            <TableHead className="w-[200px] hidden lg:table-cell">Description</TableHead>
                            <TableHead className="w-[120px]">Status</TableHead>
                            <TableHead className="w-[100px]">Urgency / Priority</TableHead>
                            <TableHead className="w-[110px]">Start Date</TableHead>
                            <TableHead className="w-[110px]">Due Date</TableHead>
                            <TableHead className="w-[140px] hidden md:table-cell">Assigned To</TableHead>
                            <TableHead className="w-[140px] hidden md:table-cell">Property</TableHead>
                            <TableHead className="w-[100px] hidden lg:table-cell">Type</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itemsInGroup.map((item) => {
                            if (item.type === "task") {
                              return (
                                <TaskTableRow
                                  key={item.data.id}
                                  task={item.data as Task}
                                  technicianUsers={technicianUsers}
                                  properties={properties}
                                  handleStatusChange={handleStatusChange}
                                  handleUrgencyChange={handleUrgencyChange}
                                  handleAssigneeChange={handleAssigneeChange}
                                  handlePropertyChange={handlePropertyChange}
                                  handleTaskTypeChange={handleTaskTypeChange}
                                  handleInlineEdit={handleInlineEdit}
                                />
                              );
                            }

                            const project = item.data as Project;
                            const childTasks = projectTasksMap[project.id] || [];
                            const completedChildTasks = childTasks.filter((t) => t.status === "completed").length;
                            const isExpanded = expandedProjects.has(project.id);

                            return (
                              <ProjectRowGroup
                                key={project.id}
                                project={project}
                                childTasks={childTasks}
                                completedChildTasks={completedChildTasks}
                                isExpanded={isExpanded}
                                onToggleExpand={() => toggleProjectExpanded(project.id)}
                                technicianUsers={technicianUsers}
                                properties={properties}
                                handleStatusChange={handleStatusChange}
                                handleUrgencyChange={handleUrgencyChange}
                                handleAssigneeChange={handleAssigneeChange}
                                handlePropertyChange={handlePropertyChange}
                                handleTaskTypeChange={handleTaskTypeChange}
                                handleInlineEdit={handleInlineEdit}
                                getPropertyName={getPropertyName}
                              />
                            );
                          })}
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

      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-project">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onProjectSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter project name" data-testid="input-project-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Describe the project" data-testid="input-project-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property (Optional)</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-project-property">
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {properties?.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isBuildingProperty && spaces && spaces.length > 0 && (
                  <FormField
                    control={form.control}
                    name="spaceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Space (Optional)</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)}
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-project-space">
                              <SelectValue placeholder="Select space" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {spaces.map((space) => (
                              <SelectItem key={space.id} value={space.id}>
                                {space.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              <FormField
                control={form.control}
                name="budgetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-project-budget"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={field.onChange}
                          data-testid="input-project-start-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target End Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={field.onChange}
                          data-testid="input-project-end-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes" data-testid="input-project-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setProjectDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProjectMutation.isPending} data-testid="button-submit-project">
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProjectRowGroup({
  project,
  childTasks,
  completedChildTasks,
  isExpanded,
  onToggleExpand,
  technicianUsers,
  properties,
  handleStatusChange,
  handleUrgencyChange,
  handleAssigneeChange,
  handlePropertyChange,
  handleTaskTypeChange,
  handleInlineEdit,
  getPropertyName,
}: {
  project: Project;
  childTasks: Task[];
  completedChildTasks: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  technicianUsers: User[];
  properties: Property[] | undefined;
  handleStatusChange: (taskId: string, newStatus: StatusType) => void;
  handleUrgencyChange: (taskId: string, urgency: string) => void;
  handleAssigneeChange: (taskId: string, assignedToId: string) => void;
  handlePropertyChange: (taskId: string, propertyId: string) => void;
  handleTaskTypeChange: (taskId: string, taskType: string) => void;
  handleInlineEdit: (taskId: string, field: string, value: string) => void;
  getPropertyName: (propertyId: string | null) => string | null;
}) {
  const propertyName = getPropertyName(project.propertyId);

  return (
    <>
      <TableRow
        data-testid={`row-project-${project.id}`}
        className={isExpanded ? "bg-indigo-500/5" : ""}
      >
        <TableCell className="font-medium">
          <div className="pl-1">
            <div className="border-l-4 border-l-indigo-500 pl-3">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand();
                  }}
                  data-testid={`button-expand-project-${project.id}`}
                  className="shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
                <Link href={`/projects/${project.id}`}>
                  <span
                    className="cursor-pointer hover:underline font-medium"
                    data-testid={`text-project-name-${project.id}`}
                  >
                    {project.name}
                  </span>
                </Link>
                <Badge
                  variant="secondary"
                  className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs shrink-0"
                  data-testid={`badge-project-type-${project.id}`}
                >
                  <FolderKanban className="w-3 h-3 mr-1" />
                  Project
                </Badge>
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell max-w-[200px]">
          <span className="text-sm text-muted-foreground line-clamp-1">
            {project.description || "-"}
          </span>
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={`${projectStatusColors[project.status] || ""} text-xs`}
            data-testid={`badge-project-status-${project.id}`}
          >
            {project.status.replace("_", " ")}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge
            variant="secondary"
            className={`${priorityColors[project.priority] || ""} text-xs capitalize`}
            data-testid={`badge-project-priority-${project.id}`}
          >
            {project.priority}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="text-sm">
            {project.startDate
              ? format(new Date(project.startDate), "M/d/yyyy")
              : "-"}
          </span>
        </TableCell>
        <TableCell>
          <span className="text-sm">
            {project.targetEndDate
              ? format(new Date(project.targetEndDate), "M/d/yyyy")
              : "-"}
          </span>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span data-testid={`text-project-progress-${project.id}`}>
              {completedChildTasks}/{childTasks.length} tasks
            </span>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <span className="text-sm text-muted-foreground">
            {propertyName || "-"}
          </span>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          {project.budgetAmount !== null && project.budgetAmount > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="w-3.5 h-3.5" />
              <span>{project.budgetAmount.toLocaleString()}</span>
            </div>
          )}
        </TableCell>
        <TableCell>
          <Link href={`/projects/${project.id}`}>
            <Button
              size="icon"
              variant="ghost"
              data-testid={`button-view-project-${project.id}`}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
        </TableCell>
      </TableRow>

      {isExpanded &&
        childTasks.map((task) => (
          <TaskTableRow
            key={task.id}
            task={task}
            technicianUsers={technicianUsers}
            properties={properties}
            handleStatusChange={handleStatusChange}
            handleUrgencyChange={handleUrgencyChange}
            handleAssigneeChange={handleAssigneeChange}
            handlePropertyChange={handlePropertyChange}
            handleTaskTypeChange={handleTaskTypeChange}
            handleInlineEdit={handleInlineEdit}
            isChildTask
          />
        ))}
    </>
  );
}
