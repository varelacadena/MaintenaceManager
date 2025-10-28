import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@shared/schema";

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
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [showAddPart, setShowAddPart] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState("");
  const [partQuantity, setPartQuantity] = useState("");
  const [partNotes, setPartNotes] = useState("");
  const [pendingUploads, setPendingUploads] = useState<
    { name: string; url: string; type: string }[]
  >([]);

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

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: uploads = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/task", id],
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return await apiRequest("PATCH", `/api/tasks/${id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
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
    onSuccess: (data: TimeEntry) => {
      setActiveTimer(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/task", id] });
      toast({ title: "Timer started" });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (timerId: string) => {
      const entry = timeEntries.find((e) => e.id === timerId);
      if (!entry?.startTime) return;

      const endTime = new Date();
      const durationMinutes = Math.floor(
        (endTime.getTime() - new Date(entry.startTime).getTime()) / (1000 * 60)
      );

      return await apiRequest("PATCH", `/api/time-entries/${timerId}`, {
        endTime: endTime.toISOString(),
        durationMinutes,
      });
    },
    onSuccess: () => {
      setActiveTimer(null);
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/task", id] });
      toast({ title: "Timer stopped" });
    },
  });

  const addPartMutation = useMutation({
    mutationFn: async () => {
      const inventoryItem = inventory.find(item => item.id === selectedInventoryItem);
      if (!inventoryItem) {
        throw new Error("Inventory item not found");
      }

      const quantity = parseInt(partQuantity);
      const cost = inventoryItem.cost ? parseFloat(inventoryItem.cost) * quantity : 0;

      return await apiRequest("POST", "/api/parts", {
        taskId: id,
        inventoryItemId: selectedInventoryItem,
        partName: inventoryItem.name,
        quantity,
        cost,
        notes: partNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts/task", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setShowAddPart(false);
      setSelectedInventoryItem("");
      setPartQuantity("");
      setPartNotes("");
      toast({ title: "Part added successfully" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/task-notes", { taskId: id, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", id] });
      setNewNote("");
      toast({ title: "Note added" });
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
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Total Hours</span>
              </div>
              <span className="font-semibold" data-testid="text-total-hours">
                {totalHours.toFixed(1)}h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Parts Cost</span>
              </div>
              <span className="font-semibold" data-testid="text-total-cost">
                ${totalCost.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Notes</span>
              </div>
              <span className="font-semibold">{notes.length}</span>
            </div>
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
                  onClick={() => stopTimerMutation.mutate(activeTimer)}
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
              <Dialog open={showAddPart} onOpenChange={setShowAddPart}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-part">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Part
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Part to Task</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Inventory Item</Label>
                      <Select value={selectedInventoryItem} onValueChange={setSelectedInventoryItem}>
                        <SelectTrigger data-testid="select-inventory-item">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} (Available: {item.quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={partQuantity}
                        onChange={(e) => setPartQuantity(e.target.value)}
                        placeholder="Enter quantity"
                        data-testid="input-part-quantity"
                      />
                    </div>
                    <div>
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={partNotes}
                        onChange={(e) => setPartNotes(e.target.value)}
                        placeholder="Additional notes"
                        data-testid="textarea-part-notes"
                      />
                    </div>
                    <Button
                      onClick={() => addPartMutation.mutate()}
                      disabled={!selectedInventoryItem || !partQuantity || addPartMutation.isPending}
                      className="w-full"
                      data-testid="button-submit-part"
                    >
                      Add Part
                    </Button>
                  </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Attachments (Optional)
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
                  <a
                    key={upload.id}
                    href={upload.objectPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded hover-elevate active-elevate-2 border"
                    data-testid={`link-attachment-${upload.id}`}
                  >
                    <Paperclip className="w-4 h-4" />
                    <span className="text-sm">{upload.fileName}</span>
                  </a>
                ))}
              </div>
            )}

            {pendingUploads.length > 0 && (
              <div className="grid gap-2 mb-4 border-t pt-4">
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
              return (
                <div key={note.id} className="p-3 bg-muted rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {noteUser?.firstName} {noteUser?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                  <p className="text-sm">{note.content}</p>
                </div>
              );
            })}
            {isMaintenanceOrAdmin && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  data-testid="textarea-new-note"
                />
                <Button
                  onClick={() => addNoteMutation.mutate(newNote)}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                  data-testid="button-add-note"
                >
                  Add Note
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}