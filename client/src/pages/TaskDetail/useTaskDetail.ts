import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useFileDownload } from "@/hooks/use-download";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { canReadInventory } from "@/lib/inventoryAccess";
import { parseVehicleIdFromScan, resolveEquipmentIdFromScan } from "@/lib/equipmentScan";
import { useInventorySearch } from "@/hooks/useInventorySearch";
import type {
  Task,
  TimeEntry,
  PartUsed,
  TaskNote,
  InventoryItem,
  User as UserType,
  Upload,
  ServiceRequest,
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
import { useTaskDetailMutations } from "./useTaskDetailMutations";
import {
  getSignedUploadParameters,
  mapUploaderResultForRegistration,
} from "@/lib/uploadUtils";

type ChecklistGroupWithItems = TaskChecklistGroup & { items: TaskChecklistItem[] };

export function useTaskDetail() {
  const params = useParams<{ id: string }>();
  const [location, navigate] = useLocation();
  const id = params.id || location.split("/tasks/")[1]?.split("?")[0]?.split("/")[0];
  const { user } = useAuth();
  const taskPagePath = `/tasks/${id}`;
  const { toast } = useToast();
  const { downloadFile } = useFileDownload();

  const [newNote, setNewNote] = useState("");
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
    objectPath?: string;
    previewUrl?: string;
  } | null>(null);

  const partsSectionRef = useRef<HTMLDivElement>(null);

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["/api/tasks", id],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${encodeURIComponent(id!)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch task");
      return res.json();
    },
    enabled: !!id,
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

  const { inventoryItems, isInventoryLoading } = useInventorySearch(inventorySearchQuery, {
    enabled: canReadInventory(user?.role),
    selectedItemId: selectedInventoryItemId || undefined,
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

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/tasks", id, "quotes"],
    enabled: !!id && !!task?.requiresEstimate,
  });

  const previousWorkQueryKey = task?.equipmentId
    ? ["/api/tasks", "previous-work", "equipment", task.equipmentId]
    : task?.propertyId
      ? ["/api/tasks", "previous-work", "property", task.propertyId]
      : ["/api/tasks", "previous-work", "none"];

  const { data: previousWorkTasks = [] } = useQuery<Task[]>({
    queryKey: previousWorkQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        status: "completed",
        limit: "10",
        summary: "true",
      });
      if (task?.equipmentId) {
        params.set("equipmentId", task.equipmentId);
      } else if (task?.propertyId) {
        params.set("propertyId", task.propertyId);
      }
      const res = await fetch(`/api/tasks?${params.toString()}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!(task?.equipmentId || task?.propertyId) && (user?.role === "technician" || user?.role === "admin"),
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

  const dependencyTaskIds = useMemo(
    () => taskDependencies.map((dep: { dependsOnTaskId?: string }) => dep.dependsOnTaskId).filter(Boolean) as string[],
    [taskDependencies],
  );

  const { data: dependencyTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", "dependency-lookup", dependencyTaskIds],
    queryFn: async () => {
      if (!dependencyTaskIds.length) return [];
      const params = new URLSearchParams({
        taskIds: dependencyTaskIds.join(","),
        summary: "true",
        limit: String(dependencyTaskIds.length),
      });
      const res = await fetch(`/api/tasks?${params.toString()}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: dependencyTaskIds.length > 0 && user?.role === "admin",
  });

  const resourcePropertyIds = useMemo(() => {
    const ids = new Set<string>();
    if (task?.propertyId) ids.add(task.propertyId);
    (task?.propertyIds ?? []).forEach((id) => ids.add(id));
    if (equipment?.propertyId) ids.add(equipment.propertyId);
    return Array.from(ids);
  }, [task?.propertyId, task?.propertyIds, equipment?.propertyId]);

  const propertyResourceQueries = useQueries({
    queries: resourcePropertyIds.map((propertyId) => ({
      queryKey: ["/api/properties", propertyId, "resources"],
      queryFn: async () => {
        const res = await apiRequest("GET", `/api/properties/${propertyId}/resources`);
        return res.json() as Promise<any[]>;
      },
      enabled: !!propertyId,
    })),
  });

  const propertyResources = useMemo(() => {
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const query of propertyResourceQueries) {
      const rows = Array.isArray(query.data) ? query.data : [];
      for (const resource of rows) {
        if (!seen.has(resource.id)) {
          seen.add(resource.id);
          merged.push(resource);
        }
      }
    }
    return merged;
  }, [propertyResourceQueries]);

  const { data: equipmentResources = [] } = useQuery<any[]>({
    queryKey: ["/api/equipment", task?.equipmentId, "resources"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/equipment/${task?.equipmentId}/resources`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
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
    if (!task || !previousWorkTasks.length) return [];
    return previousWorkTasks
      .filter((t) => t.id !== task.id)
      .sort((a, b) => {
        const dateA = a.updatedAt || "";
        const dateB = b.updatedAt || "";
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 10);
  }, [task, previousWorkTasks]);

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
      navigate(pendingNavigation, { replace: true });
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

  const openEquipmentInfo = async (
    equipmentId: string,
    initialTab: "info" | "history" | "resources" = "info",
  ) => {
    setEquipmentInfoTab(initialTab);
    setIsEquipmentLoading(true);
    try {
      const eqPromise =
        equipment?.id === equipmentId
          ? Promise.resolve(equipment)
          : fetch(`/api/equipment/${encodeURIComponent(equipmentId)}`, { credentials: "include" }).then(
              async (res) => {
                if (!res.ok) throw new Error("not found");
                return res.json();
              },
            );

      const resourcesPromise =
        task?.equipmentId === equipmentId && equipmentResources.length > 0
          ? Promise.resolve(equipmentResources)
          : fetch(`/api/equipment/${encodeURIComponent(equipmentId)}/resources`, {
              credentials: "include",
            }).then((res) => (res.ok ? res.json() : []));

      const tasksPromise = fetch(`/api/tasks?equipmentId=${encodeURIComponent(equipmentId)}`, {
        credentials: "include",
      }).then((res) => (res.ok ? res.json() : []));

      const [eq, tasks, resources] = await Promise.all([eqPromise, tasksPromise, resourcesPromise]);

      setScannedEquipment(eq);
      setScannedEquipmentTasks(tasks);
      setScannedEquipmentResources(resources);
      setIsEquipmentInfoOpen(true);
    } catch {
      toast({
        title: "Equipment not found",
        description: "Could not load equipment details.",
        variant: "destructive",
      });
    } finally {
      setIsEquipmentLoading(false);
    }
  };

  const handleViewTaskEquipment = (initialTab: "info" | "history" | "resources" = "info") => {
    if (!task?.equipmentId) return;
    void openEquipmentInfo(task.equipmentId, initialTab);
  };

  const handleEquipmentScan = async (value: string) => {
    setIsScanEquipmentOpen(false);
    try {
      const vehicleId = parseVehicleIdFromScan(value);
      if (vehicleId) {
        const vRes = await fetch(`/api/vehicles/${encodeURIComponent(vehicleId)}`, { credentials: "include" });
        if (!vRes.ok) {
          toast({ title: "Vehicle not found", description: "Could not find vehicle for this QR code.", variant: "destructive" });
          return;
        }
        const veh = await vRes.json();
        setScannedVehicle(veh);
        setIsVehicleInfoOpen(true);
        return;
      }

      const equipmentId = await resolveEquipmentIdFromScan(value);
      if (!equipmentId) {
        toast({
          title: "Equipment not found",
          description: "No equipment matched that QR code or asset tag.",
          variant: "destructive",
        });
        return;
      }
      await openEquipmentInfo(equipmentId);
    } catch {
      toast({ title: "Scan error", description: "Failed to load equipment data.", variant: "destructive" });
    }
  };

  const mutations = useTaskDetailMutations({
    id,
    user,
    task,
    timeEntries,
    inventoryItems,
    toast,
    navigate,
    safeNavigate,
    quickInventoryName,
    quickInventoryQuantity,
    quickInventoryUnit,
    selectedInventoryItemId,
    partQuantity,
    partNotes,
    setActiveTimer,
    setIsEquipmentInfoOpen,
    setIsVehicleInfoOpen,
    setIsAddSubTaskDialogOpen,
    setIsStopTimerDialogOpen,
    setIsHoldReasonDialogOpen,
    setHoldReason,
    setIsQuickAddInventoryOpen,
    setSelectedInventoryItemId,
    setQuickInventoryName,
    setQuickInventoryQuantity,
    setQuickInventoryUnit,
    setIsAddPartDialogOpen,
    setPartNotes,
    setPartQuantity,
    setInventorySearchQuery,
    setNewNote,
    setNoteType,
    setIsAddNoteDialogOpen,
    setNewQuoteVendorId,
    setNewQuoteVendorName,
    setNewQuoteEstimatedCost,
    setNewQuoteNotes,
    setPendingQuoteFiles,
    setIsAddQuoteDialogOpen,
    setNewVendorName,
    setNewVendorEmail,
    setNewVendorPhone,
    setNewVendorAddress,
    setNewVendorNotes,
    setIsAddVendorDialogOpen,
  });

  const {
    startTimerMutation,
    stopTimerMutation,
    addUploadMutation,
    updateStatusMutation,
  } = mutations;

  const getUploadParameters = getSignedUploadParameters;

  const pendingUploadQueueRef = useRef<
    Array<{
      fileName: string;
      fileType: string;
      objectUrl: string;
      objectPath?: string;
      previewUrl?: string;
    }>
  >([]);

  const handleAutoSaveUpload = async (result: any) => {
    if (result.successful?.length > 0) {
      const files = result.successful.map((file: any) => {
        const registered = mapUploaderResultForRegistration(file);
        return {
          ...registered,
          previewUrl:
            file.file && file.type?.startsWith("image/")
              ? URL.createObjectURL(file.file)
              : undefined,
        };
      });

      const saveImmediately =
        user?.role === "technician" || user?.role === "student";

      if (saveImmediately) {
        let failedCount = 0;
        for (const file of files) {
          try {
            await addUploadMutation.mutateAsync({
              fileName: file.fileName,
              fileType: file.fileType,
              objectUrl: file.objectUrl,
              objectPath: file.objectPath,
              label: file.fileName,
            });
            if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
          } catch {
            failedCount += 1;
          }
        }
        if (failedCount > 0) {
          toast({
            title: "Upload failed",
            description: `${failedCount} file(s) could not be saved`,
            variant: "destructive",
          });
        }
        return;
      }

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
        objectPath: pendingUploadForLabel.objectPath,
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
        objectPath: pendingUploadForLabel.objectPath,
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
    isInventoryLoading,
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
    quotes,
    dependencyTasks,
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
    partsSectionRef,
    pendingUploadQueueRef,
    safeNavigate,
    confirmLeave,
    cancelLeave,
    handleScanPart,
    handleEquipmentScan,
    handleViewTaskEquipment,
    handleStartOrPause,
    handleComplete,
    handleRunAiSchedule,
    handleReviewAiSchedule,
    getUploadParameters,
    handleAutoSaveUpload,
    handleUploadLabelSave,
    handleUploadLabelCancel,
    advanceUploadQueue,
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
    ...mutations,
  };
}

export type TaskDetailContext = ReturnType<typeof useTaskDetail>;
