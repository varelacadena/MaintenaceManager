import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Pencil,
  Trash2,
  MapPin,
  Clock,
  ChevronRight,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Video,
  MessageSquare,
  Package,
  History,
  Flag,
  Calendar,
  User as UserIcon,
  Camera,
  ScanLine,
  StickyNote,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Task, User, Property, Upload } from "@shared/schema";

const panelStatusDotStyle: Record<string, string> = {
  not_started: "#9CA3AF",
  needs_estimate: "#E6A817",
  waiting_approval: "#7C3AED",
  in_progress: "#4338CA",
  on_hold: "#E6A817",
  completed: "#15803D",
  cancelled: "#D94F4F",
};

const panelStatusPillStyle: Record<string, { bg: string; text: string }> = {
  not_started: { bg: "#4A4A4A", text: "#FFFFFF" },
  needs_estimate: { bg: "#FEF3C7", text: "#92400E" },
  waiting_approval: { bg: "#EDE9FE", text: "#7C3AED" },
  in_progress: { bg: "#EEF2FF", text: "#4338CA" },
  on_hold: { bg: "#FEF3C7", text: "#92400E" },
  completed: { bg: "#F0FDF4", text: "#15803D" },
  cancelled: { bg: "#FEF2F2", text: "#D94F4F" },
};

const panelStatusLabels: Record<string, string> = {
  not_started: "NOT STARTED",
  needs_estimate: "NEEDS ESTIMATE",
  waiting_approval: "ESTIMATE REVIEW",
  in_progress: "IN PROGRESS",
  on_hold: "ON HOLD",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: "#9CA3AF", label: "Low" },
  medium: { color: "#E6A817", label: "Medium" },
  high: { color: "#D94F4F", label: "High" },
};

const taskTypeLabels: Record<string, string> = {
  one_time: "One Time",
  recurring: "Recurring",
  preventive: "Preventive",
};

const avatarColors = [
  "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
  "#F43F5E", "#06B6D4", "#6366F1", "#14B8A6",
];

function getAvatarColorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

interface TaskDetailPanelProps {
  taskId: string;
  isFullscreen: boolean;
  onClose: () => void;
  onToggleFullscreen: () => void;
  allUsers?: User[];
  properties?: Property[];
}

export function TaskDetailPanel({
  taskId,
  isFullscreen,
  onClose,
  onToggleFullscreen,
  allUsers,
  properties,
}: TaskDetailPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === "admin";

  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["/api/tasks", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch task");
      return res.json();
    },
    enabled: !!taskId,
  });

  const { data: subtasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks", taskId, "subtasks"],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!taskId,
  });

  const { data: uploads } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/task", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/uploads/task/${taskId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!taskId,
  });

  const docCount = uploads?.filter(u => !u.fileType.startsWith("image/") && !u.fileType.startsWith("video/")).length || 0;
  const imgCount = uploads?.filter(u => u.fileType.startsWith("image/")).length || 0;
  const vidCount = uploads?.filter(u => u.fileType.startsWith("video/")).length || 0;

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
      toast({ title: "Task updated", description: "Status changed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const updateSubtaskStatusMutation = useMutation({
    mutationFn: async ({ subtaskId, status }: { subtaskId: string; status: string }) => {
      return apiRequest("PATCH", `/api/tasks/${subtaskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "subtasks"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted", description: "Task has been permanently removed." });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" });
    },
  });

  const property = task?.propertyId
    ? properties?.find((p) => p.id === task.propertyId)
    : null;

  const assignee = task?.assignedToId
    ? allUsers?.find((u) => u.id === task.assignedToId)
    : null;

  const assigneeInitials = assignee
    ? (assignee.firstName && assignee.lastName
        ? `${assignee.firstName[0]}${assignee.lastName[0]}`
        : (assignee.username?.[0] || "?")
      ).toUpperCase()
    : null;

  const assigneeName = assignee
    ? assignee.firstName && assignee.lastName
      ? `${assignee.firstName} ${assignee.lastName}`
      : assignee.username || "Unknown"
    : "Unassigned";

  const completedSubtasks = subtasks?.filter((s) => s.status === "completed").length || 0;
  const totalSubtasks = subtasks?.length || 0;
  const allSubtasksComplete = totalSubtasks > 0 && completedSubtasks === totalSubtasks;
  const isStarted = task?.status === "in_progress";
  const isCompleted = task?.status === "completed";
  const isNotStarted = task?.status === "not_started";

  const urg = priorityConfig[task?.urgency || "low"] || priorityConfig.low;

  const isOverdue = task?.estimatedCompletionDate
    && task.status !== "completed"
    && new Date(task.estimatedCompletionDate) < new Date();

  const toggleSubtaskExpanded = (id: string) => {
    setExpandedSubtasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartTask = () => {
    updateStatusMutation.mutate("in_progress");
  };

  const handleMarkComplete = () => {
    if (!allSubtasksComplete && totalSubtasks > 0) {
      toast({
        title: "Cannot complete task",
        description: "All subtasks must be completed first.",
        variant: "destructive",
      });
      return;
    }
    updateStatusMutation.mutate("completed");
  };

  const handleSubtaskToggle = (subtask: Task) => {
    if (!isStarted) return;
    const newStatus = subtask.status === "completed" ? "not_started" : "completed";
    updateSubtaskStatusMutation.mutate({ subtaskId: subtask.id, status: newStatus });
  };

  if (isLoading || !task) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse space-y-4 w-full p-6">
          <div className="h-4 rounded w-3/4" style={{ backgroundColor: "#EEEEEE" }} />
          <div className="h-4 rounded w-1/2" style={{ backgroundColor: "#EEEEEE" }} />
          <div className="h-20 rounded w-full" style={{ backgroundColor: "#EEEEEE" }} />
        </div>
      </div>
    );
  }

  const statusPill = panelStatusPillStyle[task.status] || panelStatusPillStyle.not_started;
  const statusDot = panelStatusDotStyle[task.status] || panelStatusDotStyle.not_started;
  const statusLabel = panelStatusLabels[task.status] || "UNKNOWN";

  const mainContent = (
    <div className="flex-1 overflow-y-auto" data-testid="panel-main-content">
      {/* Admin bar */}
      {isAdmin && !isFullscreen && (
        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderBottom: "1px solid #EEEEEE" }}>
          <Button
            variant="outline"
            size="sm"
            data-testid="button-panel-edit"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#EEEEEE", color: "#1A1A1A" }}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            data-testid="button-panel-delete"
            style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA", color: "#D94F4F" }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete
          </Button>
          {isNotStarted && (
            <Button
              size="sm"
              onClick={handleStartTask}
              disabled={updateStatusMutation.isPending}
              data-testid="button-panel-start-task"
              style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Start Task
            </Button>
          )}
          {isStarted && (
            <Button
              size="sm"
              onClick={handleMarkComplete}
              disabled={updateStatusMutation.isPending || (totalSubtasks > 0 && !allSubtasksComplete)}
              data-testid="button-panel-mark-complete"
              style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Mark Complete
            </Button>
          )}
        </div>
      )}

      {/* Task title section */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
        <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#9CA3AF" }}>
          TASK
        </p>
        <h2
          className="text-base font-medium mt-1"
          style={{ color: "#1A1A1A" }}
          data-testid="text-panel-task-title"
        >
          {task.name}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
          {taskTypeLabels[task.taskType] || task.taskType} · {task.executorType === "student" ? "Student Pool" : "Technician Pool"}
        </p>
      </div>

      {/* Meta grid */}
      <div
        className={`grid px-5 py-4 gap-4 ${isFullscreen ? "grid-cols-4" : "grid-cols-2"}`}
        style={{ borderBottom: "1px solid #EEEEEE" }}
      >
        <div>
          <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#9CA3AF" }}>
            LOCATION
          </p>
          <p className="text-sm font-medium mt-1" style={{ color: "#1A1A1A" }}>
            {property?.name || "No location"}
          </p>
          {property?.address && (
            <p className="text-xs" style={{ color: "#6B7280" }}>{property.address}</p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#9CA3AF" }}>
            TIME LOGGED
          </p>
          <p className="text-sm font-medium mt-1" style={{ color: "#1A1A1A" }}>
            0h 0m
          </p>
        </div>
        {isFullscreen && (
          <>
            <div>
              <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#9CA3AF" }}>
                ASSIGNED TO
              </p>
              <div className="flex items-center gap-2 mt-1">
                {assignee ? (
                  <>
                    <Avatar className="w-6 h-6">
                      <AvatarFallback
                        style={{ backgroundColor: getAvatarColorForId(assignee.id), color: "#FFFFFF", fontSize: "10px" }}
                      >
                        {assigneeInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>{assigneeName}</span>
                  </>
                ) : (
                  <span className="text-sm" style={{ color: "#6B7280" }}>Unassigned</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#9CA3AF" }}>
                TYPE
              </p>
              <p className="text-sm font-medium mt-1" style={{ color: "#1A1A1A" }}>
                {taskTypeLabels[task.taskType] || task.taskType}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
          <p className="text-[11px] font-medium tracking-wider uppercase mb-2" style={{ color: "#9CA3AF" }}>
            DESCRIPTION
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "#1A1A1A", lineHeight: "1.55" }}>
            {task.description}
          </p>
        </div>
      )}

      {/* Resources row */}
      <div
        className="px-5 py-3 cursor-pointer"
        style={{ borderBottom: "1px solid #EEEEEE" }}
        onClick={() => setResourcesExpanded(!resourcesExpanded)}
        data-testid="button-toggle-resources"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: "#6B7280" }} />
          <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>Resources</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: "#EDE9FE", color: "#7C3AED" }}
            >
              {docCount} docs
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
            >
              {imgCount} img
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: "#FFF1F2", color: "#F43F5E" }}
            >
              {vidCount} vid
            </span>
            {resourcesExpanded ? (
              <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
            ) : (
              <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
            )}
          </div>
        </div>
        {resourcesExpanded && (
          <div className="mt-3 space-y-1" onClick={(e) => e.stopPropagation()}>
            {(!uploads || uploads.length === 0) ? (
              <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>
                No resources attached
              </p>
            ) : (
              uploads.map((upload) => {
                const isImage = upload.fileType.startsWith("image/");
                const isVideo = upload.fileType.startsWith("video/");
                const TypeIcon = isImage ? ImageIcon : isVideo ? Video : FileText;
                const badgeBg = isImage ? "#F3F4F6" : isVideo ? "#FFF1F2" : "#EDE9FE";
                const badgeColor = isImage ? "#6B7280" : isVideo ? "#F43F5E" : "#7C3AED";
                const typeLabel = isImage ? "IMG" : isVideo ? "VID" : "DOC";
                return (
                  <a
                    key={upload.id}
                    href={upload.objectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 py-1.5 px-1 rounded hover-elevate"
                    data-testid={`resource-item-${upload.id}`}
                  >
                    <TypeIcon className="w-4 h-4 shrink-0" style={{ color: badgeColor }} />
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                      style={{ backgroundColor: badgeBg, color: badgeColor }}
                    >
                      {typeLabel}
                    </span>
                    <span className="text-xs truncate flex-1" style={{ color: "#374151" }}>
                      {upload.fileName}
                    </span>
                    <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "#9CA3AF" }} />
                  </a>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Subtasks section */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#9CA3AF" }}>
            SUBTASKS
          </p>
          <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
            {completedSubtasks} / {totalSubtasks}
          </span>
        </div>

        {/* Progress bar */}
        {isStarted && totalSubtasks > 0 && (
          <div className="w-full rounded-full overflow-hidden mb-3" style={{ height: "4px", backgroundColor: "#EEEEEE" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0}%`,
                backgroundColor: "#4338CA",
              }}
            />
          </div>
        )}

        {/* Completion warning */}
        {isStarted && totalSubtasks > 0 && !allSubtasksComplete && (
          <div
            className="flex items-center gap-2 text-xs py-2 px-3 rounded mb-3"
            style={{ borderLeft: "3px solid #D94F4F", backgroundColor: "#FEF2F2", color: "#D94F4F" }}
            data-testid="warning-subtasks-incomplete"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            All subtasks must be completed before marking this task as done
          </div>
        )}

        {/* Subtask rows */}
        {totalSubtasks === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>
            No subtasks
          </p>
        ) : (
          <div className="space-y-1">
            {subtasks?.map((subtask) => {
              const isSubCompleted = subtask.status === "completed";
              const isExpanded = expandedSubtasks.has(subtask.id);
              const isLocked = !isStarted && !isCompleted;

              return (
                <div key={subtask.id} data-testid={`panel-subtask-${subtask.id}`}>
                  <div
                    className="flex items-center gap-3 py-2.5 px-2 rounded cursor-pointer transition-opacity"
                    style={isLocked ? { opacity: 0.45 } : undefined}
                    onClick={() => !isLocked && toggleSubtaskExpanded(subtask.id)}
                  >
                    <button
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        borderColor: isSubCompleted ? "#4338CA" : "#D1D5DB",
                        backgroundColor: isSubCompleted ? "#4338CA" : "transparent",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isLocked && !isCompleted) handleSubtaskToggle(subtask);
                      }}
                      disabled={isLocked || isCompleted}
                      data-testid={`checkbox-subtask-${subtask.id}`}
                    >
                      {isSubCompleted && (
                        <CheckCircle2 className="w-3 h-3" style={{ color: "#FFFFFF" }} />
                      )}
                    </button>
                    <span
                      className={`text-sm flex-1 ${isSubCompleted ? "line-through" : ""}`}
                      style={{ color: isSubCompleted ? "#9CA3AF" : "#1A1A1A" }}
                    >
                      {subtask.name}
                    </span>
                    {!isLocked && (
                      isExpanded ? (
                        <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                      )
                    )}
                  </div>

                  {isExpanded && !isLocked && (
                    <div className="ml-8 pb-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          className="flex items-center justify-center rounded"
                          style={{
                            width: "54px",
                            height: "54px",
                            border: "2px dashed #D1D5DB",
                          }}
                          data-testid={`button-add-photo-${subtask.id}`}
                        >
                          <Camera className="w-5 h-5" style={{ color: "#9CA3AF" }} />
                        </button>
                      </div>
                      <Textarea
                        placeholder="Add a note..."
                        className="text-xs resize-none border"
                        style={{ borderColor: "#EEEEEE", minHeight: "60px" }}
                        data-testid={`textarea-subtask-note-${subtask.id}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed banner */}
      {isCompleted && (
        <div
          className="mx-5 my-4 flex items-center gap-2 text-sm py-3 px-4 rounded-lg"
          style={{ backgroundColor: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0" }}
          data-testid="banner-task-completed"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Task completed · All subtasks done · evidence captured
        </div>
      )}

      {/* Secondary links */}
      <div>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
          style={{ borderBottom: "1px solid #EEEEEE", color: "#1A1A1A" }}
          onClick={() => navigate(`/tasks/${taskId}`)}
          data-testid="link-panel-messages"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" style={{ color: "#6B7280" }} />
            Messages
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        </button>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
          style={{ borderBottom: "1px solid #EEEEEE", color: "#1A1A1A" }}
          onClick={() => navigate(`/tasks/${taskId}`)}
          data-testid="link-panel-parts"
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: "#6B7280" }} />
            Parts Used
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        </button>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
          style={{ color: "#1A1A1A" }}
          onClick={() => navigate(`/tasks/${taskId}`)}
          data-testid="link-panel-history"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" style={{ color: "#6B7280" }} />
            History
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        </button>
      </div>
    </div>
  );

  const rightSidebar = isFullscreen ? (
    <div
      className="w-60 shrink-0 overflow-y-auto"
      style={{ borderLeft: "1px solid #EEEEEE", backgroundColor: "#FFFFFF" }}
      data-testid="panel-right-sidebar"
    >
      {/* Status section */}
      <div className="p-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusDot }} />
          <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
            {panelStatusLabels[task.status]}
          </span>
        </div>
        {isNotStarted && (
          <Button
            className="w-full"
            size="sm"
            onClick={handleStartTask}
            disabled={updateStatusMutation.isPending}
            data-testid="button-sidebar-start-task"
            style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Start Task
          </Button>
        )}
        {isStarted && (
          <Button
            className="w-full"
            size="sm"
            onClick={handleMarkComplete}
            disabled={updateStatusMutation.isPending || (totalSubtasks > 0 && !allSubtasksComplete)}
            data-testid="button-sidebar-mark-complete"
            style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Mark Complete
          </Button>
        )}
      </div>

      {/* Actions section */}
      <div className="p-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
        <p className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: "#9CA3AF" }}>
          ACTIONS
        </p>
        <div className="space-y-1">
          {[
            { icon: Camera, label: "Photos / Docs" },
            { icon: ScanLine, label: "Scan" },
            { icon: StickyNote, label: "Add Note" },
            { icon: Clock, label: "Log Time" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors"
              style={{ color: "#1A1A1A" }}
              data-testid={`button-action-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="w-4 h-4" style={{ color: "#6B7280" }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Details section */}
      <div className="p-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
        <p className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: "#9CA3AF" }}>
          DETAILS
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#6B7280" }}>Priority</span>
            <div className="flex items-center gap-1">
              <Flag className="w-3 h-3" style={{ color: urg.color }} />
              <span className="text-xs font-medium" style={{ color: urg.color }}>{urg.label}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#6B7280" }}>Due Date</span>
            <span className="text-xs font-medium" style={{ color: isOverdue ? "#D94F4F" : "#1A1A1A" }}>
              {task.estimatedCompletionDate
                ? new Date(task.estimatedCompletionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#6B7280" }}>Type</span>
            <span className="text-xs font-medium" style={{ color: "#1A1A1A" }}>
              {taskTypeLabels[task.taskType] || task.taskType}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#6B7280" }}>Assigned</span>
            <div className="flex items-center gap-1.5">
              {assignee ? (
                <>
                  <Avatar className="w-5 h-5">
                    <AvatarFallback
                      style={{ backgroundColor: getAvatarColorForId(assignee.id), color: "#FFFFFF", fontSize: "8px" }}
                    >
                      {assigneeInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium" style={{ color: "#1A1A1A" }}>
                    {assignee.firstName || assignee.username}
                  </span>
                </>
              ) : (
                <span className="text-xs" style={{ color: "#6B7280" }}>Unassigned</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Scheduling */}
      <div className="p-4">
        <p className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: "#9CA3AF" }}>
          AI SCHEDULING
        </p>
        <button
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium border transition-colors"
          style={{ color: "#4338CA", borderColor: "#EEEEEE" }}
          data-testid="button-ai-schedule"
        >
          <Sparkles className="w-4 h-4" />
          Suggest Schedule
        </button>
      </div>

      {/* Admin actions in fullscreen sidebar */}
      {isAdmin && (
        <div className="p-4" style={{ borderTop: "1px solid #EEEEEE" }}>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              data-testid="button-sidebar-edit"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#EEEEEE", color: "#1A1A1A" }}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setDeleteDialogOpen(true)}
              data-testid="button-sidebar-delete"
              style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA", color: "#D94F4F" }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: "#FFFFFF" }}
      data-testid="task-detail-panel"
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid #EEEEEE" }}
      >
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          data-testid="button-panel-close"
        >
          <ArrowLeft className="w-4 h-4" style={{ color: "#1A1A1A" }} />
        </Button>

        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusDot }} />
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ backgroundColor: statusPill.bg, color: statusPill.text }}
        >
          {statusLabel}
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5">
          <Flag className="w-3 h-3" style={{ color: urg.color }} />
          <span className="text-xs font-medium" style={{ color: urg.color }}>{urg.label}</span>
        </div>

        {task.estimatedCompletionDate && (
          <span className="text-xs font-medium ml-2" style={{ color: isOverdue ? "#D94F4F" : "#6B7280" }}>
            {new Date(task.estimatedCompletionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}

        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleFullscreen}
          data-testid="button-panel-fullscreen-toggle"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" style={{ color: "#1A1A1A" }} />
          ) : (
            <Maximize2 className="w-4 h-4" style={{ color: "#1A1A1A" }} />
          )}
        </Button>
      </div>

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        {mainContent}
        {rightSidebar}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-task">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task and all its subtasks will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskMutation.mutate()}
              disabled={deleteTaskMutation.isPending}
              data-testid="button-confirm-delete"
              style={{ backgroundColor: "#D94F4F", color: "#FFFFFF" }}
            >
              {deleteTaskMutation.isPending ? "Deleting..." : "Delete task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
