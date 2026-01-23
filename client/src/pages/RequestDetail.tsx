import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  MessageSquare,
  Send,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  ClipboardList,
  Calendar,
  MapPin,
  FileText,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { FileAttachmentList } from "@/components/FileAttachment";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  ServiceRequest,
  Message,
  Area,
  Subdivision,
  User as UserType,
  Task,
  Upload,
} from "@shared/schema";

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const isMobile = useIsMobile();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: request, isLoading } = useQuery<ServiceRequest>({
    queryKey: ["/api/service-requests", id],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages/request", id],
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: attachments = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/request", id],
    enabled: !!id,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading request details...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Request not found</p>
        <Button variant="outline" onClick={() => navigate("/requests")} data-testid="button-back-to-requests">
          Back to Requests
        </Button>
      </div>
    );
  }

  const requester = users.find(u => u.id === request.requesterId);
  const area = areas.find(a => a.id === request.areaId);
  const subdivision = subdivisions.find(s => s.id === request.subdivisionId);

  const isTechnicianOrAdmin = user?.role === "admin" || user?.role === "technician";
  const canTakeAction = isTechnicianOrAdmin && request.status === "pending";

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "outline";
      case "under_review":
        return "secondary";
      case "converted_to_task":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending Review";
      case "under_review":
        return "Under Review";
      case "converted_to_task":
        return "Approved";
      case "rejected":
        return "Rejected";
      default:
        return status.replace("_", " ");
    }
  };

  const getPriorityColor = (urgency: string) => {
    switch (urgency) {
      case "low":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30";
      case "medium":
        return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30";
      case "high":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  // Mobile-optimized layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-full bg-background -mx-8 -my-6">
        {/* Ultra-Compact Mobile Header - Title and badges only */}
        <div className="px-3 py-2 border-b bg-background">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold truncate" data-testid="text-request-title">
                {request.title}
              </h1>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant={getStatusVariant(request.status)} className="text-[10px] px-1.5 py-0 h-4" data-testid="badge-status">
                  {getStatusLabel(request.status)}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] px-1.5 py-0 h-4 capitalize ${getPriorityColor(request.urgency)}`}
                  data-testid="badge-urgency"
                >
                  {request.urgency}
                </Badge>
              </div>
            </div>
            
            {/* Mobile Action Buttons */}
            {canTakeAction && (
              <div className="flex items-center gap-1 shrink-0">
                <Link href={`/tasks/new?requestId=${id}`}>
                  <Button 
                    size="sm"
                    className="h-7 px-2 text-xs"
                    data-testid="button-approve-create-task"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      data-testid="button-reject-request"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[90vw]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject Request</AlertDialogTitle>
                      <AlertDialogDescription>
                        Provide a reason for rejecting this request.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                      placeholder="Enter rejection reason..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="min-h-[80px]"
                      data-testid="textarea-rejection-reason"
                    />
                    <AlertDialogFooter className="flex-col gap-2">
                      <AlertDialogCancel onClick={() => setRejectionReason("")} className="w-full">
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
                        className="bg-destructive text-destructive-foreground w-full"
                        data-testid="button-confirm-reject"
                      >
                        Reject Request
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-3 space-y-3">
            {/* Description - Always visible */}
            <div className="bg-card rounded-lg border p-3">
              <p className="text-sm leading-relaxed" data-testid="text-description">
                {request.description || "No description provided."}
              </p>
            </div>

            {/* Collapsible Details Section */}
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full p-3 bg-card rounded-lg border text-sm font-medium">
                  <span>Request Details</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="bg-card rounded-lg border p-3 space-y-3">
                  {/* Request ID */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Request ID</span>
                    <span className="font-mono text-xs" data-testid="text-request-id">#{request.id.substring(0, 8)}</span>
                  </div>
                  
                  {/* Created Date */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span data-testid="text-created-at">
                      {new Date(request.createdAt!).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  {/* Location */}
                  {(area || subdivision) && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Location</span>
                      <span data-testid="text-area">
                        {area?.name}
                        {subdivision && <span className="text-muted-foreground" data-testid="text-subdivision"> / {subdivision.name}</span>}
                      </span>
                    </div>
                  )}
                  
                  {/* Requester Info */}
                  {requester && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Requester</p>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate" data-testid="text-requester-name">
                              {requester.firstName} {requester.lastName}
                            </p>
                            {requester.email && (
                              <p className="text-xs text-muted-foreground truncate" data-testid="text-requester-email">
                                {requester.email}
                              </p>
                            )}
                          </div>
                        </div>
                        {requester.phoneNumber && (
                          <a 
                            href={`tel:${requester.phoneNumber}`}
                            className="flex items-center gap-2 text-sm text-primary"
                            data-testid="link-requester-phone"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {requester.phoneNumber}
                          </a>
                        )}
                      </div>
                    </>
                  )}
                  
                  {/* Rejection Reason */}
                  {request.status === "rejected" && request.rejectionReason && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rejection Reason</p>
                        <p className="text-sm text-red-600 dark:text-red-400">{request.rejectionReason}</p>
                      </div>
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="bg-card rounded-lg border p-3">
                <FileAttachmentList attachments={attachments} />
              </div>
            )}

            {/* Messages Section */}
            <div className="bg-card rounded-lg border">
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Messages</span>
                </div>
                {messages.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {messages.length}
                  </Badge>
                )}
              </div>
              
              <div className="p-3">
                {messages.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto mb-3">
                    {messages.map((message) => {
                      const isOwn = message.senderId === user?.id;
                      const sender = users.find(u => u.id === message.senderId);
                      let senderName = "Unknown User";
                      if (isOwn) {
                        senderName = "You";
                      } else if (sender) {
                        const fullName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim();
                        senderName = fullName || sender.username;
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
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm leading-relaxed" data-testid={`text-content-${message.id}`}>
                              {message.content}
                            </p>
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
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No messages yet
                  </p>
                )}
                
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 resize-none min-h-[44px] text-sm"
                    rows={1}
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
                    className="shrink-0 h-[44px] w-[44px]"
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Clean Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 sm:px-6 py-4">
          {/* Top Row: Back + Actions */}
          <div className="flex items-center justify-between gap-4 mb-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/requests")}
              className="gap-1.5 -ml-2 text-muted-foreground"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            {/* Compact Action Buttons - Only for pending requests */}
            {canTakeAction && (
              <div className="flex items-center gap-2">
                <Link href={`/tasks/new?requestId=${id}`}>
                  <Button 
                    size="sm" 
                    className="gap-1.5"
                    data-testid="button-approve-create-task"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Create Task</span>
                    <span className="sm:hidden">Approve</span>
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-destructive"
                      data-testid="button-reject-request"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Reject</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
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
                        className="bg-destructive text-destructive-foreground w-full sm:w-auto"
                        data-testid="button-confirm-reject"
                      >
                        Reject Request
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {/* Title + Meta Row */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold leading-tight" data-testid="text-request-title">
                  {request.title}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5" data-testid="text-request-id">
                  Request #{request.id.substring(0, 8)}
                </p>
              </div>
            </div>

            {/* Status Badges Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getStatusVariant(request.status)} data-testid="badge-status">
                {getStatusLabel(request.status)}
              </Badge>
              <Badge 
                variant="outline" 
                className={`capitalize ${getPriorityColor(request.urgency)}`}
                data-testid="badge-urgency"
              >
                {request.urgency} priority
              </Badge>
            </div>
          </div>

          {/* Status Messages - Approved/Rejected */}
          {request.status === "converted_to_task" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>This request has been approved and a maintenance task was created.</span>
            </div>
          )}

          {request.status === "rejected" && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <XCircle className="h-4 w-4" />
                <span>This request was rejected.</span>
              </div>
              {request.rejectionReason && (
                <p className="text-sm text-muted-foreground pl-6">
                  Reason: {request.rejectionReason}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Two Column Layout on larger screens */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Left Column - Main Details */}
            <div className="lg:col-span-2 space-y-4">
              {/* Description Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm leading-relaxed text-foreground" data-testid="text-description">
                    {request.description || "No description provided."}
                  </p>
                </CardContent>
              </Card>

              {/* Attachments Section - Only show if there are attachments */}
              {attachments.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Attachments</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <FileAttachmentList attachments={attachments} />
                  </CardContent>
                </Card>
              )}

              {/* Messages Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Messages
                    {messages.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {messages.length}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {messages.length > 0 ? (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
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
                                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                                  isOwn
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <p className="text-sm leading-relaxed" data-testid={`text-content-${message.id}`}>
                                  {message.content}
                                </p>
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
                        No messages yet. Start the conversation below.
                      </div>
                    )}

                    <Separator />
                    
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 resize-none min-h-[60px] text-sm"
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
                        className="shrink-0"
                        data-testid="button-send-message"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar Info */}
            <div className="space-y-4">
              {/* Quick Info Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Request Details</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* Date */}
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm font-medium" data-testid="text-created-at">
                        {new Date(request.createdAt!).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  {(area || subdivision) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="text-sm font-medium" data-testid="text-area">
                          {area?.name}
                          {subdivision && (
                            <span className="text-muted-foreground" data-testid="text-subdivision">
                              {" "}/ {subdivision.name}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Requester Contact Card */}
              {requester && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Requester</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" data-testid="text-requester-name">
                          {requester.firstName} {requester.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {requester.role}
                        </p>
                      </div>
                    </div>

                    {(requester.email || requester.phoneNumber) && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          {requester.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate text-muted-foreground" data-testid="text-requester-email">
                                {requester.email}
                              </span>
                            </div>
                          )}
                          {requester.phoneNumber && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground" data-testid="text-requester-phone">
                                {requester.phoneNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
