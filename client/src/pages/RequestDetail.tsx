
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
  User,
  Mail,
  Phone,
  Calendar,
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
  const [rejectionReason, setRejectionReason] = useState("");
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

  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest("PATCH", `/api/service-requests/${requestId}/status`, {
        status: "under_review",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests", id] });
      toast({ title: "Request approved and moved to under review" });
    },
    onError: () => {
      toast({ title: "Failed to approve request", variant: "destructive" });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      await apiRequest("PATCH", `/api/service-requests/${requestId}/status`, {
        status: "rejected",
        rejectionReason: reason,
      });

      await apiRequest("POST", "/api/messages", {
        requestId,
        content: `Your service request "${request?.title}" has been rejected.\n\nReason: ${reason}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests", id] });
      toast({ title: "Request rejected and requester notified" });
      navigate("/requests");
    },
    onError: () => {
      toast({ title: "Failed to reject request", variant: "destructive" });
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
    <div className="flex flex-col h-full bg-muted/30">
      <div className="bg-background border-b">
        <div className="max-w-5xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/requests")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold" data-testid="text-request-title">{request.title}</h1>
              <p className="text-xs text-muted-foreground" data-testid="text-request-id">Request #{request.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(request.status)} data-testid="badge-status">
                {request.status.replace("_", " ").toUpperCase()}
              </Badge>
              <Badge className={getUrgencyColor(request.urgency)} data-testid="badge-urgency">
                {request.urgency.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          {isMaintenanceOrAdmin && (
            <div className="flex justify-end gap-2">
              {request.status === "pending" && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20 hover:bg-green-500/20"
                    onClick={() => approveRequestMutation.mutate(id)}
                    disabled={approveRequestMutation.isPending}
                    data-testid="button-approve-request"
                  >
                    Approve
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20 hover:bg-red-500/20"
                        data-testid="button-reject-request"
                      >
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Request</AlertDialogTitle>
                        <AlertDialogDescription>
                          Please provide a reason for rejecting this request. The requester will be notified.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Textarea
                        placeholder="Enter rejection reason..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="min-h-[100px]"
                        data-testid="textarea-rejection-reason"
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRejectionReason("")}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            if (!rejectionReason.trim()) {
                              toast({ 
                                title: "Please provide a rejection reason", 
                                variant: "destructive" 
                              });
                              return;
                            }
                            rejectRequestMutation.mutate({ 
                              requestId: id, 
                              reason: rejectionReason 
                            });
                            setRejectionReason("");
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          data-testid="button-confirm-reject"
                        >
                          Reject Request
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              {canConvertToTask && (
                <Link href={`/tasks/new?requestId=${id}`}>
                  <Button size="sm" data-testid="button-convert-to-task">
                    Convert to Task
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p className="text-sm" data-testid="text-description">{request.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                {area && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-1">Area</h3>
                    <p className="text-sm" data-testid="text-area">{area.name}</p>
                  </div>
                )}

                {subdivision && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-1">Subdivision</h3>
                    <p className="text-sm" data-testid="text-subdivision">{subdivision.name}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-1">Created</h3>
                  <p className="text-sm" data-testid="text-created-at">
                    {new Date(request.createdAt!).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {request.status === "rejected" && request.rejectionReason && (
                <div className="pt-2 border-t">
                  <h3 className="text-sm font-medium text-destructive mb-1">Rejection Reason</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-rejection-reason">
                    {request.rejectionReason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {requester && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Requester Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="text-sm font-medium" data-testid="text-requester-name">
                        {requester.firstName} {requester.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium" data-testid="text-requester-email">
                        {requester.email || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone Number</p>
                      <p className="text-sm font-medium" data-testid="text-requester-phone">
                        {requester.phoneNumber || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Username</p>
                      <p className="text-sm font-medium" data-testid="text-requester-username">
                        {requester.username}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploads.length > 0 && (
                  <div className="space-y-2">
                    {uploads.map((upload) => (
                      <div
                        key={upload.id}
                        className="flex items-center justify-between p-2 rounded border bg-muted/30"
                      >
                        <a
                          href={upload.objectPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 flex-1"
                          data-testid={`link-attachment-${upload.id}`}
                        >
                          <Paperclip className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm truncate">{upload.fileName}</span>
                        </a>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
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
                  <div className="space-y-2 border-t pt-3">
                    {pendingUploads.map((upload, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded border bg-blue-50 dark:bg-blue-950"
                      >
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{upload.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => removePendingUpload(index)}
                          data-testid={`button-remove-pending-upload-${index}`}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
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
                      size="sm"
                      data-testid="button-save-attachments"
                    >
                      {addUploadMutation.isPending ? "Saving..." : "Save Attachments"}
                    </Button>
                  </div>
                )}

                <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center">
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Messages ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
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
                            className={`max-w-[70%] rounded-lg px-3 py-2 ${
                              isOwn
                                ? "bg-[#1E90FF] text-white"
                                : "bg-muted text-foreground"
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
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    No messages yet. Start the conversation!
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 resize-none min-h-[60px]"
                    data-testid="textarea-message"
                  />
                  <Button
                    onClick={() => {
                      if (newMessage.trim()) {
                        sendMessageMutation.mutate(newMessage);
                      }
                    }}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    size="icon"
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
