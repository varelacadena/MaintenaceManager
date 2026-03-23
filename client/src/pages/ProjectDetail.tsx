import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft, Edit, Trash2, Plus, Calendar, DollarSign, Building2,
  ClipboardList, Clock, CheckCircle, AlertCircle, XCircle, FolderKanban,
  GanttChart, User as UserIcon, Flag, MapPin, AlertTriangle, Pencil,
  ClipboardCheck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  Cell, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { statusColors, priorityColors, taskStatusColors } from "@/lib/constants";
import { EstimateReviewDialog } from "@/components/EstimateReviewDialog";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Project, Task, Property, Area, User } from "@shared/schema";
import { format, parse } from "date-fns";

const GANTT_STATUS_COLORS: Record<string, string> = {
  not_started: "#6b7280",
  needs_estimate: "#f59e0b",
  waiting_approval: "#8b5cf6",
  in_progress: "#f43f5e",
  on_hold: "#eab308",
  completed: "#10b981",
  cancelled: "#ef4444",
};

const urgencyConfig: Record<string, { color: string; label: string }> = {
  low: { color: "text-muted-foreground", label: "Low" },
  medium: { color: "text-amber-500 dark:text-amber-400", label: "Medium" },
  high: { color: "text-red-500 dark:text-red-400", label: "High" },
};

const tableBadgeColors: Record<string, string> = {
  not_started: "bg-gray-500 dark:bg-gray-600 text-white border-transparent",
  needs_estimate: "bg-amber-500 dark:bg-amber-600 text-white border-transparent",
  waiting_approval: "bg-purple-500 dark:bg-purple-600 text-white border-transparent",
  ready: "bg-cyan-500 dark:bg-cyan-600 text-white border-transparent",
  in_progress: "bg-rose-500 dark:bg-rose-600 text-white border-transparent",
  on_hold: "bg-yellow-500 dark:bg-yellow-600 text-white border-transparent",
  completed: "bg-emerald-500 dark:bg-emerald-600 text-white border-transparent",
  cancelled: "bg-red-500 dark:bg-red-600 text-white border-transparent",
};

const statusDotColors: Record<string, string> = {
  not_started: "bg-gray-400 dark:bg-gray-500",
  needs_estimate: "bg-amber-500 dark:bg-amber-400",
  waiting_approval: "bg-purple-500 dark:bg-purple-400",
  ready: "bg-cyan-500 dark:bg-cyan-400",
  in_progress: "bg-rose-500 dark:bg-rose-400",
  on_hold: "bg-yellow-500 dark:bg-yellow-400",
  completed: "bg-emerald-500 dark:bg-emerald-400",
  cancelled: "bg-red-400 dark:bg-red-500",
};

const taskStatusConfig = [
  { key: "not_started", label: "Not Started" },
  { key: "needs_estimate", label: "Needs Estimate" },
  { key: "waiting_approval", label: "Estimate Review" },
  { key: "ready", label: "Ready" },
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

type StatusType = "not_started" | "needs_estimate" | "waiting_approval" | "ready" | "in_progress" | "on_hold" | "completed";

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
    if (editValue !== dateStr) {
      if (editValue) {
        onSave(taskId, field, new Date(editValue).toISOString());
      } else {
        onSave(taskId, field, "");
      }
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

function ProjectTaskTableRow({
  task,
  userGroups,
  allUsers,
  properties,
  handleStatusChange,
  handleUrgencyChange,
  handleAssigneeChange,
  handlePropertyChange,
  handleInlineEdit,
  onReviewEstimates,
  isAdmin,
  onViewSummary,
}: {
  task: Task;
  userGroups: { label: string; items: User[] }[];
  allUsers: User[] | undefined;
  properties: Property[] | undefined;
  handleStatusChange: (taskId: string, newStatus: StatusType) => void;
  handleUrgencyChange: (taskId: string, urgency: string) => void;
  handleAssigneeChange: (taskId: string, assignedToId: string) => void;
  handlePropertyChange: (taskId: string, propertyId: string) => void;
  handleInlineEdit: (taskId: string, field: string, value: string) => void;
  onReviewEstimates?: (taskId: string) => void;
  isAdmin?: boolean;
  onViewSummary?: (taskId: string) => void;
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
    >
      <TableCell className="py-2.5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotColors[task.status] || "bg-gray-400"}`} />
          <EditableTextCell
            value={task.name}
            taskId={task.id}
            field="name"
            onSave={handleInlineEdit}
            linkTo={`/tasks/${task.id}`}
          />
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
                className={`${tableBadgeColors[task.status] || ""} text-[10px] font-semibold uppercase tracking-wider cursor-pointer no-default-hover-elevate no-default-active-elevate`}
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

function MobileTaskCard({
  task,
  allUsers,
  handleStatusChange,
  handleUrgencyChange,
  onReviewEstimates,
  isAdmin,
  onViewSummary,
}: {
  task: Task;
  allUsers: User[] | undefined;
  handleStatusChange: (taskId: string, newStatus: StatusType) => void;
  handleUrgencyChange: (taskId: string, urgency: string) => void;
  onReviewEstimates?: (taskId: string) => void;
  isAdmin?: boolean;
  onViewSummary?: (taskId: string) => void;
}) {
  const isOverdue = task.estimatedCompletionDate
    && task.status !== "completed"
    && new Date(task.estimatedCompletionDate) < new Date();
  const assignee = task.assignedToId ? allUsers?.find(u => u.id === task.assignedToId) : null;
  const urg = urgencyConfig[task.urgency] || urgencyConfig.low;

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className="p-3 rounded-md border hover-elevate cursor-pointer space-y-2" data-testid={`task-card-${task.id}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotColors[task.status] || "bg-gray-400"}`} />
            <p className="font-medium truncate">{task.name}</p>
            {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
          </div>
          <Badge
            variant="outline"
            className={`${tableBadgeColors[task.status] || ""} text-[10px] font-semibold uppercase tracking-wider shrink-0 no-default-hover-elevate no-default-active-elevate`}
          >
            {task.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {assignee && (
            <span className="flex items-center gap-1">
              <UserIcon className="w-3 h-3" />
              {assignee.firstName && assignee.lastName
                ? `${assignee.firstName} ${assignee.lastName}`
                : assignee.username}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Flag className={`w-3 h-3 ${urg.color}`} />
            <span className={urg.color}>{urg.label}</span>
          </span>
          {task.estimatedCompletionDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(task.estimatedCompletionDate).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.preventDefault()}>
          {isAdmin && task.requiresEstimate && task.estimateStatus === "waiting_approval" && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
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
                e.preventDefault();
                onViewSummary(task.id);
              }}
              data-testid={`button-view-summary-${task.id}`}
            >
              <ClipboardCheck className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}

const editProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  budgetAmount: z.coerce.number().default(0),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  propertyId: z.string().nullable().optional(),
  areaId: z.string().nullable().optional(),
});

type EditProjectFormValues = z.infer<typeof editProjectSchema>;

interface ProjectAnalytics {
  project: Project;
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    onHold: number;
  };
  teamCount: number;
  vendorCount: number;
  budget: {
    allocated: number;
    quoted: number;
    actualParts: number;
    remaining: number;
  };
  time: {
    totalMinutes: number;
    totalHours: number;
  };
  quotes: {
    total: number;
    approved: number;
    pending: number;
  };
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isHoldReasonDialogOpen, setIsHoldReasonDialogOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    taskId: string;
    newStatus: StatusType;
    task: Task;
  } | null>(null);
  const [reviewEstimatesTaskId, setReviewEstimatesTaskId] = useState<string | null>(null);
  const [summaryTaskId, setSummaryTaskId] = useState<string | null>(null);
  const projectId = params?.id || "";
  const isAdmin = user?.role === "admin";

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/projects", projectId, "tasks"],
    enabled: !!projectId,
  });

  const { data: analytics } = useQuery<ProjectAnalytics>({
    queryKey: ["/api/projects", projectId, "analytics"],
    enabled: !!projectId,
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: areas } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

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

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Record<string, any> }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated", description: "Changes saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({
      taskId, newStatus, onHoldReason, requestId, taskName,
    }: {
      taskId: string; newStatus: StatusType; onHoldReason?: string; requestId?: string | null; taskName?: string;
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
      toast({ title: "Task updated", description: "Task status has been updated successfully." });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      }, 300);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to update task status.", variant: "destructive" });
    },
  });

  const handleStatusChange = (taskId: string, newStatus: StatusType) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    if (newStatus === "on_hold" && task.requestId) {
      setPendingStatusChange({ taskId, newStatus, task });
      setIsHoldReasonDialogOpen(true);
    } else {
      updateTaskStatusMutation.mutate({ taskId, newStatus });
    }
  };

  const handleHoldReasonSubmit = () => {
    if (!holdReason.trim()) {
      toast({ title: "Please provide a reason", description: "A reason is required when placing a task on hold.", variant: "destructive" });
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

  const handleUrgencyChange = (taskId: string, urgency: string) => {
    updateTaskMutation.mutate({ taskId, data: { urgency } });
  };

  const handleAssigneeChange = (taskId: string, assignedToId: string) => {
    updateTaskMutation.mutate({ taskId, data: { assignedToId: assignedToId === "__none__" ? null : assignedToId } });
  };

  const handlePropertyChange = (taskId: string, propertyId: string) => {
    updateTaskMutation.mutate({ taskId, data: { propertyId: propertyId === "__none__" ? null : propertyId } });
  };

  const handleTaskTypeChange = (taskId: string, taskType: string) => {
    updateTaskMutation.mutate({ taskId, data: { taskType } });
  };

  const handleInlineEdit = (taskId: string, field: string, value: string) => {
    updateTaskMutation.mutate({ taskId, data: { [field]: value } });
  };

  const editForm = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectSchema),
    values: project ? {
      name: project.name,
      description: project.description || "",
      status: project.status as any,
      priority: project.priority as any,
      budgetAmount: project.budgetAmount || 0,
      notes: project.notes || "",
      startDate: project.startDate ? format(new Date(project.startDate), "yyyy-MM-dd") : "",
      targetEndDate: project.targetEndDate ? format(new Date(project.targetEndDate), "yyyy-MM-dd") : "",
      propertyId: project.propertyId || null,
      areaId: project.areaId || null,
    } : undefined,
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: EditProjectFormValues) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}`, {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate).toISOString() : null,
      });
    },
    onSuccess: () => {
      setEditDialogOpen(false);
      toast({ title: "Project updated successfully" });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      }, 300);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
      setLocation("/work");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find(p => p.id === propertyId)?.name;
  };

  const getAreaName = (areaId: string | null) => {
    if (!areaId) return null;
    return areas?.find(a => a.id === areaId)?.name;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-xl font-semibold">Project not found</h2>
        <Link href="/work">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Work
          </Button>
        </Link>
      </div>
    );
  }

  const taskProgress = analytics?.taskStats.total
    ? Math.round((analytics.taskStats.completed / analytics.taskStats.total) * 100)
    : 0;

  const isOverdue = project.targetEndDate
    && !["completed", "cancelled"].includes(project.status)
    && new Date(project.targetEndDate) < new Date();

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/work">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <FolderKanban className="w-5 h-5 text-indigo-500" />
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-project-name">{project.name}</h1>
              {isOverdue && (
                <Badge variant="destructive" className="shrink-0" data-testid="badge-overdue">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={statusColors[project.status]} variant="secondary">
                {project.status.replace(/_/g, " ")}
              </Badge>
              <Badge className={priorityColors[project.priority]} variant="secondary">
                {project.priority}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)} data-testid="button-edit-project">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} data-testid="button-delete-project">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {project.description && (
        <p className="text-muted-foreground" data-testid="text-project-description">{project.description}</p>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ClipboardList className="w-4 h-4" />
              <span>Task Progress</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-task-progress">
              {analytics?.taskStats.completed || 0}/{analytics?.taskStats.total || 0}
            </div>
            <Progress value={taskProgress} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span>Budget</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-budget">
              ${(project.budgetAmount || 0).toLocaleString()}
            </div>
            {analytics && analytics.budget.remaining !== analytics.budget.allocated && (
              <p className={`text-xs mt-1 ${(analytics.budget.remaining || 0) < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                ${(analytics.budget.remaining || 0).toLocaleString()} remaining
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span>Time Logged</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-time-logged">
              {analytics?.time.totalHours || 0}h
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" />
              <span>Timeline</span>
            </div>
            <div className="text-sm space-y-0.5" data-testid="text-timeline">
              {project.startDate ? (
                <p>{format(new Date(project.startDate), "MMM d, yyyy")}</p>
              ) : (
                <p className="text-muted-foreground">No start date</p>
              )}
              {project.targetEndDate && (
                <p className="text-muted-foreground">to {format(new Date(project.targetEndDate), "MMM d, yyyy")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {(getPropertyName(project.propertyId) || getAreaName(project.areaId) || (analytics && (analytics.budget.quoted > 0 || analytics.budget.actualParts > 0))) && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {getPropertyName(project.propertyId) && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>{getPropertyName(project.propertyId)}</span>
                </div>
              )}
              {getAreaName(project.areaId) && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span>Area: {getAreaName(project.areaId)}</span>
                </div>
              )}
              {analytics && analytics.budget.quoted > 0 && (
                <div className="text-muted-foreground">
                  Quoted: ${analytics.budget.quoted.toLocaleString()}
                </div>
              )}
              {analytics && analytics.budget.actualParts > 0 && (
                <div className="text-muted-foreground">
                  Parts: ${analytics.budget.actualParts.toLocaleString()}
                </div>
              )}
              {analytics && analytics.quotes.total > 0 && (
                <div className="text-muted-foreground">
                  Quotes: {analytics.quotes.approved}/{analytics.quotes.total} approved
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {analytics && analytics.taskStats.total > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-muted-foreground">{analytics.taskStats.notStarted} not started</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-muted-foreground">{analytics.taskStats.inProgress} in progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-muted-foreground">{analytics.taskStats.onHold} on hold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="text-muted-foreground">{analytics.taskStats.completed} completed</span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg">Tasks</CardTitle>
          <Link href={`/tasks/new?projectId=${projectId}`}>
            <Button size="sm" data-testid="button-add-task">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {tasks && tasks.length > 0 ? (
            isMobile ? (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <MobileTaskCard
                    key={task.id}
                    task={task}
                    allUsers={allUsers}
                    handleStatusChange={handleStatusChange}
                    handleUrgencyChange={handleUrgencyChange}
                    onReviewEstimates={(id) => setReviewEstimatesTaskId(id)}
                    isAdmin={isAdmin}
                    onViewSummary={(id) => setSummaryTaskId(id)}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Task</TableHead>
                      <TableHead className="w-[50px]">Assignee</TableHead>
                      <TableHead className="min-w-[110px]">Start</TableHead>
                      <TableHead className="min-w-[110px]">Due</TableHead>
                      <TableHead className="min-w-[140px]">Status</TableHead>
                      <TableHead className="w-[80px]">Urgency</TableHead>
                      <TableHead className="hidden md:table-cell min-w-[120px]">Property</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <ProjectTaskTableRow
                        key={task.id}
                        task={task}
                        userGroups={userGroups}
                        allUsers={allUsers}
                        properties={properties}
                        handleStatusChange={handleStatusChange}
                        handleUrgencyChange={handleUrgencyChange}
                        handleAssigneeChange={handleAssigneeChange}
                        handlePropertyChange={handlePropertyChange}
                        handleInlineEdit={handleInlineEdit}
                        onReviewEstimates={(id) => setReviewEstimatesTaskId(id)}
                        isAdmin={isAdmin}
                        onViewSummary={(id) => setSummaryTaskId(id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No tasks assigned to this project yet
            </p>
          )}
        </CardContent>
      </Card>

      <ProjectGanttChart tasks={tasks || []} project={project} />

      {project.notes && (
        <Collapsible defaultOpen={false}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer">
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-project-notes">{project.notes}</p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => updateProjectMutation.mutate(data))} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-project-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-edit-project-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-project-status">
                            <SelectValue />
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
                  control={editForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-project-priority">
                            <SelectValue />
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
              <FormField
                control={editForm.control}
                name="budgetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Amount</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-edit-project-budget" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-project-property">
                            <SelectValue placeholder="No property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {properties?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="areaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-project-area">
                            <SelectValue placeholder="No area" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {areas?.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <DatePicker
                        value={field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : undefined}
                        onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        placeholder="mm/dd/yyyy"
                        data-testid="input-edit-project-start-date"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="targetEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target End Date</FormLabel>
                      <DatePicker
                        value={field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : undefined}
                        onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        placeholder="mm/dd/yyyy"
                        data-testid="input-edit-project-end-date"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-edit-project-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProjectMutation.isPending} data-testid="button-save-project">
                  {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteProjectMutation.mutate()}
              disabled={deleteProjectMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHoldReasonDialogOpen} onOpenChange={(open) => {
        setIsHoldReasonDialogOpen(open);
        if (!open) { setHoldReason(""); setPendingStatusChange(null); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hold Reason</DialogTitle>
            <DialogDescription>
              Please provide a reason for placing this task on hold. The requester will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
            placeholder="Enter reason..."
            className="resize-none"
            rows={3}
            data-testid="textarea-hold-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsHoldReasonDialogOpen(false); setHoldReason(""); setPendingStatusChange(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleHoldReasonSubmit}
              disabled={updateTaskStatusMutation.isPending}
              data-testid="button-confirm-hold"
            >
              {updateTaskStatusMutation.isPending ? "Saving..." : "Place On Hold"}
            </Button>
          </DialogFooter>
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

      {summaryTaskId && (
        <CompletedTaskSummary
          taskId={summaryTaskId}
          open={!!summaryTaskId}
          onOpenChange={(open) => {
            if (!open) setSummaryTaskId(null);
          }}
        />
      )}
    </div>
  );
}

function ProjectGanttChart({ tasks, project }: { tasks: Task[]; project: Project }) {
  const tasksWithDates = tasks.filter((t) => t.estimatedCompletionDate);
  const tasksWithoutDates = tasks.filter((t) => !t.estimatedCompletionDate);

  const allTimestamps = [
    project.startDate ? new Date(project.startDate).getTime() : null,
    project.targetEndDate ? new Date(project.targetEndDate).getTime() : null,
    ...tasksWithDates.map((t) => new Date(t.estimatedCompletionDate!).getTime()),
    ...tasksWithDates.map((t) =>
      t.scheduledStartTime ? new Date(t.scheduledStartTime).getTime() : null
    ),
  ].filter((v): v is number => v !== null);

  if (tasksWithDates.length === 0 && tasksWithoutDates.length === 0) return null;

  const minDate = allTimestamps.length > 0 ? Math.min(...allTimestamps) : Date.now();
  const maxDate = allTimestamps.length > 0 ? Math.max(...allTimestamps) : Date.now() + 86400000 * 7;
  const range = Math.max(maxDate - minDate, 86400000);

  const ganttData = tasksWithDates.map((task) => {
    const taskStart = task.scheduledStartTime
      ? new Date(task.scheduledStartTime).getTime()
      : minDate;
    const taskEnd = new Date(task.estimatedCompletionDate!).getTime();
    const spacer = taskStart - minDate;
    const duration = Math.max(taskEnd - taskStart, range * 0.015);
    const label = task.name.length > 22 ? task.name.substring(0, 22) + "…" : task.name;
    return { label, fullName: task.name, status: task.status, spacer, duration, taskStart, taskEnd };
  });

  const projectEndMs = project.targetEndDate
    ? new Date(project.targetEndDate).getTime() - minDate
    : null;

  const formatTickDate = (ms: number) => {
    const d = new Date(minDate + ms);
    return format(d, "MMM d");
  };

  const customTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const entry = payload.find((p: any) => p.dataKey === "duration");
    if (!entry) return null;
    const d = entry.payload;
    return (
      <div className="bg-popover border rounded-md shadow-md p-3 text-sm space-y-1">
        <p className="font-semibold">{d.fullName}</p>
        <p className="text-muted-foreground capitalize">{d.status.replace(/_/g, " ")}</p>
        {d.taskStart !== minDate && (
          <p className="text-xs text-muted-foreground">
            Start: {format(new Date(d.taskStart), "MMM d, yyyy")}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Due: {format(new Date(d.taskEnd), "MMM d, yyyy")}
        </p>
      </div>
    );
  };

  return (
    <Card data-testid="card-project-gantt">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <GanttChart className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-lg">Timeline</CardTitle>
        </div>
        {tasksWithDates.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {tasksWithDates.length} scheduled · {tasksWithoutDates.length} unscheduled
          </span>
        )}
      </CardHeader>
      <CardContent>
        {tasksWithDates.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            Add due dates to tasks to see the timeline.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(ganttData.length * 0, 400) }}>
              <ResponsiveContainer width="100%" height={Math.max(ganttData.length * 36 + 40, 120)}>
                <BarChart
                  layout="vertical"
                  data={ganttData}
                  margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  barCategoryGap="25%"
                >
                  <XAxis
                    type="number"
                    domain={[0, range]}
                    tickFormatter={formatTickDate}
                    tick={{ fontSize: 11 }}
                    tickCount={5}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={130}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={customTooltip} cursor={{ fill: "transparent" }} />
                  {projectEndMs !== null && (
                    <ReferenceLine
                      x={projectEndMs}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="4 2"
                      strokeWidth={1.5}
                      label={{ value: "Deadline", position: "top", fontSize: 10, fill: "hsl(var(--destructive))" }}
                    />
                  )}
                  <Bar dataKey="spacer" stackId="g" fill="transparent" isAnimationActive={false} />
                  <Bar dataKey="duration" stackId="g" radius={[3, 3, 3, 3]} isAnimationActive={false}>
                    {ganttData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={GANTT_STATUS_COLORS[entry.status] || "#6b7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {tasksWithoutDates.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Unscheduled
            </p>
            <div className="flex flex-wrap gap-2">
              {tasksWithoutDates.map((task) => (
                <Badge key={task.id} variant="outline" className="text-xs font-normal">
                  {task.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
