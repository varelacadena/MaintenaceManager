import { Link } from "wouter";
import { useRequestDetail } from "./useRequestDetail";
import { RequestDetailMobile } from "./RequestDetailMobile";
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
  Bot,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from "lucide-react";
import { FileAttachmentList } from "@/components/FileAttachment";

export default function RequestDetail() {
  const {
    id, user, navigate, toast,
    newMessage, setNewMessage,
    rejectionReason, setRejectionReason,
    isMobile,
    detailsOpen, setDetailsOpen,
    aiTriageLog, aiTriageLoading,
    request, isLoading,
    messages, attachments,
    rejectRequestMutation,
    users,
    sendMessageMutation,
    handleRunAiTriage, handleReviewAiLog,
    requester, property, space,
    isTechnicianOrAdmin, canTakeAction,
    getStatusVariant, getStatusLabel, getPriorityColor,
  } = useRequestDetail();

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

  if (isMobile) {
    return (
      <RequestDetailMobile
        id={id}
        user={user}
        toast={toast}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        detailsOpen={detailsOpen}
        setDetailsOpen={setDetailsOpen}
        request={request}
        messages={messages}
        attachments={attachments}
        users={users}
        rejectRequestMutation={rejectRequestMutation}
        sendMessageMutation={sendMessageMutation}
        requester={requester}
        property={property}
        space={space}
        canTakeAction={canTakeAction}
        getStatusVariant={getStatusVariant}
        getStatusLabel={getStatusLabel}
        getPriorityColor={getPriorityColor}
      />
    );
  }

  // Desktop layout
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6">
          {/* Request Header */}
          <div className="mb-6 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold leading-tight" data-testid="text-request-title">
                    {request.title}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5" data-testid="text-request-id">
                    Request #{request.id.substring(0, 8)}
                  </p>
                </div>

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

              {canTakeAction && (
                <div className="flex items-center gap-2 shrink-0">
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

            {request.status === "converted_to_task" && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>This request has been approved and a maintenance task was created.</span>
              </div>
            )}

            {request.status === "rejected" && (
              <div className="space-y-1">
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
          {/* AI Triage Panel - admin only */}
          {user?.role === "admin" && request.status === "pending" && (
            <div className="mb-6">
              <Card className="border-primary/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Triage Assistant</span>
                      {aiTriageLog && (
                        <Badge variant={aiTriageLog.status === "approved" ? "default" : aiTriageLog.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                          {aiTriageLog.status === "pending_review" ? "Pending Review" : aiTriageLog.status === "approved" ? "Accepted" : "Rejected"}
                        </Badge>
                      )}
                    </div>
                    {!aiTriageLog && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRunAiTriage}
                        disabled={aiTriageLoading}
                        data-testid="button-run-ai-triage"
                        className="gap-1.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {aiTriageLoading ? "Analyzing..." : "Analyze with AI"}
                      </Button>
                    )}
                  </div>
                  {aiTriageLog?.proposedValue && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                      <p className="text-xs text-muted-foreground italic">{aiTriageLog.reasoning}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground">Suggested Urgency</span>
                          <p className="font-medium capitalize">{aiTriageLog.proposedValue.suggestedUrgency}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Category</span>
                          <p className="font-medium capitalize">{aiTriageLog.proposedValue.suggestedCategory}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Assign To</span>
                          {aiTriageLog.proposedValue.suggestedAssigneeName ? (
                            <>
                              <p className="font-medium">{aiTriageLog.proposedValue.suggestedAssigneeName}</p>
                              <p className="text-xs text-muted-foreground capitalize">{aiTriageLog.proposedValue.suggestedExecutorType}</p>
                            </>
                          ) : (
                            <p className="font-medium capitalize">{aiTriageLog.proposedValue.suggestedExecutorType}</p>
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Required Skill</span>
                          <p className="font-medium capitalize">{aiTriageLog.proposedValue.suggestedSkill}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Est. Hours</span>
                          <p className="font-medium">{aiTriageLog.proposedValue.estimatedHours}h</p>
                        </div>
                        {aiTriageLog.proposedValue.suggestedStartDate && (
                          <div>
                            <span className="text-xs text-muted-foreground">Suggested Start</span>
                            <p className="font-medium">
                              {new Date(aiTriageLog.proposedValue.suggestedStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                            {aiTriageLog.proposedValue.suggestedStartDateReason && (
                              <p className="text-xs text-muted-foreground">{aiTriageLog.proposedValue.suggestedStartDateReason}</p>
                            )}
                          </div>
                        )}
                        {aiTriageLog.proposedValue.draftTaskTitle && (
                          <div className="col-span-2">
                            <span className="text-xs text-muted-foreground">Draft Task Title</span>
                            <p className="font-medium">{aiTriageLog.proposedValue.draftTaskTitle}</p>
                          </div>
                        )}
                      </div>
                      {aiTriageLog.status === "pending_review" && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReviewAiLog("approved")}
                            className="gap-1.5 text-green-600"
                            data-testid="button-accept-triage"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            Accept Suggestion
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReviewAiLog("rejected")}
                            className="gap-1.5 text-muted-foreground"
                            data-testid="button-reject-triage"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

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
                  {property && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="text-sm font-medium" data-testid="text-property">
                          {property.name}
                          {space && (
                            <span className="text-muted-foreground" data-testid="text-space">
                              {" "}/ {space.name}
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
