import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Camera,
  ScanLine,
  StickyNote,
  CheckCircle2,
  Flag,
  Calendar,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, TaskNote, User, Property, Upload } from "@shared/schema";
import { TaskEditMode } from "./TaskEditMode";

const statusDotColors: Record<string, string> = {
  not_started: "#9CA3AF",
  needs_estimate: "#E6A817",
  waiting_approval: "#7C3AED",
  in_progress: "#4338CA",
  on_hold: "#E6A817",
  completed: "#15803D",
  cancelled: "#D94F4F",
};

const statusPillStyles: Record<string, { bg: string; text: string }> = {
  not_started: { bg: "#4A4A4A", text: "#FFFFFF" },
  needs_estimate: { bg: "#FEF3C7", text: "#92400E" },
  waiting_approval: { bg: "#EDE9FE", text: "#7C3AED" },
  in_progress: { bg: "#EEF2FF", text: "#4338CA" },
  on_hold: { bg: "#FEF3C7", text: "#92400E" },
  completed: { bg: "#F0FDF4", text: "#15803D" },
  cancelled: { bg: "#FEF2F2", text: "#D94F4F" },
};

const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  needs_estimate: "Needs Estimate",
  waiting_approval: "Waiting Approval",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const priorityColors: Record<string, string> = {
  high: "#D94F4F",
  medium: "#E6A817",
  low: "#9CA3AF",
};

export default function MobileTaskDetail() {
  const [currentPath, navigate] = useLocation();
  const id = currentPath.split("/tasks/")[1]?.split("?")[0]?.split("/")[0];
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["/api/tasks", id],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${id}`);
      if (!res.ok) throw new Error("Failed to fetch task");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: subtasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks", id, "subtasks"],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${id}/subtasks`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const { data: uploads } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/task", id],
    queryFn: async () => {
      const res = await fetch(`/api/uploads/task/${id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const { data: property } = useQuery<Property>({
    queryKey: ["/api/properties", task?.propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${task!.propertyId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!task?.propertyId,
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: timeEntries } = useQuery<any[]>({
    queryKey: ["/api/time-entries/task", id],
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}/status`, { status: newStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const updateSubtaskStatusMutation = useMutation({
    mutationFn: async ({ subtaskId, status }: { subtaskId: string; status: string }) => {
      return apiRequest("PATCH", `/api/tasks/${subtaskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "subtasks"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted" });
      navigate("/work");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    },
  });


  const toggleSubtaskExpanded = (subtaskId: string) => {
    setExpandedSubtasks(prev => {
      const next = new Set(prev);
      if (next.has(subtaskId)) next.delete(subtaskId);
      else next.add(subtaskId);
      return next;
    });
  };

  const totalTime = useMemo(() => {
    if (!timeEntries?.length) return "0h 0m";
    const totalMs = timeEntries.reduce((acc: number, te: any) => {
      if (te.startTime && te.endTime) {
        return acc + (new Date(te.endTime).getTime() - new Date(te.startTime).getTime());
      }
      return acc;
    }, 0);
    const hours = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }, [timeEntries]);

  const docCount = uploads?.filter(u => !u.fileType.startsWith("image/") && !u.fileType.startsWith("video/")).length || 0;
  const imgCount = uploads?.filter(u => u.fileType.startsWith("image/")).length || 0;
  const vidCount = uploads?.filter(u => u.fileType.startsWith("video/")).length || 0;

  const taskStarted = task?.status === "in_progress" || task?.status === "completed";
  const isCompleted = task?.status === "completed";
  const completedSubtasks = subtasks?.filter(s => s.status === "completed").length || 0;
  const totalSubtasks = subtasks?.length || 0;
  const allSubtasksDone = totalSubtasks === 0 || completedSubtasks === totalSubtasks;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  if (isLoading || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F8F8F8" }}>
        <div className="animate-pulse space-y-4 w-full max-w-md px-4">
          <div className="h-10 rounded" style={{ backgroundColor: "#EEEEEE" }} />
          <div className="h-64 rounded" style={{ backgroundColor: "#EEEEEE" }} />
          <div className="h-48 rounded" style={{ backgroundColor: "#EEEEEE" }} />
        </div>
      </div>
    );
  }

  if (isEditMode) {
    return (
      <div className="flex flex-col min-h-screen" data-testid="mobile-task-detail">
        <TaskEditMode
          taskId={id!}
          task={task}
          subtasks={subtasks || []}
          onCancel={() => setIsEditMode(false)}
          onSaved={() => setIsEditMode(false)}
          onDeleted={() => navigate("/work")}
          variant="mobile"
        />
      </div>
    );
  }

  const statusStyle = statusPillStyles[task.status] || statusPillStyles.not_started;
  const taskTypeLabel = task.taskType === "one_time" ? "One Time" : task.taskType === "recurring" ? "Recurring" : task.taskType;
  const poolLabel = task.assignedPool === "student_pool" ? "Student Pool" : task.assignedPool === "technician_pool" ? "Technician Pool" : "";

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: "#F8F8F8" }} data-testid="mobile-task-detail">
      {/* Top navigation bar */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #EEEEEE" }}>
        <button
          onClick={() => navigate("/work")}
          className="p-1"
          data-testid="button-back"
          aria-label="Back to work"
        >
          <ArrowLeft className="w-5 h-5" style={{ color: "#1A1A1A" }} />
        </button>
        <span className="text-sm font-medium truncate" style={{ color: "#1A1A1A" }}>Task Details</span>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-3">

        {/* Status bar card */}
        <div
          className="rounded-xl px-4 py-3 flex items-center justify-between gap-2 flex-wrap"
          style={{ backgroundColor: "#F8F8F8", border: "1px solid #EEEEEE" }}
          data-testid="mobile-status-bar"
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: statusDotColors[task.status] || "#9CA3AF" }}
            />
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
            >
              {statusLabels[task.status] || task.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {task.urgency && (
              <span className="flex items-center gap-1 text-xs font-medium" style={{ color: priorityColors[task.urgency] || "#9CA3AF" }}>
                <Flag className="w-3 h-3" />
                {task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1)}
              </span>
            )}
            {task.estimatedCompletionDate && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "#6B7280" }}>
                <Calendar className="w-3 h-3" />
                {new Date(task.estimatedCompletionDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Main task card */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #EEEEEE" }}>
          {/* Admin bar */}
          {isAdmin && (
            <div className="flex items-center justify-end gap-2 px-4 py-2.5" style={{ backgroundColor: "#F8F8F8", borderBottom: "1px solid #EEEEEE" }}>
              <Button
                variant="outline"
                size="sm"
                data-testid="button-mobile-edit"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#EEEEEE", color: "#1A1A1A" }}
                onClick={() => setIsEditMode(true)}
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-testid="button-mobile-delete"
                style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA", color: "#D94F4F" }}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete
              </Button>
            </div>
          )}

          {/* Task section */}
          <div className="px-4 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
            <p className="text-[11px] font-medium tracking-wider uppercase mb-1.5" style={{ color: "#9CA3AF" }}>
              TASK
            </p>
            <h1 className="text-base font-medium leading-tight mb-1" style={{ color: "#1A1A1A" }} data-testid="text-mobile-task-title">
              {task.name}
            </h1>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              {taskTypeLabel}{poolLabel ? ` · ${poolLabel}` : ""}
            </p>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 divide-x" style={{ borderBottom: "1px solid #EEEEEE", divideColor: "#EEEEEE" }}>
            <div className="px-4 py-3">
              <p className="text-[11px] font-medium tracking-wider uppercase mb-1" style={{ color: "#9CA3AF" }}>
                LOCATION
              </p>
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#6B7280" }} />
                <div>
                  <p className="text-xs font-medium" style={{ color: "#1A1A1A" }}>
                    {property?.name || "—"}
                  </p>
                  {property?.address && (
                    <p className="text-[11px]" style={{ color: "#6B7280" }}>{property.address}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-[11px] font-medium tracking-wider uppercase mb-1" style={{ color: "#9CA3AF" }}>
                TIME LOGGED
              </p>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
                <p className="text-xs font-medium" style={{ color: "#1A1A1A" }}>{totalTime}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <p className="text-[11px] font-medium tracking-wider uppercase mb-1.5" style={{ color: "#9CA3AF" }}>
                DESCRIPTION
              </p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#374151", lineHeight: 1.55 }} data-testid="text-mobile-description">
                {task.description}
              </p>
            </div>
          )}

          {/* Resources row */}
          <div
            className="px-4 py-3 cursor-pointer"
            onClick={() => setResourcesExpanded(!resourcesExpanded)}
            data-testid="button-mobile-toggle-resources"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: "#6B7280" }} />
              <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>Resources</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "#EDE9FE", color: "#7C3AED" }}>
                  {docCount} docs
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                  {imgCount} img
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "#FFF1F2", color: "#F43F5E" }}>
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
                    const ext = upload.fileName.split(".").pop()?.toLowerCase() || "";
                    const TypeIcon = isImage ? ImageIcon : isVideo ? Video : FileText;
                    const getDocColors = () => {
                      if (ext === "pdf") return { bg: "#FEF2F2", color: "#DC2626" };
                      if (ext === "xls" || ext === "xlsx") return { bg: "#F0FDF4", color: "#16A34A" };
                      if (ext === "doc" || ext === "docx") return { bg: "#EFF6FF", color: "#2563EB" };
                      return { bg: "#EDE9FE", color: "#7C3AED" };
                    };
                    const docColors = !isImage && !isVideo ? getDocColors() : null;
                    const badgeBg = isImage ? "#F3F4F6" : isVideo ? "#FFF1F2" : docColors!.bg;
                    const badgeColor = isImage ? "#6B7280" : isVideo ? "#F43F5E" : docColors!.color;
                    const typeLabel = isImage ? "IMG" : isVideo ? "VID"
                      : ext === "pdf" ? "PDF" : ext === "xls" || ext === "xlsx" ? "XLS"
                      : ext === "doc" || ext === "docx" ? "DOC" : "FILE";
                    return (
                      <a
                        key={upload.id}
                        href={upload.objectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 py-1.5 px-1 rounded hover-elevate"
                        data-testid={`mobile-resource-item-${upload.id}`}
                      >
                        <TypeIcon className="w-4 h-4 shrink-0" style={{ color: badgeColor }} />
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ backgroundColor: badgeBg, color: badgeColor }}>
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
        </div>

        {/* Subtasks card */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #EEEEEE" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: taskStarted && totalSubtasks > 0 ? undefined : "1px solid #EEEEEE" }}>
            <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#9CA3AF" }}>
              SUBTASKS
            </p>
            <span className="text-sm font-medium" style={{ color: "#1A1A1A" }} data-testid="text-mobile-subtask-count">
              {completedSubtasks} / {totalSubtasks}
            </span>
          </div>

          {/* Progress bar - only visible after Start Task */}
          {taskStarted && totalSubtasks > 0 && (
            <div className="px-4 py-2" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="w-full rounded-full overflow-hidden" style={{ height: "4px", backgroundColor: "#E5E7EB" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${subtaskProgress}%`,
                    backgroundColor: "#4338CA",
                    transition: "width 300ms ease",
                  }}
                  data-testid="mobile-subtask-progress"
                />
              </div>
            </div>
          )}

          {/* Subtask warning - shown when task is in progress with incomplete subtasks */}
          {taskStarted && !isCompleted && !allSubtasksDone && (
            <div
              className="mx-4 mt-3 mb-1 px-3 py-2 rounded text-xs"
              style={{ backgroundColor: "#FEF2F2", borderLeft: "3px solid #D94F4F", color: "#D94F4F" }}
              data-testid="mobile-subtask-warning"
            >
              Complete all subtasks before marking task as done
            </div>
          )}

          {/* Subtask rows */}
          <div className="divide-y" style={{ divideColor: "#EEEEEE" }}>
            {(!subtasks || subtasks.length === 0) ? (
              <p className="text-xs text-center py-6" style={{ color: "#9CA3AF" }}>
                No subtasks
              </p>
            ) : (
              subtasks.map((subtask) => {
                const isLocked = !taskStarted;
                const isSubCompleted = subtask.status === "completed";
                const isSubExpanded = expandedSubtasks.has(subtask.id);

                return (
                  <div key={subtask.id} data-testid={`mobile-subtask-${subtask.id}`}>
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                      style={isLocked ? { opacity: 0.45 } : undefined}
                      onClick={() => !isLocked && toggleSubtaskExpanded(subtask.id)}
                    >
                      {/* Circle checkbox */}
                      <button
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{
                          borderColor: isSubCompleted ? "#4338CA" : "#D1D5DB",
                          backgroundColor: isSubCompleted ? "#4338CA" : "transparent",
                        }}
                        disabled={isLocked || isCompleted}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isLocked && !isCompleted) {
                            updateSubtaskStatusMutation.mutate({
                              subtaskId: subtask.id,
                              status: isSubCompleted ? "in_progress" : "completed",
                            });
                          }
                        }}
                        data-testid={`mobile-subtask-checkbox-${subtask.id}`}
                        aria-label={`Mark subtask ${subtask.name} as ${isSubCompleted ? "incomplete" : "complete"}`}
                      >
                        {isSubCompleted && (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </button>

                      {/* Subtask name */}
                      <span
                        className={`text-sm flex-1 ${isSubCompleted ? "line-through" : ""}`}
                        style={{ color: isSubCompleted ? "#9CA3AF" : "#1A1A1A" }}
                      >
                        {subtask.name}
                      </span>

                      {/* Chevron */}
                      {isLocked ? (
                        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#D1D5DB" }} />
                      ) : isSubExpanded ? (
                        <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                      )}
                    </div>

                    {/* Expanded subtask content */}
                    {isSubExpanded && !isLocked && (
                      <div className="px-4 pb-3 pl-12 space-y-3" onClick={(e) => e.stopPropagation()}>
                        {/* Photo thumbnails area */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <SubtaskPhotos subtaskId={subtask.id} disabled={isCompleted} />
                        </div>

                        {/* Note textarea */}
                        <SubtaskNote subtaskId={subtask.id} disabled={isCompleted} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Secondary links card */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #EEEEEE" }}>
          {[
            { label: "Messages", icon: MessageSquare, testId: "link-mobile-messages", section: "messages" },
            { label: "Parts Used", icon: Package, testId: "link-mobile-parts", section: "parts" },
            { label: "History", icon: History, testId: "link-mobile-history", section: "history" },
          ].map((link, idx) => (
            <button
              key={link.label}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              style={idx < 2 ? { borderBottom: "1px solid #EEEEEE" } : undefined}
              onClick={() => navigate(`/tasks/${id}?section=${link.section}&view=full`)}
              data-testid={link.testId}
            >
              <link.icon className="w-4 h-4" style={{ color: "#6B7280" }} />
              <span className="text-sm font-medium flex-1" style={{ color: "#1A1A1A" }}>{link.label}</span>
              <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
            </button>
          ))}
        </div>

        {/* Completed success banner */}
        {isCompleted && (
          <div
            className="rounded-xl px-4 py-4 flex items-center gap-3"
            style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
            data-testid="mobile-completed-banner"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#15803D" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "#15803D" }}>Task completed</p>
              <p className="text-xs mt-0.5" style={{ color: "#16A34A" }}>
                All subtasks done{totalSubtasks > 0 ? ` (${totalSubtasks}/${totalSubtasks})` : ""} — evidence captured
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      {!isCompleted && (
        <div
          className="fixed bottom-0 left-0 right-0 flex items-center gap-2 px-4 py-3"
          style={{ backgroundColor: "#FFFFFF", borderTop: "1px solid #EEEEEE", zIndex: 50 }}
          data-testid="mobile-bottom-bar"
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              style={{ borderColor: "#EEEEEE", color: "#6B7280" }}
              data-testid="button-mobile-photos"
              aria-label="Photos"
            >
              <Camera className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              style={{ borderColor: "#EEEEEE", color: "#6B7280" }}
              data-testid="button-mobile-scan"
              aria-label="Scan"
            >
              <ScanLine className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              style={{ borderColor: "#EEEEEE", color: "#6B7280" }}
              data-testid="button-mobile-note"
              aria-label="Note"
            >
              <StickyNote className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1">
            {task.status === "not_started" || task.status === "needs_estimate" || task.status === "waiting_approval" ? (
              <Button
                className="w-full"
                style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                onClick={() => updateStatusMutation.mutate("in_progress")}
                disabled={updateStatusMutation.isPending}
                data-testid="button-mobile-start-task"
              >
                Start Task
              </Button>
            ) : task.status === "in_progress" ? (
              <Button
                className="w-full"
                style={{
                  backgroundColor: allSubtasksDone ? "#4338CA" : "#9CA3AF",
                  color: "#FFFFFF",
                }}
                onClick={() => updateStatusMutation.mutate("completed")}
                disabled={!allSubtasksDone || updateStatusMutation.isPending}
                data-testid="button-mobile-mark-complete"
              >
                Mark Complete
              </Button>
            ) : task.status === "on_hold" ? (
              <Button
                className="w-full"
                style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                onClick={() => updateStatusMutation.mutate("in_progress")}
                disabled={updateStatusMutation.isPending}
                data-testid="button-mobile-resume"
              >
                Resume Task
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskMutation.mutate()}
              style={{ backgroundColor: "#D94F4F", color: "#FFFFFF" }}
              data-testid="button-confirm-mobile-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SubtaskNote({ subtaskId, disabled }: { subtaskId: string; disabled: boolean }) {
  const { toast } = useToast();
  const [noteText, setNoteText] = useState("");
  const [isSaved, setIsSaved] = useState(true);

  const { data: notes } = useQuery<TaskNote[]>({
    queryKey: ["/api/task-notes/task", subtaskId],
    queryFn: async () => {
      const res = await fetch(`/api/task-notes/task/${subtaskId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!subtaskId,
  });

  const latestNote = notes?.[notes.length - 1];

  const saveNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/task-notes", {
        taskId: subtaskId,
        content,
        noteType: "job_note",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", subtaskId] });
      setIsSaved(true);
    },
    onError: () => {
      toast({ title: "Failed to save note", variant: "destructive" });
    },
  });

  const displayValue = !isSaved ? noteText : (latestNote?.content ?? "");

  return (
    <div className="relative">
      <Textarea
        placeholder="Add a note..."
        className="text-xs resize-none border focus-visible:ring-1 focus-visible:ring-[#4338CA]"
        style={{ borderColor: "#EEEEEE", minHeight: "60px" }}
        disabled={disabled}
        value={displayValue}
        onChange={(e) => {
          setNoteText(e.target.value);
          setIsSaved(false);
        }}
        onBlur={() => {
          const val = noteText.trim();
          if (!isSaved && val && val !== (latestNote?.content ?? "")) {
            saveNoteMutation.mutate(val);
          } else {
            setIsSaved(true);
          }
        }}
        data-testid={`mobile-subtask-note-${subtaskId}`}
      />
      {saveNoteMutation.isPending && (
        <span className="absolute bottom-1 right-2 text-[10px]" style={{ color: "#9CA3AF" }}>Saving...</span>
      )}
    </div>
  );
}

function SubtaskPhotos({ subtaskId, disabled }: { subtaskId: string; disabled: boolean }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: uploads } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/task", subtaskId],
    queryFn: async () => {
      const res = await fetch(`/api/uploads/task/${subtaskId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!subtaskId,
  });

  const photos = uploads?.filter(u => u.fileType.startsWith("image/")) || [];

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const paramRes = await fetch("/api/objects/upload", { method: "POST", credentials: "include" });
      if (!paramRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL } = await paramRes.json();

      const isMock = uploadURL.startsWith("https://mock-storage.local/");
      let objectUrl = uploadURL;

      if (!isMock) {
        const uploadRes = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        objectUrl = uploadURL.split("?")[0];
      }

      await apiRequest("PUT", "/api/uploads", {
        taskId: subtaskId,
        fileName: file.name,
        fileType: file.type || "image/jpeg",
        objectUrl,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", subtaskId] });
      toast({ title: "Photo uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      {photos.map(photo => (
        <a
          key={photo.id}
          href={photo.objectUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`mobile-subtask-photo-${photo.id}`}
        >
          <img
            src={photo.objectUrl}
            alt={photo.fileName}
            className="rounded object-cover"
            style={{ width: "54px", height: "54px", border: "1px solid #EEEEEE" }}
          />
        </a>
      ))}
      {!disabled && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <div
            className="flex items-center justify-center rounded cursor-pointer"
            style={{
              width: "54px",
              height: "54px",
              border: "2px dashed #D1D5DB",
            }}
            onClick={() => fileInputRef.current?.click()}
            data-testid={`mobile-subtask-add-photo-${subtaskId}`}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#9CA3AF" }} />
            ) : (
              <Camera className="w-4 h-4" style={{ color: "#9CA3AF" }} />
            )}
          </div>
        </>
      )}
    </>
  );
}
