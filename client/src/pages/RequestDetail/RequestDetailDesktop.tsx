import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MessageSquare, Send, CheckCircle, XCircle, ClipboardList, FileText } from "lucide-react";
import { FileAttachmentList } from "@/components/FileAttachment";
import { RequestDetailSidebar, AiTriageCard } from "./RequestDetailSidebar";
import type { RequestDetailHookReturn } from "./useRequestDetail";

type RequestDetailDesktopProps = Pick<
  RequestDetailHookReturn,
  | "id"
  | "user"
  | "toast"
  | "newMessage"
  | "setNewMessage"
  | "rejectionReason"
  | "setRejectionReason"
  | "request"
  | "messages"
  | "attachments"
  | "users"
  | "rejectRequestMutation"
  | "sendMessageMutation"
  | "requester"
  | "property"
  | "space"
  | "canTakeAction"
  | "getStatusVariant"
  | "getStatusLabel"
  | "getPriorityColor"
  | "aiTriageLog"
  | "aiTriageLoading"
  | "handleRunAiTriage"
  | "handleReviewAiLog"
>;

export function RequestDetailDesktop({
  id,
  user,
  toast,
  newMessage,
  setNewMessage,
  rejectionReason,
  setRejectionReason,
  request,
  messages,
  attachments,
  users,
  rejectRequestMutation,
  sendMessageMutation,
  requester,
  property,
  space,
  canTakeAction,
  getStatusVariant,
  getStatusLabel,
  getPriorityColor,
  aiTriageLog,
  aiTriageLoading,
  handleRunAiTriage,
  handleReviewAiLog,
}: RequestDetailDesktopProps) {
  if (!request) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6">
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
          <AiTriageCard
            user={user}
            request={request}
            aiTriageLog={aiTriageLog}
            aiTriageLoading={aiTriageLoading}
            handleRunAiTriage={handleRunAiTriage}
            handleReviewAiLog={handleReviewAiLog}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-2 space-y-4">
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

            <RequestDetailSidebar
              request={request}
              requester={requester}
              property={property}
              space={space}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
