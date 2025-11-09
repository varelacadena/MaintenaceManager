
import { useState, useEffect } from "react";
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
    refetchInterval: 5000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest("POST", `/api/messages/request/${requestId}/mark-read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/messages"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/messages/request", id],
      });
    },
  });

  const { data: uploads = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/request", id],
    enabled: !!id,
  });

  const { data: linkedTask } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: request?.status === "converted_to_task",
    select: (tasks: any[]) => tasks.find((t: any) => t.requestId === id),
  });

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

  const isMaintenanceOrAdmin = user?.role === "admin" || user?.role === "maintenance";
  const canConvertToTask = isMaintenanceOrAdmin &&
    (request.status === "pending" || request.status === "under_review");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
      case "under_review":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20";
      case "converted_to_task":
        return "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "low":
        return "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20";
      case "high":
        return "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20";
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b px-6 py-4">
        <div className="flex items-center gap-4 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/requests")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-request-title">
            {request.title}
          </h1>
        </div>
        <div className="flex items-center justify-between ml-14">
          <p className="text-sm text-muted-foreground" data-testid="text-request-id">
            Request #{request.id}
          </p>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={getStatusColor(request.status)} 
              data-testid="badge-status"
            >
              {request.status === 'converted_to_task' ? 'CONVERTED TO TASK' : 
               request.status === 'under_review' ? 'UNDER REVIEW' : 
               request.status === 'pending' ? 'PENDING' :
               request.status === 'rejected' ? 'REJECTED' :
               request.status.toUpperCase()}
            </Badge>
            <Badge 
              variant="outline" 
              className={getUrgencyColor(request.urgency)} 
              data-testid="badge-urgency"
            >
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 max-w-6xl mx-auto">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                <p className="text-base text-gray-900 dark:text-gray-100" data-testid="text-description">
                  {request.description}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Created</h3>
                <p className="text-base text-gray-900 dark:text-gray-100" data-testid="text-created-at">
                  {new Date(request.createdAt!).toLocaleString()}
                </p>
              </div>

              {(area || subdivision) && (
                <div className="grid grid-cols-2 gap-4">
                  {area && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Area</h3>
                      <p className="text-base text-gray-900 dark:text-gray-100" data-testid="text-area">
                        {area.name}
                      </p>
                    </div>
                  )}

                  {subdivision && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Subdivision</h3>
                      <p className="text-base text-gray-900 dark:text-gray-100" data-testid="text-subdivision">
                        {subdivision.name}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {request.status === "rejected" && request.rejectionReason && (
                <div>
                  <h3 className="text-sm font-medium text-destructive mb-2">Rejection Reason</h3>
                  <p className="text-base text-gray-900 dark:text-gray-100" data-testid="text-rejection-reason">
                    {request.rejectionReason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requester Contact Information Card */}
          {requester && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Requester Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Name</h3>
                    <p className="text-base text-gray-900 dark:text-gray-100" data-testid="text-requester-name">
                      {requester.firstName} {requester.lastName}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Email</h3>
                    <p className="text-base text-gray-900 dark:text-gray-100" data-testid="text-requester-email">
                      {requester.email || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Phone Number</h3>
                    <p className="text-base text-gray-900 dark:text-gray-100" data-testid="text-requester-phone">
                      {requester.phoneNumber || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Username</h3>
                    <p className="text-base text-gray-900 dark:text-gray-100" data-testid="text-requester-username">
                      {requester.username}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attachments Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
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
                        className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-800"
                      >
                        <a
                          href={upload.objectPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 hover:text-primary"
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
                          className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-800"
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

                <div className="border-2 border-dashed rounded-lg p-8 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
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

          {/* Messages Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <MessageSquare className="h-5 w-5" />
                Messages ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.length > 0 ? (
                  <div className="space-y-4 mb-4">
                    {messages.map((message) => {
                      const isOwn = message.senderId === user?.id;
                      const sender = users.find(u => u.id === message.senderId);

                      let senderName = "Unknown User";
                      if (isOwn) {
                        senderName = "You";
                      } else if (sender) {
                        const fullName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim();
                        senderName = fullName || sender.username;
                      } else {
                        senderName = user?.role === "staff" ? "Maintenance Team" : "Unknown User";
                      }

                      return (
                        <div
                          key={message.id}
                          className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                          data-testid={`message-${message.id}`}
                        >
                          <span className="text-xs font-medium text-muted-foreground mb-1" data-testid={`text-sender-${message.id}`}>
                            {senderName}
                          </span>
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                              isOwn
                                ? "bg-[#1E90FF] text-white rounded-tr-sm"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-sm"
                            }`}
                          >
                            <p className="text-sm" data-testid={`text-content-${message.id}`}>{message.content}</p>
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
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    No messages yet. Start the conversation!
                  </div>
                )}

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 resize-none"
                    rows={2}
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
