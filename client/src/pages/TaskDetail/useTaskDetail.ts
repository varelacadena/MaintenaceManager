import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useFileDownload } from "@/hooks/use-download";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  Task,
  TimeEntry,
  PartUsed,
  TaskNote,
  InventoryItem,
  User as UserType,
  Upload,
  ServiceRequest,
  Message,
  Property,
  Equipment,
  Space,
  TaskChecklistGroup,
  TaskChecklistItem,
  Quote,
  Vendor,
  Vehicle,
} from "@shared/schema";
import { getDateLabel } from "./helpers";

type ChecklistGroupWithItems = TaskChecklistGroup & { items: TaskChecklistItem[] };

export function useTaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const taskPagePath = `/tasks/${id}`;
  const { toast } = useToast();
  const { downloadFile } = useFileDownload();

  const [newNote, setNewNote] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [aiScheduleLog, setAiScheduleLog] = useState<any>(null);
  const [aiScheduleLoading, setAiScheduleLoading] = useState(false);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>("");
  const [partQuantity, setPartQuantity] = useState("");
  const [partNotes, setPartNotes] = useState("");
  const [isAddPartDialogOpen, setIsAddPartDialogOpen] = useState(false);
  const [isScanPartOpen, setIsScanPartOpen] = useState(false);
  const [isScanEquipmentOpen, setIsScanEquipmentOpen] = useState(false);
  const [scannedEquipment, setScannedEquipment] = useState<Equipment | null>(null);
  const [scannedEquipmentTasks, setScannedEquipmentTasks] = useState<Task[]>([]);
  const [scannedEquipmentResources, setScannedEquipmentResources] = useState<any[]>([]);
  const [isEquipmentInfoOpen, setIsEquipmentInfoOpen] = useState(false);
  const [isEquipmentLoading, setIsEquipmentLoading] = useState(false);
  const [equipmentInfoTab, setEquipmentInfoTab] = useState<"info" | "history" | "resources">("info");
  const [aiSuggestedParts, setAiSuggestedParts] = useState<Array<{ id: string; name: string; suggestedQuantity: number; unit: string; reason: string }>>([]);
  const [isAiSuggestLoading, setIsAiSuggestLoading] = useState(false);
  const [isQuickAddInventoryOpen, setIsQuickAddInventoryOpen] = useState(false);
  const [quickInventoryName, setQuickInventoryName] = useState("");
  const [quickInventoryQuantity, setQuickInventoryQuantity] = useState(0);
  const [quickInventoryUnit, setQuickInventoryUnit] = useState("");
  const [isStopTimerDialogOpen, setIsStopTimerDialogOpen] = useState(false);
  const [isResourcesSheetOpen, setIsResourcesSheetOpen] = useState(false);
  const [isHoldReasonDialogOpen, setIsHoldReasonDialogOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [isAddNoteDialogOpen, setIsAddNoteDialogOpen] = useState(false);
  const [noteType, setNoteType] = useState<"job_note" | "recommendation">("job_note");
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false);
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
  const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [allowNavigation, setAllowNavigation] = useState(false);
  
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [messagesExpanded, setMessagesExpanded] = useState(false);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const [checklistExpanded, setChecklistExpanded] = useState(false);
  const [partsExpanded, setPartsExpanded] = useState(false);
  const [quotesExpanded, setQuotesExpanded] = useState(true);
  const [previousWorkExpanded, setPreviousWorkExpanded] = useState(false);
  const [isAddQuoteDialogOpen, setIsAddQuoteDialogOpen] = useState(false);
  const [newQuoteVendorId, setNewQuoteVendorId] = useState<string>("");
  const [newQuoteVendorName, setNewQuoteVendorName] = useState("");
  const [newQuoteEstimatedCost, setNewQuoteEstimatedCost] = useState("");
  const [newQuoteNotes, setNewQuoteNotes] = useState("");
  const [pendingQuoteFiles, setPendingQuoteFiles] = useState<Array<{url: string, fileName: string, fileType: string, fileSize: number}>>([]);
  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorEmail, setNewVendorEmail] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const [newVendorAddress, setNewVendorAddress] = useState("");
  const [newVendorNotes, setNewVendorNotes] = useState("");
  const [scannedVehicle, setScannedVehicle] = useState<Vehicle | null>(null);
  const [isVehicleInfoOpen, setIsVehicleInfoOpen] = useState(false);
  const [isAddSubTaskDialogOpen, setIsAddSubTaskDialogOpen] = useState(false);
  const [subTaskSearchQuery, setSubTaskSearchQuery] = useState("");
  const [subTaskSearchType, setSubTaskSearchType] = useState<"equipment" | "vehicle">("equipment");
  const [summaryTaskId, setSummaryTaskId] = useState<string | null>(null);
  const [pendingUploadForLabel, setPendingUploadForLabel] = useState<{
    fileName: string;
    fileType: string;
    objectUrl: string;
    previewUrl?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesSectionRef = useRef<HTMLDivElement>(null);
  const partsSectionRef = useRef<HTMLDivElement>(null);

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["/api/tasks", id],
  });

  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries/task", id],
    enabled: !!id,
  });

  const { data: parts = [] } = useQuery<PartUsed[]>({
    queryKey: ["/api/parts/task", id],
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery<TaskNote[]>({
    queryKey: ["/api/task-notes/task", id],
    enabled: !!id,
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: uploads = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/task", id, "includeSubtasks"],
    queryFn: async () => {
      const res = await fetch(`/api/uploads/task/${id}?includeSubtasks=true`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch uploads");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: request } = useQuery<ServiceRequest>({
    queryKey: ["/api/service-requests", task?.requestId],
    enabled: !!task?.requestId,
  });

  const { data: requestAttachments = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/request", task?.requestId],
    enabled: !!task?.requestId,
  });

  const { data: property } = useQuery<Property>({
    queryKey: ["/api/properties", task?.propertyId],
    enabled: !!task?.propertyId,
  });

  const { data: allProperties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    enabled: !!(task?.isCampusWide || (task?.propertyIds && task.propertyIds.length > 0)),
  });

  const multiProperties = useMemo(() => {
    if (!task?.propertyIds || task.propertyIds.length === 0) return [];
    return allProperties.filter((p) => task.propertyIds!.includes(p.id));
  }, [task?.propertyIds, allProperties]);

  const { data: equipment } = useQuery<Equipment>({
    queryKey: ["/api/equipment", task?.equipmentId],
    enabled: !!task?.equipmentId,
  });

  const { data: space } = useQuery<Space>({
    queryKey: ["/api/spaces", task?.spaceId],
    enabled: !!task?.spaceId,
  });

  type ChecklistGroupWithItems = TaskChecklistGroup & { items: TaskChecklistItem[] };
  
  const { data: checklistGroups = [] } = useQuery<ChecklistGroupWithItems[]>({
    queryKey: ["/api/tasks", id, "checklist-groups"],
    enabled: !!id,
  });

  const { data: contactStaff } = useQuery<UserType>({
    queryKey: ["/api/users", task?.contactStaffId],
    enabled: !!task?.contactStaffId,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages/task", id],
    enabled: !!id && (user?.role === "admin" || user?.role === "technician"),
    refetchInterval: 5000,
  });

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/tasks", id, "quotes"],
    enabled: !!id && !!task?.requiresEstimate,
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !!task?.propertyId && (user?.role === "technician" || user?.role === "admin"),
  });

  const { data: subTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", id, "subtasks"],
    enabled: !!id,
  });

  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: ["/api/vehicles", task?.vehicleId],
    enabled: !!task?.vehicleId,
  });

  const { data: parentTask } = useQuery<Task>({
    queryKey: ["/api/tasks", task?.parentTaskId],
    enabled: !!task?.parentTaskId,
  });

  const { data: allEquipment = [] } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
    enabled: !!isAddSubTaskDialogOpen,
  });

  const { data: allVehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    enabled: !!isAddSubTaskDialogOpen,
  });

  const { data: subTaskTimeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
    enabled: subTasks.length > 0,
  });

  const { data: taskDependencies = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks", id, "dependencies"],
    queryFn: () => apiRequest("GET", `/api/tasks/${id}/dependencies`).then((r) => r.json()),
    enabled: !!id && user?.role === "admin",
  });

  const { data: propertyResources = [] } = useQuery<any[]>({
    queryKey: ["/api/properties", task?.propertyId, "resources"],
    queryFn: () => fetch(`/api/properties/${task?.propertyId}/resources`).then(r => r.json()),
    enabled: !!task?.propertyId,
  });

  const { data: equipmentResources = [] } = useQuery<any[]>({
    queryKey: ["/api/equipment", task?.equipmentId, "resources"],
    queryFn: () => fetch(`/api/equipment/${task?.equipmentId}/resources`).then(r => r.json()),
    enabled: !!task?.equipmentId,
  });

  const allTaskResources = useMemo(() => {
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const r of [...propertyResources, ...equipmentResources]) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push(r);
      }
    }
    return merged;
  }, [propertyResources, equipmentResources]);

  const previousWork = useMemo(() => {
    if (!task || !allTasks.length) return [];
    return allTasks
      .filter((t) => {
        if (t.id === task.id) return false;
        if (t.status !== "completed") return false;
        if (task.equipmentId && t.equipmentId === task.equipmentId) return true;
        if (task.propertyId && t.propertyId === task.propertyId) return true;
        return false;
      })
      .sort((a, b) => {
        const dateA = a.updatedAt || "";
        const dateB = b.updatedAt || "";
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 10);
  }, [task, allTasks]);

  useEffect(() => {
    const runningEntry = timeEntries.find((e) => e.startTime && !e.endTime);
    if (runningEntry) {
      setActiveTimer(runningEntry.id);
    }
  }, [timeEntries]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeTimer) {
        e.preventDefault();
        e.returnValue = "You have an active timer running. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeTimer]);

  useEffect(() => {
    if (!activeTimer) return;

    const handlePopState = () => {
      if (allowNavigation) {
        setAllowNavigation(false);
        return;
      }
      window.history.pushState(null, "", window.location.href);
      setPendingNavigation("back");
      setIsLeaveConfirmDialogOpen(true);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [activeTimer, allowNavigation]);

  const previousLocationRef = useRef<string>(location);
  const isInitialMountRef = useRef(true);
  
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousLocationRef.current = location;
      return;
    }
    
    if (!activeTimer) {
      previousLocationRef.current = location;
      return;
    }
    
    if (allowNavigation) {
      previousLocationRef.current = location;
      return;
    }
    
    const isLeavingTaskPage = previousLocationRef.current.startsWith("/tasks/") && 
                              !location.startsWith("/tasks/" + id);
    
    if (isLeavingTaskPage && !isLeaveConfirmDialogOpen) {
      setPendingNavigation(location);
      navigate(previousLocationRef.current);
      setIsLeaveConfirmDialogOpen(true);
    } else {
      previousLocationRef.current = location;
    }
  }, [location, activeTimer, allowNavigation, id, isLeaveConfirmDialogOpen, navigate]);

  const safeNavigate = (path: string) => {
    const isSubtaskNav = subTasks?.some(st => path === `/tasks/${st.id}`);
    if (activeTimer && !isSubtaskNav) {
      setPendingNavigation(path);
      setIsLeaveConfirmDialogOpen(true);
    } else {
      navigate(path);
    }
  };

  const confirmLeave = () => {
    setAllowNavigation(true);
    if (pendingNavigation === "back") {
      window.history.back();
    } else if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setIsLeaveConfirmDialogOpen(false);
    setPendingNavigation(null);
  };

  const cancelLeave = () => {
    setIsLeaveConfirmDialogOpen(false);
    setPendingNavigation(null);
  };

  const handleScanPart = async (barcodeValue: string) => {
    const byBarcode = await fetch(`/api/inventory/by-barcode/${encodeURIComponent(barcodeValue)}`, {
      credentials: "include",
    });
    let item: InventoryItem | null = null;
    if (byBarcode.ok) {
      item = await byBarcode.json();
    } else {
      const byId = await fetch(`/api/inventory/${encodeURIComponent(barcodeValue)}`, {
        credentials: "include",
      });
      if (byId.ok) {
        item = await byId.json();
      }
    }
    if (item) {
      setSelectedInventoryItemId(item.id);
      setInventorySearchQuery(item.name);
      setIsAddPartDialogOpen(true);
      toast({ title: "Item found", description: item.name });
    } else {
      const proceed = window.confirm(
        `No item found for barcode "${barcodeValue}". Add it to inventory first, then try again.`
      );
      if (proceed) {
        setIsQuickAddInventoryOpen(true);
        setQuickInventoryName(barcodeValue);
      }
    }
  };

  const addSubTaskMutation = useMutation({
    mutationFn: async (body: { equipmentId?: string; vehicleId?: string; name?: string }) => {
      return await apiRequest("POST", `/api/tasks/${id}/subtasks`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Sub-task created" });
      setIsEquipmentInfoOpen(false);
      setIsVehicleInfoOpen(false);
      setIsAddSubTaskDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEquipmentScan = async (value: string) => {
    setIsScanEquipmentOpen(false);
    setIsEquipmentLoading(true);
    setEquipmentInfoTab("info");
    try {
      const vehicleIdMatch = value.match(/\/vehicles\/([a-f0-9-]{36})/i);
      if (vehicleIdMatch) {
        const vId = vehicleIdMatch[1];
        const vRes = await fetch(`/api/vehicles/${encodeURIComponent(vId)}`, { credentials: "include" });
        if (!vRes.ok) {
          toast({ title: "Vehicle not found", description: "Could not find vehicle for this QR code.", variant: "destructive" });
          return;
        }
        const veh = await vRes.json();
        setScannedVehicle(veh);
        setIsVehicleInfoOpen(true);
        return;
      }

      const equipmentIdMatch = value.match(/\/equipment\/([a-f0-9-]{36})/i) || value.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      const equipmentId = equipmentIdMatch ? equipmentIdMatch[1] : value.trim();

      const [eqRes, tasksRes, resourcesRes] = await Promise.all([
        fetch(`/api/equipment/${encodeURIComponent(equipmentId)}`, { credentials: "include" }),
        fetch(`/api/tasks?equipmentId=${encodeURIComponent(equipmentId)}`, { credentials: "include" }),
        fetch(`/api/equipment/${encodeURIComponent(equipmentId)}/resources`, { credentials: "include" }),
      ]);

      if (!eqRes.ok) {
        toast({ title: "Equipment not found", description: "Could not find equipment for this QR code.", variant: "destructive" });
        return;
      }

      const [eq, tasks, resources] = await Promise.all([
        eqRes.json(),
        tasksRes.ok ? tasksRes.json() : [],
        resourcesRes.ok ? resourcesRes.json() : [],
      ]);

      setScannedEquipment(eq);
      setScannedEquipmentTasks(tasks);
      setScannedEquipmentResources(resources);
      setIsEquipmentInfoOpen(true);
    } catch {
      toast({ title: "Scan error", description: "Failed to load equipment data.", variant: "destructive" });
    } finally {
      setIsEquipmentLoading(false);
    }
  };

  const handleAiSuggestParts = async () => {
    if (!task) return;
    setIsAiSuggestLoading(true);
    try {
      const res = await apiRequest("POST", "/api/inventory/ai-insights", {
        type: "task_parts",
        taskDescription: task.description || task.name,
        taskCategory: (task as any).category || "general",
      });
      const data = await res.json();
      setAiSuggestedParts(data.items || []);
    } catch {
      toast({ title: "Error", description: "Failed to get AI suggestions", variant: "destructive" });
    } finally {
      setIsAiSuggestLoading(false);
    }
  };

  const markAsReadMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("POST", `/api/messages/task/${taskId}/mark-read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/task", id] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark messages as read", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/messages", { taskId: id, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/task", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessage("");
      toast({ title: "Message sent" });
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/task", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Message deleted" });
    },
    onError: () => toast({ title: "Failed to delete message", variant: "destructive" }),
  });

  useEffect(() => {
    if (id && messages.length > 0) {
      const hasUnreadMessages = messages.some((msg) => !msg.read && msg.senderId !== user?.id);
      if (hasUnreadMessages) {
        markAsReadMutation.mutate(id);
      }
    }
  }, [id, messages, user?.id]);

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiRequest("PATCH", `/api/tasks/${id}/status`, { status: newStatus });
      const result = await response.json();
      return { ...result, _requestedStatus: newStatus };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: data?._requestedStatus === "completed" ? "Task completed" : "Status updated" });
      if (data?._requestedStatus === "completed" && task?.parentTaskId) {
        setTimeout(() => safeNavigate(`/tasks/${task.parentTaskId}`), 1200);
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to update status", variant: "destructive" });
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

  const updateTaskMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const response = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to update task", variant: "destructive" });
    },
  });

  const startTimerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/time-entries", {
        taskId: id,
        userId: user?.id,
        startTime: new Date().toISOString()
      });
      return response.json();
    },
    onSuccess: async (data: TimeEntry) => {
      setActiveTimer(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/task", id] });
      if (task?.status === "not_started" || task?.status === "waiting_approval") {
        try {
          await apiRequest("PATCH", `/api/tasks/${id}/status`, { status: "in_progress" });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        } catch (error) {
          console.error("Error updating task status:", error);
        }
      }
      // If this is a pool task, claim it for the current user
      if (task?.assignedPool && !task?.assignedToId && user?.id) {
        try {
          await apiRequest("PATCH", `/api/tasks/${id}`, {
            assignedToId: user.id,
            assignedPool: null,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        } catch (error) {
          console.error("Error claiming pool task:", error);
        }
      }
      toast({ title: "Timer started" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start timer", variant: "destructive" });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async ({ timerId, newStatus, onHoldReason }: { timerId: string, newStatus?: string, onHoldReason?: string }) => {
      const entry = timeEntries.find((e) => e.id === timerId);
      if (!entry?.startTime) return;

      const endTime = new Date();
      const durationMinutes = Math.floor(
        (endTime.getTime() - new Date(entry.startTime).getTime()) / (1000 * 60)
      );

      await apiRequest("PATCH", `/api/time-entries/${timerId}`, {
        endTime: endTime.toISOString(),
        durationMinutes,
      });

      if (newStatus) {
        const payload: any = { status: newStatus };
        if (newStatus === "completed") {
          payload.actualCompletionDate = new Date().toISOString();
        }
        await apiRequest("PATCH", `/api/tasks/${id}`, payload);

        if (newStatus === "on_hold" && onHoldReason) {
          await apiRequest("POST", "/api/task-notes", {
            taskId: id,
            content: `Task placed on hold: ${onHoldReason}`
          });
        }
      }
      return { newStatus };
    },
    onSuccess: (data) => {
      setActiveTimer(null);
      setIsStopTimerDialogOpen(false);
      setIsHoldReasonDialogOpen(false);
      setHoldReason("");
      toast({ title: data?.newStatus === "completed" ? "Task completed" : "Timer stopped" });
      if (data?.newStatus === "completed" && task?.parentTaskId) {
        setTimeout(() => safeNavigate(`/tasks/${task.parentTaskId}`), 1200);
      }
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries/task", id] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", id] });
      }, 300);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to stop timer", variant: "destructive" });
    },
  });

  const quickAddInventoryMutation = useMutation({
    mutationFn: async () => {
      if (!quickInventoryName || quickInventoryQuantity <= 0) {
        throw new Error("Please enter item name and quantity");
      }
      const itemData = {
        name: quickInventoryName,
        quantity: quickInventoryQuantity,
        unit: quickInventoryUnit || undefined,
      };
      const response = await apiRequest("POST", "/api/inventory", itemData);
      return response.json();
    },
    onSuccess: (newItem) => {
      setIsQuickAddInventoryOpen(false);
      setSelectedInventoryItemId(newItem.id);
      setQuickInventoryName("");
      setQuickInventoryQuantity(0);
      setQuickInventoryUnit("");
      toast({ title: "Item created" });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/inventory"] }), 300);
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to create item", variant: "destructive" }),
  });

  const addPartMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInventoryItemId) throw new Error("Please select an item");
      const selectedItem = inventoryItems?.find(item => item.id === selectedInventoryItemId);
      if (!selectedItem) throw new Error("Item not found");

      const qty = parseFloat(partQuantity);
      const partData = {
        taskId: id,
        inventoryItemId: selectedInventoryItemId,
        partName: selectedItem.name,
        quantity: String(qty),
        cost: selectedItem.cost ? parseFloat(selectedItem.cost) * qty : 0,
        notes: partNotes || undefined,
      };

      const response = await apiRequest("POST", "/api/parts", partData);
      return response.json();
    },
    onSuccess: () => {
      setIsAddPartDialogOpen(false);
      setSelectedInventoryItemId("");
      setPartNotes("");
      setPartQuantity("");
      setInventorySearchQuery("");
      toast({ title: "Part added" });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/parts/task", id] });
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      }, 300);
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to add part", variant: "destructive" }),
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ content, noteType }: { content: string, noteType: string }) => {
      return await apiRequest("POST", "/api/task-notes", { taskId: id, content, noteType });
    },
    onSuccess: () => {
      setNewNote("");
      setNoteType("job_note");
      setIsAddNoteDialogOpen(false);
      toast({ title: "Note added" });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", id] }), 300);
    },
    onError: () => toast({ title: "Failed to add note", variant: "destructive" }),
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string, content: string }) => {
      const response = await apiRequest("PATCH", `/api/task-notes/${noteId}`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", id] });
    },
    onError: () => toast({ title: "Failed to update note", variant: "destructive" }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return await apiRequest("DELETE", `/api/task-notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", id] });
      toast({ title: "Note deleted" });
    },
    onError: () => toast({ title: "Failed to delete note", variant: "destructive" }),
  });

  const createQuoteMutation = useMutation({
    mutationFn: async ({ vendorName, estimatedCost, notes, files }: { vendorName: string, estimatedCost: number, notes: string, files: Array<{url: string, fileName: string, fileType: string, fileSize: number}> }) => {
      const response = await apiRequest("POST", "/api/quotes", { 
        taskId: id, 
        vendorName: vendorName || null, 
        estimatedCost, 
        notes: notes || null,
        status: "draft",
      });
      const quote = await response.json();
      
      if (files.length > 0 && quote.id) {
        for (const file of files) {
          await apiRequest("POST", `/api/quotes/${quote.id}/attachments`, {
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            storageUrl: file.url,
          });
        }
      }
      
      return quote;
    },
    onSuccess: () => {
      setNewQuoteVendorId("");
      setNewQuoteVendorName("");
      setNewQuoteEstimatedCost("");
      setNewQuoteNotes("");
      setPendingQuoteFiles([]);
      setIsAddQuoteDialogOpen(false);
      toast({ title: "Quote added", description: "The estimate has been added for comparison." });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "quotes"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      }, 300);
    },
    onError: () => toast({ title: "Failed to create quote", variant: "destructive" }),
  });

  const approveQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return await apiRequest("POST", `/api/quotes/${quoteId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Quote approved", description: "The task is now ready to start work." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve quote", variant: "destructive" });
    },
  });

  const rejectQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return await apiRequest("POST", `/api/quotes/${quoteId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Estimate rejected", description: "The estimate has been rejected." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject estimate", variant: "destructive" });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return await apiRequest("DELETE", `/api/quotes/${quoteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "quotes"] });
      toast({ title: "Estimate deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete estimate", variant: "destructive" });
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (vendorData: { name: string; email?: string; phone?: string; address?: string; notes?: string }) => {
      const response = await apiRequest("POST", "/api/vendors", vendorData);
      return response.json();
    },
    onSuccess: (newVendor) => {
      setNewQuoteVendorId(newVendor.id);
      setNewQuoteVendorName(newVendor.name);
      setNewVendorName("");
      setNewVendorEmail("");
      setNewVendorPhone("");
      setNewVendorAddress("");
      setNewVendorNotes("");
      setIsAddVendorDialogOpen(false);
      toast({ title: "Vendor created", description: `${newVendor.name} has been added.` });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/vendors"] }), 300);
    },
    onError: () => toast({ title: "Failed to create vendor", variant: "destructive" }),
  });

  const addUploadMutation = useMutation({
    mutationFn: async ({ fileName, fileType, objectUrl, label }: { fileName: string, fileType: string, objectUrl: string, label?: string }) => {
      const response = await apiRequest("PUT", "/api/uploads", {
        taskId: id,
        fileName,
        fileType,
        objectUrl,
        label,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", id, "includeSubtasks"] });
      toast({ title: "File uploaded" });
    },
  });

  const deleteUploadMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      return await apiRequest("DELETE", `/api/uploads/${uploadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", id, "includeSubtasks"] });
      toast({ title: "Attachment deleted" });
    },
    onError: () => {
      toast({ title: "Delete failed", description: "Could not remove attachment", variant: "destructive" });
    },
  });

  const toggleChecklistItemMutation = useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      return await apiRequest("PATCH", `/api/checklist-items/${itemId}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "checklist-groups"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update checklist item", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      if (task?.projectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", task.projectId, "tasks"] });
      }
      toast({ title: "Task deleted" });
      navigate("/work");
    },
    onError: () => toast({ title: "Failed to delete task", variant: "destructive" }),
  });

  const getUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to get upload URL" }));
      throw new Error(error.message || "Failed to get upload URL");
    }
    const { uploadURL } = await response.json();
    return { method: "PUT" as const, url: uploadURL };
  };

  const pendingUploadQueueRef = useRef<Array<{ fileName: string; fileType: string; objectUrl: string; previewUrl?: string }>>([]);

  const handleAutoSaveUpload = async (result: any) => {
    if (result.successful?.length > 0) {
      const files = result.successful.map((file: any) => ({
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        objectUrl: file.uploadURL || file.url,
        previewUrl: file.file && file.type?.startsWith("image/") ? URL.createObjectURL(file.file) : undefined,
      }));
      pendingUploadQueueRef.current = files.slice(1);
      setPendingUploadForLabel(files[0]);
    }
    if (result.failed?.length > 0) {
      toast({ title: "Upload failed", description: result.failed[0]?.error || "Could not upload file", variant: "destructive" });
    }
  };

  const [isUploadLabelSaving, setIsUploadLabelSaving] = useState(false);

  const advanceUploadQueue = () => {
    if (pendingUploadForLabel?.previewUrl) {
      URL.revokeObjectURL(pendingUploadForLabel.previewUrl);
    }
    const next = pendingUploadQueueRef.current.shift();
    if (next) {
      setPendingUploadForLabel(next);
    } else {
      setPendingUploadForLabel(null);
    }
  };

  const handleUploadLabelSave = async (label: string) => {
    if (!pendingUploadForLabel || isUploadLabelSaving) return;
    setIsUploadLabelSaving(true);
    try {
      await addUploadMutation.mutateAsync({
        fileName: pendingUploadForLabel.fileName,
        fileType: pendingUploadForLabel.fileType,
        objectUrl: pendingUploadForLabel.objectUrl,
        label,
      });
      advanceUploadQueue();
    } catch {
      toast({ title: "Upload failed", description: "Could not save file", variant: "destructive" });
    } finally {
      setIsUploadLabelSaving(false);
    }
  };

  const handleUploadLabelCancel = async () => {
    if (!pendingUploadForLabel || isUploadLabelSaving) return;
    setIsUploadLabelSaving(true);
    try {
      await addUploadMutation.mutateAsync({
        fileName: pendingUploadForLabel.fileName,
        fileType: pendingUploadForLabel.fileType,
        objectUrl: pendingUploadForLabel.objectUrl,
        label: pendingUploadForLabel.fileName,
      });
      advanceUploadQueue();
    } catch {
      toast({ title: "Upload failed", description: "Could not save file", variant: "destructive" });
    } finally {
      setIsUploadLabelSaving(false);
    }
  };

  const isTechnicianOrAdmin = user?.role === "admin" || user?.role === "technician";
  const isStudent = user?.role === "student";
  const taskWithHelpers = task as (Task & { helpers?: Array<{ userId: string; user?: { id: string; name: string; email: string; role: string } }>; isHelper?: boolean }) | undefined;
  const taskIsHelper = !!taskWithHelpers?.isHelper;
  const taskHelpers = taskWithHelpers?.helpers || [];
  const estimateBlocksCompletion = task?.requiresEstimate && task?.estimateStatus !== "approved";
  const assignedUser = task ? users.find(u => u.id === task.assignedToId) : undefined;
  const adminUsers = users.filter(u => u.role === "admin");
  const technicianUsers = users.filter(u => u.role === "technician");
  const staffUsers = users.filter(u => u.role === "staff");
  const studentUsers = users.filter(u => u.role === "student");

  const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  const { label: dateLabel, isOverdue } = getDateLabel(task?.estimatedCompletionDate ?? null);

  const totalChecklistItems = checklistGroups.reduce((sum, group) => sum + group.items.length, 0);
  const completedChecklistItems = checklistGroups.reduce(
    (sum, group) => sum + group.items.filter(item => item.isCompleted).length,
    0
  );

  const isParentTask = subTasks.length > 0;
  const isSubTask = !!task?.parentTaskId;
  const completedSubTasks = subTasks.filter(st => st.status === "completed").length;
  const subTaskProgress = subTasks.length > 0 ? (completedSubTasks / subTasks.length) * 100 : 0;

  const handleStartOrPause = () => {
    if (activeTimer) {
      setIsStopTimerDialogOpen(true);
    } else {
      startTimerMutation.mutate();
    }
  };

  const handleComplete = () => {
    if (estimateBlocksCompletion) {
      toast({
        title: "Cannot complete task",
        description: isStudent
          ? "This task requires approved estimates. Contact your supervisor."
          : "Estimates must be approved before completing this task.",
        variant: "destructive",
      });
      return;
    }
    if (task?.requiresPhoto && uploads.length === 0) {
      toast({
        title: "Photo required",
        description: "This task requires at least one photo before it can be marked as completed. Please upload a photo first.",
        variant: "destructive",
      });
      return;
    }
    if (activeTimer) {
      stopTimerMutation.mutate({ timerId: activeTimer, newStatus: "completed" });
    } else {
      updateStatusMutation.mutate("completed");
    }
  };

  const handleRunAiSchedule = async () => {
    if (!id) return;
    setAiScheduleLoading(true);
    try {
      const res = await apiRequest("POST", `/api/ai/schedule/${id}`, {});
      const log = await res.json();
      setAiScheduleLog(log);
      toast({ title: "AI schedule suggestion ready", description: "Review and accept below." });
    } catch {
      toast({ title: "AI scheduling failed", description: "Check that ANTHROPIC_API_KEY is configured.", variant: "destructive" });
    } finally {
      setAiScheduleLoading(false);
    }
  };

  const handleReviewAiSchedule = async (status: "approved" | "rejected") => {
    if (!aiScheduleLog) return;
    try {
      await apiRequest("PATCH", `/api/ai-logs/${aiScheduleLog.id}`, { status });
      setAiScheduleLog({ ...aiScheduleLog, status });
      if (status === "approved") {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      }
      toast({ title: status === "approved" ? "Schedule applied" : "Suggestion rejected" });
    } catch {
      toast({ title: "Failed to update suggestion", variant: "destructive" });
    }
  };

  return {
    id,
    user,
    navigate,
    toast,
    downloadFile,
    task,
    isLoading,
    timeEntries,
    parts,
    notes,
    inventoryItems,
    users,
    vendors,
    uploads,
    request,
    requestAttachments,
    property,
    allProperties,
    multiProperties,
    equipment,
    space,
    checklistGroups,
    contactStaff,
    messages,
    quotes,
    allTasks,
    subTasks,
    vehicle,
    parentTask,
    allEquipment,
    allVehicles,
    subTaskTimeEntries,
    taskDependencies,
    propertyResources,
    equipmentResources,
    allTaskResources,
    previousWork,
    newNote,
    setNewNote,
    newMessage,
    setNewMessage,
    activeTimer,
    setActiveTimer,
    aiScheduleLog,
    setAiScheduleLog,
    aiScheduleLoading,
    setAiScheduleLoading,
    selectedInventoryItemId,
    setSelectedInventoryItemId,
    partQuantity,
    setPartQuantity,
    partNotes,
    setPartNotes,
    isAddPartDialogOpen,
    setIsAddPartDialogOpen,
    isScanPartOpen,
    setIsScanPartOpen,
    isScanEquipmentOpen,
    setIsScanEquipmentOpen,
    scannedEquipment,
    setScannedEquipment,
    scannedEquipmentTasks,
    setScannedEquipmentTasks,
    scannedEquipmentResources,
    setScannedEquipmentResources,
    isEquipmentInfoOpen,
    setIsEquipmentInfoOpen,
    isEquipmentLoading,
    setIsEquipmentLoading,
    equipmentInfoTab,
    setEquipmentInfoTab,
    aiSuggestedParts,
    setAiSuggestedParts,
    isAiSuggestLoading,
    setIsAiSuggestLoading,
    isQuickAddInventoryOpen,
    setIsQuickAddInventoryOpen,
    quickInventoryName,
    setQuickInventoryName,
    quickInventoryQuantity,
    setQuickInventoryQuantity,
    quickInventoryUnit,
    setQuickInventoryUnit,
    isStopTimerDialogOpen,
    setIsStopTimerDialogOpen,
    isResourcesSheetOpen,
    setIsResourcesSheetOpen,
    isHoldReasonDialogOpen,
    setIsHoldReasonDialogOpen,
    holdReason,
    setHoldReason,
    isAddNoteDialogOpen,
    setIsAddNoteDialogOpen,
    noteType,
    setNoteType,
    inventorySearchQuery,
    setInventorySearchQuery,
    isAssignDialogOpen,
    setIsAssignDialogOpen,
    isUploadSheetOpen,
    setIsUploadSheetOpen,
    isHistorySheetOpen,
    setIsHistorySheetOpen,
    isLeaveConfirmDialogOpen,
    setIsLeaveConfirmDialogOpen,
    pendingNavigation,
    setPendingNavigation,
    allowNavigation,
    setAllowNavigation,
    notesExpanded,
    setNotesExpanded,
    messagesExpanded,
    setMessagesExpanded,
    attachmentsExpanded,
    setAttachmentsExpanded,
    checklistExpanded,
    setChecklistExpanded,
    partsExpanded,
    setPartsExpanded,
    quotesExpanded,
    setQuotesExpanded,
    previousWorkExpanded,
    setPreviousWorkExpanded,
    isAddQuoteDialogOpen,
    setIsAddQuoteDialogOpen,
    newQuoteVendorId,
    setNewQuoteVendorId,
    newQuoteVendorName,
    setNewQuoteVendorName,
    newQuoteEstimatedCost,
    setNewQuoteEstimatedCost,
    newQuoteNotes,
    setNewQuoteNotes,
    pendingQuoteFiles,
    setPendingQuoteFiles,
    isAddVendorDialogOpen,
    setIsAddVendorDialogOpen,
    newVendorName,
    setNewVendorName,
    newVendorEmail,
    setNewVendorEmail,
    newVendorPhone,
    setNewVendorPhone,
    newVendorAddress,
    setNewVendorAddress,
    newVendorNotes,
    setNewVendorNotes,
    scannedVehicle,
    setScannedVehicle,
    isVehicleInfoOpen,
    setIsVehicleInfoOpen,
    isAddSubTaskDialogOpen,
    setIsAddSubTaskDialogOpen,
    subTaskSearchQuery,
    setSubTaskSearchQuery,
    subTaskSearchType,
    setSubTaskSearchType,
    summaryTaskId,
    setSummaryTaskId,
    pendingUploadForLabel,
    setPendingUploadForLabel,
    isUploadLabelSaving,
    messagesEndRef,
    messagesSectionRef,
    partsSectionRef,
    pendingUploadQueueRef,
    safeNavigate,
    confirmLeave,
    cancelLeave,
    handleScanPart,
    handleEquipmentScan,
    handleAiSuggestParts,
    handleStartOrPause,
    handleComplete,
    handleRunAiSchedule,
    handleReviewAiSchedule,
    getUploadParameters,
    handleAutoSaveUpload,
    handleUploadLabelSave,
    handleUploadLabelCancel,
    advanceUploadQueue,
    markAsReadMutation,
    sendMessageMutation,
    deleteMessageMutation,
    updateStatusMutation,
    updateSubtaskStatusMutation,
    updateTaskMutation,
    startTimerMutation,
    stopTimerMutation,
    quickAddInventoryMutation,
    addPartMutation,
    addNoteMutation,
    updateNoteMutation,
    deleteNoteMutation,
    createQuoteMutation,
    approveQuoteMutation,
    rejectQuoteMutation,
    deleteQuoteMutation,
    createVendorMutation,
    addUploadMutation,
    deleteUploadMutation,
    toggleChecklistItemMutation,
    deleteTaskMutation,
    addSubTaskMutation,
    isTechnicianOrAdmin,
    isStudent,
    taskWithHelpers,
    taskIsHelper,
    taskHelpers,
    estimateBlocksCompletion,
    assignedUser,
    adminUsers,
    technicianUsers,
    staffUsers,
    studentUsers,
    totalMinutes,
    totalHours,
    remainingMins,
    dateLabel,
    isOverdue,
    totalChecklistItems,
    completedChecklistItems,
    isParentTask,
    isSubTask,
    completedSubTasks,
    subTaskProgress,
  };
}

export type TaskDetailContext = ReturnType<typeof useTaskDetail>;
