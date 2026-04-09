import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, User, Property, Upload, Message, PartUsed, InventoryItem } from "@shared/schema";

export function useMobileTaskDetail() {
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
  const [newPartQuantity, setNewPartQuantity] = useState("1");
  const [newPartNotes, setNewPartNotes] = useState("");
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState("");

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

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
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
    mutationFn: async (partData: { taskId: string; partName: string; quantity: string; cost: number; notes?: string; inventoryItemId?: string }) => {
      const res = await apiRequest("POST", "/api/parts", partData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts/task", id] });
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

  return {
    id,
    user,
    isAdmin,
    navigate,
    toast,
    task,
    isLoading,
    subtasks,
    uploads,
    property,
    allUsers,
    timeEntries,
    taskMessages,
    taskParts,
    inventoryItems,
    expandedSubtasks, setExpandedSubtasks,
    resourcesExpanded, setResourcesExpanded,
    deleteDialogOpen, setDeleteDialogOpen,
    isEditMode, setIsEditMode,
    isNoteSheetOpen, setIsNoteSheetOpen,
    noteText, setNoteText,
    isScannerOpen, setIsScannerOpen,
    previewUpload, setPreviewUpload,
    isMessagesSheetOpen, setIsMessagesSheetOpen,
    newMessageText, setNewMessageText,
    isPartsSheetOpen, setIsPartsSheetOpen,
    isHistorySheetOpen, setIsHistorySheetOpen,
    messagesEndRef,
    isAddPartFormOpen, setIsAddPartFormOpen,
    newPartQuantity, setNewPartQuantity,
    newPartNotes, setNewPartNotes,
    inventorySearchQuery, setInventorySearchQuery,
    selectedInventoryItemId, setSelectedInventoryItemId,
    sendMessageMutation,
    addPartMutation,
    activeTimerEntry,
    startTimerMutation,
    stopTimerMutation,
    updateStatusMutation,
    updateSubtaskStatusMutation,
    deleteTaskMutation,
    addUploadMutation,
    deleteUploadMutation,
    addNoteMutation,
    getUploadParameters,
    handleAutoSaveUpload,
    handleEquipmentScan,
    toggleSubtaskExpanded,
    totalTime,
    docCount,
    imgCount,
    vidCount,
    taskStarted,
    isCompleted,
    completedSubtasks,
    totalSubtasks,
    allSubtasksDone,
    subtaskProgress,
  };
}

export type MobileTaskDetailHookReturn = ReturnType<typeof useMobileTaskDetail>;
