import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
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
  ArrowLeft,
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
  X,
  MessageSquare,
  Send,
  Building2,
  MapPin,
  Phone,
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
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
  TaskChecklistGroup,
  TaskChecklistItem,
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
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
};

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
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [newNote, setNewNote] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>("");
  const [partQuantity, setPartQuantity] = useState("");
  const [partNotes, setPartNotes] = useState("");
  const [pendingUploads, setPendingUploads] = useState<{ name: string; url: string; type: string }[]>([]);
  const [isAddPartDialogOpen, setIsAddPartDialogOpen] = useState(false);
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
  
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [messagesExpanded, setMessagesExpanded] = useState(false);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const [checklistExpanded, setChecklistExpanded] = useState(false);
  const [partsExpanded, setPartsExpanded] = useState(false);

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
    enabled: !!id && (user?.role === "admin" || user?.role === "maintenance"),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const runningEntry = timeEntries.find((e) => e.startTime && !e.endTime);
    if (runningEntry) {
      setActiveTimer(runningEntry.id);
    }
  }, [timeEntries]);

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

      const partData = {
        taskId: id,
        inventoryItemId: selectedInventoryItemId,
        partName: selectedItem.name,
        quantity: parseInt(partQuantity),
        cost: selectedItem.cost ? parseFloat(selectedItem.cost) * parseInt(partQuantity) : 0,
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
      toast({ title: "Task deleted" });
      navigate("/tasks");
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
          <Button variant="outline" onClick={() => navigate("/tasks")} className="mt-4">
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  const isMaintenanceOrAdmin = user?.role === "admin" || user?.role === "maintenance";
  const assignedUser = users.find(u => u.id === task.assignedToId);
  const maintenanceUsers = users.filter(u => u.role === "maintenance" || u.role === "admin");

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
    if (activeTimer) {
      stopTimerMutation.mutate({ timerId: activeTimer, newStatus: "completed" });
    } else {
      updateStatusMutation.mutate("completed");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Header - Simple & Centered */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/tasks")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex flex-col items-center flex-1 min-w-0 mx-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium truncate" data-testid="text-assignee">
                {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : "Unassigned"}
              </span>
            </div>
            <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
              <Calendar className="w-3 h-3" />
              <span data-testid="text-due-date">{dateLabel}</span>
            </div>
          </div>

          {isMaintenanceOrAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-delete-task">
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
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
          
          {/* Task Identity Block */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={statusColors[task.status]} data-testid="badge-status">
                {statusLabels[task.status]}
              </Badge>
              <Badge variant="outline" className={urgencyColors[task.urgency]} data-testid="badge-urgency">
                {task.urgency}
              </Badge>
              <Badge variant="secondary" className="capitalize" data-testid="badge-task-type">
                {task.taskType.replace("_", " ")}
              </Badge>
            </div>
            
            <h1 className="text-xl font-semibold leading-tight" data-testid="text-task-name">
              {task.name}
            </h1>

            {/* Location - Clickable */}
            {property && (
              <Link href={`/properties/${property.id}`}>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md hover-elevate active-elevate-2 cursor-pointer" data-testid="link-property">
                  <Building2 className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{property.name}</p>
                    {property.address && (
                      <p className="text-sm text-muted-foreground truncate">{property.address}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            )}

            {/* Equipment if present */}
            {equipment && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <Package className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{equipment.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{equipment.category}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              variant={activeTimer ? "default" : "outline"}
              className="h-14 flex-col gap-1"
              onClick={handleStartOrPause}
              disabled={startTimerMutation.isPending}
              data-testid="button-start-pause"
            >
              {activeTimer ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span className="text-xs">Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span className="text-xs">{task.status === "not_started" ? "Start" : "Resume"}</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="h-14 flex-col gap-1"
              onClick={() => setIsAssignDialogOpen(true)}
              data-testid="button-assign"
            >
              <UserPlus className="w-5 h-5" />
              <span className="text-xs">{assignedUser ? "Reassign" : "Assign"}</span>
            </Button>

            {task.requestId && (
              <Link href={`/requests/${task.requestId}`}>
                <Button variant="outline" className="h-14 flex-col gap-1 w-full" data-testid="link-original-request">
                  <ExternalLink className="w-5 h-5" />
                  <span className="text-xs">Original Request</span>
                </Button>
              </Link>
            )}

            <Sheet open={isHistorySheetOpen} onOpenChange={setIsHistorySheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-14 flex-col gap-1" data-testid="button-history">
                  <History className="w-5 h-5" />
                  <span className="text-xs">History</span>
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
            {isMaintenanceOrAdmin && (
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
            {isMaintenanceOrAdmin && (
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

            {/* Time Logged */}
            <div className="flex items-center gap-3 p-3 bg-background rounded-md">
              <Clock className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Time Logged</p>
                <p className="font-medium" data-testid="text-time-logged">
                  {totalHours}h {remainingMins}m
                </p>
              </div>
              {activeTimer && (
                <Badge variant="outline" className="animate-pulse bg-green-500/10 text-green-700 border-green-500/20">
                  Recording
                </Badge>
              )}
            </div>
          </div>

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
                  <div key={group.id} className="p-4 bg-muted/30 rounded-lg space-y-2">
                    <p className="font-medium text-sm">{group.name}</p>
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 bg-background rounded cursor-pointer hover-elevate"
                        onClick={() => toggleChecklistItemMutation.mutate({ itemId: item.id, isCompleted: !item.isCompleted })}
                        data-testid={`checklist-item-${item.id}`}
                      >
                        <Checkbox checked={item.isCompleted} />
                        <span className={`text-sm flex-1 ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>
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

          {/* Messages - Collapsible (Only for Maintenance/Admin) */}
          {isMaintenanceOrAdmin && (
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
                  {requestAttachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.objectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover-elevate"
                    >
                      <Paperclip className="w-4 h-4 text-primary" />
                      <span className="text-sm flex-1 truncate">{att.fileName}</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              )}
              {uploads.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground px-1">Task Attachments</p>
                  {uploads.map((upload) => (
                    <div key={upload.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <a
                        href={upload.objectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 flex-1 min-w-0 hover-elevate"
                      >
                        <Paperclip className="w-4 h-4 text-primary" />
                        <span className="text-sm truncate">{upload.fileName}</span>
                      </a>
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
                  ))}
                </div>
              )}
              {uploads.length === 0 && requestAttachments.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">No attachments</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Parts Used - Collapsible */}
          {isMaintenanceOrAdmin && (
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
        <div className="flex items-center justify-around px-2 py-2 max-w-2xl mx-auto gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-12 flex-col gap-0.5"
            onClick={() => navigate("/tasks")}
            data-testid="bottom-button-back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs">Back</span>
          </Button>

          <Button
            variant={activeTimer ? "default" : "ghost"}
            size="sm"
            className="flex-1 h-12 flex-col gap-0.5"
            onClick={handleStartOrPause}
            disabled={startTimerMutation.isPending || task.status === "completed"}
            data-testid="bottom-button-start-pause"
          >
            {activeTimer ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <span className="text-xs">{activeTimer ? "Pause" : "Start"}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`flex-1 h-12 flex-col gap-0.5 ${task.status === "completed" ? "text-green-600" : ""}`}
            onClick={handleComplete}
            disabled={updateStatusMutation.isPending || stopTimerMutation.isPending || task.status === "completed"}
            data-testid="bottom-button-complete"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs">{task.status === "completed" ? "Done" : "Complete"}</span>
          </Button>

          <Sheet open={isUploadSheetOpen} onOpenChange={setIsUploadSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-1 h-12 flex-col gap-0.5" data-testid="bottom-button-upload">
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
                    buttonClassName="bg-primary text-primary-foreground hover:bg-primary/90"
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
          <div className="space-y-2 py-4 max-h-[300px] overflow-y-auto">
            {maintenanceUsers.map((u) => (
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

      {/* Add Part Dialog */}
      <Dialog open={isAddPartDialogOpen} onOpenChange={setIsAddPartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Part</DialogTitle>
            <DialogDescription>Select an inventory item to add to this task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search Inventory</Label>
              <div className="relative">
                <Input
                  placeholder="Type to search..."
                  value={inventorySearchQuery}
                  onChange={(e) => setInventorySearchQuery(e.target.value)}
                  data-testid="input-search-inventory"
                />
                {inventorySearchQuery && !selectedInventoryItemId && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div
                      className="px-3 py-2 cursor-pointer hover:bg-accent font-semibold text-primary border-b"
                      onClick={() => {
                        setIsQuickAddInventoryOpen(true);
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
                          className="px-3 py-2 cursor-pointer hover:bg-accent"
                          onClick={() => {
                            setSelectedInventoryItemId(item.id);
                            setInventorySearchQuery(item.name);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              {selectedInventoryItemId && (
                <div className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                  <span>Selected: <span className="font-medium">{inventoryItems.find(i => i.id === selectedInventoryItemId)?.name}</span></span>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedInventoryItemId(""); setInventorySearchQuery(""); }}>
                    Change
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={partQuantity}
                onChange={(e) => setPartQuantity(e.target.value)}
                placeholder="Enter quantity"
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
            <Button variant="outline" onClick={() => { setIsAddPartDialogOpen(false); setSelectedInventoryItemId(""); setInventorySearchQuery(""); setPartQuantity(""); setPartNotes(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => addPartMutation.mutate()}
              disabled={!selectedInventoryItemId || !partQuantity || addPartMutation.isPending}
            >
              Add Part
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
    </div>
  );
}
