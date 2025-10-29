import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  MessageSquare,
  Paperclip,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type {
  ServiceRequest,
  Message,
  Upload,
  Area,
  Subdivision,
  User as UserType,
  Task,
} from "@shared/schema";

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [pendingUploads, setPendingUploads] = useState<
    { name: string; url: string; type: string }[]
  >([]);

  const { data: request, isLoading } = useQuery<ServiceRequest>({
    queryKey: ["/api/service-requests", id],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages/request", id],
    enabled: !!id,
  });

  const { data: uploads = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/request", id],
    enabled: !!id,
  });

  // Fetch linked task if request has been converted
  const { data: linkedTask } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: request?.status === "converted_to_task",
    select: (tasks: any[]) => tasks.find((t: any) => t.requestId === id),
  });

  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });

  const { data: subdivisions = [] } = useQuery<Subdivision[]>({
    queryKey: ["/api/subdivisions"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/messages", { requestId: id, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/request", id] });
      setNewMessage("");
      toast({ title: "Message sent" });
    },
  });

  const addUploadMutation = useMutation({
    mutationFn: async ({ fileName, fileType, objectUrl }: { fileName: string, fileType: string, objectUrl: string }) => {
      const response = await apiRequest("PUT", "/api/uploads", {
        requestId: id,
        fileName,
        fileType,
        objectUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/request", id] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/request", id] });
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

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!request) {
    return <div className="p-8">Request not found</div>;
  }

  const requester = users.find(u => u.id === request.requesterId);
  const area = areas.find(a => a.id === request.areaId);
  const subdivision = subdivisions.find(s => s.id === request.subdivisionId);

  const canConvertToTask = (user?.role === "admin" || user?.role === "maintenance") &&
    (request.status === "submitted" || request.status === "under_review" || request.status === "pending");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-500";
      case "under_review":
        return "bg-yellow-500";
      case "converted_to_task":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "low":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "high":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/requests")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-request-title">{request.title}</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-request-id">Request #{request.id}</p>
        </div>
        <Badge className={getStatusColor(request.status)} data-testid="badge-status">
          {request.status.replace("_", " ").toUpperCase()}
        </Badge>
        {linkedTask && (
          <Badge 
            variant="outline" 
            className={
              linkedTask.status === "completed" 
                ? "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20"
                : linkedTask.status === "in_progress"
                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                : linkedTask.status === "on_hold"
                ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20"
                : "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20"
            }
            data-testid="badge-task-status"
          >
            Task: {linkedTask.status.replace("_", " ").toUpperCase()}
          </Badge>
        )}
        <Badge className={getUrgencyColor(request.urgency)} data-testid="badge-urgency">
          {request.urgency.toUpperCase()}
        </Badge>
        {canConvertToTask && (
          <Link href={`/tasks/new?requestId=${id}`}>
            <Button data-testid="button-convert-to-task">
              Convert to Task
            </Button>
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground" data-testid="text-description">{request.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {area && (
                  <div>
                    <h3 className="font-medium mb-2">Area</h3>
                    <p className="text-muted-foreground" data-testid="text-area">{area.name}</p>
                  </div>
                )}

                {subdivision && (
                  <div>
                    <h3 className="font-medium mb-2">Subdivision</h3>
                    <p className="text-muted-foreground" data-testid="text-subdivision">{subdivision.name}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-medium mb-2">Created</h3>
                  <p className="text-muted-foreground" data-testid="text-created-at">
                    {new Date(request.createdAt!).toLocaleString()}
                  </p>
                </div>
              </div>

              {request.status === "rejected" && request.rejectionReason && (
                <div>
                  <h3 className="font-medium mb-2 text-destructive">Rejection Reason</h3>
                  <p className="text-muted-foreground" data-testid="text-rejection-reason">
                    {request.rejectionReason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {requester && (
            <Card>
              <CardHeader>
                <CardTitle>Requester Contact Information</CardTitle>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload photos or documents related to this request
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
                <MessageSquare className="h-5 w-5" />
                Messages ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {messages.map((message) => {
                      const sender = users.find(u => u.id === message.userId);
                      return (
                        <div
                          key={message.id}
                          className="border rounded-lg p-3"
                          data-testid={`message-${message.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm" data-testid={`text-sender-${message.id}`}>
                              {sender ? `${sender.firstName} ${sender.lastName}` : "Unknown User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.createdAt!).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm" data-testid={`text-content-${message.id}`}>
                            {message.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                    data-testid="textarea-message"
                  />
                  <Button
                    onClick={() => {
                      if (newMessage.trim()) {
                        sendMessageMutation.mutate(newMessage);
                      }
                    }}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}