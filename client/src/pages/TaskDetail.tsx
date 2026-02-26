import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Clock,
  User,
  Calendar,
  Plus,
  Play,
  Square,
  Pause,
  Package,
  FileText,
  ExternalLink,
  Edit,
  Trash2,
  Paperclip,
  AlertCircle,
  X,
  MessageSquare,
  Send,
  Building2,
  MapPin,
  Phone,
  DoorOpen,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Camera,
  StickyNote,
  History,
  UserPlus,
  Check,
  ListChecks,
  AlertTriangle,
  DollarSign,
  CircleDollarSign,
  Download,
  Bot,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Link2,
  GripVertical,
  ScanLine,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFileDownload } from "@/hooks/use-download";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { BarcodeScanner } from "@/components/BarcodeScanner";
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
  QuoteAttachment,
} from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@radix-ui/react-label";
import { format, isToday, isTomorrow, isPast, formatDistanceToNow } from "date-fns";

const urgencyColors = {
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  high: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  needs_estimate: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  waiting_approval: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  ready: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

import { taskStatusLabels as statusLabels } from "@/lib/constants";

const quoteStatusColors: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  approved: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

function QuoteAttachmentsList({ quoteId }: { quoteId: string }) {
  const { data: attachments = [], isLoading } = useQuery<QuoteAttachment[]>({
    queryKey: ["/api/quotes", quoteId, "attachments"],
  });

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Loading attachments...</div>;
  }

  if (attachments.length === 0) {
    return null;
  }

  const handleDownload = (attachment: QuoteAttachment) => {
    window.open(attachment.storageUrl, "_blank");
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <Paperclip className="w-3 h-3" />
        Attachments ({attachments.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <Button
            key={attachment.id}
            variant="outline"
            size="sm"
            className="text-xs h-7 px-2 gap-1"
            onClick={() => handleDownload(attachment)}
            data-testid={`button-download-attachment-${attachment.id}`}
          >
            <Download className="w-3 h-3" />
            {attachment.fileName.length > 20 
              ? attachment.fileName.substring(0, 17) + "..." 
              : attachment.fileName}
          </Button>
        ))}
      </div>
    </div>
  );
}

function getDateLabel(date: Date | string | null): { label: string; isOverdue: boolean } {
  if (!date) return { label: "No date", isOverdue: false };
  const d = new Date(date);
  if (isToday(d)) return { label: "Today", isOverdue: false };
  if (isTomorrow(d)) return { label: "Tomorrow", isOverdue: false };
  if (isPast(d)) return { label: `Overdue (${format(d, "MMM d")})`, isOverdue: true };
  return { label: format(d, "MMM d"), isOverdue: false };
}

export default function TaskDetail() {
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
  const [pendingUploads, setPendingUploads] = useState<{ name: string; url: string; type: string }[]>([]);
  const [isAddPartDialogOpen, setIsAddPartDialogOpen] = useState(false);
  const [isScanPartOpen, setIsScanPartOpen] = useState(false);
  const [aiSuggestedParts, setAiSuggestedParts] = useState<Array<{ id: string; name: string; suggestedQuantity: number; unit: string; reason: string }>>([]);
  const [isAiSuggestLoading, setIsAiSuggestLoading] = useState(false);
  const [isQuickAddInventoryOpen, setIsQuickAddInventoryOpen] = useState(false);
  const [quickInventoryName, setQuickInventoryName] = useState("");
  const [quickInventoryQuantity, setQuickInventoryQuantity] = useState(0);
  const [quickInventoryUnit, setQuickInventoryUnit] = useState("");
  const [isStopTimerDialogOpen, setIsStopTimerDialogOpen] = useState(false);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    queryKey: ["/api/uploads/task", id],
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

  const { data: taskDependencies = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks", id, "dependencies"],
    queryFn: () => apiRequest("GET", `/api/tasks/${id}/dependencies`).then((r) => r.json()),
    enabled: !!id && user?.role === "admin",
  });

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
    if (activeTimer) {
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
    const res = await fetch(`/api/inventory/by-barcode/${encodeURIComponent(barcodeValue)}`, {
      credentials: "include",
    });
    if (res.ok) {
      const item: InventoryItem = await res.json();
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
      return response.json();
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Status updated" });
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
      if (task?.status === "not_started") {
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
    },
    onSuccess: () => {
      setActiveTimer(null);
      setIsStopTimerDialogOpen(false);
      setIsHoldReasonDialogOpen(false);
      setHoldReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/task", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", id] });
      toast({ title: "Timer stopped" });
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
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsQuickAddInventoryOpen(false);
      setSelectedInventoryItemId(newItem.id);
      setQuickInventoryName("");
      setQuickInventoryQuantity(0);
      setQuickInventoryUnit("");
      toast({ title: "Item created" });
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/parts/task", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsAddPartDialogOpen(false);
      setSelectedInventoryItemId("");
      setPartNotes("");
      setPartQuantity("");
      setInventorySearchQuery("");
      toast({ title: "Part added" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ content, noteType }: { content: string, noteType: string }) => {
      return await apiRequest("POST", "/api/task-notes", { taskId: id, content, noteType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", id] });
      setNewNote("");
      setNoteType("job_note");
      setIsAddNoteDialogOpen(false);
      toast({ title: "Note added" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return await apiRequest("DELETE", `/api/task-notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", id] });
      toast({ title: "Note deleted" });
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      setNewQuoteVendorId("");
      setNewQuoteVendorName("");
      setNewQuoteEstimatedCost("");
      setNewQuoteNotes("");
      setPendingQuoteFiles([]);
      setIsAddQuoteDialogOpen(false);
      toast({ title: "Quote added", description: "The estimate has been added for comparison." });
    },
  });

  const approveQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return await apiRequest("POST", `/api/quotes/${quoteId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      toast({ title: "Quote approved", description: "The task is now ready to start work." });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return await apiRequest("DELETE", `/api/quotes/${quoteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "quotes"] });
      toast({ title: "Quote deleted" });
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (vendorData: { name: string; email?: string; phone?: string; address?: string; notes?: string }) => {
      const response = await apiRequest("POST", "/api/vendors", vendorData);
      return response.json();
    },
    onSuccess: (newVendor) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
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
  });

  const deleteUploadMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      return await apiRequest("DELETE", `/api/uploads/${uploadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", id] });
      toast({ title: "Attachment deleted" });
    },
  });

  const toggleChecklistItemMutation = useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      return await apiRequest("PATCH", `/api/checklist-items/${itemId}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "checklist-groups"] });
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

  const handleFileUpload = async (result: any) => {
    if (result.successful?.length > 0) {
      const newUploads = result.successful.map((file: any) => ({
        name: file.name,
        url: file.uploadURL,
        type: file.type || "application/octet-stream",
      }));
      setPendingUploads((prev) => [...prev, ...newUploads]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading task...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-lg font-medium">Task not found</p>
          <Button variant="outline" onClick={() => navigate("/work")} className="mt-4">
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  const isTechnicianOrAdmin = user?.role === "admin" || user?.role === "technician";
  const isStudent = user?.role === "student";
  const assignedUser = users.find(u => u.id === task.assignedToId);
  const adminUsers = users.filter(u => u.role === "admin");
  const technicianUsers = users.filter(u => u.role === "technician");
  const staffUsers = users.filter(u => u.role === "staff");
  const studentUsers = users.filter(u => u.role === "student");

  const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  const { label: dateLabel, isOverdue } = getDateLabel(task.estimatedCompletionDate);

  const totalChecklistItems = checklistGroups.reduce((sum, group) => sum + group.items.length, 0);
  const completedChecklistItems = checklistGroups.reduce(
    (sum, group) => sum + group.items.filter(item => item.isCompleted).length,
    0
  );

  const handleStartOrPause = () => {
    if (activeTimer) {
      setIsStopTimerDialogOpen(true);
    } else {
      startTimerMutation.mutate();
    }
  };

  const handleComplete = () => {
    if (task.requiresPhoto && uploads.length === 0) {
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

  if (isStudent) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-28">
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h1 className="text-xl font-bold leading-tight" data-testid="text-task-name">
                {task.name}
              </h1>
              {property && (
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {property.name}
                  {space && ` - ${space.name}`}
                </p>
              )}
            </div>

            {task.instructions && (
              <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-lg" data-testid="task-instructions">
                <p className="font-semibold text-sm mb-1 text-primary">Instructions</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.instructions}</p>
              </div>
            )}

            {task.description && !task.instructions && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm leading-relaxed" data-testid="text-description">{task.description}</p>
              </div>
            )}

            {checklistGroups.length > 0 && (
              <div className="space-y-3">
                <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Checklist ({completedChecklistItems}/{totalChecklistItems})
                </p>
                {checklistGroups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    {checklistGroups.length > 1 && (
                      <p className="text-sm font-medium">{group.name}</p>
                    )}
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg cursor-pointer active-elevate-2 min-h-[56px]"
                        onClick={() => toggleChecklistItemMutation.mutate({ itemId: item.id, isCompleted: !item.isCompleted })}
                        data-testid={`checklist-item-${item.id}`}
                      >
                        <Checkbox checked={item.isCompleted} className="w-6 h-6" />
                        <span className={`text-base flex-1 ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-muted/30 rounded-lg flex items-center justify-between" data-testid="time-logged-card">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeTimer ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted"}`}>
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time Logged</p>
                  <p className="text-xl font-bold" data-testid="text-time-logged">{totalHours}h {remainingMins}m</p>
                </div>
              </div>
              {activeTimer && (
                <Badge variant="default" className="animate-pulse">Running</Badge>
              )}
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Notes</p>
              <div className="flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this task..."
                  rows={3}
                  className="text-base"
                  data-testid="textarea-new-note"
                />
              </div>
              {newNote.trim() && (
                <Button
                  className="w-full"
                  onClick={() => addNoteMutation.mutate({ content: newNote, noteType: "job_note" })}
                  disabled={addNoteMutation.isPending}
                  data-testid="button-submit-note"
                >
                  Save Note
                </Button>
              )}
              {notes.length > 0 && (
                <div className="space-y-2">
                  {notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {note.createdAt && formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Photos</p>
              <div className="grid grid-cols-2 gap-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="h-14 flex-col gap-1" data-testid="button-take-photo">
                      <Camera className="w-6 h-6" />
                      <span className="text-xs font-medium">Take Photo</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[50vh]">
                    <SheetHeader>
                      <SheetTitle>Upload Photos</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-4">
                      {pendingUploads.length > 0 && (
                        <div className="space-y-2">
                          {pendingUploads.map((upload, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm truncate flex-1">{upload.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPendingUploads(prev => prev.filter((_, i) => i !== index))}
                                data-testid={`button-remove-photo-${index}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            className="w-full"
                            onClick={async () => {
                              for (const upload of pendingUploads) {
                                await addUploadMutation.mutateAsync({
                                  fileName: upload.name,
                                  fileType: upload.type,
                                  objectUrl: upload.url,
                                });
                              }
                              setPendingUploads([]);
                            }}
                            disabled={addUploadMutation.isPending}
                            data-testid="button-save-photos"
                          >
                            Save {pendingUploads.length} Photo{pendingUploads.length !== 1 ? "s" : ""}
                          </Button>
                        </div>
                      )}
                      <div className="border-2 border-dashed rounded-lg p-8 flex items-center justify-center" data-testid="photo-upload-area">
                        <ObjectUploader
                          maxNumberOfFiles={5}
                          maxFileSize={10485760}
                          onGetUploadParameters={getUploadParameters}
                          onComplete={handleFileUpload}
                          onError={(error) => {
                            toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                          }}
                          buttonClassName="bg-primary text-primary-foreground"
                        >
                          Browse Photos
                        </ObjectUploader>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                {uploads.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg" data-testid="text-photo-count">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{uploads.length} photo{uploads.length !== 1 ? "s" : ""} attached</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50 safe-area-inset-bottom">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            {task.status === "completed" ? (
              <Button
                size="lg"
                className="flex-1 font-bold bg-green-600 text-white border-green-600"
                disabled
                data-testid="bottom-button-done"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Task Completed
              </Button>
            ) : activeTimer ? (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleStartOrPause}
                  disabled={stopTimerMutation.isPending}
                  data-testid="bottom-button-pause"
                >
                  <Pause className="w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  className="flex-1 font-bold bg-green-600 text-white border-green-600"
                  onClick={handleComplete}
                  disabled={stopTimerMutation.isPending}
                  data-testid="bottom-button-complete"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Mark as Completed
                </Button>
              </>
            ) : task.status === "in_progress" ? (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleStartOrPause}
                  disabled={startTimerMutation.isPending}
                  data-testid="bottom-button-resume"
                >
                  <Play className="w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  className="flex-1 font-bold bg-green-600 text-white border-green-600"
                  onClick={handleComplete}
                  disabled={updateStatusMutation.isPending}
                  data-testid="bottom-button-complete"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Mark as Completed
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                className="flex-1 font-bold"
                onClick={handleStartOrPause}
                disabled={startTimerMutation.isPending}
                data-testid="bottom-button-start"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Task
              </Button>
            )}
          </div>
        </div>

        <Dialog open={isStopTimerDialogOpen} onOpenChange={setIsStopTimerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Stop Timer</DialogTitle>
              <DialogDescription>What would you like to do?</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  if (activeTimer) {
                    stopTimerMutation.mutate({ timerId: activeTimer, newStatus: "completed" });
                  }
                }}
                disabled={stopTimerMutation.isPending}
                data-testid="button-stop-complete"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Task
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  if (activeTimer) {
                    stopTimerMutation.mutate({ timerId: activeTimer });
                  }
                }}
                disabled={stopTimerMutation.isPending}
                data-testid="button-stop-pause"
              >
                Just Pause Timer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (user?.role === "technician") {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-28">
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h1 className="text-xl font-bold leading-tight" data-testid="text-task-name">
                {task.name}
              </h1>
              {property && (
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {property.name}
                  {space && ` - ${space.name}`}
                </p>
              )}
              {equipment && (
                <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <Package className="w-4 h-4 shrink-0" />
                  {equipment.name}
                </p>
              )}
            </div>

            {(task.contactPhone || contactStaff?.phoneNumber) && (
              <a
                href={`tel:${task.contactPhone || contactStaff?.phoneNumber}`}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover-elevate active-elevate-2"
                data-testid="link-phone"
              >
                <Phone className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="font-medium">{task.contactPhone || contactStaff?.phoneNumber}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
            )}

            {task.instructions && (
              <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-lg" data-testid="task-instructions">
                <p className="font-semibold text-sm mb-1 text-primary">Instructions</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.instructions}</p>
              </div>
            )}

            {task.description && !task.instructions && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm leading-relaxed" data-testid="text-description">{task.description}</p>
              </div>
            )}

            {previousWork.length > 0 && (
              <Collapsible open={previousWorkExpanded} onOpenChange={setPreviousWorkExpanded}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full p-4 bg-muted/30 rounded-lg text-left cursor-pointer hover-elevate" data-testid="toggle-previous-work">
                    <div className="flex items-center gap-3">
                      <History className="w-5 h-5 text-primary" />
                      <span className="font-medium">Previous Work Here</span>
                      <Badge variant="secondary">{previousWork.length}</Badge>
                    </div>
                    {previousWorkExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {previousWork.map((prevTask) => {
                    const completedBy = users.find(u => u.id === prevTask.assignedToId);
                    const isEquipmentMatch = task.equipmentId && prevTask.equipmentId === task.equipmentId;
                    return (
                      <div
                        key={prevTask.id}
                        className="p-3 rounded-md border border-border/50 cursor-pointer hover-elevate"
                        onClick={() => navigate(`/tasks/${prevTask.id}`)}
                        data-testid={`previous-work-item-${prevTask.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{prevTask.name}</p>
                            {prevTask.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{prevTask.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {completedBy && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {completedBy.firstName} {completedBy.lastName}
                                </span>
                              )}
                              {prevTask.updatedAt && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(prevTask.updatedAt), "MMM d, yyyy")}
                                </span>
                              )}
                              {isEquipmentMatch && (
                                <Badge variant="outline" className="text-xs">Same Equipment</Badge>
                              )}
                            </div>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}

            {checklistGroups.length > 0 && (
              <div className="space-y-3">
                <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Checklist ({completedChecklistItems}/{totalChecklistItems})
                </p>
                {checklistGroups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    {checklistGroups.length > 1 && (
                      <p className="text-sm font-medium">{group.name}</p>
                    )}
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg cursor-pointer active-elevate-2 min-h-[56px]"
                        onClick={() => toggleChecklistItemMutation.mutate({ itemId: item.id, isCompleted: !item.isCompleted })}
                        data-testid={`checklist-item-${item.id}`}
                      >
                        <Checkbox checked={item.isCompleted} className="w-6 h-6" />
                        <span className={`text-base flex-1 ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Notes</p>
              <div className="flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this task..."
                  rows={3}
                  className="text-base"
                  data-testid="textarea-new-note"
                />
              </div>
              {newNote.trim() && (
                <Button
                  className="w-full"
                  onClick={() => addNoteMutation.mutate({ content: newNote, noteType: "job_note" })}
                  disabled={addNoteMutation.isPending}
                  data-testid="button-submit-note"
                >
                  Save Note
                </Button>
              )}
              {notes.length > 0 && (
                <div className="space-y-2">
                  {notes.slice(0, 5).map((note) => (
                    <div key={note.id} className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {note.createdAt && formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Photos</p>
              <div className="grid grid-cols-2 gap-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="h-14 flex-col gap-1" data-testid="button-take-photo">
                      <Camera className="w-6 h-6" />
                      <span className="text-xs font-medium">Take Photo</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[50vh]">
                    <SheetHeader>
                      <SheetTitle>Upload Photos</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-4">
                      {pendingUploads.length > 0 && (
                        <div className="space-y-2">
                          {pendingUploads.map((upload, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm truncate flex-1">{upload.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPendingUploads(prev => prev.filter((_, i) => i !== index))}
                                data-testid={`button-remove-photo-${index}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            className="w-full"
                            onClick={async () => {
                              for (const upload of pendingUploads) {
                                await addUploadMutation.mutateAsync({
                                  fileName: upload.name,
                                  fileType: upload.type,
                                  objectUrl: upload.url,
                                });
                              }
                              setPendingUploads([]);
                            }}
                            disabled={addUploadMutation.isPending}
                            data-testid="button-save-photos"
                          >
                            Save {pendingUploads.length} Photo{pendingUploads.length !== 1 ? "s" : ""}
                          </Button>
                        </div>
                      )}
                      <div className="border-2 border-dashed rounded-lg p-8 flex items-center justify-center" data-testid="photo-upload-area">
                        <ObjectUploader
                          maxNumberOfFiles={5}
                          maxFileSize={10485760}
                          onGetUploadParameters={getUploadParameters}
                          onComplete={handleFileUpload}
                          onError={(error) => {
                            toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                          }}
                          buttonClassName="bg-primary text-primary-foreground"
                        >
                          Browse Photos
                        </ObjectUploader>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                {uploads.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg" data-testid="text-photo-count">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{uploads.length} photo{uploads.length !== 1 ? "s" : ""} attached</span>
                  </div>
                )}
              </div>
            </div>

            <Collapsible open={partsExpanded} onOpenChange={setPartsExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-parts">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="font-medium">Parts Used</span>
                    {parts.length > 0 && <Badge variant="secondary">{parts.length}</Badge>}
                  </div>
                  {partsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {parts.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">No parts used</p>
                ) : (
                  parts.map((part) => (
                    <div key={part.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{part.partName}</p>
                        {part.notes && <p className="text-xs text-muted-foreground">{part.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Qty: {part.quantity}</p>
                        <p className="text-xs text-muted-foreground">${part.cost.toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsAddPartDialogOpen(true)}
                  data-testid="button-add-part"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Part
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50 safe-area-inset-bottom">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            {task.status === "completed" ? (
              <Button
                size="lg"
                className="flex-1 font-bold bg-green-600 text-white border-green-600"
                disabled
                data-testid="bottom-button-done"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Task Completed
              </Button>
            ) : activeTimer ? (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleStartOrPause}
                  disabled={stopTimerMutation.isPending}
                  data-testid="bottom-button-pause"
                >
                  <Pause className="w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  className="flex-1 font-bold bg-green-600 text-white border-green-600"
                  onClick={handleComplete}
                  disabled={stopTimerMutation.isPending}
                  data-testid="bottom-button-complete"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Mark as Completed
                </Button>
              </>
            ) : task.status === "in_progress" ? (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleStartOrPause}
                  disabled={startTimerMutation.isPending}
                  data-testid="bottom-button-resume"
                >
                  <Play className="w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  className="flex-1 font-bold bg-green-600 text-white border-green-600"
                  onClick={handleComplete}
                  disabled={updateStatusMutation.isPending}
                  data-testid="bottom-button-complete"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Mark as Completed
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                className="flex-1 font-bold"
                onClick={handleStartOrPause}
                disabled={startTimerMutation.isPending}
                data-testid="bottom-button-start"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Task
              </Button>
            )}
          </div>
        </div>

        <Dialog open={isStopTimerDialogOpen} onOpenChange={setIsStopTimerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Stop Timer</DialogTitle>
              <DialogDescription>What would you like to do?</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  if (activeTimer) {
                    stopTimerMutation.mutate({ timerId: activeTimer, newStatus: "completed" });
                  }
                }}
                disabled={stopTimerMutation.isPending}
                data-testid="button-stop-complete"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Task
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  if (activeTimer) {
                    stopTimerMutation.mutate({ timerId: activeTimer });
                  }
                }}
                disabled={stopTimerMutation.isPending}
                data-testid="button-stop-pause"
              >
                Just Pause Timer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddPartDialogOpen} onOpenChange={setIsAddPartDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Part</DialogTitle>
              <DialogDescription>Select an inventory item to add to this task.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setIsScanPartOpen(true)}
                  data-testid="button-scan-part"
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  Scan Part
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleAiSuggestParts}
                  disabled={isAiSuggestLoading}
                  data-testid="button-ai-suggest-parts"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isAiSuggestLoading ? "Thinking..." : "AI Suggest"}
                </Button>
              </div>

              {/* AI Suggested Parts */}
              {aiSuggestedParts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Suggestions</p>
                  {aiSuggestedParts.map((suggestion, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm" data-testid={`ai-suggestion-${i}`}>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{suggestion.name}</p>
                        <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const item = inventoryItems.find((i) => i.id === suggestion.id);
                          if (item) {
                            setSelectedInventoryItemId(item.id);
                            setInventorySearchQuery(item.name);
                            setPartQuantity(String(suggestion.suggestedQuantity));
                          }
                        }}
                        data-testid={`button-add-suggestion-${i}`}
                      >
                        Use
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Search Inventory</Label>
                <div className="relative">
                  <Input
                    placeholder="Type to search..."
                    value={inventorySearchQuery}
                    onChange={(e) => { setInventorySearchQuery(e.target.value); setSelectedInventoryItemId(""); }}
                    data-testid="input-search-inventory"
                  />
                  {inventorySearchQuery && !selectedInventoryItemId && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {inventoryItems
                        ?.filter((item) => item.name.toLowerCase().includes(inventorySearchQuery.toLowerCase()))
                        .map((item) => (
                          <div
                            key={item.id}
                            className="px-3 py-2 cursor-pointer hover-elevate"
                            onClick={() => {
                              setSelectedInventoryItemId(item.id);
                              setInventorySearchQuery(item.name);
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{item.name}</span>
                              <div className="text-right">
                                <span className="text-sm text-muted-foreground">
                                  {(item.trackingMode === "status")
                                    ? (item.stockStatus || "stocked")
                                    : `${parseFloat(String(item.quantity || "0")).toFixed(2)} ${item.unit || ""}`}
                                </span>
                                {item.packageInfo && (
                                  <p className="text-xs text-muted-foreground">{item.packageInfo}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      {inventoryItems?.filter((item) => item.name.toLowerCase().includes(inventorySearchQuery.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No items found.{" "}
                          <button className="underline text-primary" onClick={() => { setIsQuickAddInventoryOpen(true); setQuickInventoryName(inventorySearchQuery); }}>
                            Create new
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {selectedInventoryItemId && (
                  <div className="bg-muted p-2 rounded space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{inventoryItems.find(i => i.id === selectedInventoryItemId)?.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedInventoryItemId(""); setInventorySearchQuery(""); }}>
                        Change
                      </Button>
                    </div>
                    {(() => {
                      const sel = inventoryItems.find(i => i.id === selectedInventoryItemId);
                      return sel?.packageInfo ? (
                        <p className="text-xs text-muted-foreground">{sel.packageInfo}</p>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Quantity {(() => {
                  const sel = inventoryItems.find(i => i.id === selectedInventoryItemId);
                  return sel?.unit ? `(${sel.unit})` : "";
                })()}</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(e.target.value)}
                  placeholder="e.g. 1, 0.5, 2.5"
                  data-testid="input-part-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={partNotes}
                  onChange={(e) => setPartNotes(e.target.value)}
                  placeholder="Additional notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddPartDialogOpen(false); setSelectedInventoryItemId(""); setInventorySearchQuery(""); setPartQuantity(""); setPartNotes(""); setAiSuggestedParts([]); }}>
                Cancel
              </Button>
              <Button
                onClick={() => addPartMutation.mutate()}
                disabled={!selectedInventoryItemId || !partQuantity || isNaN(parseFloat(partQuantity)) || addPartMutation.isPending}
                data-testid="button-confirm-add-part"
              >
                {addPartMutation.isPending ? "Adding..." : "Add Part"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Scan Part Scanner */}
        <BarcodeScanner
          open={isScanPartOpen}
          onOpenChange={setIsScanPartOpen}
          onScan={handleScanPart}
          title="Scan Part"
          description="Scan a barcode to find this part in inventory"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
          {/* Task Header */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold leading-tight line-clamp-2" data-testid="text-task-name">
                  {task.name}
                </h1>
              </div>

              {isTechnicianOrAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-delete-task">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. All associated data will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteTaskMutation.mutate()}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={`text-xs ${statusColors[task.status]}`} data-testid="badge-status">
                  {statusLabels[task.status]}
                </Badge>
                <Badge variant="outline" className={`text-xs capitalize ${urgencyColors[task.urgency]}`} data-testid="badge-urgency">
                  {task.urgency}
                </Badge>
                <Badge variant="secondary" className="text-xs capitalize" data-testid="badge-task-type">
                  {task.taskType.replace("_", " ")}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span data-testid="text-assignee">
                    {task.assignedToId === user?.id 
                      ? "You"
                      : assignedUser?.firstName && assignedUser?.lastName 
                        ? `${assignedUser.firstName} ${assignedUser.lastName}` 
                        : task.assignedPool === "student_pool" 
                          ? "Student Pool"
                          : task.assignedPool === "technician_pool"
                            ? "Technician Pool"
                            : "Unassigned"}
                  </span>
                </div>
                <div className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span data-testid="text-due-date">{dateLabel}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Location - Clickable for admin/tech only */}
          {property && (
            isTechnicianOrAdmin ? (
              <div 
                onClick={() => safeNavigate(`/properties/${property.id}`)}
                className="flex items-center gap-2 p-3 bg-muted/50 rounded-md hover-elevate active-elevate-2 cursor-pointer" 
                data-testid="link-property"
              >
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{property.name}</p>
                  {property.address && (
                    <p className="text-sm text-muted-foreground truncate">{property.address}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md" data-testid="display-property">
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{property.name}</p>
                  {property.address && (
                    <p className="text-sm text-muted-foreground truncate">{property.address}</p>
                  )}
                </div>
              </div>
            )
          )}

          {/* Space if present */}
          {space && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md" data-testid="display-space">
              <DoorOpen className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{space.name}</p>
                {space.floor && (
                  <p className="text-sm text-muted-foreground">Floor {space.floor}</p>
                )}
              </div>
            </div>
          )}

          {/* Equipment if present */}
          {equipment && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md" data-testid="display-equipment">
              <Package className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{equipment.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{equipment.category}</p>
              </div>
            </div>
          )}

          {/* Previous Work at this Property/Equipment - Technician & Admin */}
          {isTechnicianOrAdmin && previousWork.length > 0 && (
            <Collapsible open={previousWorkExpanded} onOpenChange={setPreviousWorkExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-md text-left" data-testid="toggle-previous-work">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm">Previous Work Here</span>
                    <Badge variant="secondary" className="text-xs">{previousWork.length}</Badge>
                  </div>
                  {previousWorkExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {previousWork.map((prevTask) => {
                  const completedBy = users.find(u => u.id === prevTask.assignedToId);
                  const isEquipmentMatch = task.equipmentId && prevTask.equipmentId === task.equipmentId;
                  return (
                    <div
                      key={prevTask.id}
                      className="p-3 rounded-md border border-border/50 cursor-pointer hover-elevate"
                      onClick={() => navigate(`/tasks/${prevTask.id}`)}
                      data-testid={`previous-work-item-${prevTask.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{prevTask.name}</p>
                          {prevTask.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{prevTask.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {completedBy && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {completedBy.firstName} {completedBy.lastName}
                              </span>
                            )}
                            {prevTask.updatedAt && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(prevTask.updatedAt), "MMM d, yyyy")}
                              </span>
                            )}
                            {isEquipmentMatch && (
                              <Badge variant="outline" className="text-xs">Same Equipment</Badge>
                            )}
                          </div>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      </div>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Instructions - Important for student tasks */}
          {task.instructions && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg" data-testid="task-instructions">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Instructions</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{task.instructions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Time Logged - Prominent Display for Students */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg" data-testid="time-logged-card">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeTimer ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted"}`}>
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time Logged</p>
                <p className="text-2xl font-bold" data-testid="text-time-logged">{totalHours}h {remainingMins}m</p>
              </div>
            </div>
            {activeTimer && (
              <Badge variant="default" className="animate-pulse">
                Timer Running
              </Badge>
            )}
          </div>

          {/* Quick Action Buttons - Admin/Technician Only */}
          {isTechnicianOrAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAssignDialogOpen(true)}
                data-testid="button-assign"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                {assignedUser ? "Reassign" : "Assign"}
              </Button>

              {task.requestId && (
                <Button 
                  variant="outline"
                  size="sm"
                  data-testid="link-original-request"
                  onClick={() => safeNavigate(`/requests/${task.requestId}`)}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Request
                </Button>
              )}

            <Sheet open={isHistorySheetOpen} onOpenChange={setIsHistorySheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-history">
                  <History className="w-4 h-4 mr-1" />
                  History
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh]">
                <SheetHeader>
                  <SheetTitle>Task History</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(70vh-80px)]">
                  {timeEntries.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No time entries yet</p>
                  ) : (
                    timeEntries.map((entry) => {
                      const entryUser = users.find(u => u.id === entry.userId);
                      return (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                          <div>
                            <p className="text-sm font-medium">
                              {entryUser?.firstName} {entryUser?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : "No start time"}
                            </p>
                          </div>
                          {entry.durationMinutes ? (
                            <Badge variant="secondary">{Math.floor(entry.durationMinutes / 60)}h {entry.durationMinutes % 60}m</Badge>
                          ) : (
                            <Badge variant="outline" className="animate-pulse">Running</Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </SheetContent>
            </Sheet>
            </div>
          )}

          {/* Editable Details Section */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            {/* Contact Phone - Tap to call */}
            {(task.contactPhone || contactStaff?.phoneNumber) && (
              <a
                href={`tel:${task.contactPhone || contactStaff?.phoneNumber}`}
                className="flex items-center gap-3 p-3 bg-background rounded-md hover-elevate active-elevate-2"
                data-testid="link-phone"
              >
                <Phone className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="font-medium">{task.contactPhone || contactStaff?.phoneNumber}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
            )}

            {/* Status - Editable */}
            {isTechnicianOrAdmin && (
              <div className="flex items-center gap-3 p-3 bg-background rounded-md">
                <div className="w-5 h-5 flex items-center justify-center">
                  <div className={`w-3 h-3 rounded-full ${
                    task.status === "completed" ? "bg-green-500" :
                    task.status === "in_progress" ? "bg-blue-500" :
                    task.status === "on_hold" ? "bg-yellow-500" : "bg-gray-400"
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Select
                    value={task.status}
                    onValueChange={(value) => updateStatusMutation.mutate(value)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <SelectTrigger className="border-0 p-0 h-auto font-medium focus:ring-0" data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Priority - Editable */}
            {isTechnicianOrAdmin && (
              <div className="flex items-center gap-3 p-3 bg-background rounded-md">
                <AlertTriangle className={`w-5 h-5 ${
                  task.urgency === "high" ? "text-red-500" :
                  task.urgency === "medium" ? "text-yellow-500" : "text-blue-500"
                }`} />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <Select
                    value={task.urgency}
                    onValueChange={(value) => updateTaskMutation.mutate({ urgency: value as "low" | "medium" | "high" })}
                    disabled={updateTaskMutation.isPending}
                  >
                    <SelectTrigger className="border-0 p-0 h-auto font-medium focus:ring-0 capitalize" data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

          </div>

          {/* AI Schedule Suggestion - admin only, when no assignee or due date */}
          {user?.role === "admin" && (!task.assignedToId || !task.estimatedCompletionDate) && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Scheduling</span>
                  {aiScheduleLog && (
                    <Badge variant={aiScheduleLog.status === "approved" ? "default" : aiScheduleLog.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                      {aiScheduleLog.status === "pending_review" ? "Pending Review" : aiScheduleLog.status === "approved" ? "Applied" : "Rejected"}
                    </Badge>
                  )}
                </div>
                {!aiScheduleLog && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRunAiSchedule}
                    disabled={aiScheduleLoading}
                    data-testid="button-ai-schedule"
                    className="gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {aiScheduleLoading ? "Analyzing..." : "Suggest Schedule"}
                  </Button>
                )}
              </div>
              {aiScheduleLog?.proposedValue && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground italic">{aiScheduleLog.reasoning}</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Assignee</span>
                      <p className="font-medium">{aiScheduleLog.proposedValue.suggestedAssigneeName || aiScheduleLog.proposedValue.assigneeName || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Start Date</span>
                      <p className="font-medium">{aiScheduleLog.proposedValue.suggestedStartDate || aiScheduleLog.proposedValue.startDate || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Due Date</span>
                      <p className="font-medium">{aiScheduleLog.proposedValue.suggestedDueDate || aiScheduleLog.proposedValue.dueDate || "—"}</p>
                    </div>
                  </div>
                  {aiScheduleLog.status === "pending_review" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => handleReviewAiSchedule("approved")} className="gap-1.5 text-green-600" data-testid="button-accept-schedule">
                        <ThumbsUp className="h-3.5 w-3.5" /> Apply
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleReviewAiSchedule("rejected")} className="gap-1.5 text-muted-foreground" data-testid="button-reject-schedule">
                        <ThumbsDown className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dependencies - admin only */}
          {user?.role === "admin" && taskDependencies.length > 0 && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Blocked By</span>
              </div>
              <div className="space-y-1.5">
                {taskDependencies.map((dep: any) => {
                  const depTask = allTasks.find((t: any) => t.id === dep.dependsOnTaskId);
                  return (
                    <div key={dep.id} className="flex items-center gap-2 text-sm">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">{depTask?.name || dep.dependsOnTaskId}</span>
                      <Badge variant="outline" className="text-xs capitalize ml-auto">{dep.dependencyType?.replace("_", " ") || "finish to start"}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description Block */}
          {task.description && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm leading-relaxed" data-testid="text-description">{task.description}</p>
            </div>
          )}

          {/* Checklists - Collapsible */}
          {checklistGroups.length > 0 && (
            <Collapsible open={checklistExpanded} onOpenChange={setChecklistExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-checklist">
                  <div className="flex items-center gap-3">
                    <ListChecks className="w-5 h-5 text-primary" />
                    <span className="font-medium">Checklists</span>
                    <Badge variant="secondary">{completedChecklistItems}/{totalChecklistItems}</Badge>
                  </div>
                  {checklistExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-4">
                {checklistGroups.map((group) => (
                  <div key={group.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <p className="font-medium text-sm">{group.name}</p>
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 bg-background rounded-lg cursor-pointer hover-elevate active-elevate-2 min-h-[56px]"
                        onClick={() => toggleChecklistItemMutation.mutate({ itemId: item.id, isCompleted: !item.isCompleted })}
                        data-testid={`checklist-item-${item.id}`}
                      >
                        <Checkbox checked={item.isCompleted} className="w-6 h-6" />
                        <span className={`text-base flex-1 ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Notes - Collapsible */}
          <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-notes">
                <div className="flex items-center gap-3">
                  <StickyNote className="w-5 h-5 text-primary" />
                  <span className="font-medium">Notes</span>
                  {notes.length > 0 && <Badge variant="secondary">{notes.length}</Badge>}
                </div>
                {notesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {notes.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">No notes yet</p>
              ) : (
                notes.map((note) => {
                  const noteUser = users.find(u => u.id === note.userId);
                  const canDelete = user?.role === "admin" || note.userId === user?.id;
                  return (
                    <div key={note.id} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{noteUser?.firstName} {noteUser?.lastName}</span>
                          <Badge variant="outline" className="text-xs py-0">
                            {note.noteType === "job_note" ? "Note" : "Recommendation"}
                          </Badge>
                        </div>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteNoteMutation.mutate(note.id)}
                            data-testid={`button-delete-note-${note.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {note.createdAt && formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  );
                })
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Time History - Show user's own entries for students, all entries for admin/tech */}
          {(() => {
            const myEntries = timeEntries.filter(e => e.userId === user?.id);
            const entriesToShow = isTechnicianOrAdmin ? timeEntries : myEntries;
            
            if (entriesToShow.length === 0) return null;
            
            return (
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <History className="w-5 h-5 text-primary" />
                  <span className="font-medium">{isTechnicianOrAdmin ? "Time Log" : "My Time Log"}</span>
                </div>
                <div className="space-y-2">
                  {entriesToShow.slice(0, 5).map((entry) => {
                    const entryUser = users.find(u => u.id === entry.userId);
                    return (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-background rounded-md" data-testid={`time-entry-${entry.id}`}>
                        <div className="flex-1">
                          <p className="text-sm">
                            {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : "No start time"}
                          </p>
                          {isTechnicianOrAdmin && entryUser && (
                            <p className="text-xs text-muted-foreground">
                              {entryUser.firstName} {entryUser.lastName}
                            </p>
                          )}
                        </div>
                        {entry.durationMinutes ? (
                          <Badge variant="secondary">{Math.floor(entry.durationMinutes / 60)}h {entry.durationMinutes % 60}m</Badge>
                        ) : (
                          <Badge variant="default" className="animate-pulse">Running</Badge>
                        )}
                      </div>
                    );
                  })}
                  {entriesToShow.length > 5 && (
                    <p className="text-xs text-center text-muted-foreground pt-2">
                      +{entriesToShow.length - 5} more entries
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Messages - Collapsible (Only for Maintenance/Admin) */}
          {isTechnicianOrAdmin && (
            <Collapsible open={messagesExpanded} onOpenChange={setMessagesExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-messages">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <span className="font-medium">Messages</span>
                    {messages.length > 0 && <Badge variant="secondary">{messages.length}</Badge>}
                  </div>
                  {messagesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">No messages yet</p>
                ) : (
                  messages.map((message) => {
                    const sender = users.find(u => u.id === message.senderId);
                    const isOwnMessage = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${isOwnMessage ? "bg-primary/10 ml-8" : "bg-muted/30 mr-8"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{sender?.firstName} {sender?.lastName}</span>
                          {user?.role === "admin" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => deleteMessageMutation.mutate(message.id)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {message.createdAt && formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    );
                  })
                )}
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newMessage.trim()) {
                        sendMessageMutation.mutate(newMessage.trim());
                      }
                    }}
                    data-testid="input-message"
                  />
                  <Button
                    size="icon"
                    onClick={() => newMessage.trim() && sendMessageMutation.mutate(newMessage.trim())}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Attachments - Collapsible */}
          <Collapsible open={attachmentsExpanded} onOpenChange={setAttachmentsExpanded}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-attachments">
                <div className="flex items-center gap-3">
                  <Paperclip className="w-5 h-5 text-primary" />
                  <span className="font-medium">Attachments</span>
                  {(uploads.length + requestAttachments.length) > 0 && (
                    <Badge variant="secondary">{uploads.length + requestAttachments.length}</Badge>
                  )}
                </div>
                {attachmentsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {requestAttachments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground px-1">From Request</p>
                  {requestAttachments.map((att) => {
                    const isMockFile = att.objectUrl.includes("mock-storage.local");
                    return (
                      <button
                        key={att.id}
                        onClick={() => downloadFile(att.id, att.objectUrl)}
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover-elevate w-full text-left"
                      >
                        {isMockFile ? (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        ) : (
                          <Paperclip className="w-4 h-4 text-primary" />
                        )}
                        <span className="text-sm flex-1 truncate">{att.fileName}</span>
                        {isMockFile ? (
                          <span className="text-xs text-destructive">Unavailable</span>
                        ) : (
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {uploads.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground px-1">Task Attachments</p>
                  {uploads.map((upload) => {
                    const isMockFile = upload.objectUrl.includes("mock-storage.local");
                    return (
                      <div key={upload.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <button
                          onClick={() => downloadFile(upload.id, upload.objectUrl)}
                          className="flex items-center gap-3 flex-1 min-w-0 hover-elevate text-left"
                        >
                          {isMockFile ? (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          ) : (
                            <Paperclip className="w-4 h-4 text-primary" />
                          )}
                          <span className="text-sm truncate">{upload.fileName}</span>
                          {isMockFile && (
                            <span className="text-xs text-destructive">Unavailable</span>
                          )}
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUploadMutation.mutate(upload.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    );
                  })}
                </div>
              )}
              {uploads.length === 0 && requestAttachments.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">No attachments</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Quotes/Estimates - Collapsible (only for tasks requiring estimates) */}
          {task?.requiresEstimate && isTechnicianOrAdmin && (
            <Collapsible open={quotesExpanded} onOpenChange={setQuotesExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-quotes">
                  <div className="flex items-center gap-3">
                    <CircleDollarSign className="w-5 h-5 text-primary" />
                    <span className="font-medium">Estimates & Quotes</span>
                    {quotes.length > 0 && <Badge variant="secondary">{quotes.length}</Badge>}
                    {task?.estimateStatus === "needs_estimate" && (
                      <Badge variant="outline" className={statusColors.needs_estimate}>Needs Estimate</Badge>
                    )}
                    {task?.estimateStatus === "waiting_approval" && (
                      <Badge variant="outline" className={statusColors.waiting_approval}>Awaiting Approval</Badge>
                    )}
                    {task?.estimateStatus === "approved" && (
                      <Badge variant="outline" className={statusColors.ready}>Approved</Badge>
                    )}
                  </div>
                  {quotesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-3">
                {/* Add Quote Button */}
                {task?.estimateStatus !== "approved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddQuoteDialogOpen(true)}
                    className="w-full"
                    data-testid="button-add-quote"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Estimate
                  </Button>
                )}

                {quotes.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    No estimates added yet. Add estimates to compare and approve before work begins.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {quotes.map((quote) => (
                      <div
                        key={quote.id}
                        className={`p-4 rounded-lg border ${
                          quote.status === "approved" ? "border-green-500/50 bg-green-500/5" : 
                          quote.status === "rejected" ? "border-red-500/30 bg-red-500/5 opacity-60" : 
                          "border-border"
                        }`}
                        data-testid={`quote-card-${quote.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-lg">
                                ${(quote.estimatedCost || 0).toLocaleString()}
                              </span>
                              <Badge variant="secondary" className={quoteStatusColors[quote.status]}>
                                {quote.status}
                              </Badge>
                            </div>
                            {quote.vendorName && (
                              <p className="text-sm text-muted-foreground">
                                Vendor: {quote.vendorName}
                              </p>
                            )}
                            {quote.notes && (
                              <p className="text-sm mt-2">{quote.notes}</p>
                            )}
                            <QuoteAttachmentsList quoteId={quote.id} />
                          </div>
                          <div className="flex gap-2">
                            {quote.status === "draft" && task?.estimateStatus !== "approved" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => approveQuoteMutation.mutate(quote.id)}
                                  disabled={approveQuoteMutation.isPending}
                                  data-testid={`button-approve-quote-${quote.id}`}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteQuoteMutation.mutate(quote.id)}
                                  disabled={deleteQuoteMutation.isPending}
                                  data-testid={`button-delete-quote-${quote.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {quote.status === "approved" && (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Parts Used - Collapsible */}
          {isTechnicianOrAdmin && (
            <Collapsible open={partsExpanded} onOpenChange={setPartsExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-parts">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="font-medium">Parts Used</span>
                    {parts.length > 0 && <Badge variant="secondary">{parts.length}</Badge>}
                  </div>
                  {partsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {parts.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">No parts used</p>
                ) : (
                  parts.map((part) => (
                    <div key={part.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{part.partName}</p>
                        {part.notes && <p className="text-xs text-muted-foreground">{part.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Qty: {part.quantity}</p>
                        <p className="text-xs text-muted-foreground">${part.cost.toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsAddPartDialogOpen(true)}
                  data-testid="button-add-part"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Part
                </Button>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-2 max-w-2xl mx-auto gap-2">
          {/* Single Primary Action Button - follows workflow */}
          {task.status === "completed" ? (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-14 flex-col gap-0.5 text-green-600 dark:text-green-400"
              disabled
              data-testid="bottom-button-done"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span className="text-xs font-medium">Completed</span>
            </Button>
          ) : activeTimer ? (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-14 flex-col gap-0.5"
              onClick={handleStartOrPause}
              disabled={stopTimerMutation.isPending}
              data-testid="bottom-button-pause"
            >
              <Pause className="w-6 h-6" />
              <span className="text-xs font-medium">Pause Timer</span>
            </Button>
          ) : task.status === "in_progress" ? (
            <div className="flex flex-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-14 flex-col gap-0.5"
                onClick={handleStartOrPause}
                disabled={startTimerMutation.isPending}
                data-testid="bottom-button-resume"
              >
                <Play className="w-6 h-6" />
                <span className="text-xs font-medium">Resume</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="flex-1 h-14 flex-col gap-0.5 bg-green-600"
                onClick={handleComplete}
                disabled={updateStatusMutation.isPending}
                data-testid="bottom-button-complete"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-xs font-medium">Complete</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-14 flex-col gap-0.5"
              onClick={handleStartOrPause}
              disabled={startTimerMutation.isPending}
              data-testid="bottom-button-start"
            >
              <Play className="w-6 h-6" />
              <span className="text-xs font-medium">Start Task</span>
            </Button>
          )}

          <Sheet open={isUploadSheetOpen} onOpenChange={setIsUploadSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-14 px-4 flex-col gap-0.5" data-testid="bottom-button-upload">
                <Camera className="w-5 h-5" />
                <span className="text-xs">Photos</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[50vh]">
              <SheetHeader>
                <SheetTitle>Upload Photos</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {pendingUploads.length > 0 && (
                  <div className="space-y-2">
                    {pendingUploads.map((upload, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm truncate flex-1">{upload.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingUploads(prev => prev.filter((_, i) => i !== index))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      className="w-full"
                      onClick={async () => {
                        for (const upload of pendingUploads) {
                          await addUploadMutation.mutateAsync({
                            fileName: upload.name,
                            fileType: upload.type,
                            objectUrl: upload.url,
                          });
                        }
                        setPendingUploads([]);
                        setIsUploadSheetOpen(false);
                      }}
                      disabled={addUploadMutation.isPending}
                    >
                      Save {pendingUploads.length} Photo{pendingUploads.length !== 1 ? "s" : ""}
                    </Button>
                  </div>
                )}
                <div className="border-2 border-dashed rounded-lg p-8 flex items-center justify-center">
                  <ObjectUploader
                    maxNumberOfFiles={5}
                    maxFileSize={10485760}
                    onGetUploadParameters={getUploadParameters}
                    onComplete={handleFileUpload}
                    onError={(error) => {
                      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                    }}
                    buttonClassName="bg-primary text-primary-foreground"
                  >
                    Browse Photos
                  </ObjectUploader>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-12 flex-col gap-0.5"
            onClick={() => setIsAddNoteDialogOpen(true)}
            data-testid="bottom-button-add-note"
          >
            <StickyNote className="w-5 h-5" />
            <span className="text-xs">Note</span>
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      
      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{assignedUser ? "Reassign Task" : "Assign Task"}</DialogTitle>
            <DialogDescription>Select a team member to assign this task to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-4 max-h-[400px] overflow-y-auto">
            {[
              { label: "Admins", users: adminUsers },
              { label: "Technicians", users: technicianUsers },
              { label: "Staff", users: staffUsers },
              { label: "Students", users: studentUsers },
            ].filter(group => group.users.length > 0).map((group) => (
              <div key={group.label}>
                <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </p>
                <div className="space-y-1 px-1">
                  {group.users.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover-elevate ${
                        u.id === task.assignedToId ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                      }`}
                      onClick={() => {
                        updateTaskMutation.mutate({ assignedToId: u.id });
                        setIsAssignDialogOpen(false);
                      }}
                      data-testid={`assign-user-${u.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                        </div>
                      </div>
                      {u.id === task.assignedToId && <Check className="w-5 h-5 text-primary" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={isAddNoteDialogOpen} onOpenChange={setIsAddNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add a note or recommendation for this task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={noteType === "job_note" ? "default" : "outline"}
                size="sm"
                onClick={() => setNoteType("job_note")}
                className="flex-1"
              >
                Job Note
              </Button>
              <Button
                variant={noteType === "recommendation" ? "default" : "outline"}
                size="sm"
                onClick={() => setNoteType("recommendation")}
                className="flex-1"
              >
                Recommendation
              </Button>
            </div>
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter your note..."
              rows={4}
              data-testid="textarea-new-note"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddNoteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addNoteMutation.mutate({ content: newNote, noteType })}
              disabled={!newNote.trim() || addNoteMutation.isPending}
              data-testid="button-submit-note"
            >
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop Timer Dialog */}
      <Dialog open={isStopTimerDialogOpen} onOpenChange={setIsStopTimerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
            <DialogDescription>What would you like to do?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start h-12"
              onClick={() => {
                setIsStopTimerDialogOpen(false);
                setIsHoldReasonDialogOpen(true);
              }}
            >
              <Pause className="w-4 h-4 mr-2" />
              Put Task On Hold
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-12"
              onClick={() => {
                if (activeTimer) {
                  stopTimerMutation.mutate({ timerId: activeTimer, newStatus: "completed" });
                }
              }}
              disabled={stopTimerMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Task
            </Button>
            <Button
              variant="ghost"
              className="w-full h-12"
              onClick={() => {
                if (activeTimer) {
                  stopTimerMutation.mutate({ timerId: activeTimer });
                }
              }}
              disabled={stopTimerMutation.isPending}
            >
              Just Stop Timer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hold Reason Dialog */}
      <Dialog open={isHoldReasonDialogOpen} onOpenChange={setIsHoldReasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hold Task</DialogTitle>
            <DialogDescription>Please provide a reason for putting this task on hold.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter reason..."
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              rows={4}
              data-testid="textarea-hold-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsHoldReasonDialogOpen(false); setHoldReason(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (activeTimer) {
                  stopTimerMutation.mutate({ timerId: activeTimer, newStatus: "on_hold", onHoldReason: holdReason });
                }
              }}
              disabled={!holdReason.trim() || stopTimerMutation.isPending}
            >
              Hold Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Quote Dialog */}
      <Dialog open={isAddQuoteDialogOpen} onOpenChange={setIsAddQuoteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Estimate</DialogTitle>
            <DialogDescription>Add a new estimate for comparison. You can add multiple estimates to compare before approving one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Estimated Cost *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newQuoteEstimatedCost}
                  onChange={(e) => setNewQuoteEstimatedCost(e.target.value)}
                  className="pl-8"
                  data-testid="input-quote-cost"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vendor/Source (Optional)</Label>
              <div className="flex gap-2">
                <Select
                  value={newQuoteVendorId}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setNewQuoteVendorId("");
                      setNewQuoteVendorName("");
                    } else {
                      setNewQuoteVendorId(value);
                      const selectedVendor = vendors.find(v => v.id === value);
                      setNewQuoteVendorName(selectedVendor?.name || "");
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-quote-vendor" className="flex-1">
                    <SelectValue placeholder="Select a vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vendor</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsAddVendorDialogOpen(true)}
                  data-testid="button-add-new-vendor"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Details about this estimate..."
                value={newQuoteNotes}
                onChange={(e) => setNewQuoteNotes(e.target.value)}
                data-testid="input-quote-notes"
              />
            </div>
            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={10485760}
                  onGetUploadParameters={getUploadParameters}
                  onComplete={(result: { successful: Array<{url: string, fileName: string, type: string, size: number}>, failed: Array<any> }) => {
                    if (result.successful && result.successful.length > 0) {
                      const newFiles = result.successful.map(file => ({
                        url: file.url,
                        fileName: file.fileName,
                        fileType: file.type,
                        fileSize: file.size,
                      }));
                      setPendingQuoteFiles(prev => [...prev, ...newFiles]);
                      toast({ title: "File uploaded", description: `${result.successful.length} file(s) uploaded` });
                    }
                  }}
                  onError={(error) => {
                    toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                  }}
                  buttonClassName="w-full"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Browse Files
                </ObjectUploader>
                {pendingQuoteFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {pendingQuoteFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                        <span className="truncate flex-1">{file.fileName}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setPendingQuoteFiles(prev => prev.filter((_, i) => i !== index))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddQuoteDialogOpen(false);
              setNewQuoteVendorId("");
              setNewQuoteVendorName("");
              setPendingQuoteFiles([]);
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => createQuoteMutation.mutate({
                vendorName: newQuoteVendorName,
                estimatedCost: parseFloat(newQuoteEstimatedCost) || 0,
                notes: newQuoteNotes,
                files: pendingQuoteFiles,
              })}
              disabled={!newQuoteEstimatedCost || createQuoteMutation.isPending}
              data-testid="button-submit-quote"
            >
              Add Estimate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Part Dialog */}
      <Dialog open={isAddPartDialogOpen} onOpenChange={setIsAddPartDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Part</DialogTitle>
            <DialogDescription>Select an inventory item to add to this task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setIsScanPartOpen(true)}
                data-testid="button-scan-part"
              >
                <ScanLine className="h-4 w-4 mr-2" />
                Scan Part
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleAiSuggestParts}
                disabled={isAiSuggestLoading}
                data-testid="button-ai-suggest-parts"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isAiSuggestLoading ? "Thinking..." : "AI Suggest"}
              </Button>
            </div>

            {/* AI Suggested Parts */}
            {aiSuggestedParts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Suggestions</p>
                {aiSuggestedParts.map((suggestion, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm" data-testid={`ai-suggestion-${i}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{suggestion.name}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const item = inventoryItems.find((inv) => inv.id === suggestion.id);
                        if (item) {
                          setSelectedInventoryItemId(item.id);
                          setInventorySearchQuery(item.name);
                          setPartQuantity(String(suggestion.suggestedQuantity));
                        }
                      }}
                      data-testid={`button-add-suggestion-${i}`}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Search Inventory</Label>
              <div className="relative">
                <Input
                  placeholder="Type to search..."
                  value={inventorySearchQuery}
                  onChange={(e) => { setInventorySearchQuery(e.target.value); setSelectedInventoryItemId(""); }}
                  data-testid="input-search-inventory"
                />
                {inventorySearchQuery && !selectedInventoryItemId && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div
                      className="px-3 py-2 cursor-pointer hover-elevate font-semibold text-primary border-b"
                      onClick={() => {
                        setIsQuickAddInventoryOpen(true);
                        setQuickInventoryName(inventorySearchQuery);
                        setInventorySearchQuery("");
                      }}
                    >
                      + Create New Item
                    </div>
                    {inventoryItems
                      ?.filter((item) => item.name.toLowerCase().includes(inventorySearchQuery.toLowerCase()))
                      .map((item) => (
                        <div
                          key={item.id}
                          className="px-3 py-2 cursor-pointer hover-elevate"
                          onClick={() => {
                            setSelectedInventoryItemId(item.id);
                            setInventorySearchQuery(item.name);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.name}</span>
                            <div className="text-right">
                              <span className="text-sm text-muted-foreground">
                                {(item.trackingMode === "status")
                                  ? (item.stockStatus || "stocked")
                                  : `${parseFloat(String(item.quantity || "0")).toFixed(2)} ${item.unit || ""}`}
                              </span>
                              {item.packageInfo && (
                                <p className="text-xs text-muted-foreground">{item.packageInfo}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              {selectedInventoryItemId && (
                <div className="bg-muted p-2 rounded space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{inventoryItems.find(i => i.id === selectedInventoryItemId)?.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedInventoryItemId(""); setInventorySearchQuery(""); }}>
                      Change
                    </Button>
                  </div>
                  {(() => {
                    const sel = inventoryItems.find(i => i.id === selectedInventoryItemId);
                    return sel?.packageInfo ? (
                      <p className="text-xs text-muted-foreground">{sel.packageInfo}</p>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Quantity {(() => {
                const sel = inventoryItems.find(i => i.id === selectedInventoryItemId);
                return sel?.unit ? `(${sel.unit})` : "";
              })()}</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={partQuantity}
                onChange={(e) => setPartQuantity(e.target.value)}
                placeholder="e.g. 1, 0.5, 2.5"
                data-testid="input-part-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={partNotes}
                onChange={(e) => setPartNotes(e.target.value)}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddPartDialogOpen(false); setSelectedInventoryItemId(""); setInventorySearchQuery(""); setPartQuantity(""); setPartNotes(""); setAiSuggestedParts([]); }}>
              Cancel
            </Button>
            <Button
              onClick={() => addPartMutation.mutate()}
              disabled={!selectedInventoryItemId || !partQuantity || isNaN(parseFloat(partQuantity)) || addPartMutation.isPending}
              data-testid="button-confirm-add-part"
            >
              {addPartMutation.isPending ? "Adding..." : "Add Part"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Inventory Dialog */}
      <Dialog open={isQuickAddInventoryOpen} onOpenChange={setIsQuickAddInventoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Item</DialogTitle>
            <DialogDescription>Quickly add a new inventory item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input
                value={quickInventoryName}
                onChange={(e) => setQuickInventoryName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quickInventoryQuantity}
                onChange={(e) => setQuickInventoryQuantity(parseInt(e.target.value) || 0)}
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit (Optional)</Label>
              <Input
                value={quickInventoryUnit}
                onChange={(e) => setQuickInventoryUnit(e.target.value)}
                placeholder="e.g., pieces, boxes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsQuickAddInventoryOpen(false); setQuickInventoryName(""); setQuickInventoryQuantity(0); setQuickInventoryUnit(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => quickAddInventoryMutation.mutate()}
              disabled={!quickInventoryName || quickInventoryQuantity <= 0 || quickAddInventoryMutation.isPending}
            >
              Create Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Confirmation Dialog */}
      <AlertDialog open={isLeaveConfirmDialogOpen} onOpenChange={setIsLeaveConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Timer Still Running
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have an active timer running for this task. If you leave now, the timer will continue running in the background. 
              Would you like to stop the timer first, or leave anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel onClick={cancelLeave}>
              Stay on Page
            </AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsLeaveConfirmDialogOpen(false);
                setIsStopTimerDialogOpen(true);
              }}
            >
              Stop Timer First
            </Button>
            <AlertDialogAction onClick={confirmLeave} className="bg-destructive text-destructive-foreground">
              Leave Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Vendor Dialog */}
      <Dialog open={isAddVendorDialogOpen} onOpenChange={setIsAddVendorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>Create a new vendor to associate with this estimate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vendor Name *</Label>
              <Input
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                placeholder="e.g., ABC Plumbing, Home Depot"
                data-testid="input-new-vendor-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={newVendorEmail}
                onChange={(e) => setNewVendorEmail(e.target.value)}
                placeholder="vendor@example.com"
                data-testid="input-new-vendor-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone (Optional)</Label>
              <Input
                value={newVendorPhone}
                onChange={(e) => setNewVendorPhone(e.target.value)}
                placeholder="(555) 123-4567"
                data-testid="input-new-vendor-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Address (Optional)</Label>
              <Input
                value={newVendorAddress}
                onChange={(e) => setNewVendorAddress(e.target.value)}
                placeholder="123 Main St, City, State"
                data-testid="input-new-vendor-address"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={newVendorNotes}
                onChange={(e) => setNewVendorNotes(e.target.value)}
                placeholder="Any additional details about this vendor..."
                data-testid="input-new-vendor-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddVendorDialogOpen(false);
              setNewVendorName("");
              setNewVendorEmail("");
              setNewVendorPhone("");
              setNewVendorAddress("");
              setNewVendorNotes("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => createVendorMutation.mutate({
                name: newVendorName,
                email: newVendorEmail || undefined,
                phone: newVendorPhone || undefined,
                address: newVendorAddress || undefined,
                notes: newVendorNotes || undefined,
              })}
              disabled={!newVendorName.trim() || createVendorMutation.isPending}
              data-testid="button-submit-new-vendor"
            >
              {createVendorMutation.isPending ? "Creating..." : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
