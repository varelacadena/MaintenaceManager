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
  MoreVertical,
  Building2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, User, Property, Upload, Message, PartUsed, InventoryItem, TaskNote, TimeEntry } from "@shared/schema";
import { TaskEditMode } from "./TaskEditMode";
import { SubtaskNote } from "./SubtaskNote";
import { SubtaskPhotos } from "./SubtaskPhotos";
import { BarcodeScanner } from "./BarcodeScanner";
import { toDisplayUrl } from "@/lib/imageUtils";
import { UploadLabelDialog } from "@/components/UploadLabelDialog";
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
  panelStatusDotStyle,
  panelStatusPillStyle,
  panelStatusLabels,
  priorityConfig,
  taskTypeLabels,
  getAvatarHexColor as getAvatarColorForId,
} from "@/utils/taskUtils";

interface TaskDetailPanelProps {
  taskId: string;
  isFullscreen: boolean;
  onClose: () => void;
  onToggleFullscreen: () => void;
  allUsers?: User[];
  properties?: Property[];
  hideFullscreenToggle?: boolean;
}

export function TaskDetailPanel({
  taskId,
  isFullscreen,
  onClose,
  onToggleFullscreen,
  allUsers,
  properties,
  hideFullscreenToggle,
}: TaskDetailPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const isMobile = useIsMobile();

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

  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isAddNoteDialogOpen, setIsAddNoteDialogOpen] = useState(false);
  const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState("job_note");
  const [logTimeDuration, setLogTimeDuration] = useState("");
  const [editingTimeEntryId, setEditingTimeEntryId] = useState<string | null>(null);
  const [editTimeDuration, setEditTimeDuration] = useState("");
  const [deleteTimeEntryId, setDeleteTimeEntryId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [pendingUploadForLabel, setPendingUploadForLabel] = useState<{
    fileName: string;
    fileType: string;
    objectUrl: string;
    previewUrl?: string;
  } | null>(null);
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
    refetchInterval: (isMessagesOpen || (isFullscreen && isAdmin)) ? 5000 : false,
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

  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries/task", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/time-entries/task/${taskId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!taskId,
  });

  const { data: taskNotes = [] } = useQuery<TaskNote[]>({
    queryKey: ["/api/task-notes/task", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/task-notes/task/${taskId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!taskId,
  });

  const totalMinutes = useMemo(() => {
    return timeEntries.reduce((sum: number, e: TimeEntry) => {
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

  const messagesVisible = isMessagesOpen || (isFullscreen && isAdmin);
  useEffect(() => {
    if (messagesVisible && taskMessages.length > 0) {
      const hasUnread = taskMessages.some((m: Message) => !m.read && m.senderId !== user?.id);
      if (hasUnread) {
        markMessagesReadMutation.mutate();
      }
    }
  }, [messagesVisible, taskMessages.length]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", taskId] });
      toast({ title: "Note added" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add note.", variant: "destructive" }),
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      return apiRequest("PATCH", `/api/task-notes/${noteId}`, { content });
    },
    onSuccess: () => {
      setEditingNoteId(null);
      setEditNoteContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", taskId] });
      toast({ title: "Note updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update note.", variant: "destructive" }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest("DELETE", `/api/task-notes/${noteId}`);
    },
    onSuccess: () => {
      setDeleteNoteId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", taskId] });
      toast({ title: "Note deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete note.", variant: "destructive" }),
  });

  const updateTimeEntryMutation = useMutation({
    mutationFn: async ({ entryId, durationMinutes }: { entryId: string; durationMinutes: number }) => {
      return apiRequest("PATCH", `/api/time-entries/${entryId}`, { durationMinutes });
    },
    onSuccess: () => {
      setEditingTimeEntryId(null);
      setEditTimeDuration("");
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/task", taskId] });
      toast({ title: "Time entry updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update time entry.", variant: "destructive" }),
  });

  const deleteTimeEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      return apiRequest("DELETE", `/api/time-entries/${entryId}`);
    },
    onSuccess: () => {
      setDeleteTimeEntryId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/task", taskId] });
      toast({ title: "Time entry deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete time entry.", variant: "destructive" }),
  });

  const logTimeMutation = useMutation({
    mutationFn: async (durationMinutes: number) => {
      const now = new Date();
      const startTime = new Date(now.getTime() - durationMinutes * 60000);
      return apiRequest("POST", "/api/time-entries", {
        taskId,
        durationMinutes,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/task", taskId] });
      setLogTimeDuration("");
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
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      setPendingUploadForLabel({
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        objectUrl,
        previewUrl,
      });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [isPanelUploadLabelSaving, setIsPanelUploadLabelSaving] = useState(false);

  const handlePanelUploadLabelSave = async (label: string) => {
    if (!pendingUploadForLabel || isPanelUploadLabelSaving) return;
    setIsPanelUploadLabelSaving(true);
    try {
      await apiRequest("PUT", "/api/uploads", {
        taskId,
        fileName: pendingUploadForLabel.fileName,
        fileType: pendingUploadForLabel.fileType,
        objectUrl: pendingUploadForLabel.objectUrl,
        label,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", taskId, "includeSubtasks"] });
      toast({ title: "File uploaded" });
      if (pendingUploadForLabel.previewUrl) URL.revokeObjectURL(pendingUploadForLabel.previewUrl);
      setPendingUploadForLabel(null);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsPanelUploadLabelSaving(false);
    }
  };

  const handlePanelUploadLabelCancel = async () => {
    if (!pendingUploadForLabel || isPanelUploadLabelSaving) return;
    setIsPanelUploadLabelSaving(true);
    try {
      await apiRequest("PUT", "/api/uploads", {
        taskId,
        fileName: pendingUploadForLabel.fileName,
        fileType: pendingUploadForLabel.fileType,
        objectUrl: pendingUploadForLabel.objectUrl,
        label: pendingUploadForLabel.fileName,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", taskId, "includeSubtasks"] });
      toast({ title: "File uploaded" });
      if (pendingUploadForLabel.previewUrl) URL.revokeObjectURL(pendingUploadForLabel.previewUrl);
      setPendingUploadForLabel(null);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsPanelUploadLabelSaving(false);
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
    <div className={isMobile && isFullscreen ? "flex-1" : "flex-1 overflow-y-auto"} data-testid="panel-main-content">
      {/* Task title + description section */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
        <h2
          className="text-base font-semibold leading-snug"
          style={{ color: "#1A1A1A" }}
          data-testid="text-panel-task-title"
        >
          {task.name}
        </h2>
        <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
          {taskTypeLabels[task.taskType] || task.taskType} · {task.executorType === "student" ? "Student Pool" : "Technician Pool"}
        </p>
        {task.description && (
          <p className="text-sm leading-relaxed mt-3" style={{ color: "#374151", lineHeight: "1.55" }}>
            {task.description}
          </p>
        )}
      </div>

      {/* Info grid — always shows all key fields */}
      <div
        className={`grid px-5 py-4 ${isFullscreen ? (isMobile ? "grid-cols-2 gap-4" : "grid-cols-4 gap-4") : "grid-cols-1 gap-3"}`}
        style={{ borderBottom: "1px solid #EEEEEE" }}
      >
        <div className="flex items-center gap-3">
          <UserIcon className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
          <span className="text-xs" style={{ color: "#6B7280" }}>Assigned</span>
          <div className="flex items-center gap-1.5 ml-auto">
            {assignee ? (
              <>
                <Avatar className="w-5 h-5">
                  <AvatarFallback
                    style={{ backgroundColor: getAvatarColorForId(assignee.id), color: "#FFFFFF", fontSize: "9px" }}
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
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
          <span className="text-xs" style={{ color: "#6B7280" }}>Location</span>
          <span className="text-sm font-medium ml-auto truncate max-w-[55%] text-right" style={{ color: "#1A1A1A" }}>
            {property?.name || "No location"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
          <span className="text-xs" style={{ color: "#6B7280" }}>Due date</span>
          <span className="text-sm font-medium ml-auto" style={{ color: isOverdue ? "#D94F4F" : "#1A1A1A" }}>
            {task.estimatedCompletionDate
              ? new Date(task.estimatedCompletionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "Not set"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Flag className="w-4 h-4 shrink-0" style={{ color: urg.color }} />
          <span className="text-xs" style={{ color: "#6B7280" }}>Priority</span>
          <span className="text-sm font-medium ml-auto" style={{ color: urg.color }}>
            {urg.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
          <span className="text-xs" style={{ color: "#6B7280" }}>Time logged</span>
          <span className="text-sm font-medium ml-auto" style={{ color: "#1A1A1A" }}>
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
          <span className="text-xs" style={{ color: "#6B7280" }}>Estimated</span>
          <span className="text-sm font-medium ml-auto" style={{ color: task.estimatedHours ? "#1A1A1A" : "#9CA3AF" }}>
            {task.estimatedHours ? `${task.estimatedHours}h` : "Not set"}
          </span>
        </div>
      </div>

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
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: "#EDE9FE", color: "#7C3AED" }}
            >
              {docCount} docs
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
            >
              {imgCount} img
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
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
                      className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
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
          <p className="text-xs font-medium tracking-wider uppercase" style={{ color: "#9CA3AF" }}>
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
              const isReadOnly = !isFullscreen;

              return (
                <div key={subtask.id} data-testid={`panel-subtask-${subtask.id}`}>
                  <div
                    className={`flex items-center gap-3 py-2.5 px-2 rounded transition-opacity ${isReadOnly ? "" : "cursor-pointer"}`}
                    style={isLocked && !isReadOnly ? { opacity: 0.45 } : undefined}
                    onClick={() => !isLocked && !isReadOnly && toggleSubtaskExpanded(subtask.id)}
                  >
                    <span
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: isSubCompleted ? "#4338CA" : "#D1D5DB",
                        backgroundColor: isSubCompleted ? "#4338CA" : "transparent",
                      }}
                      data-testid={`checkbox-subtask-${subtask.id}`}
                    >
                      {isSubCompleted && (
                        <CheckCircle2 className="w-3 h-3" style={{ color: "#FFFFFF" }} />
                      )}
                    </span>
                    <span
                      className={`text-sm flex-1 ${isSubCompleted ? "line-through" : ""}`}
                      style={{ color: isSubCompleted ? "#9CA3AF" : "#1A1A1A" }}
                    >
                      {subtask.name}
                    </span>
                    {!isLocked && !isReadOnly && (
                      isExpanded ? (
                        <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                      )
                    )}
                  </div>

                  {isExpanded && !isLocked && !isReadOnly && (
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
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}>
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
                        <p className="text-xs font-medium mb-0.5" style={{ color: "#6B7280" }}>
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
                        <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
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
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}>
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

      {/* Notes section */}
      <div style={{ borderBottom: "1px solid #EEEEEE" }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
          style={{ color: "#1A1A1A" }}
          onClick={() => setIsNotesOpen(!isNotesOpen)}
          data-testid="link-panel-notes"
        >
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4" style={{ color: "#6B7280" }} />
            Notes
            {taskNotes.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                {taskNotes.length}
              </span>
            )}
          </div>
          {isNotesOpen ? (
            <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          )}
        </button>
        {isNotesOpen && (
          <div className="px-5 pb-4 space-y-2">
            {taskNotes.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>No notes yet</p>
            ) : (
              taskNotes.map((note) => {
                const noteAuthor = allUsers?.find(u => u.id === note.userId);
                const isEditing = editingNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}
                    data-testid={`panel-note-${note.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                            {noteAuthor ? `${noteAuthor.firstName || ""} ${noteAuthor.lastName || ""}`.trim() || noteAuthor.username : "Unknown"}
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{
                              backgroundColor: note.noteType === "recommendation" ? "#EDE9FE" : "#F3F4F6",
                              color: note.noteType === "recommendation" ? "#7C3AED" : "#6B7280",
                            }}
                          >
                            {note.noteType === "recommendation" ? "Recommendation" : "Job Note"}
                          </span>
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editNoteContent}
                              onChange={(e) => setEditNoteContent(e.target.value)}
                              rows={3}
                              data-testid="input-edit-note-content"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setEditingNoteId(null); setEditNoteContent(""); }}
                                data-testid="button-cancel-edit-note"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                                disabled={!editNoteContent.trim() || updateNoteMutation.isPending}
                                onClick={() => updateNoteMutation.mutate({ noteId: note.id, content: editNoteContent })}
                                data-testid="button-save-edit-note"
                              >
                                {updateNoteMutation.isPending ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#374151" }}>
                            {note.content}
                          </p>
                        )}
                        <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
                          {note.createdAt ? format(new Date(note.createdAt), "MMM d, h:mm a") : ""}
                        </p>
                      </div>
                      {isAdmin && !isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { setEditingNoteId(note.id); setEditNoteContent(note.content); }}
                            data-testid={`button-edit-note-${note.id}`}
                          >
                            <Pencil className="w-3 h-3" style={{ color: "#6B7280" }} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteNoteId(note.id)}
                            data-testid={`button-delete-note-${note.id}`}
                          >
                            <Trash2 className="w-3 h-3" style={{ color: "#D94F4F" }} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <button
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ border: "1px dashed #D1D5DB", color: "#6B7280" }}
              onClick={() => setIsAddNoteDialogOpen(true)}
              data-testid="button-panel-add-note-inline"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Note
            </button>
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
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
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
              timeEntries.map((entry: TimeEntry) => {
                const entryUser = allUsers?.find(u => u.id === entry.userId);
                const isRunning = entry.startTime && !entry.endTime;
                const duration = entry.durationMinutes
                  ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m`
                  : isRunning ? "Running" : "—";
                return (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}
                    data-testid={`panel-history-${entry.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                          {entryUser ? `${entryUser.firstName || ""} ${entryUser.lastName || ""}`.trim() || entryUser.username : "Unknown"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                          {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : "No start time"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span
                          className="text-xs font-medium px-2 py-1 rounded"
                          style={{
                            backgroundColor: isRunning ? "#EEF2FF" : "#F3F4F6",
                            color: isRunning ? "#4338CA" : "#6B7280",
                          }}
                        >
                          {duration}
                        </span>
                        {isAdmin && !isRunning && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingTimeEntryId(entry.id);
                                setEditTimeDuration(String(entry.durationMinutes || 0));
                              }}
                              data-testid={`button-edit-time-${entry.id}`}
                            >
                              <Pencil className="w-3 h-3" style={{ color: "#6B7280" }} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteTimeEntryId(entry.id)}
                              data-testid={`button-delete-time-${entry.id}`}
                            >
                              <Trash2 className="w-3 h-3" style={{ color: "#D94F4F" }} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
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
      className={isMobile ? "w-full shrink-0" : "w-60 shrink-0 overflow-y-auto"}
      style={{ borderLeft: isMobile ? "none" : "1px solid #EEEEEE", borderTop: isMobile ? "1px solid #EEEEEE" : "none", backgroundColor: "#FFFFFF" }}
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
        <p className="text-xs font-medium tracking-wider uppercase mb-3" style={{ color: "#9CA3AF" }}>
          ACTIONS
        </p>
        <div className={isMobile ? "grid grid-cols-2 gap-1" : "space-y-1"}>
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
        <p className="text-xs font-medium tracking-wider uppercase mb-3" style={{ color: "#9CA3AF" }}>
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
        <p className="text-xs font-medium tracking-wider uppercase mb-3" style={{ color: "#9CA3AF" }}>
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
          <div className={isMobile ? "flex gap-2" : "space-y-2"}>
            <Button
              variant="outline"
              size="sm"
              className={isMobile ? "flex-1" : "w-full"}
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
              className={isMobile ? "flex-1" : "w-full"}
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

  const taskDialogs = (
    <>
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
              onClick={() => logTimeMutation.mutate(parseInt(logTimeDuration, 10))}
              disabled={!logTimeDuration || parseInt(logTimeDuration, 10) <= 0 || logTimeMutation.isPending}
              data-testid="button-save-time"
            >
              {logTimeMutation.isPending ? "Saving..." : "Log Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <UploadLabelDialog
        open={!!pendingUploadForLabel}
        fileName={pendingUploadForLabel?.fileName || ""}
        fileType={pendingUploadForLabel?.fileType || ""}
        filePreviewUrl={pendingUploadForLabel?.previewUrl}
        saving={isPanelUploadLabelSaving}
        onSave={handlePanelUploadLabelSave}
        onCancel={handlePanelUploadLabelCancel}
      />

      <Dialog open={!!editingTimeEntryId} onOpenChange={(open) => { if (!open) { setEditingTimeEntryId(null); setEditTimeDuration(""); } }}>
        <DialogContent data-testid="dialog-edit-time-entry">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>Update the duration of this time entry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" style={{ color: "#1A1A1A" }}>Duration (minutes)</label>
              <Input
                type="number"
                min="0"
                value={editTimeDuration}
                onChange={(e) => setEditTimeDuration(e.target.value)}
                data-testid="input-edit-time-duration"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => { setEditingTimeEntryId(null); setEditTimeDuration(""); }}
              data-testid="button-cancel-edit-time"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingTimeEntryId) {
                  updateTimeEntryMutation.mutate({
                    entryId: editingTimeEntryId,
                    durationMinutes: parseInt(editTimeDuration, 10) || 0,
                  });
                }
              }}
              disabled={updateTimeEntryMutation.isPending}
              data-testid="button-save-edit-time"
            >
              {updateTimeEntryMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTimeEntryId} onOpenChange={(open) => { if (!open) setDeleteTimeEntryId(null); }}>
        <AlertDialogContent data-testid="dialog-delete-time-entry">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete time entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This time entry will be permanently removed from this task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-time">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTimeEntryId) deleteTimeEntryMutation.mutate(deleteTimeEntryId); }}
              disabled={deleteTimeEntryMutation.isPending}
              data-testid="button-confirm-delete-time"
              style={{ backgroundColor: "#D94F4F", color: "#FFFFFF" }}
            >
              {deleteTimeEntryMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => { if (!open) setDeleteNoteId(null); }}>
        <AlertDialogContent data-testid="dialog-delete-note">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This note will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-note">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteNoteId) deleteNoteMutation.mutate(deleteNoteId); }}
              disabled={deleteNoteMutation.isPending}
              data-testid="button-confirm-delete-note"
              style={{ backgroundColor: "#D94F4F", color: "#FFFFFF" }}
            >
              {deleteNoteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

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
          variant={isMobile ? "mobile" : "desktop"}
        />
      </div>
    );
  }

  if (isFullscreen && isAdmin) {
    return (
      <div className="h-full flex flex-col" style={{ backgroundColor: "#FFFFFF" }} data-testid="task-detail-panel">
        <div
          className={`flex items-center shrink-0 ${isMobile ? "gap-2 px-4 py-3" : "gap-4 px-8 py-4"}`}
          style={{ borderBottom: "1px solid #EEEEEE" }}
        >
          <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-panel-close">
            <ArrowLeft className={isMobile ? "w-4 h-4" : "w-5 h-5"} style={{ color: "#1A1A1A" }} />
          </Button>
          <span className={`${isMobile ? "w-2 h-2" : "w-2.5 h-2.5"} rounded-full shrink-0`} style={{ backgroundColor: statusDot }} />
          <span
            className={`${isMobile ? "text-xs" : "text-xs"} font-semibold uppercase tracking-wider px-2.5 py-1 rounded`}
            style={{ backgroundColor: statusPill.bg, color: statusPill.text }}
          >
            {statusLabel}
          </span>
          <div className="flex items-center gap-1.5">
            <Flag className={isMobile ? "w-3 h-3" : "w-4 h-4"} style={{ color: urg.color }} />
            <span className={`${isMobile ? "text-xs" : "text-sm"} font-medium`} style={{ color: urg.color }}>{urg.label}</span>
          </div>
          {task.estimatedCompletionDate && (
            <span className={`${isMobile ? "text-xs" : "text-sm"} font-medium`} style={{ color: isOverdue ? "#D94F4F" : "#6B7280" }}>
              Due {new Date(task.estimatedCompletionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
          <div className="flex-1" />
          {!isMobile && (
            <Button variant="outline" className="gap-2" style={{ borderColor: "#E5E7EB" }} onClick={() => setIsEditMode(true)} data-testid="button-admin-edit">
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-admin-more-menu">
                <MoreVertical className={isMobile ? "w-4 h-4" : "w-5 h-5"} style={{ color: "#6B7280" }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isMobile && (
                <DropdownMenuItem className="gap-2" onClick={() => setIsEditMode(true)} data-testid="button-admin-edit-mobile">
                  <Pencil className="w-4 h-4" />
                  Edit Task
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-red-600 gap-2" onClick={() => setDeleteDialogOpen(true)} data-testid="button-admin-delete">
                <Trash2 className="w-4 h-4" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className={isMobile ? "flex flex-col flex-1 overflow-y-auto" : "flex flex-1 overflow-hidden"}>
          <div className={isMobile ? "flex-1" : "flex-1 overflow-y-auto"}>
            <div className={`${isMobile ? "px-5 pt-5 pb-4" : "px-8 pt-8 pb-6"}`} style={{ borderBottom: "1px solid #F3F4F6" }}>
              <h1
                className={`${isMobile ? "text-xl" : "text-2xl"} font-semibold leading-snug mb-5`}
                style={{ color: "#1A1A1A" }}
                data-testid="text-panel-task-title"
              >
                {task.name}
              </h1>
              <p className="text-xs mb-4" style={{ color: "#6B7280" }}>
                {taskTypeLabels[task.taskType] || task.taskType} · {task.executorType === "student" ? "Student Pool" : "Technician Pool"}
              </p>
              <div className={`grid ${isMobile ? "grid-cols-1 gap-3" : "grid-cols-2 gap-x-12 gap-y-4"}`}>
                <div className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                  <span className="text-sm" style={{ color: "#6B7280" }}>Assigned to</span>
                  <div className="flex items-center gap-2 ml-auto">
                    {assignee && (
                      <Avatar className="w-6 h-6">
                        <AvatarFallback style={{ backgroundColor: getAvatarColorForId(assignee.id), color: "#FFFFFF", fontSize: "10px" }}>
                          {assigneeInitials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>{assigneeName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                  <span className="text-sm" style={{ color: "#6B7280" }}>Location</span>
                  <span className="text-sm font-medium ml-auto" style={{ color: "#1A1A1A" }}>
                    {property?.name || "No location"}
                    {property?.address ? ` — ${property.address}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                  <span className="text-sm" style={{ color: "#6B7280" }}>Due date</span>
                  <span className="text-sm font-medium ml-auto" style={{ color: isOverdue ? "#D94F4F" : "#1A1A1A" }}>
                    {task.estimatedCompletionDate
                      ? new Date(task.estimatedCompletionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "Not set"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                  <span className="text-sm" style={{ color: "#6B7280" }}>Time logged</span>
                  <span className="text-sm font-medium ml-auto" style={{ color: "#1A1A1A" }}>
                    {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                  </span>
                </div>
              </div>
            </div>

            {task.description && (
              <div className={`${isMobile ? "px-5 py-4" : "px-8 py-6"}`} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>Description</p>
                <p className={`${isMobile ? "text-sm" : "text-base"} leading-relaxed`} style={{ color: "#374151" }}>
                  {task.description}
                </p>
              </div>
            )}

            <div className={`${isMobile ? "px-5 py-4" : "px-8 py-6"}`} style={{ borderBottom: "1px solid #F3F4F6" }}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Subtasks</p>
                <span className="text-sm font-medium" style={{ color: "#4338CA" }}>
                  {completedSubtasks}/{totalSubtasks}
                </span>
              </div>
              {totalSubtasks > 0 && (
                <div className="w-full rounded-full overflow-hidden mb-4" style={{ height: 6, backgroundColor: "#EEEEEE" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(completedSubtasks / totalSubtasks) * 100}%`,
                      backgroundColor: "#4338CA",
                    }}
                  />
                </div>
              )}
              {totalSubtasks === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: "#9CA3AF" }}>No subtasks</p>
              ) : (
                <div className="space-y-1">
                  {subtasks?.map((subtask) => {
                    const isSubCompleted = subtask.status === "completed";
                    return (
                      <div key={subtask.id} className="flex items-center gap-3 py-2 px-2" data-testid={`panel-subtask-${subtask.id}`}>
                        <span
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={{
                            borderColor: isSubCompleted ? "#4338CA" : "#D1D5DB",
                            backgroundColor: isSubCompleted ? "#4338CA" : "transparent",
                          }}
                        >
                          {isSubCompleted && <CheckCircle2 className="w-3 h-3" style={{ color: "#FFFFFF" }} />}
                        </span>
                        <span
                          className={`text-sm flex-1 ${isSubCompleted ? "line-through" : ""}`}
                          style={{ color: isSubCompleted ? "#9CA3AF" : "#1A1A1A" }}
                        >
                          {subtask.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`${isMobile ? "px-5 py-4" : "px-8 py-6"}`} style={{ borderBottom: "1px solid #F3F4F6" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
                Messages ({taskMessages.length})
              </p>
              {taskMessages.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: "#9CA3AF" }}>No messages yet</p>
              ) : (
                <div className="space-y-4 mb-4">
                  {taskMessages.map((msg) => {
                    const sender = allUsers?.find(u => u.id === msg.senderId);
                    return (
                      <div key={msg.id} data-testid={`panel-message-${msg.id}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                            {sender ? `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || sender.username : "Unknown"}
                          </span>
                          <span className="text-xs" style={{ color: "#9CA3AF" }}>
                            {msg.createdAt ? format(new Date(msg.createdAt), "MMM d, h:mm a") : ""}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>{msg.content}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2" style={{ borderTop: "1px solid #EEEEEE", paddingTop: "12px" }}>
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

            <div className={`${isMobile ? "px-5 py-4" : "px-8 py-6"}`} style={{ borderBottom: "1px solid #F3F4F6" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
                Notes ({taskNotes.length})
              </p>
              {taskNotes.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: "#9CA3AF" }}>No notes yet</p>
              ) : (
                <div className="space-y-4 mb-3">
                  {taskNotes.map((note) => {
                    const noteAuthor = allUsers?.find(u => u.id === note.userId);
                    const isEditing = editingNoteId === note.id;
                    return (
                      <div key={note.id} data-testid={`panel-note-${note.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <StickyNote className="w-4 h-4" style={{ color: "#F59E0B" }} />
                              <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                                {noteAuthor ? `${noteAuthor.firstName || ""} ${noteAuthor.lastName || ""}`.trim() || noteAuthor.username : "Unknown"}
                              </span>
                              <span className="text-xs" style={{ color: "#9CA3AF" }}>
                                {note.createdAt ? format(new Date(note.createdAt), "MMM d, h:mm a") : ""}
                              </span>
                            </div>
                            {isEditing ? (
                              <div className="space-y-2 ml-6">
                                <Textarea
                                  value={editNoteContent}
                                  onChange={(e) => setEditNoteContent(e.target.value)}
                                  rows={3}
                                  data-testid="input-edit-note-content"
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button variant="ghost" size="sm" onClick={() => { setEditingNoteId(null); setEditNoteContent(""); }} data-testid="button-cancel-edit-note">
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                                    disabled={!editNoteContent.trim() || updateNoteMutation.isPending}
                                    onClick={() => updateNoteMutation.mutate({ noteId: note.id, content: editNoteContent })}
                                    data-testid="button-save-edit-note"
                                  >
                                    {updateNoteMutation.isPending ? "Saving..." : "Save"}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed ml-6" style={{ color: "#374151" }}>{note.content}</p>
                            )}
                          </div>
                          {!isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="icon" variant="ghost" onClick={() => { setEditingNoteId(note.id); setEditNoteContent(note.content); }} data-testid={`button-edit-note-${note.id}`}>
                                <Pencil className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => setDeleteNoteId(note.id)} data-testid={`button-delete-note-${note.id}`}>
                                <Trash2 className="w-3.5 h-3.5" style={{ color: "#D94F4F" }} />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs font-medium transition-colors"
                style={{ border: "1px dashed #D1D5DB", color: "#6B7280" }}
                onClick={() => setIsAddNoteDialogOpen(true)}
                data-testid="button-panel-add-note-inline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Note
              </button>
            </div>
          </div>

          <div
            className={isMobile ? "w-full shrink-0" : "w-80 shrink-0 overflow-y-auto"}
            style={{
              borderLeft: isMobile ? "none" : "1px solid #EEEEEE",
              borderTop: isMobile ? "1px solid #EEEEEE" : "none",
              backgroundColor: "#FAFAFA",
            }}
            data-testid="panel-right-sidebar"
          >
            <div className={`${isMobile ? "p-4" : "p-6"}`} style={{ borderBottom: "1px solid #F3F4F6" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
                Parts ({taskParts.length})
              </p>
              {taskParts.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: "#9CA3AF" }}>No parts used</p>
              ) : (
                <div className="space-y-3">
                  {taskParts.map((part) => (
                    <div key={part.id} data-testid={`panel-part-${part.id}`}>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                        <span className="text-sm" style={{ color: "#1A1A1A" }}>{part.partName}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-6 mt-1">
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>Qty: {part.quantity}</span>
                        {part.cost !== null && part.cost !== undefined && Number(part.cost) > 0 && (
                          <span className="text-xs font-medium" style={{ color: "#15803D" }}>${Number(part.cost).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`${isMobile ? "p-4" : "p-6"}`} style={{ borderBottom: "1px solid #F3F4F6" }}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Time Log</p>
                <span className="text-sm font-medium" style={{ color: "#6B7280" }}>
                  {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                </span>
              </div>
              {timeEntries.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: "#9CA3AF" }}>No time entries</p>
              ) : (
                <div className="space-y-3">
                  {timeEntries.map((entry: TimeEntry) => {
                    const entryUser = allUsers?.find(u => u.id === entry.userId);
                    const isRunning = entry.startTime && !entry.endTime;
                    const duration = entry.durationMinutes
                      ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m`
                      : isRunning ? "Running" : "—";
                    return (
                      <div key={entry.id} className="flex items-center justify-between gap-2 py-1.5" data-testid={`panel-history-${entry.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                            {entryUser ? `${entryUser.firstName || ""} ${entryUser.lastName || ""}`.trim() || entryUser.username : "Unknown"}
                          </p>
                          <p className="text-xs" style={{ color: "#9CA3AF" }}>
                            {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{
                              backgroundColor: isRunning ? "#EEF2FF" : "#FFFFFF",
                              color: isRunning ? "#4338CA" : "#374151",
                              border: isRunning ? "none" : "1px solid #E5E7EB",
                            }}
                          >
                            {duration}
                          </span>
                          {!isRunning && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingTimeEntryId(entry.id);
                                  setEditTimeDuration(String(entry.durationMinutes || 0));
                                }}
                                data-testid={`button-edit-time-${entry.id}`}
                              >
                                <Pencil className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteTimeEntryId(entry.id)}
                                data-testid={`button-delete-time-${entry.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" style={{ color: "#D94F4F" }} />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-3 rounded-md text-xs font-medium transition-colors"
                style={{ border: "1px dashed #D1D5DB", color: "#6B7280" }}
                onClick={() => setIsLogTimeDialogOpen(true)}
                data-testid="button-panel-log-time-inline"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Time
              </button>
            </div>

            <div className={`${isMobile ? "p-4" : "p-6"}`}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
                Resources ({(uploads?.length || 0)})
              </p>
              {(!uploads || uploads.length === 0) ? (
                <p className="text-xs text-center py-3" style={{ color: "#9CA3AF" }}>No resources attached</p>
              ) : (
                <div className="space-y-2">
                  {uploads.map((upload) => {
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
                        className="flex items-center gap-2 py-2 px-2 rounded hover-elevate"
                        data-testid={`resource-item-${upload.id}`}
                      >
                        <TypeIcon className="w-4 h-4 shrink-0" style={{ color: badgeColor }} />
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                          style={{ backgroundColor: badgeBg, color: badgeColor }}
                        >
                          {typeLabel}
                        </span>
                        <span className="text-sm truncate flex-1" style={{ color: "#374151" }}>{upload.fileName}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        {taskDialogs}
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
          className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ backgroundColor: statusPill.bg, color: statusPill.text }}
        >
          {statusLabel}
        </span>

        <div className="flex-1" />

        {!isFullscreen && isAdmin && (
          <div className="flex items-center gap-1">
            {isNotStarted && (
              <Button
                size="sm"
                onClick={handleStartTask}
                disabled={updateStatusMutation.isPending}
                data-testid="button-panel-start-task"
                style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                Start
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
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Complete
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" data-testid="button-panel-actions-menu">
                  <MoreVertical className="w-4 h-4" style={{ color: "#6B7280" }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2" onClick={() => setIsEditMode(true)} data-testid="button-panel-edit">
                  <Pencil className="w-4 h-4" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600 gap-2" onClick={() => setDeleteDialogOpen(true)} data-testid="button-panel-delete">
                  <Trash2 className="w-4 h-4" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {isFullscreen && (
          <>
            <div className="flex items-center gap-1.5">
              <Flag className="w-3 h-3" style={{ color: urg.color }} />
              <span className="text-xs font-medium" style={{ color: urg.color }}>{urg.label}</span>
            </div>

            {task.estimatedCompletionDate && (
              <span className="text-xs font-medium ml-2" style={{ color: isOverdue ? "#D94F4F" : "#6B7280" }}>
                {new Date(task.estimatedCompletionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </>
        )}

        {!hideFullscreenToggle && (
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
        )}
      </div>

      {/* Content area */}
      <div className={isMobile && isFullscreen ? "flex flex-col flex-1 overflow-y-auto" : "flex flex-1 overflow-hidden"}>
        {mainContent}
        {rightSidebar}
      </div>
      {taskDialogs}
    </div>
  );
}
