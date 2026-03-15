import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  X,
  Send,
  Plus,
  Play,
  Square,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, User, Property, Upload, Message, PartUsed } from "@shared/schema";
import { TaskEditMode } from "./TaskEditMode";
import { SubtaskNote } from "./SubtaskNote";
import { SubtaskPhotos } from "./SubtaskPhotos";
import { ObjectUploader } from "./ObjectUploader";
import { BarcodeScanner } from "./BarcodeScanner";
import { toDisplayUrl } from "@/lib/imageUtils";
import { format } from "date-fns";

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
  const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [previewUpload, setPreviewUpload] = useState<Upload | null>(null);
  const [isMessagesSheetOpen, setIsMessagesSheetOpen] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [isPartsSheetOpen, setIsPartsSheetOpen] = useState(false);
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isAddPartFormOpen, setIsAddPartFormOpen] = useState(false);
  const [newPartName, setNewPartName] = useState("");
  const [newPartQuantity, setNewPartQuantity] = useState("1");
  const [newPartNotes, setNewPartNotes] = useState("");
  const [newPartCost, setNewPartCost] = useState("");

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

  const { data: taskMessages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages/task", id],
    queryFn: async () => {
      const res = await fetch(`/api/messages/task/${id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
    refetchInterval: isMessagesSheetOpen ? 5000 : false,
  });

  const { data: taskParts = [] } = useQuery<PartUsed[]>({
    queryKey: ["/api/parts/task", id],
    queryFn: async () => {
      const res = await fetch(`/api/parts/task/${id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/messages", { taskId: id, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/task", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessageText("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    },
  });

  const markMessagesReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/messages/task/${id}/mark-read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/task", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const addPartMutation = useMutation({
    mutationFn: async (partData: { taskId: string; partName: string; quantity: string; cost: number; notes?: string }) => {
      const res = await apiRequest("POST", "/api/parts", partData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts/task", id] });
      setNewPartName("");
      setNewPartQuantity("1");
      setNewPartNotes("");
      setNewPartCost("");
      setIsAddPartFormOpen(false);
      toast({ title: "Part added" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add part.", variant: "destructive" }),
  });

  const activeTimerEntry = useMemo(() => {
    if (!timeEntries || !user) return null;
    return timeEntries.find((e: any) => e.startTime && !e.endTime && e.userId === user.id) || null;
  }, [timeEntries, user]);

  const startTimerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/time-entries", {
        taskId: id,
        userId: user?.id,
        startTime: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/task", id] });
      if (task?.status === "not_started" || task?.status === "waiting_approval") {
        try {
          await apiRequest("PATCH", `/api/tasks/${id}/status`, { status: "in_progress" });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        } catch {}
      }
      toast({ title: "Timer started" });
    },
    onError: () => toast({ title: "Error", description: "Failed to start timer", variant: "destructive" }),
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (timerId: string) => {
      const entry = timeEntries?.find((e: any) => e.id === timerId);
      if (!entry?.startTime) return;
      const endTime = new Date();
      const startTime = new Date(entry.startTime);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      await apiRequest("PATCH", `/api/time-entries/${timerId}`, {
        endTime: endTime.toISOString(),
        durationMinutes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/task", id] });
      toast({ title: "Timer stopped" });
    },
    onError: () => toast({ title: "Error", description: "Failed to stop timer", variant: "destructive" }),
  });

  useEffect(() => {
    if (isMessagesSheetOpen && taskMessages.length > 0) {
      const hasUnread = taskMessages.some((m: Message) => !m.read && m.senderId !== user?.id);
      if (hasUnread) {
        markMessagesReadMutation.mutate();
      }
    }
  }, [isMessagesSheetOpen, taskMessages.length]);

  useEffect(() => {
    if (isMessagesSheetOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [isMessagesSheetOpen, taskMessages.length]);

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


  const addUploadMutation = useMutation({
    mutationFn: async ({ fileName, fileType, objectUrl }: { fileName: string, fileType: string, objectUrl: string }) => {
      const response = await apiRequest("PUT", "/api/uploads", {
        taskId: id,
        fileName,
        fileType,
        objectUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", id] });
      toast({ title: "File uploaded" });
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Could not save attachment", variant: "destructive" });
    },
  });

  const deleteUploadMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      return await apiRequest("DELETE", `/api/uploads/${uploadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", id] });
      toast({ title: "Attachment deleted" });
    },
    onError: () => {
      toast({ title: "Delete failed", description: "Could not remove attachment", variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/task-notes", {
        taskId: id,
        content,
        noteType: "job_note",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", id] });
      toast({ title: "Note added" });
      setNoteText("");
      setIsNoteSheetOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add note", variant: "destructive" });
    },
  });

  const getUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to get upload parameters");
    }
    const { uploadURL } = await response.json();
    return { method: "PUT" as const, url: uploadURL };
  };

  const handleAutoSaveUpload = async (result: any) => {
    if (result.successful?.length > 0) {
      for (const file of result.successful) {
        await addUploadMutation.mutateAsync({
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          objectUrl: file.uploadURL || file.url,
        });
      }
    }
  };

  const handleEquipmentScan = (value: string) => {
    setIsScannerOpen(false);
    toast({ title: "Scanned", description: `Code: ${value}` });
  };

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
    const totalMinutes = timeEntries.reduce((acc: number, te: any) => {
      if (te.durationMinutes) return acc + te.durationMinutes;
      if (te.startTime && te.endTime) {
        return acc + Math.round((new Date(te.endTime).getTime() - new Date(te.startTime).getTime()) / 60000);
      }
      return acc;
    }, 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
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
          <div className="grid grid-cols-2 divide-x divide-[#EEEEEE]" style={{ borderBottom: "1px solid #EEEEEE" }}>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
                  <p className="text-xs font-medium" style={{ color: "#1A1A1A" }}>{totalTime}</p>
                  {activeTimerEntry && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium animate-pulse" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                      Running
                    </span>
                  )}
                </div>
                {!isCompleted && (
                  activeTimerEntry ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => stopTimerMutation.mutate(activeTimerEntry.id)}
                      disabled={stopTimerMutation.isPending}
                      style={{ borderColor: "#FECACA", color: "#DC2626" }}
                      data-testid="button-mobile-stop-timer"
                    >
                      <Square className="w-3.5 h-3.5 mr-1" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startTimerMutation.mutate()}
                      disabled={startTimerMutation.isPending}
                      style={{ borderColor: "#D1D5DB", color: "#4338CA" }}
                      data-testid="button-mobile-start-timer"
                    >
                      <Play className="w-3.5 h-3.5 mr-1" />
                      Start
                    </Button>
                  )
                )}
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
                      <button
                        key={upload.id}
                        onClick={() => {
                          if (isImage) {
                            setPreviewUpload(upload);
                          } else {
                            window.open(toDisplayUrl(upload.objectUrl), "_blank");
                          }
                        }}
                        className="flex items-center gap-2 py-1.5 px-1 rounded hover-elevate w-full text-left"
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
                      </button>
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
          <div className="divide-y divide-[#EEEEEE]">
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
                          <SubtaskPhotos subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="mobile-subtask" />
                        </div>

                        <SubtaskNote subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="mobile-subtask" />
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
          <button
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            style={{ borderBottom: "1px solid #EEEEEE" }}
            onClick={() => setIsMessagesSheetOpen(true)}
            data-testid="link-mobile-messages"
          >
            <MessageSquare className="w-4 h-4" style={{ color: "#6B7280" }} />
            <span className="text-sm font-medium flex-1" style={{ color: "#1A1A1A" }}>Messages</span>
            {taskMessages.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}>
                {taskMessages.length}
              </span>
            )}
            <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            style={{ borderBottom: "1px solid #EEEEEE" }}
            onClick={() => setIsPartsSheetOpen(true)}
            data-testid="link-mobile-parts"
          >
            <Package className="w-4 h-4" style={{ color: "#6B7280" }} />
            <span className="text-sm font-medium flex-1" style={{ color: "#1A1A1A" }}>Parts Used</span>
            {taskParts.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}>
                {taskParts.length}
              </span>
            )}
            <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            onClick={() => setIsHistorySheetOpen(true)}
            data-testid="link-mobile-history"
          >
            <History className="w-4 h-4" style={{ color: "#6B7280" }} />
            <span className="text-sm font-medium flex-1" style={{ color: "#1A1A1A" }}>History</span>
            {(timeEntries?.length || 0) > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                {timeEntries?.length}
              </span>
            )}
            <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          </button>
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
            <ObjectUploader
              maxNumberOfFiles={5}
              maxFileSize={10485760}
              onGetUploadParameters={getUploadParameters}
              onComplete={handleAutoSaveUpload}
              onError={(error) => {
                toast({ title: "Upload failed", description: error.message, variant: "destructive" });
              }}
              buttonVariant="outline"
              buttonClassName=""
              buttonTestId="button-mobile-photos"
              isLoading={addUploadMutation.isPending}
            >
              <Camera className="w-4 h-4" />
            </ObjectUploader>
            <Button
              variant="outline"
              size="icon"
              style={{ borderColor: "#EEEEEE", color: "#6B7280" }}
              onClick={() => setIsScannerOpen(true)}
              data-testid="button-mobile-scan"
              aria-label="Scan"
            >
              <ScanLine className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              style={{ borderColor: "#EEEEEE", color: "#6B7280" }}
              onClick={() => setIsNoteSheetOpen(true)}
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

      {/* Add Note Sheet */}
      {isNoteSheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsNoteSheetOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-add-note"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">Add Note</p>
              <button onClick={() => setIsNoteSheetOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type your note..."
              rows={4}
              className="mb-3"
              data-testid="input-mobile-note"
            />
            <div className="flex gap-2">
              <Button
                className="flex-1"
                style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                onClick={() => noteText.trim() && addNoteMutation.mutate(noteText.trim())}
                disabled={!noteText.trim() || addNoteMutation.isPending}
                data-testid="button-submit-note"
              >
                Save Note
              </Button>
              <Button
                variant="outline"
                onClick={() => { setIsNoteSheetOpen(false); setNoteText(""); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewUpload && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          onClick={() => setPreviewUpload(null)}
        >
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-photo-preview"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white truncate flex-1 mr-4">
                {previewUpload.fileName}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center justify-center rounded-full bg-red-600/80 hover:bg-red-600"
                  style={{ width: 32, height: 32 }}
                  onClick={async () => {
                    try {
                      await deleteUploadMutation.mutateAsync(previewUpload.id);
                      setPreviewUpload(null);
                    } catch {}
                  }}
                  data-testid="button-delete-photo"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
                <button
                  className="flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
                  style={{ width: 32, height: 32 }}
                  onClick={() => setPreviewUpload(null)}
                  data-testid="button-close-photo-preview"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            {previewUpload.fileType?.startsWith("image/") ? (
              <img
                src={toDisplayUrl(previewUpload.objectUrl)}
                alt={previewUpload.fileName}
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-card rounded-lg">
                <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-sm text-foreground">{previewUpload.fileName}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleEquipmentScan}
        title="Scan Equipment"
        description="Scan a QR code or barcode"
      />

      {/* Messages Sheet */}
      {isMessagesSheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setIsMessagesSheetOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-card rounded-t-2xl flex flex-col"
            style={{ height: "80vh", maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-messages"
          >
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" style={{ color: "#6B7280" }} />
                <p className="text-sm font-semibold text-foreground">Messages</p>
                {taskMessages.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}>
                    {taskMessages.length}
                  </span>
                )}
              </div>
              <button onClick={() => setIsMessagesSheetOpen(false)} data-testid="button-close-messages">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {taskMessages.length === 0 ? (
                <p className="text-xs text-center py-8" style={{ color: "#9CA3AF" }}>No messages yet</p>
              ) : (
                taskMessages.map((msg) => {
                  const sender = allUsers?.find(u => u.id === msg.senderId);
                  const isOwnMessage = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
                      data-testid={`message-item-${msg.id}`}
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
            <div className="shrink-0 px-4 py-3 flex gap-2" style={{ borderTop: "1px solid #EEEEEE" }}>
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
                data-testid="input-mobile-message"
              />
              <Button
                size="icon"
                style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                onClick={() => newMessageText.trim() && sendMessageMutation.mutate(newMessageText.trim())}
                disabled={!newMessageText.trim() || sendMessageMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Parts Used Sheet */}
      {isPartsSheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setIsPartsSheetOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-card rounded-t-2xl flex flex-col"
            style={{ maxHeight: "70vh" }}
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-parts"
          >
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: "#6B7280" }} />
                <p className="text-sm font-semibold text-foreground">Parts Used</p>
                {taskParts.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}>
                    {taskParts.length}
                  </span>
                )}
              </div>
              <button onClick={() => setIsPartsSheetOpen(false)} data-testid="button-close-parts">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {taskParts.length === 0 && !isAddPartFormOpen ? (
                <p className="text-xs text-center py-8" style={{ color: "#9CA3AF" }}>No parts used yet</p>
              ) : (
                <div className="space-y-2">
                  {taskParts.map((part) => (
                    <div
                      key={part.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}
                      data-testid={`part-item-${part.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#1A1A1A" }}>{part.partName}</p>
                        {part.notes && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: "#6B7280" }}>{part.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-xs font-medium" style={{ color: "#6B7280" }}>
                          x{part.quantity}
                        </span>
                        {part.cost !== null && part.cost !== undefined && Number(part.cost) > 0 && (
                          <span className="text-xs font-medium" style={{ color: "#15803D" }}>
                            ${Number(part.cost).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isAddPartFormOpen ? (
                <div className="mt-2 p-3 rounded-lg space-y-2" style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}>
                  <Input
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    placeholder="Part name"
                    data-testid="input-mobile-part-name"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={newPartQuantity}
                      onChange={(e) => setNewPartQuantity(e.target.value)}
                      placeholder="Qty"
                      type="number"
                      min="1"
                      className="w-20"
                      data-testid="input-mobile-part-quantity"
                    />
                    <Input
                      value={newPartCost}
                      onChange={(e) => setNewPartCost(e.target.value)}
                      placeholder="Cost ($)"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-24"
                      data-testid="input-mobile-part-cost"
                    />
                  </div>
                  <Input
                    value={newPartNotes}
                    onChange={(e) => setNewPartNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    data-testid="input-mobile-part-notes"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddPartFormOpen(false);
                        setNewPartName("");
                        setNewPartQuantity("1");
                        setNewPartCost("");
                        setNewPartNotes("");
                      }}
                      data-testid="button-mobile-cancel-part"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                      disabled={!newPartName.trim() || addPartMutation.isPending}
                      onClick={() => {
                        addPartMutation.mutate({
                          taskId: id!,
                          partName: newPartName.trim(),
                          quantity: newPartQuantity || "1",
                          cost: newPartCost ? parseFloat(newPartCost) : 0,
                          notes: newPartNotes.trim() || undefined,
                        });
                      }}
                      data-testid="button-mobile-save-part"
                    >
                      {addPartMutation.isPending ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </div>
              ) : (
                isAdmin && (
                  <button
                    className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 rounded-lg text-xs font-medium transition-colors"
                    style={{ border: "1px dashed #D1D5DB", color: "#6B7280" }}
                    onClick={() => setIsAddPartFormOpen(true)}
                    data-testid="button-mobile-add-part"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Part
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Sheet */}
      {isHistorySheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setIsHistorySheetOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-card rounded-t-2xl flex flex-col"
            style={{ maxHeight: "70vh" }}
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-history"
          >
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" style={{ color: "#6B7280" }} />
                <p className="text-sm font-semibold text-foreground">Time History</p>
              </div>
              <button onClick={() => setIsHistorySheetOpen(false)} data-testid="button-close-history">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {(!timeEntries || timeEntries.length === 0) ? (
                <p className="text-xs text-center py-8" style={{ color: "#9CA3AF" }}>No time entries yet</p>
              ) : (
                <div className="space-y-2">
                  {timeEntries.map((entry: any) => {
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
                        data-testid={`history-entry-${entry.id}`}
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
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

