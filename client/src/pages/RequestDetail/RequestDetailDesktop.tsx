import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, ClipboardList, ExternalLink, Calendar, ImageIcon, MapPin, Paperclip, User } from "lucide-react";
import { FileAttachmentList } from "@/components/FileAttachment";
import { apiRequest } from "@/lib/queryClient";
import type { RequestDetailHookReturn } from "./useRequestDetail";
import { getServiceRequestNumber } from "@shared/recordNumbers";
import { getUserDisplayName } from "@/utils/taskUtils";
import { buildUploadPreviewOptions, useImagePreview } from "@/components/ImagePreviewProvider";

type RequestDetailDesktopProps = Pick<
  RequestDetailHookReturn,
  | "id"
  | "toast"
  | "rejectionReason"
  | "setRejectionReason"
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

type Attachment = RequestDetailDesktopProps["attachments"][number];

function RequestImagePreview({ attachment }: { attachment: Attachment }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const { openImagePreview } = useImagePreview();

  useEffect(() => {
    let cancelled = false;

    async function loadImageUrl() {
      try {
        const response = await apiRequest("GET", `/api/uploads/${attachment.id}/download`);
        const data = await response.json();
        if (!cancelled) {
          setImageUrl(data.downloadUrl || null);
        }
      } catch {
        if (!cancelled) {
          setHasError(true);
        }
      }
    }

    loadImageUrl();

    return () => {
      cancelled = true;
    };
  }, [attachment.id]);

  return (
    <button
      type="button"
      className="group overflow-hidden rounded-xl border bg-muted/30 text-left hover:border-primary/40 transition-colors"
      onClick={() => {
        if (imageUrl) {
          openImagePreview({
            ...buildUploadPreviewOptions(attachment),
            src: imageUrl,
          });
        }
      }}
      data-testid={`attachment-preview-${attachment.id}`}
    >
      <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {imageUrl && !hasError ? (
          <img
            src={imageUrl}
            alt={attachment.fileName}
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">{hasError ? "Preview unavailable" : "Loading preview..."}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium">{attachment.label || attachment.fileName}</p>
        <p className="text-xs text-muted-foreground">{attachment.fileType}</p>
      </div>
    </button>
  );
}

export function RequestDetailDesktop({
  id,
  toast,
  rejectionReason,
  setRejectionReason,
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
}: RequestDetailDesktopProps) {
  if (!request) return null;

  const imageAttachments = attachments.filter((attachment) =>
    attachment.fileType?.startsWith("image/"),
  );
  const otherAttachments = attachments.filter(
    (attachment) => !attachment.fileType?.startsWith("image/"),
  );
  const submittedDate = request.createdAt
    ? new Date(request.createdAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not available";

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(request.status)} data-testid="badge-status">
                {getStatusLabel(request.status)}
              </Badge>
              <Badge
                variant="outline"
                className={`capitalize ${getPriorityColor(request.urgency)}`}
                data-testid="badge-urgency"
              >
                {getUrgencyLabel(request.urgency)} urgency
              </Badge>
              <span className="text-xs text-muted-foreground" data-testid="text-request-id">
                Request {getServiceRequestNumber(request)}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-request-title">
              {request.title}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5" data-testid="text-property">
                <MapPin className="h-3.5 w-3.5" />
                {property?.name || "No property"}
                {space && <span data-testid="text-space">/ {space.name}</span>}
              </span>
              <span className="inline-flex items-center gap-1.5" data-testid="text-created-at">
                <Calendar className="h-3.5 w-3.5" />
                {submittedDate}
              </span>
              {requester && (
                <span className="inline-flex items-center gap-1.5" data-testid="text-requester-name">
                  <User className="h-3.5 w-3.5" />
                  {getUserDisplayName(requester)}
                </span>
              )}
            </div>
          </div>

          {(canReviewRequest || canMarkUnderReview) && (
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {canMarkUnderReview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markUnderReviewMutation.mutate(id)}
                  disabled={markUnderReviewMutation.isPending}
                  data-testid="button-mark-under-review"
                >
                  Mark under review
                </Button>
              )}
              {canReviewRequest && (
                <>
                  <Link href={`/tasks/new?requestId=${id}`}>
                    <Button size="sm" className="gap-1.5" data-testid="button-approve-create-task">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Create Task
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
                                variant: "destructive",
                              });
                              return;
                            }
                            rejectRequestMutation.mutate({
                              requestId: id,
                              reason: rejectionReason,
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
                </>
              )}
            </div>
          )}
        </div>

        {request.status === "converted_to_task" && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>This request was approved and converted to a work order.</span>
              </div>
              {linkedTask && (
                <Link href={`/tasks/${linkedTask.id}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 bg-background" data-testid="button-view-linked-task">
                    <ExternalLink className="h-3.5 w-3.5" />
                    View work order
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {request.status === "rejected" && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-3 space-y-1 text-sm text-red-700 dark:text-red-300">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                <span>This request was rejected.</span>
              </div>
              {request.rejectionReason && (
                <p className="text-muted-foreground pl-6">Reason: {request.rejectionReason}</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)] gap-5">
          <section className="space-y-5">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-base font-semibold">Photos</h2>
                  <span className="text-sm text-muted-foreground">({imageAttachments.length})</span>
                </div>
                {imageAttachments.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {imageAttachments.map((attachment) => (
                      <RequestImagePreview key={attachment.id} attachment={attachment} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                    No photos were attached to this request.
                  </div>
                )}
              </CardContent>
            </Card>

            {otherAttachments.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-base font-semibold">Other files</h2>
                  </div>
                  <FileAttachmentList attachments={otherAttachments} />
                </CardContent>
              </Card>
            )}
          </section>

          <aside className="space-y-5">
            <Card>
              <CardContent className="p-5 space-y-3">
                <h2 className="text-base font-semibold">Description</h2>
                <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground" data-testid="text-description">
                  {request.description || "No description provided."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-4 text-sm">
                <h2 className="text-base font-semibold">Quick details</h2>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">
                    {property?.name || "Not specified"}
                    {space && <span className="text-muted-foreground"> / {space.name}</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium">{submittedDate}</p>
                </div>
                {requester && (
                  <div>
                    <p className="text-xs text-muted-foreground">Requester</p>
                    <p className="font-medium">
                      {getUserDisplayName(requester)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{requester.role}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}


