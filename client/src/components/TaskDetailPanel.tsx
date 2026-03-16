import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Send,
  Plus,
  Search,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, User, Property, Upload, Message, PartUsed, InventoryItem } from "@shared/schema";
import { TaskEditMode } from "./TaskEditMode";
import { SubtaskNote } from "./SubtaskNote";
import { SubtaskPhotos } from "./SubtaskPhotos";
import { BarcodeScanner } from "./BarcodeScanner";
import { toDisplayUrl } from "@/lib/imageUtils";
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
  const isAdmin = user?.role === "admin";

  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isPartsOpen, setIsPartsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isAddPartFormOpen, setIsAddPartFormOpen] = useState(false);
  const [newPartQuantity, setNewPartQuantity] = useState("1");
  const [newPartNotes, setNewPartNotes] = useState("");
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState("");

  const [isAddNoteDialogOpen, setIsAddNoteDialogOpen] = useState(false);
  const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState("job_note");
  const [logTimeDuration, setLogTimeDuration] = useState("");
  const [logTimeDescription, setLogTimeDescription] = useState("");
  const [isFileUploading, setIsFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    queryKey: ["/api/uploads/task", taskId, "includeSubtasks"],
    queryFn: async () => {
      const res = await fetch(`/api/uploads/task/${taskId}?includeSubtasks=true`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!taskId,
  });

  const { data: taskMessages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages/task", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/task/${taskId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!taskId,
    refetchInterval: isMessagesOpen ? 5000 : false,
  });

  const { data: taskParts = [] } = useQuery<PartUsed[]>({
    queryKey: ["/api/parts/task", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/parts/task/${taskId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!taskId,
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: timeEntries = [] } = useQuery<any[]>({
    queryKey: ["/api/time-entries/task", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/time-entries/task/${taskId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!taskId,
  });

  const totalMinutes = useMemo(() => {
    return timeEntries.reduce((sum: number, e: any) => {
      if (e.durationMinutes) return sum + e.durationMinutes;
      if (e.startTime && e.endTime) {
        return sum + Math.round((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000);
      }
      return sum;
    }, 0);
  }, [timeEntries]);

  const docCount = uploads?.filter(u => !u.fileType.startsWith("image/") && !u.fileType.startsWith("video/")).length || 0;
  const imgCount = uploads?.filter(u => u.fileType.startsWith("image/")).length || 0;
  const vidCount = uploads?.filter(u => u.fileType.startsWith("video/")).length || 0;

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", { taskId, content });
      return res.json();
    },
    onSuccess: () => {
      setNewMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages/task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to send message.", variant: "destructive" }),
  });

  const markMessagesReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/messages/task/${taskId}/mark-read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const addPartMutation = useMutation({
    mutationFn: async (partData: { taskId: string; partName: string; quantity: string; cost: number; notes?: string; inventoryItemId?: string }) => {
      const res = await apiRequest("POST", "/api/parts", partData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts/task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setNewPartQuantity("1");
      setNewPartNotes("");
      setInventorySearchQuery("");
      setSelectedInventoryItemId("");
      setIsAddPartFormOpen(false);
      toast({ title: "Part added" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add part.", variant: "destructive" }),
  });

  useEffect(() => {
    if (isMessagesOpen && taskMessages.length > 0) {
      const hasUnread = taskMessages.some((m: Message) => !m.read && m.senderId !== user?.id);
      if (hasUnread) {
        markMessagesReadMutation.mutate();
      }
    }
  }, [isMessagesOpen, taskMessages.length]);

  useEffect(() => {
    if (isMessagesOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [isMessagesOpen, taskMessages.length]);

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

  const addNoteMutation = useMutation({
    mutationFn: async ({ content, noteType }: { content: string; noteType: string }) => {
      return apiRequest("POST", "/api/task-notes", { taskId, content, noteType });
    },
    onSuccess: () => {
      setNewNoteContent("");
      setNewNoteType("job_note");
      setIsAddNoteDialogOpen(false);
      toast({ title: "Note added" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add note.", variant: "destructive" }),
  });

  const logTimeMutation = useMutation({
    mutationFn: async ({ durationMinutes, description }: { durationMinutes: number; description: string }) => {
      return apiRequest("POST", "/api/time-entries", { taskId, durationMinutes, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/task", taskId] });
      setLogTimeDuration("");
      setLogTimeDescription("");
      setIsLogTimeDialogOpen(false);
      toast({ title: "Time logged" });
    },
    onError: () => toast({ title: "Error", description: "Failed to log time.", variant: "destructive" }),
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsFileUploading(true);
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
        taskId,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        objectUrl,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", taskId, "includeSubtasks"] });
      toast({ title: "File uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
      {isAdmin && (
        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderBottom: "1px solid #EEEEEE" }}>
          <Button
            variant="outline"
            size="sm"
            data-testid="button-panel-edit"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#EEEEEE", color: "#1A1A1A" }}
            onClick={() => setIsEditMode(true)}
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
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
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
                const ext = upload.fileName.split(".").pop()?.toLowerCase() || "";
                const typeLabel = isImage ? "IMG" : isVideo ? "VID"
                  : ext === "pdf" ? "PDF" : ext === "xls" || ext === "xlsx" ? "XLS"
                  : ext === "doc" || ext === "docx" ? "DOC" : "FILE";
                return (
                  <a
                    key={upload.id}
                    href={toDisplayUrl(upload.objectUrl)}
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
                        <SubtaskPhotos subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="panel-subtask" />
                      </div>
                      <SubtaskNote subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="panel-subtask" />
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

      {/* Messages section */}
      <div style={{ borderBottom: "1px solid #EEEEEE" }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
          style={{ color: "#1A1A1A" }}
          onClick={() => setIsMessagesOpen(!isMessagesOpen)}
          data-testid="link-panel-messages"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" style={{ color: "#6B7280" }} />
            Messages
            {taskMessages.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}>
                {taskMessages.length}
              </span>
            )}
          </div>
          {isMessagesOpen ? (
            <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          )}
        </button>
        {isMessagesOpen && (
          <div className="px-5 pb-4">
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #EEEEEE" }}>
              <div className="overflow-y-auto space-y-3 p-3" style={{ maxHeight: "250px" }}>
                {taskMessages.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>No messages yet</p>
                ) : (
                  taskMessages.map((msg) => {
                    const sender = allUsers?.find(u => u.id === msg.senderId);
                    const isOwnMessage = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
                        data-testid={`panel-message-${msg.id}`}
                      >
                        <p className="text-[11px] font-medium mb-0.5" style={{ color: "#6B7280" }}>
                          {sender ? `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || sender.username : "Unknown"}
                        </p>
                        <div
                          className="rounded-xl px-3 py-2 max-w-[80%]"
                          style={{
                            backgroundColor: isOwnMessage ? "#4338CA" : "#F3F4F6",
                            color: isOwnMessage ? "#FFFFFF" : "#1A1A1A",
                          }}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: "#9CA3AF" }}>
                          {msg.createdAt ? format(new Date(msg.createdAt), "MMM d, h:mm a") : ""}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2 p-2" style={{ borderTop: "1px solid #EEEEEE" }}>
                <Input
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && newMessageText.trim()) {
                      e.preventDefault();
                      sendMessageMutation.mutate(newMessageText.trim());
                    }
                  }}
                  data-testid="input-panel-message"
                />
                <Button
                  size="icon"
                  style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                  onClick={() => newMessageText.trim() && sendMessageMutation.mutate(newMessageText.trim())}
                  disabled={!newMessageText.trim() || sendMessageMutation.isPending}
                  data-testid="button-panel-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Parts Used section */}
      <div style={{ borderBottom: "1px solid #EEEEEE" }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
          style={{ color: "#1A1A1A" }}
          onClick={() => setIsPartsOpen(!isPartsOpen)}
          data-testid="link-panel-parts"
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: "#6B7280" }} />
            Parts Used
            {taskParts.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}>
                {taskParts.length}
              </span>
            )}
          </div>
          {isPartsOpen ? (
            <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          )}
        </button>
        {isPartsOpen && (
          <div className="px-5 pb-4 space-y-2">
            {taskParts.length === 0 && !isAddPartFormOpen ? (
              <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>No parts used yet</p>
            ) : (
              taskParts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}
                  data-testid={`panel-part-${part.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#1A1A1A" }}>{part.partName}</p>
                    {part.notes && <p className="text-xs mt-0.5 truncate" style={{ color: "#6B7280" }}>{part.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs font-medium" style={{ color: "#6B7280" }}>x{part.quantity}</span>
                    {part.cost !== null && part.cost !== undefined && Number(part.cost) > 0 && (
                      <span className="text-xs font-medium" style={{ color: "#15803D" }}>${Number(part.cost).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              ))
            )}
            {isAddPartFormOpen ? (
              <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search inventory..."
                    value={inventorySearchQuery}
                    onChange={(e) => {
                      setInventorySearchQuery(e.target.value);
                      setSelectedInventoryItemId("");
                    }}
                    className="pl-9"
                    data-testid="input-panel-search-part"
                  />
                </div>
                {inventorySearchQuery && !selectedInventoryItemId && (() => {
                  const filtered = inventoryItems.filter((item) =>
                    item.name.toLowerCase().includes(inventorySearchQuery.toLowerCase())
                  );
                  return (
                    <div className="border border-border rounded-md max-h-40 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground" data-testid="text-panel-no-inventory-match">
                          No matching inventory items
                        </div>
                      ) : (
                        filtered.map((item) => (
                          <div
                            key={item.id}
                            className="px-3 py-2 cursor-pointer text-sm border-b border-border/50 text-foreground hover-elevate"
                            onClick={() => {
                              setSelectedInventoryItemId(item.id);
                              setInventorySearchQuery(item.name);
                            }}
                            data-testid={`panel-inventory-item-${item.id}`}
                          >
                            {item.name}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })()}
                {selectedInventoryItemId && (
                  <div className="p-2 rounded-md text-sm font-medium bg-muted text-foreground" data-testid="text-panel-selected-item">
                    {inventoryItems.find((i) => i.id === selectedInventoryItemId)?.name}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newPartQuantity}
                    onChange={(e) => setNewPartQuantity(e.target.value)}
                    placeholder="Qty"
                    type="number"
                    min="1"
                    className="w-20"
                    data-testid="input-panel-part-quantity"
                  />
                  <Input
                    value={
                      selectedInventoryItemId
                        ? (
                            (parseFloat(
                              inventoryItems.find((i) => i.id === selectedInventoryItemId)?.cost || "0"
                            ) || 0) * (parseFloat(newPartQuantity) || 1)
                          ).toFixed(2)
                        : ""
                    }
                    readOnly
                    placeholder="Cost ($)"
                    type="number"
                    className="w-24"
                    data-testid="input-panel-part-cost"
                  />
                </div>
                <Input
                  value={newPartNotes}
                  onChange={(e) => setNewPartNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  data-testid="input-panel-part-notes"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddPartFormOpen(false);
                      setNewPartQuantity("1");
                      setInventorySearchQuery("");
                      setSelectedInventoryItemId("");
                      setNewPartNotes("");
                    }}
                    data-testid="button-panel-cancel-part"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                    disabled={!selectedInventoryItemId || addPartMutation.isPending}
                    onClick={() => {
                      const selectedItem = inventoryItems.find((i) => i.id === selectedInventoryItemId);
                      if (!selectedItem) return;
                      const cost = (parseFloat(selectedItem.cost || "0") || 0) * (parseFloat(newPartQuantity) || 1);
                      addPartMutation.mutate({
                        taskId,
                        partName: selectedItem.name,
                        quantity: newPartQuantity || "1",
                        cost,
                        notes: newPartNotes.trim() || undefined,
                        inventoryItemId: selectedInventoryItemId,
                      });
                    }}
                    data-testid="button-panel-save-part"
                  >
                    {addPartMutation.isPending ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
            ) : (
              isAdmin && (
                <button
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ border: "1px dashed #D1D5DB", color: "#6B7280" }}
                  onClick={() => setIsAddPartFormOpen(true)}
                  data-testid="button-panel-add-part"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Part
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* History section */}
      <div>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
          style={{ color: "#1A1A1A" }}
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          data-testid="link-panel-history"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" style={{ color: "#6B7280" }} />
            History
            {timeEntries.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                {timeEntries.length}
              </span>
            )}
          </div>
          {isHistoryOpen ? (
            <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          )}
        </button>
        {isHistoryOpen && (
          <div className="px-5 pb-4 space-y-2">
            {timeEntries.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>No time entries yet</p>
            ) : (
              timeEntries.map((entry: any) => {
                const entryUser = allUsers?.find(u => u.id === entry.userId);
                const isRunning = entry.startTime && !entry.endTime;
                const duration = entry.durationMinutes
                  ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m`
                  : isRunning ? "Running" : "—";
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}
                    data-testid={`panel-history-${entry.id}`}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                        {entryUser ? `${entryUser.firstName || ""} ${entryUser.lastName || ""}`.trim() || entryUser.username : "Unknown"}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                        {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : "No start time"}
                      </p>
                    </div>
                    <span
                      className="text-xs font-medium px-2 py-1 rounded"
                      style={{
                        backgroundColor: isRunning ? "#EEF2FF" : "#F3F4F6",
                        color: isRunning ? "#4338CA" : "#6B7280",
                      }}
                    >
                      {duration}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
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
            { icon: Camera, label: "Photos / Docs", onClick: () => fileInputRef.current?.click() },
            { icon: ScanLine, label: "Scan", onClick: () => setIsScanDialogOpen(true) },
            { icon: StickyNote, label: "Add Note", onClick: () => setIsAddNoteDialogOpen(true) },
            { icon: Clock, label: "Log Time", onClick: () => setIsLogTimeDialogOpen(true) },
          ].map(({ icon: Icon, label, onClick }) => (
            <button
              key={label}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors hover-elevate"
              style={{ color: "#1A1A1A" }}
              onClick={onClick}
              data-testid={`button-action-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="w-4 h-4" style={{ color: "#6B7280" }} />
              {label}
              {label === "Photos / Docs" && isFileUploading && (
                <Loader2 className="w-3 h-3 ml-auto animate-spin" style={{ color: "#6B7280" }} />
              )}
            </button>
          ))}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            data-testid="input-file-upload"
          />
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
              onClick={() => setIsEditMode(true)}
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

  if (isEditMode && task) {
    return (
      <div
        className="h-full flex flex-col"
        style={{ backgroundColor: "#FFFFFF" }}
        data-testid="task-detail-panel"
      >
        <TaskEditMode
          taskId={taskId}
          task={task}
          subtasks={subtasks || []}
          onCancel={() => setIsEditMode(false)}
          onSaved={() => setIsEditMode(false)}
          onDeleted={onClose}
          variant="desktop"
        />
      </div>
    );
  }

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

      {/* Add Note Dialog */}
      <Dialog open={isAddNoteDialogOpen} onOpenChange={setIsAddNoteDialogOpen}>
        <DialogContent data-testid="dialog-add-note">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add a note to this task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={newNoteType} onValueChange={setNewNoteType}>
              <SelectTrigger data-testid="select-note-type">
                <SelectValue placeholder="Note type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="job_note">Job Note</SelectItem>
                <SelectItem value="recommendation">Recommendation</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Write your note..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={4}
              data-testid="input-note-content"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsAddNoteDialogOpen(false)}
              data-testid="button-cancel-note"
            >
              Cancel
            </Button>
            <Button
              onClick={() => addNoteMutation.mutate({ content: newNoteContent, noteType: newNoteType })}
              disabled={!newNoteContent.trim() || addNoteMutation.isPending}
              data-testid="button-save-note"
            >
              {addNoteMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Time Dialog */}
      <Dialog open={isLogTimeDialogOpen} onOpenChange={setIsLogTimeDialogOpen}>
        <DialogContent data-testid="dialog-log-time">
          <DialogHeader>
            <DialogTitle>Log Time</DialogTitle>
            <DialogDescription>Record time spent on this task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" style={{ color: "#1A1A1A" }}>Duration (minutes)</label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 30"
                value={logTimeDuration}
                onChange={(e) => setLogTimeDuration(e.target.value)}
                data-testid="input-time-duration"
              />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: "#1A1A1A" }}>Description</label>
              <Textarea
                placeholder="What did you work on?"
                value={logTimeDescription}
                onChange={(e) => setLogTimeDescription(e.target.value)}
                rows={3}
                data-testid="input-time-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsLogTimeDialogOpen(false)}
              data-testid="button-cancel-time"
            >
              Cancel
            </Button>
            <Button
              onClick={() => logTimeMutation.mutate({
                durationMinutes: parseInt(logTimeDuration, 10),
                description: logTimeDescription,
              })}
              disabled={!logTimeDuration || parseInt(logTimeDuration, 10) <= 0 || logTimeMutation.isPending}
              data-testid="button-save-time"
            >
              {logTimeMutation.isPending ? "Saving..." : "Log Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scan Dialog */}
      <BarcodeScanner
        open={isScanDialogOpen}
        onOpenChange={setIsScanDialogOpen}
        onScan={(code) => {
          setIsScanDialogOpen(false);
          toast({ title: "Scanned", description: `Code: ${code}` });
        }}
        title="Scan Barcode / QR Code"
        description="Scan an equipment or inventory barcode to look it up."
      />
    </div>
  );
}
