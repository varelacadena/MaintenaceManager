import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
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
  ArrowLeft,
  Clock,
  User,
  Calendar,
  Plus,
  Play,
  Square,
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
} from "@shared/schema";
import { Link } from "wouter";
import { Label } from "@radix-ui/react-label";

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

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [newNote, setNewNote] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [showAddPart, setShowAddPart] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState("");
  const [partQuantity, setPartQuantity] = useState("");
  const [partNotes, setPartNotes] = useState("");
  const [pendingUploads, setPendingUploads] = useState<
    { name: string; url: string; type: string }[]
  >([]);
  const [isAddPartDialogOpen, setIsAddPartDialogOpen] = useState(false);
  const [isQuickAddInventoryOpen, setIsQuickAddInventoryOpen] = useState(false);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>("");
  const [quickInventoryName, setQuickInventoryName] = useState("");
  const [quickInventoryQuantity, setQuickInventoryQuantity] = useState(0);
  const [quickInventoryUnit, setQuickInventoryUnit] = useState("");
  const [isStopTimerDialogOpen, setIsStopTimerDialogOpen] = useState(false);
  const [isHoldReasonDialogOpen, setIsHoldReasonDialogOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [isAddNoteDialogOpen, setIsAddNoteDialogOpen] = useState(false);
  const [noteType, setNoteType] = useState<"job_note" | "recommendation">("job_note");
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

  const { data: requester } = useQuery<UserType>({
    queryKey: ["/api/users", request?.requesterId],
    enabled: !!request?.requesterId,
  });

  const { data: property } = useQuery<Property>({
    queryKey: ["/api/properties", task?.propertyId],
    enabled: !!task?.propertyId,
  });

  const { data: equipment } = useQuery<Equipment>({
    queryKey: ["/api/equipment", task?.equipmentId],
    enabled: !!task?.equipmentId,
  });

  const { data: contactStaff } = useQuery<UserType>({
    queryKey: ["/api/users", task?.contactStaffId],
    enabled: !!task?.contactStaffId,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages/task", id],
    enabled: !!id && (user?.role === "admin" || user?.role === "maintenance"),
    refetchInterval: 5000, // Poll for new messages
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("POST", `/api/messages/task/${taskId}/mark-read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/messages"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/messages/task", id],
      });
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
      toast({ title: "Message deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting message",
        description: error.message || "Failed to delete message",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when viewing the task
  useEffect(() => {
    if (id && messages.length > 0) {
      const hasUnreadMessages = messages.some(
        (msg) => !msg.read && msg.senderId !== user?.id
      );
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
      if (updatedTask.requestId) {
        queryClient.invalidateQueries({ queryKey: ["/api/messages/request", updatedTask.requestId] });
      }
      toast({ title: "Status updated successfully" });
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

      // Auto-update status to in_progress if currently not_started
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

      // Update task status if specified
      if (newStatus) {
        const payload: any = { status: newStatus };
        if (newStatus === "completed") {
          payload.actualCompletionDate = new Date().toISOString();
        }
        await apiRequest("PATCH", `/api/tasks/${id}`, payload);

        // Create a task note if hold reason was provided
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
      toast({
        title: "Inventory Item Created",
        description: "The item has been added to inventory and selected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create inventory item",
        variant: "destructive",
      });
    },
  });

  const addPartMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInventoryItemId) {
        throw new Error("Please select an inventory item");
      }

      const selectedItem = inventoryItems?.find(item => item.id === selectedInventoryItemId);
      if (!selectedItem) {
        throw new Error("Inventory item not found");
      }

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
      toast({
        title: "Part Added",
        description: "The part has been added to the task.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add part",
        variant: "destructive",
      });
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
      toast({ title: "Note deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete note",
        variant: "destructive",
      });
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
      toast({ title: "File uploaded successfully" });
    },
    onError: (error: any) => {
      console.error("Error saving upload:", error);
      toast({
        title: "Upload failed",
        description: "File uploaded but couldn't be saved to database",
        variant: "destructive",
      });
    },
  });

  const deleteUploadMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      return await apiRequest("DELETE", `/api/uploads/${uploadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", id] });
      toast({ title: "Attachment deleted successfully" });
    },
    onError: (error: any) => {
      console.error("Error deleting upload:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete attachment",
        variant: "destructive",
      });
    },
  });


  const getUploadParameters = async () => {
    try {
      const response = await fetch("/api/objects/upload", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error("Error getting upload URL:", error);
      throw error;
    }
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

  const removePendingUpload = (index: number) => {
    setPendingUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted successfully" });
      navigate("/tasks");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading task details...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <div className="text-center">Task not found</div>
      </div>
    );
  }

  const isMaintenanceOrAdmin = user?.role === "admin" || user?.role === "maintenance";
  const assignedUser = users.find(u => u.id === task.assignedToId);

  const totalHours = timeEntries.reduce((sum, entry) => {
    return sum + (entry.durationMinutes || 0);
  }, 0) / 60;

  const totalCost = parts.reduce((sum, part) => sum + (part.cost || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/tasks")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold" data-testid="text-task-name">{task.name}</h1>
          {task.requestId && (
            <Link href={`/requests/${task.requestId}`}>
              <span className="text-sm text-primary hover:underline cursor-pointer flex items-center gap-1" data-testid="link-original-request">
                <ExternalLink className="w-3 h-3" />
                View Original Request
              </span>
            </Link>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="outline" className={urgencyColors[task.urgency]} data-testid="badge-urgency">
            {task.urgency}
          </Badge>
          <Badge variant="outline" className={statusColors[task.status]} data-testid="badge-status">
            {task.status.replace("_", " ")}
          </Badge>
          {isMaintenanceOrAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/tasks/${id}/edit`)}
                data-testid="button-edit-task"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    data-testid="button-delete-task"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Task</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this task? This action cannot be undone and will remove all associated data including time entries, parts, and notes.
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
            </>
          )}
        </div>
      </div>

      {requester && (
        <Card>
          <CardHeader>
            <CardTitle>Requestor Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-1 text-sm text-muted-foreground">Name</h3>
                <p className="text-base" data-testid="text-requester-name">
                  {requester.firstName} {requester.lastName}
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-1 text-sm text-muted-foreground">Email</h3>
                <p className="text-base" data-testid="text-requester-email">
                  {requester.email || "Not provided"}
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-1 text-sm text-muted-foreground">Phone Number</h3>
                <p className="text-base" data-testid="text-requester-phone">
                  {requester.phoneNumber || "Not provided"}
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-1 text-sm text-muted-foreground">Username</h3>
                <p className="text-base" data-testid="text-requester-username">
                  {requester.username}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="mt-1" data-testid="text-description">{task.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Task Type</p>
                <p className="mt-1 capitalize" data-testid="text-task-type">{task.taskType.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assigned To</p>
                <p className="mt-1" data-testid="text-assigned-to">
                  {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="mt-1" data-testid="text-start-date">
                  {new Date(task.initialDate).toLocaleDateString()}
                </p>
              </div>
              {task.estimatedCompletionDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Est. Completion</p>
                  <p className="mt-1" data-testid="text-est-completion">
                    {new Date(task.estimatedCompletionDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {task.propertyId && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Property</p>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  {property ? (
                    <span
                      className="cursor-pointer hover:underline text-primary"
                      onClick={() => navigate(`/properties/${property.id}`)}
                      data-testid="text-property-name"
                    >
                      {property.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Loading...</span>
                  )}
                </div>
              </div>
            )}

            {task.equipmentId && (
              <div className={task.propertyId ? "pt-4" : "pt-4 border-t"}>
                <p className="text-sm text-muted-foreground mb-2">Equipment</p>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  {equipment ? (
                    <span data-testid="text-equipment-name">{equipment.name}</span>
                  ) : (
                    <span className="text-muted-foreground">Loading...</span>
                  )}
                </div>
              </div>
            )}
            
            {isMaintenanceOrAdmin && (
              <div>
                <Label>Update Status</Label>
                <Select
                  value={task.status}
                  onValueChange={(value) => updateStatusMutation.mutate(value)}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger data-testid="select-status">
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            {task.contactType === "requester" && requester ? (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="font-medium mb-1 text-sm text-muted-foreground">Name</h3>
                  <p className="text-base" data-testid="text-contact-name">
                    {requester.firstName} {requester.lastName}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1 text-sm text-muted-foreground">Email</h3>
                  <p className="text-base" data-testid="text-contact-email">
                    {requester.email || "Not provided"}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1 text-sm text-muted-foreground">Phone Number</h3>
                  <p className="text-base" data-testid="text-contact-phone">
                    {requester.phoneNumber || "Not provided"}
                  </p>
                </div>
              </div>
            ) : task.contactType === "staff" && contactStaff ? (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="font-medium mb-1 text-sm text-muted-foreground">Name</h3>
                  <p className="text-base" data-testid="text-contact-name">
                    {contactStaff.firstName} {contactStaff.lastName}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1 text-sm text-muted-foreground">Email</h3>
                  <p className="text-base" data-testid="text-contact-email">
                    {contactStaff.email || "Not provided"}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1 text-sm text-muted-foreground">Phone Number</h3>
                  <p className="text-base" data-testid="text-contact-phone">
                    {contactStaff.phoneNumber || "Not provided"}
                  </p>
                </div>
              </div>
            ) : task.contactType === "staff" && task.contactStaffId ? (
              <p className="text-muted-foreground text-center py-4">Loading contact information...</p>
            ) : task.contactType === "other" && (task.contactName || task.contactEmail || task.contactPhone) ? (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="font-medium mb-1 text-sm text-muted-foreground">Name</h3>
                  <p className="text-base" data-testid="text-contact-name">
                    {task.contactName || "Not provided"}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1 text-sm text-muted-foreground">Email</h3>
                  <p className="text-base" data-testid="text-contact-email">
                    {task.contactEmail || "Not provided"}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1 text-sm text-muted-foreground">Phone Number</h3>
                  <p className="text-base" data-testid="text-contact-phone">
                    {task.contactPhone || "Not provided"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No contact information available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {isMaintenanceOrAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Time Tracking
              </CardTitle>
              {!activeTimer ? (
                <Button
                  onClick={() => startTimerMutation.mutate()}
                  disabled={startTimerMutation.isPending}
                  data-testid="button-start-timer"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Timer
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => setIsStopTimerDialogOpen(true)}
                  disabled={stopTimerMutation.isPending}
                  data-testid="button-stop-timer"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Timer
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {timeEntries.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No time entries yet</p>
            ) : (
              <div className="space-y-2">
                {timeEntries.map((entry) => {
                  const user = users.find(u => u.id === entry.userId);
                  return (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{user?.firstName} {user?.lastName}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.startTime).toLocaleString()}
                        </span>
                        {entry.durationMinutes && (
                          <Badge variant="secondary">{(entry.durationMinutes / 60).toFixed(1)}h</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isMaintenanceOrAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Parts Used
              </CardTitle>
              <Dialog open={isAddPartDialogOpen} onOpenChange={setIsAddPartDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-part">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Part
                  </Button>
                </DialogTrigger>

                {/* Quick Add Inventory Dialog */}
                <Dialog open={isQuickAddInventoryOpen} onOpenChange={setIsQuickAddInventoryOpen}>
                  <DialogContent data-testid="dialog-quick-add-inventory">
                    <DialogHeader>
                      <DialogTitle>Create New Inventory Item</DialogTitle>
                      <DialogDescription>
                        Add a new item to inventory that will be immediately available
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="quick-item-name">Item Name</Label>
                        <Input
                          id="quick-item-name"
                          placeholder="e.g., PVC Pipe, Light Bulbs"
                          value={quickInventoryName}
                          onChange={(e) => setQuickInventoryName(e.target.value)}
                          data-testid="input-quick-item-name"
                        />
                      </div>
                      <div className="space-2">
                        <Label htmlFor="quick-item-quantity">Quantity</Label>
                        <Input
                          id="quick-item-quantity"
                          type="number"
                          min="1"
                          value={quickInventoryQuantity}
                          onChange={(e) => setQuickInventoryQuantity(parseInt(e.target.value) || 0)}
                          data-testid="input-quick-item-quantity"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quick-item-unit">Unit (Optional)</Label>
                        <Input
                          id="quick-item-unit"
                          placeholder="e.g., pcs, boxes"
                          value={quickInventoryUnit}
                          onChange={(e) => setQuickInventoryUnit(e.target.value)}
                          data-testid="input-quick-item-unit"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsQuickAddInventoryOpen(false);
                          setQuickInventoryName("");
                          setQuickInventoryQuantity(0);
                          setQuickInventoryUnit("");
                        }}
                        data-testid="button-cancel-quick-add"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => quickAddInventoryMutation.mutate()}
                        disabled={quickAddInventoryMutation.isPending || !quickInventoryName || quickInventoryQuantity <= 0}
                        data-testid="button-submit-quick-add"
                      >
                        {quickAddInventoryMutation.isPending ? "Creating..." : "Create & Select"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <DialogContent data-testid="dialog-add-part">
                  <DialogHeader>
                    <DialogTitle>Add Part to Task</DialogTitle>
                    <DialogDescription>
                      Select an inventory item to add to this task
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Inventory Item</Label>
                      <Select value={selectedInventoryItemId} onValueChange={(value) => {
                        if (value === "__new_item__") {
                          setIsQuickAddInventoryOpen(true);
                        } else {
                          setSelectedInventoryItemId(value);
                        }
                      }}>
                        <SelectTrigger data-testid="select-inventory-item">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__new_item__" className="font-semibold text-primary">
                            + New Item
                          </SelectItem>
                          {inventoryItems?.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} (Available: {item.quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        data-testid="textarea-part-notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddPartDialogOpen(false);
                        setSelectedInventoryItemId("");
                        setPartNotes("");
                        setPartQuantity("");
                      }}
                      data-testid="button-cancel-add-part"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => addPartMutation.mutate()}
                      disabled={!selectedInventoryItemId || !partQuantity || addPartMutation.isPending}
                      data-testid="button-submit-part"
                    >
                      {addPartMutation.isPending ? "Adding..." : "Add Part"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {parts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No parts used yet</p>
            ) : (
              <div className="space-y-2">
                {parts.map((part) => (
                  <div key={part.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div>
                      <p className="font-medium">{part.partName}</p>
                      {part.notes && <p className="text-sm text-muted-foreground">{part.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Qty: {part.quantity}</p>
                      <p className="text-sm text-muted-foreground">${part.cost.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stop Timer Dialog */}
      <Dialog open={isStopTimerDialogOpen} onOpenChange={setIsStopTimerDialogOpen}>
        <DialogContent data-testid="dialog-stop-timer">
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
            <DialogDescription>
              What would you like to do with this task?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setIsStopTimerDialogOpen(false);
                setIsHoldReasonDialogOpen(true);
              }}
              data-testid="button-hold-task"
            >
              Hold Task
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                if (activeTimer) {
                  stopTimerMutation.mutate({ timerId: activeTimer, newStatus: "completed" });
                }
              }}
              disabled={stopTimerMutation.isPending}
              data-testid="button-complete-task"
            >
              {stopTimerMutation.isPending ? "Completing..." : "Task Completed"}
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
              data-testid="button-stop-only"
            >
              Just Stop Timer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hold Reason Dialog */}
      <Dialog open={isHoldReasonDialogOpen} onOpenChange={setIsHoldReasonDialogOpen}>
        <DialogContent data-testid="dialog-hold-reason">
          <DialogHeader>
            <DialogTitle>Hold Task</DialogTitle>
            <DialogDescription>
              Please provide a reason for putting this task on hold
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter reason for holding the task..."
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              rows={4}
              data-testid="textarea-hold-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsHoldReasonDialogOpen(false);
                setHoldReason("");
              }}
              data-testid="button-cancel-hold"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (activeTimer) {
                  stopTimerMutation.mutate({
                    timerId: activeTimer,
                    newStatus: "on_hold",
                    onHoldReason: holdReason
                  });
                }
              }}
              disabled={!holdReason.trim() || stopTimerMutation.isPending}
              data-testid="button-submit-hold"
            >
              {stopTimerMutation.isPending ? "Holding..." : "Hold Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload photos or documents related to this task
            </p>

            {uploads.length > 0 && (
              <div className="grid gap-2 mb-4">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <a
                      href={upload.objectPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                      data-testid={`link-attachment-${upload.id}`}
                    >
                      <Paperclip className="w-4 h-4" />
                      <span className="text-sm">{upload.fileName}</span>
                    </a>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-delete-attachment-${upload.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this attachment? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUploadMutation.mutate(upload.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

            {pendingUploads.length > 0 && (
              <div className="space-y-3 mb-4 border-t pt-4">
                <div className="grid gap-2">
                  {pendingUploads.map((upload, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded border"
                    >
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{upload.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePendingUpload(index)}
                        data-testid={`button-remove-pending-upload-${index}`}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
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
                  className="w-full"
                  data-testid="button-save-attachments"
                >
                  {addUploadMutation.isPending ? "Saving..." : "Save Attachments"}
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
                  console.error("Upload error:", error);
                  toast({
                    title: "Upload failed",
                    description: error.message,
                    variant: "destructive"
                  });
                }}
                buttonClassName="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Browse
              </ObjectUploader>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Task Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notes.map((note) => {
              const noteUser = users.find(u => u.id === note.userId);
              const canDelete = user?.role === "admin" || note.userId === user?.id;
              return (
                <div key={note.id} className="p-3 bg-muted rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {noteUser?.firstName} {noteUser?.lastName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {note.noteType === "job_note" ? "Job Note" : "Recommendation"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
                      </span>
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              data-testid={`button-delete-note-${note.id}`}
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Note</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this note? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteNoteMutation.mutate(note.id)}
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
                  <p className="text-sm">{note.content}</p>
                </div>
              );
            })}
            {isMaintenanceOrAdmin && (
              <Dialog open={isAddNoteDialogOpen} onOpenChange={setIsAddNoteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" data-testid="button-add-note">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Note
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-add-note">
                  <DialogHeader>
                    <DialogTitle>Add Task Note</DialogTitle>
                    <DialogDescription>
                      Choose the type of note and add your content
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Note Type</Label>
                      <Select value={noteType} onValueChange={(value: "job_note" | "recommendation") => setNoteType(value)}>
                        <SelectTrigger data-testid="select-note-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="job_note">Job Note</SelectItem>
                          <SelectItem value="recommendation">Recommendation</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {noteType === "job_note"
                          ? "Document work performed, parts used, or issues encountered"
                          : "Provide suggestions for future maintenance or improvements"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Note Content</Label>
                      <Textarea
                        placeholder={noteType === "job_note"
                          ? "Describe the work performed..."
                          : "Provide your recommendation..."}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={6}
                        data-testid="textarea-new-note"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddNoteDialogOpen(false);
                        setNewNote("");
                        setNoteType("job_note");
                      }}
                      data-testid="button-cancel-add-note"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => addNoteMutation.mutate({ content: newNote, noteType })}
                      disabled={!newNote.trim() || addNoteMutation.isPending}
                      data-testid="button-submit-note"
                    >
                      {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {(user?.role === "admin" || user?.role === "maintenance") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.senderId === user?.id;
                  const sender = users.find(u => u.id === message.senderId);
                  const senderName = isOwn
                    ? "You"
                    : sender
                      ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.username
                      : "Unknown User";

                  return (
                    <div
                      key={message.id}
                      className={`flex flex-col ${isOwn ? "items-end" : "items-start"} group`}
                    >
                      <span className="text-xs font-medium text-muted-foreground mb-1">
                        {senderName}
                      </span>
                      <div className={`flex items-start gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            isOwn
                              ? "bg-[#1E90FF] text-white rounded-tr-sm"
                              : "bg-gray-200 text-gray-900 rounded-tl-sm"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        {user?.role === "admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this message?")) {
                                deleteMessageMutation.mutate(message.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {message.createdAt &&
                          new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="resize-none"
                rows={2}
                data-testid="textarea-new-message"
              />
              <Button
                onClick={() => sendMessageMutation.mutate(newMessage)}
                disabled={
                  !newMessage.trim() || sendMessageMutation.isPending
                }
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}