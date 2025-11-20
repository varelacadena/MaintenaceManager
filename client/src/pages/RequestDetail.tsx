
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
    <div className="flex flex-col h-full bg-background">
      {/* Compact Mobile Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-3 sm:p-4">
          <div className="flex items-start gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/requests")}
              data-testid="button-back"
              className="h-8 w-8 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-xl font-semibold leading-tight line-clamp-2" data-testid="text-request-title">
                {request.title}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-request-id">
                #{request.id.substring(0, 8)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge 
              variant="outline" 
              className={`${getStatusColor(request.status)} text-xs px-2 py-0.5`} 
              data-testid="badge-status"
            >
              {request.status.replace("_", " ")}
            </Badge>
            <Badge 
              variant="outline" 
              className={`${getUrgencyColor(request.urgency)} text-xs px-2 py-0.5`} 
              data-testid="badge-urgency"
            >
              {request.urgency}
            </Badge>
          </div>
          
          {isMaintenanceOrAdmin && request.status === "pending" && (
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1 bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20 hover:bg-green-500/20 h-8 text-xs"
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
                    className="flex-1 bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20 hover:bg-red-500/20 h-8 text-xs"
                    data-testid="button-reject-request"
                  >
                    Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject Request</AlertDialogTitle>
                    <AlertDialogDescription>
                      Please provide a reason for rejecting this request.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    placeholder="Enter rejection reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="min-h-[80px]"
                    data-testid="textarea-rejection-reason"
                  />
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel onClick={() => setRejectionReason("")} className="w-full sm:w-auto">
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
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                      data-testid="button-confirm-reject"
                    >
                      Reject
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          
          {isMaintenanceOrAdmin && canConvertToTask && (
            <Link href={`/tasks/new?requestId=${id}`} className="block mt-2">
              <Button size="sm" className="w-full h-8 text-xs" data-testid="button-convert-to-task">
                Convert to Task
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-3 sm:p-4 space-y-3">
          {/* Compact Details Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm leading-snug" data-testid="text-description">{request.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                {area && (
                  <div>
                    <p className="text-muted-foreground mb-0.5">Area</p>
                    <p className="font-medium" data-testid="text-area">{area.name}</p>
                  </div>
                )}
                {subdivision && (
                  <div>
                    <p className="text-muted-foreground mb-0.5">Subdivision</p>
                    <p className="font-medium" data-testid="text-subdivision">{subdivision.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground mb-0.5">Created</p>
                  <p className="font-medium" data-testid="text-created-at">
                    {new Date(request.createdAt!).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {request.status === "rejected" && request.rejectionReason && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-destructive mb-1">Rejection Reason</p>
                  <p className="text-xs text-muted-foreground leading-snug" data-testid="text-rejection-reason">
                    {request.rejectionReason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compact Contact Card */}
          {requester && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm font-semibold">Requester Contact</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium truncate" data-testid="text-requester-name">
                        {requester.firstName} {requester.lastName}
                      </p>
                    </div>
                  </div>
                  {requester.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium truncate" data-testid="text-requester-email">
                          {requester.email}
                        </p>
                      </div>
                    </div>
                  )}
                  {requester.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium" data-testid="text-requester-phone">
                          {requester.phoneNumber}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compact Attachments Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Attachments {uploads.length > 0 && `(${uploads.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="space-y-2">
                {uploads.length > 0 && (
                  <div className="space-y-1.5">
                    {uploads.map((upload) => (
                      <div
                        key={upload.id}
                        className="flex items-center gap-2 p-2 rounded border bg-muted/30 text-xs"
                      >
                        <a
                          href={upload.objectPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 flex-1 min-w-0"
                          data-testid={`link-attachment-${upload.id}`}
                        >
                          <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{upload.fileName}</span>
                        </a>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              data-testid={`button-delete-attachment-${upload.id}`}
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUploadMutation.mutate(upload.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
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
                  <div className="space-y-1.5 pt-2 border-t">
                    {pendingUploads.map((upload, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded border bg-blue-50 dark:bg-blue-950 text-xs"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{upload.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={() => removePendingUpload(index)}
                          data-testid={`button-remove-pending-upload-${index}`}
                        >
                          <X className="w-3 h-3 text-red-500" />
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
                      className="w-full h-8 text-xs"
                      size="sm"
                      data-testid="button-save-attachments"
                    >
                      {addUploadMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}

                {(isMaintenanceOrAdmin || request.requesterId === user?.id) ? (
                  <div className="border-2 border-dashed rounded-lg p-3 flex items-center justify-center">
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
                      buttonClassName="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8"
                    >
                      Browse
                    </ObjectUploader>
                  </div>
                ) : uploads.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No attachments
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Compact Messages Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Messages ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="space-y-3">
                {messages.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
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
                          <span className="text-[10px] font-medium text-muted-foreground mb-0.5" data-testid={`text-sender-${message.id}`}>
                            {senderName}
                          </span>
                          <div
                            className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                              isOwn
                                ? "bg-[#1E90FF] text-white"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <p className="text-xs leading-snug" data-testid={`text-content-${message.id}`}>{message.content}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
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
                  <div className="text-center text-muted-foreground py-6 text-xs">
                    No messages yet
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 resize-none min-h-[60px] text-xs"
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
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    data-testid="button-send-message"
                  >
                    <Send className="h-3.5 w-3.5" />
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
