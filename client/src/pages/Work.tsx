import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  FolderKanban,
  Search,
  Calendar,
  AlertTriangle,
  Pencil,
  Flag,
  ClipboardCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { EstimateReviewDialog } from "@/components/EstimateReviewDialog";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import type { Task, Area, User, Property, Vendor, Project, Space } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";

const urgencyConfig: Record<string, { color: string; label: string }> = {
  low: { color: "text-muted-foreground", label: "Low" },
  medium: { color: "text-amber-500 dark:text-amber-400", label: "Medium" },
  high: { color: "text-red-500 dark:text-red-400", label: "High" },
};

const taskStatusColors: Record<string, string> = {
  not_started: "bg-gray-500 dark:bg-gray-600 text-white border-transparent",
  needs_estimate: "bg-amber-500 dark:bg-amber-600 text-white border-transparent",
  waiting_approval: "bg-purple-500 dark:bg-purple-600 text-white border-transparent",
  in_progress: "bg-rose-500 dark:bg-rose-600 text-white border-transparent",
  on_hold: "bg-yellow-500 dark:bg-yellow-600 text-white border-transparent",
  completed: "bg-emerald-500 dark:bg-emerald-600 text-white border-transparent",
  cancelled: "bg-red-500 dark:bg-red-600 text-white border-transparent",
};

const statusDotColors: Record<string, string> = {
  not_started: "bg-gray-400 dark:bg-gray-500",
  needs_estimate: "bg-amber-500 dark:bg-amber-400",
  waiting_approval: "bg-purple-500 dark:bg-purple-400",
  in_progress: "bg-rose-500 dark:bg-rose-400",
  on_hold: "bg-yellow-500 dark:bg-yellow-400",
  completed: "bg-emerald-500 dark:bg-emerald-400",
  cancelled: "bg-red-400 dark:bg-red-500",
};

const unifiedStatusConfig = [
  { key: "not_started", label: "Not Started" },
  { key: "needs_estimate", label: "Needs Estimate" },
  { key: "waiting_approval", label: "Estimate Review" },
  { key: "in_progress", label: "In Progress" },
  { key: "on_hold", label: "On Hold" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const unifiedStatusColors: Record<string, string> = {
  not_started: taskStatusColors.not_started,
  needs_estimate: taskStatusColors.needs_estimate,
  waiting_approval: taskStatusColors.waiting_approval,
  in_progress: taskStatusColors.in_progress,
  on_hold: taskStatusColors.on_hold,
  completed: taskStatusColors.completed,
  cancelled: "bg-red-500 dark:bg-red-600 text-white border-transparent",
};

const projectStatusMapping: Record<string, string> = {
  planning: "not_started",
  in_progress: "in_progress",
  on_hold: "on_hold",
  completed: "completed",
  cancelled: "cancelled",
};

const projectPriorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: "text-muted-foreground", label: "Low" },
  medium: { color: "text-amber-500 dark:text-amber-400", label: "Medium" },
  high: { color: "text-red-500 dark:text-red-400", label: "High" },
  critical: { color: "text-red-700 dark:text-red-300 font-semibold", label: "Critical" },
};

const taskStatusConfig = [
  { key: "not_started", label: "Not Started" },
  { key: "needs_estimate", label: "Needs Estimate" },
  { key: "waiting_approval", label: "Estimate Review" },
  { key: "in_progress", label: "In Progress" },
  { key: "on_hold", label: "On Hold" },
  { key: "completed", label: "Completed" },
];

const avatarColors = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
];

function getAvatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

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
  linkTo,
}: {
  value: string;
  taskId: string;
  field: string;
  onSave: (taskId: string, field: string, value: string) => void;
  linkTo?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useLocation()[1];
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      className={`group/editable cursor-pointer inline-flex items-center gap-1.5 ${linkTo ? "font-medium hover:underline underline-offset-2" : "hover:underline decoration-dashed underline-offset-2"}`}
      onClick={(e) => {
        e.stopPropagation();
        if (linkTo) {
          if (clickTimerRef.current) return;
          clickTimerRef.current = setTimeout(() => {
            clickTimerRef.current = null;
            navigate(linkTo);
          }, 250);
        } else {
          setIsEditing(true);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        setIsEditing(true);
      }}
      data-testid={`text-${field}-${taskId}`}
    >
      {value || "-"}
      {!linkTo && <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover/editable:text-muted-foreground/60 transition-colors shrink-0" />}
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
      className="group/editable cursor-pointer hover:underline decoration-dashed underline-offset-2 text-sm inline-flex items-center gap-1.5"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      data-testid={`text-${field}-${taskId}`}
    >
      {rawValue ? new Date(rawValue).toLocaleDateString() : "-"}
      <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover/editable:text-muted-foreground/60 transition-colors shrink-0" />
    </span>
  );
}

function TaskTableRow({
  task,
  userGroups,
  allUsers,
  properties,
  handleStatusChange,
  handleUrgencyChange,
  handleAssigneeChange,
  handlePropertyChange,
  handleTaskTypeChange,
  handleInlineEdit,
  isChildTask,
  rowIndex,
  onReviewEstimates,
  isAdmin,
  onViewSummary,
  onSelectTask,
  selectedTaskId,
}: {
  task: Task;
  userGroups: { label: string; items: User[] }[];
  allUsers: User[] | undefined;
  properties: Property[] | undefined;
  handleStatusChange: (taskId: string, newStatus: StatusType) => void;
  handleUrgencyChange: (taskId: string, urgency: string) => void;
  handleAssigneeChange: (taskId: string, assignedToId: string) => void;
  handlePropertyChange: (taskId: string, propertyId: string) => void;
  handleTaskTypeChange: (taskId: string, taskType: string) => void;
  handleInlineEdit: (taskId: string, field: string, value: string) => void;
  isChildTask?: boolean;
  rowIndex?: number;
  onReviewEstimates?: (taskId: string) => void;
  isAdmin?: boolean;
  onViewSummary?: (taskId: string) => void;
  onSelectTask?: (taskId: string) => void;
  selectedTaskId?: string | null;
}) {
  const isOverdue = task.estimatedCompletionDate
    && task.status !== "completed"
    && new Date(task.estimatedCompletionDate) < new Date();

  const assignee = task.assignedToId ? allUsers?.find(u => u.id === task.assignedToId) : null;
  const assigneeInitials = assignee
    ? (assignee.firstName && assignee.lastName
        ? `${assignee.firstName[0]}${assignee.lastName[0]}`
        : (assignee.username?.[0] || "?")).toUpperCase()
    : null;

  const urg = urgencyConfig[task.urgency] || urgencyConfig.low;

  return (
    <TableRow
      key={task.id}
      data-testid={`row-task-${task.id}`}
      className={`cursor-pointer ${selectedTaskId === task.id ? "!bg-[#EEF2FF]" : ""}`}
      onClick={() => onSelectTask?.(task.id)}
      tabIndex={onSelectTask ? 0 : undefined}
      onKeyDown={onSelectTask ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectTask(task.id); } } : undefined}
      role={onSelectTask ? "button" : undefined}
    >
      <TableCell className="py-2.5">
        <div className={`flex items-center gap-2 ${isChildTask ? "pl-8" : ""}`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotColors[task.status] || "bg-gray-400"}`} />
          <EditableTextCell
            value={task.name}
            taskId={task.id}
            field="name"
            onSave={handleInlineEdit}
            linkTo={onSelectTask ? undefined : `/tasks/${task.id}`}
          />
          {(task as Task & { isHelper?: boolean }).isHelper && (
            <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0" data-testid={`badge-helper-${task.id}`}>
              Helper
            </Badge>
          )}
          {isOverdue && (
            <span className="shrink-0" title="Overdue">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-2.5">
        <Select
          value={task.assignedToId || "__none__"}
          onValueChange={(val) => handleAssigneeChange(task.id, val)}
        >
          <SelectTrigger
            className="border-0 bg-transparent p-0 shadow-none h-auto"
            data-testid={`select-assignee-${task.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            {assignee ? (
              <Avatar className="w-7 h-7 cursor-pointer" data-testid={`avatar-assignee-${task.id}`}>
                <AvatarFallback className={`${getAvatarColor(assignee.id)} text-white text-[10px] font-medium`}>
                  {assigneeInitials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer" data-testid={`avatar-unassigned-${task.id}`}>
                <UserIcon className="w-3 h-3 text-muted-foreground/40" />
              </span>
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Unassigned</SelectItem>
            {userGroups.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.items.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName && u.lastName
                      ? `${u.firstName} ${u.lastName}`
                      : u.username}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2.5">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <EditableDateCell
            value={task.initialDate}
            taskId={task.id}
            field="initialDate"
            onSave={handleInlineEdit}
          />
        </div>
      </TableCell>
      <TableCell className="py-2.5">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <EditableDateCell
            value={task.estimatedCompletionDate}
            taskId={task.id}
            field="estimatedCompletionDate"
            onSave={handleInlineEdit}
          />
          {isOverdue && (
            <span className="text-[10px] font-medium text-destructive whitespace-nowrap">Overdue</span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Select
            value={task.status}
            onValueChange={(val) => handleStatusChange(task.id, val as StatusType)}
          >
            <SelectTrigger
              className="text-xs border-0 bg-transparent p-0 shadow-none h-auto"
              data-testid={`select-status-${task.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Badge
                variant="outline"
                className={`${taskStatusColors[task.status] || ""} text-[10px] font-semibold uppercase tracking-wider cursor-pointer no-default-hover-elevate no-default-active-elevate`}
              >
                <SelectValue />
              </Badge>
            </SelectTrigger>
            <SelectContent>
              {taskStatusConfig
                .filter((s) => {
                  if (s.key === "completed" && task.requiresEstimate && task.estimateStatus !== "approved") {
                    return false;
                  }
                  return true;
                })
                .map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && task.requiresEstimate && task.estimateStatus === "waiting_approval" && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onReviewEstimates?.(task.id);
              }}
              className="text-[10px]"
              data-testid={`button-review-estimates-${task.id}`}
            >
              Review & Approve
            </Button>
          )}
          {task.status === "completed" && onViewSummary && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onViewSummary(task.id);
              }}
              data-testid={`button-view-summary-${task.id}`}
            >
              <ClipboardCheck className="w-4 h-4" />
            </Button>
          )}
        </div>
      </TableCell>
      <TableCell className="py-2.5">
        <Select
          value={task.urgency}
          onValueChange={(val) => handleUrgencyChange(task.id, val)}
        >
          <SelectTrigger
            className="text-xs border-0 bg-transparent p-0 shadow-none h-auto"
            data-testid={`select-urgency-${task.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex items-center gap-1 cursor-pointer">
              <Flag className={`w-3.5 h-3.5 ${urg.color} shrink-0`} />
              <span className={`text-xs ${urg.color}`}>{urg.label}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2.5 hidden md:table-cell">
        <Select
          value={task.propertyId || "__none__"}
          onValueChange={(val) => handlePropertyChange(task.id, val)}
        >
          <SelectTrigger
            className="text-sm border-0 bg-transparent p-0 shadow-none h-auto text-left"
            data-testid={`select-property-${task.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <SelectValue placeholder="No property" />
            </span>
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
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    unifiedStatusConfig.forEach(s => { initial[s.key] = true; });
    return initial;
  });
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedParentTasks, setExpandedParentTasks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"tasks" | "projects">("tasks");
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("all");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    taskId: string;
    newStatus: StatusType;
    task: Task;
  } | null>(null);
  const [reviewEstimatesTaskId, setReviewEstimatesTaskId] = useState<string | null>(null);
  const [summaryTaskId, setSummaryTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isPanelFullscreen, setIsPanelFullscreen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const isMobile = useIsMobile();

  const panelOpen = !!selectedTaskId && !isMobile;

  useEffect(() => {
    if (panelOpen) {
      setPanelMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPanelVisible(true));
      });
    } else {
      setPanelVisible(false);
      const timer = setTimeout(() => setPanelMounted(false), 280);
      return () => clearTimeout(timer);
    }
  }, [panelOpen]);

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
      setIsHoldReasonDialogOpen(false);
      setHoldReason("");
      setPendingStatusChange(null);
      toast({
        title: "Task updated",
        description: "Task status has been updated successfully.",
      });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      }, 300);
    },
    onError: async (error: any) => {
      let description = "Failed to update task status.";
      if (error?.message) {
        description = error.message;
      }
      toast({
        title: "Error",
        description,
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
      setProjectDialogOpen(false);
      form.reset();
      toast({
        title: "Project created",
        description: "The project has been created successfully.",
      });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      }, 300);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const updateProjectStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project updated", description: "Status changed successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update project status.", variant: "destructive" });
    },
  });

  const handleProjectStatusChange = (projectId: string, status: string) => {
    updateProjectStatusMutation.mutate({ projectId, status });
  };

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

  const handleSelectTask = (taskId: string) => {
    if (isMobile) {
      navigate(`/tasks/${taskId}`);
    } else {
      setSelectedTaskId((prev) => (prev === taskId ? prev : taskId));
    }
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

  const toggleParentTaskExpanded = (taskId: string) => {
    setExpandedParentTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const subTasksMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks?.forEach((t) => {
      if (t.parentTaskId) {
        if (!map[t.parentTaskId]) map[t.parentTaskId] = [];
        map[t.parentTaskId].push(t);
      }
    });
    return map;
  }, [tasks]);

  const standaloneTasks = useMemo(
    () => tasks?.filter((t) => !t.projectId && !t.parentTaskId) || [],
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
    return filtered;
  }, [standaloneTasks, searchQuery]);

  const filteredProjects = useMemo(() => {
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
  }, [projects, searchQuery]);

  const projectsTabFiltered = useMemo(() => {
    let filtered = projects || [];
    if (projectSearchQuery) {
      const q = projectSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }
    if (projectStatusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === projectStatusFilter);
    }
    return filtered;
  }, [projects, projectSearchQuery, projectStatusFilter]);

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

    if (!isAdmin) {
      filteredProjects.forEach((project) => {
        const unifiedStatus = projectStatusMapping[project.status] || "not_started";
        if (groups[unifiedStatus]) {
          groups[unifiedStatus].push({ type: "project", data: project });
        }
      });
    }

    return groups;
  }, [filteredStandaloneTasks, filteredProjects, isAdmin]);

  const adminUsers = allUsers?.filter((u) => u.role === "admin") || [];
  const technicianUsers = allUsers?.filter((u) => u.role === "technician") || [];
  const staffUsers = allUsers?.filter((u) => u.role === "staff") || [];
  const studentUsers = allUsers?.filter((u) => u.role === "student") || [];
  const userGroups = [
    { label: "Admins", items: adminUsers },
    { label: "Technicians", items: technicianUsers },
    { label: "Staff", items: staffUsers },
    { label: "Students", items: studentUsers },
  ].filter(group => group.items.length > 0);

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

  const getTaskDate = (task: Task): Date | null => {
    if (task.status === "completed" && task.actualCompletionDate) {
      return new Date(task.actualCompletionDate);
    }
    if (task.estimatedCompletionDate) return new Date(task.estimatedCompletionDate);
    if (task.initialDate) return new Date(task.initialDate);
    return null;
  };

  const isToday = (d: Date) => {
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const isThisWeek = (d: Date) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return d >= startOfWeek && d < endOfWeek;
  };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const filterTasksByDate = (allTasks: Task[]) => {
    return allTasks.filter((t) => {
      if (t.status === "completed") {
        const completedDate = t.actualCompletionDate ? new Date(t.actualCompletionDate) : null;
        if (!completedDate || completedDate < sevenDaysAgo) return false;
        if (dateFilter === "today") return isToday(completedDate);
        if (dateFilter === "week") return isThisWeek(completedDate);
        return true;
      }
      const taskDate = getTaskDate(t);
      if (dateFilter === "today") {
        return !taskDate || isToday(taskDate);
      }
      if (dateFilter === "week") {
        return !taskDate || isThisWeek(taskDate);
      }
      return true;
    });
  };

  const groupTasksByDay = (taskList: Task[]): { label: string; dateKey: string; tasks: Task[] }[] => {
    const groups: Record<string, Task[]> = {};
    const unscheduled: Task[] = [];

    for (const t of taskList) {
      const d = getTaskDate(t);
      if (!d) {
        unscheduled.push(t);
      } else {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      }
    }

    const sortedKeys = Object.keys(groups).sort();
    const result: { label: string; dateKey: string; tasks: Task[] }[] = [];

    for (const key of sortedKeys) {
      const [y, m, day] = key.split("-").map(Number);
      const d = new Date(y, m - 1, day);
      const dayName = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const todayLabel = isToday(d) ? " (Today)" : "";
      result.push({ label: `${dayName}${todayLabel}`, dateKey: key, tasks: groups[key] });
    }

    if (unscheduled.length > 0) {
      result.push({ label: "Unscheduled", dateKey: "unscheduled", tasks: unscheduled });
    }

    return result;
  };

  const DateFilterBar = () => (
    <div className="flex gap-1 bg-muted rounded-md p-1" data-testid="date-filter-bar">
      {([["today", "Today"], ["week", "This Week"], ["all", "All"]] as const).map(([value, label]) => (
        <button
          key={value}
          onClick={() => setDateFilter(value)}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
            dateFilter === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover-elevate"
          }`}
          data-testid={`button-filter-${value}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (user?.role === "student") {
    const studentTasks =
      tasks?.filter((t) => {
        if (t.parentTaskId) return false;
        const isAssignedToMe = t.assignedToId === user.id;
        const isStudentPoolTask = t.assignedToId === "student_pool";
        if (!isAssignedToMe && !isStudentPoolTask) return false;
        return true;
      }) || [];

    const filteredTasks = filterTasksByDate(studentTasks);
    const activeTasks = filteredTasks.filter((t) => t.status !== "completed");
    const completedTasks = filteredTasks.filter((t) => t.status === "completed");
    const activeGroups = groupTasksByDay(activeTasks);
    const completedGroups = groupTasksByDay(completedTasks);

    const renderStudentActiveCard = (task: Task, index: number) => {
      const property = getPropertyById(task.propertyId);
      const isInProgress = task.status === "in_progress";
      const isHighUrgency = task.urgency === "high";
      return (
        <div
          key={task.id}
          className={`rounded-lg border-2 p-4 cursor-pointer active-elevate-2 transition-colors ${
            isInProgress
              ? "border-primary bg-primary/5"
              : isHighUrgency
              ? "border-red-400 dark:border-red-600"
              : "border-border"
          }`}
          data-testid={`student-task-card-${task.id}`}
          onClick={() => navigate(`/tasks/${task.id}`)}
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
              isInProgress
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}>
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight truncate" data-testid={`text-task-name-${task.id}`}>
                {task.name}
              </h3>
              {property && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {property.name}
                </p>
              )}
            </div>
            {isInProgress && (
              <Badge variant="default" className="shrink-0" data-testid={`badge-status-${task.id}`}>
                In Progress
              </Badge>
            )}
            {isHighUrgency && !isInProgress && (
              <Badge variant="destructive" className="shrink-0" data-testid={`badge-urgency-${task.id}`}>
                Urgent
              </Badge>
            )}
          </div>
        </div>
      );
    };

    const renderStudentCompletedCard = (task: Task) => {
      const property = getPropertyById(task.propertyId);
      return (
        <div
          key={task.id}
          className="rounded-lg border border-border/50 p-3 cursor-pointer opacity-60"
          data-testid={`student-task-card-${task.id}`}
          onClick={() => navigate(`/tasks/${task.id}`)}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm line-through truncate" data-testid={`text-task-name-${task.id}`}>
                {task.name}
              </h3>
              {property && (
                <p className="text-xs text-muted-foreground truncate">{property.name}</p>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setSummaryTaskId(task.id);
              }}
              data-testid={`button-view-summary-${task.id}`}
            >
              <ClipboardCheck className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    };

    const DaySeparator = ({ label }: { label: string }) => (
      <div className="flex items-center gap-3 pt-2" data-testid={`day-separator-${label}`}>
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{label}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    );

    return (
      <div className="p-4 pb-28 space-y-5 max-w-lg mx-auto">
        <div className="pt-2">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Your Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTasks.length === 0
              ? "Nothing assigned right now"
              : `${activeTasks.length} task${activeTasks.length !== 1 ? "s" : ""} to do`}
          </p>
        </div>

        <DateFilterBar />

        {activeTasks.length === 0 && completedTasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <p className="text-xl font-semibold">All done!</p>
            <p className="text-muted-foreground mt-1">
              {dateFilter === "today" ? "No tasks for today." : dateFilter === "week" ? "No tasks this week." : "No tasks assigned to you right now."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeGroups.map((group) => (
              <div key={group.dateKey} className="space-y-3">
                <DaySeparator label={group.label} />
                {group.tasks.map((task, index) => renderStudentActiveCard(task, index))}
              </div>
            ))}
          </div>
        )}

        {completedTasks.length > 0 && (
          <div>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-sm text-muted-foreground flex items-center gap-1 mb-2"
              data-testid="toggle-completed-tasks"
            >
              {showCompleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showCompleted ? "Hide" : "Show"} {completedTasks.length} completed
            </button>
            {showCompleted && (
              <div className="space-y-2">
                {completedGroups.map((group) => (
                  <div key={group.dateKey} className="space-y-2">
                    <DaySeparator label={group.label} />
                    {group.tasks.map((task) => renderStudentCompletedCard(task))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <CompletedTaskSummary
          taskId={summaryTaskId!}
          open={!!summaryTaskId}
          onOpenChange={(open) => !open && setSummaryTaskId(null)}
        />
      </div>
    );
  }

  if (user?.role === "technician") {
    const techTasks =
      tasks?.filter((t) => {
        if (t.parentTaskId) return false;
        const isAssignedToMe = t.assignedToId === user.id;
        const isTechPoolTask = t.assignedToId === "technician_pool" || t.assignedPool === "technician_pool";
        if (!isAssignedToMe && !isTechPoolTask) return false;
        return true;
      }) || [];

    const filteredTasks = filterTasksByDate(techTasks);
    const activeTasks = filteredTasks.filter((t) => t.status !== "completed");
    const completedTasks = filteredTasks.filter((t) => t.status === "completed");
    const activeGroups = groupTasksByDay(activeTasks);
    const completedGroups = groupTasksByDay(completedTasks);

    const renderTechActiveCard = (task: Task, index: number) => {
      const property = getPropertyById(task.propertyId);
      const isInProgress = task.status === "in_progress";
      const isHighUrgency = task.urgency === "high";
      return (
        <div
          key={task.id}
          className={`rounded-lg border-2 p-4 cursor-pointer active-elevate-2 transition-colors ${
            isInProgress
              ? "border-primary bg-primary/5"
              : isHighUrgency
              ? "border-red-400 dark:border-red-600"
              : "border-border"
          }`}
          data-testid={`tech-task-card-${task.id}`}
          onClick={() => navigate(`/tasks/${task.id}`)}
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
              isInProgress
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}>
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight truncate" data-testid={`text-task-name-${task.id}`}>
                {task.name}
              </h3>
              {property && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {property.name}
                </p>
              )}
            </div>
            {isInProgress && (
              <Badge variant="default" className="shrink-0" data-testid={`badge-status-${task.id}`}>
                In Progress
              </Badge>
            )}
            {isHighUrgency && !isInProgress && (
              <Badge variant="destructive" className="shrink-0" data-testid={`badge-urgency-${task.id}`}>
                Urgent
              </Badge>
            )}
          </div>
        </div>
      );
    };

    const renderTechCompletedCard = (task: Task) => {
      const property = getPropertyById(task.propertyId);
      return (
        <div
          key={task.id}
          className="rounded-lg border-2 border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 cursor-pointer active-elevate-2 transition-colors"
          data-testid={`tech-task-card-${task.id}`}
          onClick={() => navigate(`/tasks/${task.id}`)}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-green-100 dark:bg-green-900/50">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight truncate text-green-900 dark:text-green-100" data-testid={`text-task-name-${task.id}`}>
                {task.name}
              </h3>
              {property && (
                <p className="text-sm text-green-700 dark:text-green-400 mt-0.5 truncate flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {property.name}
                </p>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setSummaryTaskId(task.id);
              }}
              data-testid={`button-view-summary-${task.id}`}
            >
              <ClipboardCheck className="w-4 h-4" />
            </Button>
            <Badge variant="outline" className="shrink-0 border-green-400 dark:border-green-700 text-green-700 dark:text-green-400" data-testid={`badge-completed-${task.id}`}>
              Done
            </Badge>
          </div>
        </div>
      );
    };

    const DaySeparator = ({ label }: { label: string }) => (
      <div className="flex items-center gap-3 pt-2" data-testid={`day-separator-${label}`}>
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{label}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    );

    return (
      <div className="p-4 pb-8 space-y-5 max-w-lg mx-auto">
        <div className="pt-2">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            My Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTasks.length === 0
              ? "Nothing assigned right now"
              : `${activeTasks.length} task${activeTasks.length !== 1 ? "s" : ""} to do`}
          </p>
        </div>

        <DateFilterBar />

        {activeTasks.length === 0 && completedTasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <p className="text-xl font-semibold">All done!</p>
            <p className="text-muted-foreground mt-1">
              {dateFilter === "today" ? "No tasks for today." : dateFilter === "week" ? "No tasks this week." : "No tasks assigned to you right now."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeGroups.map((group) => (
              <div key={group.dateKey} className="space-y-3">
                <DaySeparator label={group.label} />
                {group.tasks.map((task, index) => renderTechActiveCard(task, index))}
              </div>
            ))}

            {completedTasks.length > 0 && (
              <>
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Completed</p>
                </div>
                {completedGroups.map((group) => (
                  <div key={group.dateKey} className="space-y-3">
                    <DaySeparator label={group.label} />
                    {group.tasks.map((task) => renderTechCompletedCard(task))}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <CompletedTaskSummary
          taskId={summaryTaskId!}
          open={!!summaryTaskId}
          onOpenChange={(open) => !open && setSummaryTaskId(null)}
        />
      </div>
    );
  }

  const onProjectSubmit = (data: ProjectFormValues) => {
    createProjectMutation.mutate(data);
  };

  return (
    <>
      <div className={`flex ${panelMounted ? "-mx-8 -mt-6 overflow-hidden" : ""}`} style={panelMounted ? { height: "calc(100vh - 49px)" } : undefined}>
        {/* Task list area */}
        <div
          className={`flex-1 min-w-0 overflow-y-auto ${panelMounted && isPanelFullscreen ? "hidden" : ""}`}
          style={{ transition: "all 280ms cubic-bezier(0.4, 0, 0.2, 1)" }}
        >
          <div className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">
                  {user?.role === "admin" ? "Work" : "My Tasks"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {user?.role === "admin"
                    ? "Manage tasks and projects in one place"
                    : "View and manage your assigned tasks"}
                </p>
              </div>
              {user?.role === "admin" && (
                <div className="flex items-center gap-2 flex-wrap">
                  {activeTab === "tasks" && (
                    <Link href="/tasks/new">
                      <Button data-testid="button-create-task">
                        <Plus className="w-4 h-4 mr-2" />
                        New Task
                      </Button>
                    </Link>
                  )}
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
              <div className="space-y-3">
                <div className="flex gap-1 bg-muted rounded-md p-1" data-testid="work-tabs">
                  {([["tasks", "Tasks"], ["projects", "Projects"]] as const).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setActiveTab(value)}
                      className={`flex-1 px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                        activeTab === value
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover-elevate"
                      }`}
                      data-testid={`tab-${value}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {user?.role === "admin" && activeTab === "tasks" && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-work"
                  />
                </div>
              </div>
            )}

            {user?.role === "admin" && activeTab === "projects" && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search projects..."
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-projects"
                    />
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap" data-testid="project-status-filters">
                  {([
                    ["all", "All"],
                    ["planning", "Planning"],
                    ["in_progress", "In Progress"],
                    ["on_hold", "On Hold"],
                    ["completed", "Completed"],
                    ["cancelled", "Cancelled"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setProjectStatusFilter(value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        projectStatusFilter === value
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background text-muted-foreground border-border hover-elevate"
                      }`}
                      data-testid={`filter-project-status-${value}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {projectsTabFiltered.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderKanban className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">No projects found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {projectSearchQuery || projectStatusFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Create a new project to get started"}
                    </p>
                  </div>
                ) : (
                  <Card data-testid="projects-list">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="min-w-[220px] text-xs font-medium text-muted-foreground">Name</TableHead>
                          <TableHead className="w-[120px] text-xs font-medium text-muted-foreground">Status</TableHead>
                          <TableHead className="w-[100px] text-xs font-medium text-muted-foreground">Priority</TableHead>
                          <TableHead className="w-[130px] text-xs font-medium text-muted-foreground">Progress</TableHead>
                          <TableHead className="w-[150px] hidden md:table-cell text-xs font-medium text-muted-foreground">Property</TableHead>
                          <TableHead className="w-[180px] hidden md:table-cell text-xs font-medium text-muted-foreground">Dates</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectsTabFiltered.map((project) => {
                          const childTasks = projectTasksMap[project.id] || [];
                          const completedChildTasks = childTasks.filter((t) => t.status === "completed").length;
                          const totalChildTasks = childTasks.length;
                          const progressPercent = totalChildTasks > 0 ? Math.round((completedChildTasks / totalChildTasks) * 100) : 0;
                          const propertyName = getPropertyName(project.propertyId);
                          const isOverdue = project.targetEndDate
                            && project.status !== "completed"
                            && new Date(project.targetEndDate) < new Date();
                          const priorityCfg = projectPriorityConfig[project.priority] || projectPriorityConfig.medium;

                          const projectStatusBadgeColors: Record<string, string> = {
                            planning: "bg-gray-500 dark:bg-gray-600 text-white border-transparent",
                            in_progress: "bg-rose-500 dark:bg-rose-600 text-white border-transparent",
                            on_hold: "bg-yellow-500 dark:bg-yellow-600 text-white border-transparent",
                            completed: "bg-emerald-500 dark:bg-emerald-600 text-white border-transparent",
                            cancelled: "bg-red-500 dark:bg-red-600 text-white border-transparent",
                          };

                          const statusLabel: Record<string, string> = {
                            planning: "Planning",
                            in_progress: "In Progress",
                            on_hold: "On Hold",
                            completed: "Completed",
                            cancelled: "Cancelled",
                          };

                          return (
                            <TableRow
                              key={project.id}
                              className="cursor-pointer"
                              onClick={() => navigate(`/projects/${project.id}`)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/projects/${project.id}`); } }}
                              tabIndex={0}
                              role="link"
                              data-testid={`project-row-${project.id}`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-0">
                                  <FolderKanban className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span className="font-medium text-sm truncate" data-testid={`text-project-name-${project.id}`}>
                                    {project.name}
                                  </span>
                                  {isOverdue && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" data-testid={`icon-overdue-${project.id}`} />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-[10px] ${projectStatusBadgeColors[project.status] || ""}`} data-testid={`badge-project-status-${project.id}`}>
                                  {statusLabel[project.status] || project.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${priorityCfg.color}`} data-testid={`badge-project-priority-${project.id}`}>
                                  <Flag className="w-3 h-3 mr-0.5" />
                                  {priorityCfg.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap" data-testid={`progress-${project.id}`}>
                                    {completedChildTasks}/{totalChildTasks}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {propertyName ? (
                                  <span className="text-xs text-muted-foreground truncate block max-w-[140px]" data-testid={`text-project-property-${project.id}`}>
                                    {propertyName}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground/50">—</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-project-dates-${project.id}`}>
                                  {project.startDate ? format(new Date(project.startDate), "MMM d") : "—"}
                                  {project.startDate && project.targetEndDate ? " – " : ""}
                                  {project.targetEndDate ? format(new Date(project.targetEndDate), "MMM d, yyyy") : project.startDate ? "" : "—"}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </div>
            )}

            {(user?.role !== "admin" || activeTab === "tasks") && (
            <div className="space-y-2">
              {unifiedStatusConfig.map((status) => {
                const itemsInGroup = unifiedGroups[status.key] || [];
                const isEmpty = itemsInGroup.length === 0;
                const isCollapsed = collapsedGroups[status.key] ?? true;

                return (
                  <Card key={status.key} data-testid={`group-${status.key}`}>
                    <div
                      className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer select-none ${isEmpty ? "opacity-40" : ""}`}
                      onClick={() => toggleGroup(status.key)}
                      data-testid={`toggle-group-${status.key}`}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotColors[status.key]}`} />
                      <span className="text-sm font-medium">{status.label}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {itemsInGroup.length}
                      </span>
                    </div>

                    {!isCollapsed && !isEmpty && (
                      <div className="border-t">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="min-w-[220px] text-xs font-medium text-muted-foreground">Name</TableHead>
                              <TableHead className="w-[60px] text-xs font-medium text-muted-foreground">Assignee</TableHead>
                              <TableHead className="w-[120px] text-xs font-medium text-muted-foreground">Start Date</TableHead>
                              <TableHead className="w-[140px] text-xs font-medium text-muted-foreground">Due Date</TableHead>
                              <TableHead className="w-[130px] text-xs font-medium text-muted-foreground">Status</TableHead>
                              <TableHead className="w-[100px] text-xs font-medium text-muted-foreground">Priority</TableHead>
                              <TableHead className="w-[150px] hidden md:table-cell text-xs font-medium text-muted-foreground">Property</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itemsInGroup.map((item, idx) => {
                              if (item.type === "task") {
                                const task = item.data as Task;
                                const childSubTasks = subTasksMap[task.id] || [];
                                if (childSubTasks.length > 0) {
                                  return (
                                    <ParentTaskRowGroup
                                      key={task.id}
                                      task={task}
                                      childSubTasks={childSubTasks}
                                      isExpanded={expandedParentTasks.has(task.id)}
                                      onToggleExpand={() => toggleParentTaskExpanded(task.id)}
                                      userGroups={userGroups}
                                      allUsers={allUsers}
                                      properties={properties}
                                      handleStatusChange={handleStatusChange}
                                      handleUrgencyChange={handleUrgencyChange}
                                      handleAssigneeChange={handleAssigneeChange}
                                      handlePropertyChange={handlePropertyChange}
                                      handleTaskTypeChange={handleTaskTypeChange}
                                      handleInlineEdit={handleInlineEdit}
                                      isAdmin={isAdmin}
                                      onReviewEstimates={(taskId) => setReviewEstimatesTaskId(taskId)}
                                      onViewSummary={(taskId) => setSummaryTaskId(taskId)}
                                      onSelectTask={handleSelectTask}
                                      selectedTaskId={selectedTaskId}
                                    />
                                  );
                                }
                                return (
                                  <TaskTableRow
                                    key={task.id}
                                    task={task}
                                    userGroups={userGroups}
                                    allUsers={allUsers}
                                    properties={properties}
                                    handleStatusChange={handleStatusChange}
                                    handleUrgencyChange={handleUrgencyChange}
                                    handleAssigneeChange={handleAssigneeChange}
                                    handlePropertyChange={handlePropertyChange}
                                    handleTaskTypeChange={handleTaskTypeChange}
                                    handleInlineEdit={handleInlineEdit}
                                    rowIndex={idx}
                                    isAdmin={isAdmin}
                                    onReviewEstimates={(taskId) => setReviewEstimatesTaskId(taskId)}
                                    onViewSummary={(taskId) => setSummaryTaskId(taskId)}
                                    onSelectTask={handleSelectTask}
                                    selectedTaskId={selectedTaskId}
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
                                  userGroups={userGroups}
                                  allUsers={allUsers}
                                  properties={properties}
                                  handleStatusChange={handleStatusChange}
                                  handleUrgencyChange={handleUrgencyChange}
                                  handleAssigneeChange={handleAssigneeChange}
                                  handlePropertyChange={handlePropertyChange}
                                  handleTaskTypeChange={handleTaskTypeChange}
                                  handleInlineEdit={handleInlineEdit}
                                  getPropertyName={getPropertyName}
                                  handleProjectStatusChange={handleProjectStatusChange}
                                  isAdmin={isAdmin}
                                  onReviewEstimates={(taskId) => setReviewEstimatesTaskId(taskId)}
                                  onViewSummary={(taskId) => setSummaryTaskId(taskId)}
                                  onSelectTask={handleSelectTask}
                                  selectedTaskId={selectedTaskId}
                                />
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
            )}
          </div>
        </div>

        {/* Slide-in panel */}
        {panelMounted && (
          <div
            className="shrink-0 overflow-hidden border-l"
            style={{
              width: isPanelFullscreen ? "100%" : panelVisible ? "380px" : "0px",
              borderColor: "#EEEEEE",
              transition: "width 280ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            data-testid="task-detail-slide-panel"
          >
            <div style={{ width: isPanelFullscreen ? "100%" : "380px", height: "100%" }}>
              <TaskDetailPanel
                taskId={selectedTaskId!}
                isFullscreen={isPanelFullscreen}
                onClose={() => {
                  setSelectedTaskId(null);
                  setIsPanelFullscreen(false);
                }}
                onToggleFullscreen={() => setIsPanelFullscreen((prev) => !prev)}
                allUsers={allUsers}
                properties={properties}
              />
            </div>
          </div>
        )}
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

      {reviewEstimatesTaskId && (
        <EstimateReviewDialog
          taskId={reviewEstimatesTaskId}
          open={!!reviewEstimatesTaskId}
          onOpenChange={(open) => {
            if (!open) setReviewEstimatesTaskId(null);
          }}
        />
      )}

      <CompletedTaskSummary
        taskId={summaryTaskId!}
        open={!!summaryTaskId}
        onOpenChange={(open) => !open && setSummaryTaskId(null)}
      />
    </>
  );
}

function ParentTaskRowGroup({
  task,
  childSubTasks,
  isExpanded,
  onToggleExpand,
  userGroups,
  allUsers,
  properties,
  handleStatusChange,
  handleUrgencyChange,
  handleAssigneeChange,
  handlePropertyChange,
  handleTaskTypeChange,
  handleInlineEdit,
  isAdmin,
  onReviewEstimates,
  onViewSummary,
  onSelectTask,
  selectedTaskId,
}: {
  task: Task;
  childSubTasks: Task[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  userGroups: { label: string; items: User[] }[];
  allUsers: User[] | undefined;
  properties: Property[] | undefined;
  handleStatusChange: (taskId: string, newStatus: StatusType) => void;
  handleUrgencyChange: (taskId: string, urgency: string) => void;
  handleAssigneeChange: (taskId: string, assignedToId: string) => void;
  handlePropertyChange: (taskId: string, propertyId: string) => void;
  handleTaskTypeChange: (taskId: string, taskType: string) => void;
  handleInlineEdit: (taskId: string, field: string, value: string) => void;
  isAdmin?: boolean;
  onReviewEstimates?: (taskId: string) => void;
  onViewSummary?: (taskId: string) => void;
  onSelectTask?: (taskId: string) => void;
  selectedTaskId?: string | null;
}) {
  const completedSubTasks = childSubTasks.filter((t) => t.status === "completed").length;
  const isOverdue = task.estimatedCompletionDate
    && task.status !== "completed"
    && new Date(task.estimatedCompletionDate) < new Date();
  const assignee = task.assignedToId ? allUsers?.find(u => u.id === task.assignedToId) : null;
  const assigneeInitials = assignee
    ? (assignee.firstName && assignee.lastName
        ? `${assignee.firstName[0]}${assignee.lastName[0]}`
        : (assignee.username?.[0] || "?")).toUpperCase()
    : null;
  const urg = urgencyConfig[task.urgency] || urgencyConfig.low;

  return (
    <>
      <TableRow
        data-testid={`row-parent-task-${task.id}`}
        className={`cursor-pointer ${selectedTaskId === task.id ? "!bg-[#EEF2FF]" : isExpanded ? "bg-muted/20" : ""}`}
        onClick={() => onSelectTask?.(task.id)}
        tabIndex={onSelectTask ? 0 : undefined}
        onKeyDown={onSelectTask ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectTask(task.id); } } : undefined}
        role={onSelectTask ? "button" : undefined}
      >
        <TableCell className="py-2.5">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              data-testid={`button-expand-subtasks-${task.id}`}
              className="shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotColors[task.status] || "bg-gray-400"}`} />
            <EditableTextCell
              value={task.name}
              taskId={task.id}
              field="name"
              onSave={handleInlineEdit}
              linkTo={onSelectTask ? undefined : `/tasks/${task.id}`}
            />
            <Badge
              variant="outline"
              className="text-[10px] shrink-0 no-default-hover-elevate no-default-active-elevate"
              data-testid={`badge-subtask-count-${task.id}`}
            >
              {completedSubTasks}/{childSubTasks.length} complete
            </Badge>
            {isOverdue && (
              <span className="shrink-0" title="Overdue">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="py-2.5">
          <Select
            value={task.assignedToId || "__none__"}
            onValueChange={(val) => handleAssigneeChange(task.id, val)}
          >
            <SelectTrigger
              className="border-0 bg-transparent p-0 shadow-none h-auto"
              data-testid={`select-assignee-${task.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              {assignee ? (
                <Avatar className="w-7 h-7 cursor-pointer" data-testid={`avatar-assignee-${task.id}`}>
                  <AvatarFallback className={`${getAvatarColor(assignee.id)} text-white text-[10px] font-medium`}>
                    {assigneeInitials}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer" data-testid={`avatar-unassigned-${task.id}`}>
                  <UserIcon className="w-3 h-3 text-muted-foreground/40" />
                </span>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {userGroups.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.items.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName && u.lastName
                        ? `${u.firstName} ${u.lastName}`
                        : u.username}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="py-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <EditableDateCell
              value={task.initialDate}
              taskId={task.id}
              field="initialDate"
              onSave={handleInlineEdit}
            />
          </div>
        </TableCell>
        <TableCell className="py-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <EditableDateCell
              value={task.estimatedCompletionDate}
              taskId={task.id}
              field="estimatedCompletionDate"
              onSave={handleInlineEdit}
            />
            {isOverdue && (
              <span className="text-[10px] font-medium text-destructive whitespace-nowrap">Overdue</span>
            )}
          </div>
        </TableCell>
        <TableCell className="py-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Select
              value={task.status}
              onValueChange={(val) => handleStatusChange(task.id, val as StatusType)}
            >
              <SelectTrigger
                className="text-xs border-0 bg-transparent p-0 shadow-none h-auto"
                data-testid={`select-status-${task.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Badge
                  variant="outline"
                  className={`${taskStatusColors[task.status] || ""} text-[10px] font-semibold uppercase tracking-wider cursor-pointer no-default-hover-elevate no-default-active-elevate`}
                >
                  <SelectValue />
                </Badge>
              </SelectTrigger>
              <SelectContent>
                {taskStatusConfig
                  .filter((s) => {
                    if (s.key === "completed" && task.requiresEstimate && task.estimateStatus !== "approved") {
                      return false;
                    }
                    return true;
                  })
                  .map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && task.requiresEstimate && task.estimateStatus === "waiting_approval" && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onReviewEstimates?.(task.id);
                }}
                className="text-[10px]"
                data-testid={`button-review-estimates-${task.id}`}
              >
                Review & Approve
              </Button>
            )}
          </div>
        </TableCell>
        <TableCell className="py-2.5">
          <Select
            value={task.urgency}
            onValueChange={(val) => handleUrgencyChange(task.id, val)}
          >
            <SelectTrigger
              className="text-xs border-0 bg-transparent p-0 shadow-none h-auto"
              data-testid={`select-urgency-${task.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1 cursor-pointer">
                <Flag className={`w-3.5 h-3.5 ${urg.color} shrink-0`} />
                <span className={`text-xs ${urg.color}`}>{urg.label}</span>
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="py-2.5 hidden md:table-cell">
          <Select
            value={task.propertyId || "__none__"}
            onValueChange={(val) => handlePropertyChange(task.id, val)}
          >
            <SelectTrigger
              className="text-sm border-0 bg-transparent p-0 shadow-none h-auto text-left"
              data-testid={`select-property-${task.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <SelectValue placeholder="No property" />
              </span>
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
      </TableRow>

      {isExpanded &&
        childSubTasks.map((subTask, idx) => (
          <TaskTableRow
            key={subTask.id}
            task={subTask}
            userGroups={userGroups}
            allUsers={allUsers}
            properties={properties}
            handleStatusChange={handleStatusChange}
            handleUrgencyChange={handleUrgencyChange}
            handleAssigneeChange={handleAssigneeChange}
            handlePropertyChange={handlePropertyChange}
            handleTaskTypeChange={handleTaskTypeChange}
            handleInlineEdit={handleInlineEdit}
            isChildTask
            rowIndex={idx}
            isAdmin={isAdmin}
            onReviewEstimates={onReviewEstimates}
            onViewSummary={onViewSummary}
            onSelectTask={onSelectTask}
            selectedTaskId={selectedTaskId}
          />
        ))}
    </>
  );
}

function ProjectRowGroup({
  project,
  childTasks,
  completedChildTasks,
  isExpanded,
  onToggleExpand,
  userGroups,
  allUsers,
  properties,
  handleStatusChange,
  handleUrgencyChange,
  handleAssigneeChange,
  handlePropertyChange,
  handleTaskTypeChange,
  handleInlineEdit,
  getPropertyName,
  handleProjectStatusChange,
  isAdmin,
  onReviewEstimates,
  onViewSummary,
  onSelectTask,
  selectedTaskId,
}: {
  project: Project;
  childTasks: Task[];
  completedChildTasks: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  userGroups: { label: string; items: User[] }[];
  allUsers: User[] | undefined;
  properties: Property[] | undefined;
  handleStatusChange: (taskId: string, newStatus: StatusType) => void;
  handleUrgencyChange: (taskId: string, urgency: string) => void;
  handleAssigneeChange: (taskId: string, assignedToId: string) => void;
  handlePropertyChange: (taskId: string, propertyId: string) => void;
  handleTaskTypeChange: (taskId: string, taskType: string) => void;
  handleInlineEdit: (taskId: string, field: string, value: string) => void;
  getPropertyName: (propertyId: string | null) => string | null;
  handleProjectStatusChange: (projectId: string, status: string) => void;
  isAdmin?: boolean;
  onReviewEstimates?: (taskId: string) => void;
  onViewSummary?: (taskId: string) => void;
  onSelectTask?: (taskId: string) => void;
  selectedTaskId?: string | null;
}) {
  const propertyName = getPropertyName(project.propertyId);
  const projectStatusToUnified = projectStatusMapping[project.status] || "not_started";
  const urg = projectPriorityConfig[project.priority] || projectPriorityConfig.low;

  return (
    <>
      <TableRow
        data-testid={`row-project-${project.id}`}
        className={isExpanded ? "bg-muted/20" : ""}
      >
        <TableCell className="py-2.5">
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
            <FolderKanban className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Link href={`/projects/${project.id}`}>
              <span
                className="cursor-pointer hover:underline font-medium"
                data-testid={`text-project-name-${project.id}`}
              >
                {project.name}
              </span>
            </Link>
            <span className="text-xs text-muted-foreground" data-testid={`text-project-progress-${project.id}`}>
              {completedChildTasks}/{childTasks.length} tasks
            </span>
          </div>
        </TableCell>
        <TableCell className="py-2.5">
          <span className="text-sm text-muted-foreground">-</span>
        </TableCell>
        <TableCell className="py-2.5">
          <span className="text-sm text-muted-foreground">-</span>
        </TableCell>
        <TableCell className="py-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm">
              {project.targetEndDate
                ? format(new Date(project.targetEndDate), "M/d/yyyy")
                : "-"}
            </span>
          </div>
        </TableCell>
        <TableCell className="py-2.5">
          <Select
            value={project.status}
            onValueChange={(val) => handleProjectStatusChange(project.id, val)}
          >
            <SelectTrigger
              className="text-xs border-0 bg-transparent p-0 shadow-none h-auto"
              data-testid={`select-project-status-${project.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Badge
                variant="outline"
                className={`${taskStatusColors[projectStatusToUnified] || taskStatusColors.not_started} text-[10px] font-semibold uppercase tracking-wider cursor-pointer no-default-hover-elevate no-default-active-elevate`}
              >
                <SelectValue />
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="py-2.5">
          <span className="flex items-center gap-1">
            <Flag className={`w-3.5 h-3.5 ${urg.color} shrink-0`} />
            <span className={`text-xs ${urg.color}`}>{urg.label}</span>
          </span>
        </TableCell>
        <TableCell className="py-2.5 hidden md:table-cell">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {propertyName || "-"}
          </span>
        </TableCell>
      </TableRow>

      {isExpanded &&
        childTasks.map((task, idx) => (
          <TaskTableRow
            key={task.id}
            task={task}
            userGroups={userGroups}
            allUsers={allUsers}
            properties={properties}
            handleStatusChange={handleStatusChange}
            handleUrgencyChange={handleUrgencyChange}
            handleAssigneeChange={handleAssigneeChange}
            handlePropertyChange={handlePropertyChange}
            handleTaskTypeChange={handleTaskTypeChange}
            handleInlineEdit={handleInlineEdit}
            isChildTask
            rowIndex={idx}
            isAdmin={isAdmin}
            onReviewEstimates={onReviewEstimates}
            onViewSummary={onViewSummary}
            onSelectTask={onSelectTask}
            selectedTaskId={selectedTaskId}
          />
        ))}
    </>
  );
}
