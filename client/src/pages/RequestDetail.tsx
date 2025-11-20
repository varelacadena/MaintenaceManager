import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
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
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  MessageSquare,
  Paperclip,
  User,
  Mail,
  Phone,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  ServiceRequest,
  Message,
  Upload,
  Area,
  Subdivision,
  Property,
  User as UserType,
} from "@shared/schema";
import { format } from "date-fns";

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: request, isLoading } = useQuery<ServiceRequest>({
    queryKey: ["/api/service-requests", id],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages/request", id],
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: uploads = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/request", id],
    enabled: !!id,
  });

  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });

  const { data: subdivisions = [] } = useQuery<Subdivision[]>({
    queryKey: ["/api/subdivisions"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
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

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/messages", { requestId: id, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/request", id] });
      toast({ title: "Message sent" });
    },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold">Loading request details...</div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold text-destructive">Request not found</div>
        </div>
      </div>
    );
  }

  const requester = users.find((u) => u.id === request.requesterId);
  const area = areas.find((a) => a.id === request.areaId);
  const subdivision = subdivisions.find((s) => s.id === request.subdivisionId);
  const property = properties.find((p) => p.id === request.propertyId);

  const isMaintenanceOrAdmin = user?.role === "admin" || user?.role === "maintenance";
  const canConvertToTask =
    isMaintenanceOrAdmin &&
    (request.status === "pending" || request.status === "under_review");

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500", icon: Clock, label: "Pending" },
      under_review: { color: "bg-blue-500", icon: AlertCircle, label: "Under Review" },
      converted_to_task: { color: "bg-green-500", icon: CheckCircle2, label: "Converted to Task" },
      rejected: { color: "bg-red-500", icon: XCircle, label: "Rejected" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white border-0`} data-testid="badge-status">
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig = {
      low: { color: "bg-green-500", label: "Low" },
      medium: { color: "bg-yellow-500", label: "Medium" },
      high: { color: "bg-red-500", label: "High" },
    };

    const config = urgencyConfig[urgency as keyof typeof urgencyConfig] || urgencyConfig.medium;

    return (
      <Badge className={`${config.color} text-white border-0`} data-testid="badge-urgency">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/requests")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-request-title">
              {request.title}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-request-id">
              Request ID: #{request.id.substring(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(request.status)}
            {getUrgencyBadge(request.urgency)}
          </div>
        </div>

        {/* Action Buttons for Admin/Maintenance */}
        {isMaintenanceOrAdmin && request.status === "pending" && (
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => approveRequestMutation.mutate(id)}
              disabled={approveRequestMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-approve-request"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve Request
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-reject-request">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Request
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject Request</AlertDialogTitle>
                  <AlertDialogDescription>
                    Please provide a reason for rejecting this request.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  id="rejection-reason"
                  placeholder="Enter rejection reason..."
                  className="min-h-[100px]"
                  data-testid="textarea-rejection-reason"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      const reasonInput = document.getElementById(
                        "rejection-reason"
                      ) as HTMLTextAreaElement;
                      const reason = reasonInput?.value || "";
                      if (!reason.trim()) {
                        toast({
                          title: "Please provide a rejection reason",
                          variant: "destructive",
                        });
                        return;
                      }
                      rejectRequestMutation.mutate({ requestId: id, reason });
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                    data-testid="button-confirm-reject"
                  >
                    Reject
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {canConvertToTask && (
          <Button
            onClick={() => navigate(`/tasks/new?requestId=${id}`)}
            className="mt-4"
            data-testid="button-convert-to-task"
          >
            Convert to Task
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Category</h3>
                <p className="text-base" data-testid="text-category">
                  {request.category}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Description</h3>
                <p className="text-base leading-relaxed" data-testid="text-description">
                  {request.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                    Requested Completion Date
                  </h3>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="text-base" data-testid="text-requested-date">
                      {request.requestedDate
                        ? format(new Date(request.requestedDate), "PPP")
                        : "Not specified"}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                    Submitted On
                  </h3>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-base" data-testid="text-created-at">
                      {request.createdAt ? format(new Date(request.createdAt), "PPP") : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {request.status === "rejected" && request.rejectionReason && (
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold text-destructive mb-2">
                    Rejection Reason
                  </h3>
                  <p
                    className="text-base bg-destructive/10 p-3 rounded-md"
                    data-testid="text-rejection-reason"
                  >
                    {request.rejectionReason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {property && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Property</h3>
                  <p className="text-base" data-testid="text-property">
                    {property.name}
                  </p>
                </div>
              )}

              {area && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Area</h3>
                  <p className="text-base" data-testid="text-area">
                    {area.name}
                  </p>
                </div>
              )}

              {subdivision && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                    Subdivision
                  </h3>
                  <p className="text-base" data-testid="text-subdivision">
                    {subdivision.name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="w-5 h-5" />
                Attachments ({uploads.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {uploads.length > 0 ? (
                <div className="space-y-2">
                  {uploads.map((upload) => (
                    <a
                      key={upload.id}
                      href={upload.objectPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-md bg-muted hover-elevate"
                      data-testid={`link-attachment-${upload.id}`}
                    >
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{upload.fileName}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No attachments</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requester Information Card */}
          {requester && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Requester Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Name</h3>
                  <p className="text-base" data-testid="text-requester-name">
                    {requester.firstName} {requester.lastName}
                  </p>
                </div>

                {requester.email && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Email</h3>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={`mailto:${requester.email}`}
                        className="text-base text-primary hover:underline"
                        data-testid="text-requester-email"
                      >
                        {requester.email}
                      </a>
                    </div>
                  </div>
                )}

                {requester.phoneNumber && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Phone</h3>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={`tel:${requester.phoneNumber}`}
                        className="text-base text-primary hover:underline"
                        data-testid="text-requester-phone"
                      >
                        {requester.phoneNumber}
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Messages Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Messages ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {messages.map((message) => {
                      const isOwn = message.senderId === user?.id;
                      const sender = users.find((u) => u.id === message.senderId);
                      const senderName = isOwn
                        ? "You"
                        : sender
                        ? `${sender.firstName} ${sender.lastName}`
                        : "Unknown";

                      return (
                        <div
                          key={message.id}
                          className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                          data-testid={`message-${message.id}`}
                        >
                          <span className="text-xs font-medium text-muted-foreground mb-1">
                            {senderName}
                          </span>
                          <div
                            className={`max-w-[90%] rounded-lg px-3 py-2 ${
                              isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            <p className="text-sm" data-testid={`text-content-${message.id}`}>
                              {message.content}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">
                            {message.createdAt
                              ? format(new Date(message.createdAt), "PPp")
                              : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    No messages yet
                  </div>
                )}

                <div className="pt-3 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const content = formData.get("message") as string;
                      if (content.trim()) {
                        sendMessageMutation.mutate(content);
                        e.currentTarget.reset();
                      }
                    }}
                    className="space-y-2"
                  >
                    <Textarea
                      name="message"
                      placeholder="Type a message..."
                      className="min-h-[80px]"
                      data-testid="textarea-message"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full"
                      disabled={sendMessageMutation.isPending}
                      data-testid="button-send-message"
                    >
                      Send Message
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
