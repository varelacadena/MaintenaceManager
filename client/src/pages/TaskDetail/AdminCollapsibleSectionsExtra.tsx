import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Package,
  ExternalLink,
  Trash2,
  Paperclip,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Check,
  CircleDollarSign,
} from "lucide-react";
import { statusColors, quoteStatusColors } from "./constants";
import { QuoteAttachmentsList } from "./helpers";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminCollapsibleSectionsExtra({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, user, downloadFile,
    parts, uploads, requestAttachments, quotes, users,
    attachmentsExpanded, setAttachmentsExpanded,
    partsExpanded, setPartsExpanded,
    quotesExpanded, setQuotesExpanded,
    isAddPartDialogOpen, setIsAddPartDialogOpen,
    isAddQuoteDialogOpen, setIsAddQuoteDialogOpen,
    partsSectionRef,
    deleteUploadMutation,
    approveQuoteMutation, rejectQuoteMutation, deleteQuoteMutation,
    isTechnicianOrAdmin,
    estimateBlocksCompletion,
  } = ctx;

  if (!task) return null;

  return (
    <>
      <Collapsible open={attachmentsExpanded} onOpenChange={setAttachmentsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-attachments">
            <div className="flex items-center gap-3">
              <Paperclip className="w-5 h-5 text-primary" />
              <span className="font-medium">Attachments</span>
              {(uploads.length + requestAttachments.length) > 0 && (
                <Badge variant="secondary">{uploads.length + requestAttachments.length}</Badge>
              )}
            </div>
            {attachmentsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {requestAttachments.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-1">From Request</p>
              {requestAttachments.map((att) => {
                const isMockFile = att.objectUrl.includes("mock-storage.local");
                return (
                  <button
                    key={att.id}
                    onClick={() => downloadFile(att.id, att.objectUrl)}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover-elevate w-full text-left"
                  >
                    {isMockFile ? (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <Paperclip className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-sm flex-1 truncate">{att.fileName}</span>
                    {isMockFile ? (
                      <span className="text-xs text-destructive">Unavailable</span>
                    ) : (
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {uploads.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-1">Task Attachments</p>
              {uploads.map((upload) => {
                const isMockFile = upload.objectUrl.includes("mock-storage.local");
                return (
                  <div key={upload.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <button
                      onClick={() => downloadFile(upload.id, upload.objectUrl)}
                      className="flex items-center gap-3 flex-1 min-w-0 hover-elevate text-left"
                    >
                      {isMockFile ? (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-sm truncate">{upload.fileName}</span>
                      {isMockFile && (
                        <span className="text-xs text-destructive">Unavailable</span>
                      )}
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUploadMutation.mutate(upload.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          )}
          {uploads.length === 0 && requestAttachments.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">No attachments</p>
          )}
        </CollapsibleContent>
      </Collapsible>

      {task?.requiresEstimate && isTechnicianOrAdmin && (
        <Collapsible open={quotesExpanded} onOpenChange={setQuotesExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-quotes">
              <div className="flex items-center gap-3">
                <CircleDollarSign className="w-5 h-5 text-primary" />
                <span className="font-medium">Estimates</span>
                {quotes.length > 0 && <Badge variant="secondary">{quotes.length}</Badge>}
                {task?.estimateStatus === "needs_estimate" && (
                  <Badge variant="outline" className={statusColors.needs_estimate}>Needs Estimate</Badge>
                )}
                {task?.estimateStatus === "waiting_approval" && (
                  <Badge variant="outline" className={statusColors.waiting_approval}>Pending Review</Badge>
                )}
                {task?.estimateStatus === "approved" && (
                  <Badge variant="outline" className={statusColors.ready}>Approved</Badge>
                )}
              </div>
              {quotesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            {task?.estimateStatus !== "approved" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddQuoteDialogOpen(true)}
                className="w-full"
                data-testid="button-add-quote"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Estimate
              </Button>
            )}

            {quotes.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                No estimates added yet. Add estimates to compare and approve before work begins.
              </p>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote) => {
                  const quoteCreator = users.find(u => u.id === quote.createdById);
                  const isOwnQuote = user?.id === quote.createdById;
                  const canModify = user?.role === "admin" || isOwnQuote;

                  return (
                    <div
                      key={quote.id}
                      className={`p-4 rounded-lg border ${
                        quote.status === "approved" ? "border-green-500/50 bg-green-500/5" : 
                        quote.status === "rejected" ? "border-red-500/30 bg-red-500/5 opacity-60" : 
                        "border-border"
                      }`}
                      data-testid={`quote-card-${quote.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-semibold text-lg">
                              ${(quote.estimatedCost || 0).toLocaleString()}
                            </span>
                            <Badge variant="secondary" className={quoteStatusColors[quote.status]}>
                              {quote.status}
                            </Badge>
                          </div>
                          {quote.vendorName && (
                            <p className="text-sm text-muted-foreground">
                              Vendor: {quote.vendorName}
                            </p>
                          )}
                          {quoteCreator && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Submitted by {quoteCreator.firstName && quoteCreator.lastName ? `${quoteCreator.firstName} ${quoteCreator.lastName}` : quoteCreator.username}
                            </p>
                          )}
                          {quote.notes && (
                            <p className="text-sm mt-2">{quote.notes}</p>
                          )}
                          <QuoteAttachmentsList quoteId={quote.id} />
                        </div>
                        <div className="flex gap-2">
                          {quote.status === "draft" && task?.estimateStatus !== "approved" && (
                            <>
                              {user?.role === "admin" && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => approveQuoteMutation.mutate(quote.id)}
                                    disabled={approveQuoteMutation.isPending}
                                    data-testid={`button-approve-quote-${quote.id}`}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => rejectQuoteMutation.mutate(quote.id)}
                                    disabled={rejectQuoteMutation.isPending}
                                    data-testid={`button-reject-quote-${quote.id}`}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {canModify && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteQuoteMutation.mutate(quote.id)}
                                  disabled={deleteQuoteMutation.isPending}
                                  data-testid={`button-delete-quote-${quote.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          )}
                          {quote.status === "approved" && (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {isTechnicianOrAdmin && (
        <Collapsible open={partsExpanded} onOpenChange={setPartsExpanded}>
          <CollapsibleTrigger asChild>
            <div ref={partsSectionRef} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-parts">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-primary" />
                <span className="font-medium">Parts Used</span>
                {parts.length > 0 && <Badge variant="secondary">{parts.length}</Badge>}
              </div>
              {partsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {parts.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No parts used</p>
            ) : (
              parts.map((part) => (
                <div key={part.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{part.partName}</p>
                    {part.notes && <p className="text-xs text-muted-foreground">{part.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Qty: {part.quantity}</p>
                    <p className="text-xs text-muted-foreground">${part.cost.toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAddPartDialogOpen(true)}
              data-testid="button-add-part"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Part
            </Button>
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}
