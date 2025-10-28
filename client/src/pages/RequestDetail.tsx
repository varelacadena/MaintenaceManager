import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Clock,
  User,
  MessageSquare,
  Paperclip,
  Plus,
  Play,
  Square,
  Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type {
  ServiceRequest,
  TimeEntry,
  PartUsed,
  Message,
  Upload,
  TaskNote,
  User as UserType,
} from "@shared/schema";

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newPart, setNewPart] = useState({ name: "", cost: "", quantity: "" });
  const [activeTimer, setActiveTimer] = useState<string | null>(null);

  const { data: request, isLoading } = useQuery<ServiceRequest>({
    queryKey: ["/api/service-requests", id],
  });

  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries/request", id],
    enabled: !!id,
  });

  const { data: parts = [] } = useQuery<PartUsed[]>({
    queryKey: ["/api/parts/request", id],
    enabled: !!id,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages/request", id],
    enabled: !!id,
  });

  const { data: uploads = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/request", id],
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery<TaskNote[]>({
    queryKey: ["/api/task-notes/request", id],
    enabled: !!id,
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin",
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, onHoldReason }: { status: string; onHoldReason?: string }) => {
      return await apiRequest(`/api/service-requests/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, onHoldReason }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      toast({ title: "Status updated successfully" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (assignedToId: string) => {
      return await apiRequest(`/api/service-requests/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assignedToId }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests", id] });
      toast({ title: "Task assigned successfully" });
    },
  });

  const startTimerMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/time-entries", {
        method: "POST",
        body: JSON.stringify({ requestId: id, startTime: new Date() }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (data: TimeEntry) => {
      setActiveTimer(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/request", id] });
      toast({ title: "Timer started" });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (timerId: string) => {
      const entry = timeEntries.find((e) => e.id === timerId);
      if (!entry?.startTime) return;
      
      const endTime = new Date();
      const durationMinutes = Math.floor(
        (endTime.getTime() - new Date(entry.startTime).getTime()) / 60000
      );
      
      return await apiRequest(`/api/time-entries/${timerId}`, {
        method: "PATCH",
        body: JSON.stringify({ endTime, durationMinutes }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      setActiveTimer(null);
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/request", id] });
      toast({ title: "Timer stopped" });
    },
  });

  const addPartMutation = useMutation({
    mutationFn: async (part: { requestId: string; partName: string; cost: number; quantity: number }) => {
      return await apiRequest("/api/parts", {
        method: "POST",
        body: JSON.stringify(part),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts/request", id] });
      setNewPart({ name: "", cost: "", quantity: "" });
      toast({ title: "Part added successfully" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("/api/messages", {
        method: "POST",
        body: JSON.stringify({ requestId: id, content }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/request", id] });
      setNewMessage("");
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      return await apiRequest("/api/task-notes", {
        method: "POST",
        body: JSON.stringify({ requestId: id, note }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/request", id] });
      setNewNote("");
      toast({ title: "Note added successfully" });
    },
  });

  const handleFileUpload = async (result: any) => {
    if (result.successful?.length > 0) {
      const file = result.successful[0];
      
      try {
        await apiRequest("/api/uploads", {
          method: "PUT",
          body: JSON.stringify({
            requestId: id,
            objectUrl: file.uploadURL,
            fileName: file.name,
            fileType: file.type,
          }),
          headers: { "Content-Type": "application/json" },
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/uploads/request", id] });
        toast({ title: "File uploaded successfully" });
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Failed to save file metadata",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading || !request) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading request...</p>
        </div>
      </div>
    );
  }

  const totalTime = timeEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);
  const totalCost = parts.reduce((sum, part) => sum + part.cost * part.quantity, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "in_progress": return "bg-blue-500";
      case "completed": return "bg-green-500";
      case "on_hold": return "bg-orange-500";
      default: return "bg-muted";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "bg-destructive text-destructive-foreground";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-blue-500 text-white";
      default: return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/requests")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold" data-testid="text-request-title">{request.title}</h1>
          <p className="text-muted-foreground">Request #{request.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${getStatusColor(request.status)} text-white no-default-hover-elevate`}>
            {request.status.replace("_", " ").toUpperCase()}
          </Badge>
          <Badge className={`${getUrgencyColor(request.urgency)} no-default-hover-elevate`}>
            {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1">{request.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="mt-1">{request.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="mt-1">{request.location || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(user?.role === "maintenance" || user?.role === "admin") && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time Tracking
                  </CardTitle>
                  {!activeTimer ? (
                    <Button
                      size="sm"
                      onClick={() => startTimerMutation.mutate()}
                      disabled={startTimerMutation.isPending}
                      data-testid="button-start-timer"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Timer
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => stopTimerMutation.mutate(activeTimer)}
                      disabled={stopTimerMutation.isPending}
                      data-testid="button-stop-timer"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop Timer
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold mb-4">
                    {Math.floor(totalTime / 60)}h {totalTime % 60}m
                  </div>
                  {timeEntries.length > 0 && (
                    <div className="space-y-2">
                      {timeEntries.map((entry) => (
                        <div key={entry.id} className="text-sm text-muted-foreground">
                          {entry.startTime && new Date(entry.startTime).toLocaleString()} -{" "}
                          {entry.durationMinutes || 0} minutes
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Parts Used
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-2xl font-semibold">${totalCost.toFixed(2)}</div>
                  <div className="space-y-2">
                    {parts.map((part) => (
                      <div key={part.id} className="flex items-center justify-between p-2 border rounded">
                        <span>{part.partName}</span>
                        <span className="text-muted-foreground">
                          {part.quantity}x ${part.cost.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Part name"
                      value={newPart.name}
                      onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                      data-testid="input-part-name"
                    />
                    <Input
                      type="number"
                      placeholder="Cost"
                      value={newPart.cost}
                      onChange={(e) => setNewPart({ ...newPart, cost: e.target.value })}
                      data-testid="input-part-cost"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={newPart.quantity}
                      onChange={(e) => setNewPart({ ...newPart, quantity: e.target.value })}
                      data-testid="input-part-quantity"
                    />
                  </div>
                  <Button
                    onClick={() =>
                      addPartMutation.mutate({
                        requestId: id!,
                        partName: newPart.name,
                        cost: parseFloat(newPart.cost),
                        quantity: parseInt(newPart.quantity),
                      })
                    }
                    disabled={!newPart.name || !newPart.cost || !newPart.quantity}
                    className="w-full"
                    data-testid="button-add-part"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Part
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Attachments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {uploads.map((upload) => (
                    <div key={upload.id} className="flex items-center gap-2 p-2 border rounded">
                      <Paperclip className="w-4 h-4" />
                      <a
                        href={`/objects/${upload.objectPath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 truncate hover:underline"
                      >
                        {upload.fileName}
                      </a>
                    </div>
                  ))}
                  <ObjectUploader
                    onGetUploadParameters={async () => {
                      const response = await fetch("/api/objects/upload", { method: "POST" });
                      const data = await response.json();
                      return { method: "PUT" as const, url: data.uploadURL };
                    }}
                    onComplete={handleFileUpload}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Upload File
                  </ObjectUploader>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">
                        {message.createdAt && new Date(message.createdAt).toLocaleString()}
                      </div>
                      <p className="mt-1">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Write a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  data-testid="textarea-message"
                />
                <Button
                  onClick={() => sendMessageMutation.mutate(newMessage)}
                  disabled={!newMessage || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {user?.role === "admin" && (
            <Card>
              <CardHeader>
                <CardTitle>Assignment</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={request.assignedToId || ""}
                  onValueChange={(value) => assignMutation.mutate(value)}
                >
                  <SelectTrigger data-testid="select-assign">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u) => u.role === "maintenance" || u.role === "admin")
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {(user?.role === "maintenance" || user?.role === "admin") && (
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={request.status}
                  onValueChange={(status) => updateStatusMutation.mutate({ status })}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {(user?.role === "maintenance" || user?.role === "admin") && (
            <Card>
              <CardHeader>
                <CardTitle>Task Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 border rounded bg-muted/50">
                    <p className="text-sm">{note.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {note.createdAt && new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  data-testid="textarea-note"
                />
                <Button
                  onClick={() => addNoteMutation.mutate(newNote)}
                  disabled={!newNote || addNoteMutation.isPending}
                  className="w-full"
                  data-testid="button-add-note"
                >
                  Add Note
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
