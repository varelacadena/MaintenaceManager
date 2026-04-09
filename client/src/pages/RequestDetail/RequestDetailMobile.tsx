import { Link } from "wouter";
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
  Phone,
  CheckCircle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { FileAttachmentList } from "@/components/FileAttachment";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { RequestDetailHookReturn } from "./useRequestDetail";

type RequestDetailMobileProps = Pick<
  RequestDetailHookReturn,
  | "id"
  | "user"
  | "toast"
  | "newMessage"
  | "setNewMessage"
  | "rejectionReason"
  | "setRejectionReason"
  | "detailsOpen"
  | "setDetailsOpen"
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
>;

export function RequestDetailMobile({
  id,
  user,
  toast,
  newMessage,
  setNewMessage,
  rejectionReason,
  setRejectionReason,
  detailsOpen,
  setDetailsOpen,
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
}: RequestDetailMobileProps) {
  if (!request) return null;

  return (
    <div className="flex flex-col h-full bg-background -mx-8 -my-6">
      <div className="flex-1 overflow-auto">
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold truncate" data-testid="text-request-title">
                {request.title}
              </h1>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant={getStatusVariant(request.status)} className="text-xs px-1.5 py-0 h-4" data-testid="badge-status">
                  {getStatusLabel(request.status)}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-xs px-1.5 py-0 h-4 capitalize ${getPriorityColor(request.urgency)}`}
                  data-testid="badge-urgency"
                >
                  {request.urgency}
                </Badge>
              </div>
            </div>
            
            {canTakeAction && (
              <div className="flex items-center gap-1 shrink-0">
                <Link href={`/tasks/new?requestId=${id}`}>
                  <Button 
                    size="sm"
                    className="h-7 px-2 text-xs"
                    data-testid="button-approve-create-task-mobile"
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
          <div className="bg-card rounded-lg border p-3">
            <p className="text-sm leading-relaxed" data-testid="text-description">
              {request.description || "No description provided."}
            </p>
          </div>

          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full p-3 bg-card rounded-lg border text-sm font-medium">
                <span>Request Details</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-card rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Request ID</span>
                  <span className="font-mono text-xs" data-testid="text-request-id">#{request.id.substring(0, 8)}</span>
                </div>
                
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
                
                {property && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Location</span>
                    <span data-testid="text-property">
                      {property.name}
                      {space && <span className="text-muted-foreground" data-testid="text-space"> / {space.name}</span>}
                    </span>
                  </div>
                )}
                
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

          {attachments.length > 0 && (
            <div className="bg-card rounded-lg border p-3">
              <FileAttachmentList attachments={attachments} />
            </div>
          )}

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
                        <span className="text-xs font-medium text-muted-foreground mb-0.5" data-testid={`text-sender-${message.id}`}>
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
                        <span className="text-xs text-muted-foreground mt-0.5">
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
