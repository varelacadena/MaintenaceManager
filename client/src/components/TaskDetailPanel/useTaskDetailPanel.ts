import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { invalidateTaskAfterMutation, patchTaskInListCaches } from "@/lib/taskQueryInvalidation";
import { canReadInventory } from "@/lib/inventoryAccess";
import { useInventorySearch } from "@/hooks/useInventorySearch";
import type { Task, User, Property, Upload, PartUsed, InventoryItem, TaskNote, TimeEntry } from "@shared/schema";
import {
  panelStatusDotStyle,
  panelStatusPillStyle,
  panelStatusLabels,
  priorityConfig,
  getAvatarHexColor as getAvatarColorForId,
} from "@/utils/taskUtils";

interface UseTaskDetailPanelArgs {
  taskId: string;
  isFullscreen: boolean;
  onClose: () => void;
  allUsers?: User[];
  properties?: Property[];
}

type TaskDetailPayload = {
  task: Task;
  subtasks: Task[];
  uploads: Upload[];
  parts: PartUsed[];
  timeEntries: TimeEntry[];
  notes: TaskNote[];
};

export function useTaskDetailPanel({
  taskId,
  isFullscreen,
  onClose,
  allUsers,
  properties,
}: UseTaskDetailPanelArgs) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const isMobile = useIsMobile();

  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [isPartsOpen, setIsPartsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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

  const { data: detail, isLoading, isError: isTaskLoadError } = useQuery<TaskDetailPayload>({
    queryKey: ["/api/tasks", taskId, "detail"],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/detail`);
      if (!res.ok) throw new Error("Failed to fetch task");
      return res.json();
    },
    enabled: !!taskId,
  });

  const task = detail?.task;
  const subtasks = detail?.subtasks ?? [];
  const uploads = detail?.uploads ?? [];
  const taskParts = detail?.parts ?? [];

  const { inventoryItems } = useInventorySearch(inventorySearchQuery, {
    enabled: canReadInventory(user?.role),
    selectedItemId: selectedInventoryItemId || undefined,
  });

  const timeEntries = detail?.timeEntries ?? [];
  const taskNotes = detail?.notes ?? [];

  const refreshTaskDetail = (patch?: Partial<Task>) => {
    invalidateTaskAfterMutation(taskId, patch ? { patch } : undefined);
  };

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

  const addPartMutation = useMutation({
    mutationFn: async (partData: { taskId: string; partName: string; quantity: string; cost: number; notes?: string; inventoryItemId?: string }) => {
      const res = await apiRequest("POST", "/api/parts", partData);
      return res.json();
    },
    onSuccess: () => {
      refreshTaskDetail();
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

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, { status: newStatus });
    },
    onSuccess: (_result, newStatus) => {
      refreshTaskDetail({ status: newStatus as Task["status"] });
      toast({ title: "Task updated", description: "Status changed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, { [field]: value });
    },
    onSuccess: (_result, variables) => {
      const patch = { [variables.field]: variables.value } as Partial<Task>;
      patchTaskInListCaches(taskId, patch);
      refreshTaskDetail(patch);
      toast({ title: "Task updated", description: "Changes saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    },
  });

  const handleInlineEdit = (editTaskId: string, field: string, value: string) => {
    if (editTaskId !== taskId) return;
    updateTaskMutation.mutate({ field, value });
  };

  const updateSubtaskStatusMutation = useMutation({
    mutationFn: async ({ subtaskId, status }: { subtaskId: string; status: string }) => {
      return apiRequest("PATCH", `/api/tasks/${subtaskId}`, { status });
    },
    onSuccess: (_result, variables) => {
      refreshTaskDetail();
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", variables.subtaskId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      invalidateTaskAfterMutation(taskId, { broad: true });
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
      refreshTaskDetail();
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
      refreshTaskDetail();
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
      refreshTaskDetail();
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
      refreshTaskDetail();
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
      refreshTaskDetail();
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
      refreshTaskDetail();
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
      refreshTaskDetail();
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
      refreshTaskDetail();
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

  const statusPill = task ? (panelStatusPillStyle[task.status] || panelStatusPillStyle.not_started) : panelStatusPillStyle.not_started;
  const statusDot = task ? (panelStatusDotStyle[task.status] || panelStatusDotStyle.not_started) : panelStatusDotStyle.not_started;
  const statusLabel = task ? (panelStatusLabels[task.status] || "UNKNOWN") : "UNKNOWN";

  return {
    user,
    toast,
    isAdmin,
    isMobile,

    task,
    isLoading,
    isTaskLoadError,
    subtasks,
    uploads,
    taskParts,
    inventoryItems,
    timeEntries,
    taskNotes,
    totalMinutes,
    docCount,
    imgCount,
    vidCount,

    expandedSubtasks,
    resourcesExpanded,
    setResourcesExpanded,
    deleteDialogOpen,
    setDeleteDialogOpen,
    isEditMode,
    setIsEditMode,
    isPartsOpen,
    setIsPartsOpen,
    isHistoryOpen,
    setIsHistoryOpen,
    isAddPartFormOpen,
    setIsAddPartFormOpen,
    newPartQuantity,
    setNewPartQuantity,
    newPartNotes,
    setNewPartNotes,
    inventorySearchQuery,
    setInventorySearchQuery,
    selectedInventoryItemId,
    setSelectedInventoryItemId,
    isNotesOpen,
    setIsNotesOpen,
    isAddNoteDialogOpen,
    setIsAddNoteDialogOpen,
    isLogTimeDialogOpen,
    setIsLogTimeDialogOpen,
    isScanDialogOpen,
    setIsScanDialogOpen,
    newNoteContent,
    setNewNoteContent,
    newNoteType,
    setNewNoteType,
    logTimeDuration,
    setLogTimeDuration,
    editingTimeEntryId,
    setEditingTimeEntryId,
    editTimeDuration,
    setEditTimeDuration,
    deleteTimeEntryId,
    setDeleteTimeEntryId,
    editingNoteId,
    setEditingNoteId,
    editNoteContent,
    setEditNoteContent,
    deleteNoteId,
    setDeleteNoteId,
    isFileUploading,
    pendingUploadForLabel,
    fileInputRef,
    isPanelUploadLabelSaving,

    addPartMutation,
    updateStatusMutation,
    updateTaskMutation,
    handleInlineEdit,
    deleteTaskMutation,
    addNoteMutation,
    updateNoteMutation,
    deleteNoteMutation,
    updateTimeEntryMutation,
    deleteTimeEntryMutation,
    logTimeMutation,

    handleFileUpload,
    handlePanelUploadLabelSave,
    handlePanelUploadLabelCancel,

    property,
    assignee,
    assigneeInitials,
    assigneeName,
    completedSubtasks,
    totalSubtasks,
    allSubtasksComplete,
    isStarted,
    isCompleted,
    isNotStarted,
    urg,
    isOverdue,
    toggleSubtaskExpanded,
    handleStartTask,
    handleMarkComplete,
    handleSubtaskToggle,
    statusPill,
    statusDot,
    statusLabel,
  };
}

export type TaskDetailPanelContext = ReturnType<typeof useTaskDetailPanel>;
