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
  User,
  Phone,
  CheckCircle,
  XCircle,
  ChevronDown,
  ClipboardList,
  ExternalLink,
} from "lucide-react";
import { FileAttachmentList } from "@/components/FileAttachment";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { RequestDetailHookReturn } from "./useRequestDetail";
import { getServiceRequestNumber } from "@shared/recordNumbers";
import { getUserDisplayName } from "@/utils/taskUtils";

type RequestDetailMobileProps = Pick<
  RequestDetailHookReturn,
  | "id"
  | "toast"
  | "rejectionReason"
  | "setRejectionReason"
  | "detailsOpen"
  | "setDetailsOpen"
  | "request"
  | "attachments"
  | "rejectRequestMutation"
  | "markUnderReviewMutation"
  | "requester"
  | "property"
  | "space"
  | "linkedTask"
  | "canReviewRequest"
  | "canMarkUnderReview"
  | "getStatusVariant"
  | "getStatusLabel"
  | "getPriorityColor"
  | "getUrgencyLabel"
>;

export function RequestDetailMobile({
  id,
  toast,
  rejectionReason,
  setRejectionReason,
  detailsOpen,
  setDetailsOpen,
  request,
  attachments,
  rejectRequestMutation,
  markUnderReviewMutation,
  requester,
  property,
  space,
  linkedTask,
  canReviewRequest,
  canMarkUnderReview,
  getStatusVariant,
  getStatusLabel,
  getPriorityColor,
  getUrgencyLabel,
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
                  {getUrgencyLabel(request.urgency)}
                </Badge>
              </div>
            </div>
            
            {(canReviewRequest || canMarkUnderReview) && (
              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                {canMarkUnderReview && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={markUnderReviewMutation.isPending}
                    onClick={() => markUnderReviewMutation.mutate(id)}
                    data-testid="button-mark-under-review-mobile"
                  >
                    Under review
                  </Button>
                )}
                {canReviewRequest && (
                <>
                <Link href={`/tasks/new?requestId=${id}`}>
                  <Button 
                    size="sm"
                    className="h-7 px-2 text-xs"
                    data-testid="button-approve-create-task-mobile"
                  >
                    <ClipboardList className="h-3 w-3 mr-1" />
                    Create task
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
                </>
                )}
              </div>
            )}
          </div>
          {request.status === "converted_to_task" && (
            <div className="flex flex-col gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-sm text-green-700 dark:text-green-300">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Approved and converted to a work order.</span>
              </div>
              {linkedTask && (
                <Link href={`/tasks/${linkedTask.id}`}>
                  <Button variant="outline" size="sm" className="w-full gap-1.5" data-testid="button-view-linked-task-mobile">
                    <ExternalLink className="h-3.5 w-3.5" />
                    View work order
                  </Button>
                </Link>
              )}
            </div>
          )}

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
                  <span className="font-mono text-xs" data-testid="text-request-id">{getServiceRequestNumber(request)}</span>
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
                    <span className="text-muted-foreground">Property</span>
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
                            {getUserDisplayName(requester)}
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

        </div>
      </div>
    </div>
  );
}
