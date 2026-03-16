import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toDisplayUrl } from "@/lib/imageUtils";
import {
  Check,
  X,
  CircleDollarSign,
  MapPin,
  User,
  Download,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { Task, Quote, QuoteAttachment, User as UserType } from "@shared/schema";

function QuoteAttachments({ quoteId }: { quoteId: string }) {
  const { data: attachments = [] } = useQuery<QuoteAttachment[]>({
    queryKey: ["/api/quotes", quoteId, "attachments"],
  });

  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {attachments.map((attachment) => (
        <Button
          key={attachment.id}
          variant="outline"
          size="sm"
          onClick={() => window.open(toDisplayUrl(attachment.storageUrl), "_blank")}
          data-testid={`button-download-attachment-${attachment.id}`}
        >
          <Download className="w-3 h-3 mr-1" />
          {attachment.fileName.length > 20
            ? attachment.fileName.substring(0, 17) + "..."
            : attachment.fileName}
        </Button>
      ))}
    </div>
  );
}

interface EstimateReviewDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EstimateReviewDialog({ taskId, open, onOpenChange }: EstimateReviewDialogProps) {
  const { toast } = useToast();
  const [adminInstructions, setAdminInstructions] = useState("");

  const { data: task } = useQuery<Task>({
    queryKey: ["/api/tasks", taskId],
    enabled: !!taskId && open,
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/tasks", taskId, "quotes"],
    enabled: !!taskId && open,
  });

  const { data: allUsers = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const assignedUser = allUsers.find(u => u.id === task?.assignedToId);
  const property = properties.find((p: any) => p.id === task?.propertyId);

  const approveQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      await apiRequest("POST", `/api/quotes/${quoteId}/approve`);
      if (adminInstructions.trim()) {
        await apiRequest("PATCH", `/api/tasks/${taskId}`, {
          instructions: adminInstructions.trim(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "quotes"] });
      toast({
        title: "Estimate Approved",
        description: adminInstructions.trim()
          ? "Estimate approved and instructions updated."
          : "Estimate approved successfully.",
      });
      setAdminInstructions("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      await apiRequest("POST", `/api/quotes/${quoteId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "quotes"] });
      toast({
        title: "Estimate Rejected",
        description: "The estimate has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const draftQuotes = quotes.filter(q => q.status === "draft");
  const hasActionableQuotes = draftQuotes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-estimate-review">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-primary" />
            Review Estimates
          </DialogTitle>
        </DialogHeader>

        {task && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-base" data-testid="text-review-task-name">{task.name}</h3>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {property && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {property.name}
                  </span>
                )}
                {assignedUser && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {assignedUser.firstName && assignedUser.lastName
                      ? `${assignedUser.firstName} ${assignedUser.lastName}`
                      : assignedUser.username}
                  </span>
                )}
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
              )}
            </div>

            <div className="border-t pt-4">
              <Label htmlFor="admin-instructions" className="text-sm font-medium">
                Instructions for Technician
              </Label>
              <Textarea
                id="admin-instructions"
                placeholder="Add any instructions or notes for the technician (optional)..."
                value={adminInstructions}
                onChange={(e) => setAdminInstructions(e.target.value)}
                className="mt-1.5 resize-none"
                rows={3}
                data-testid="textarea-admin-instructions"
              />
              <p className="text-xs text-muted-foreground mt-1">
                These instructions will be visible to the technician on the task.
              </p>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm">
                Submitted Estimates ({quotes.length})
              </h4>

              {quotesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : quotes.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No estimates have been submitted yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {quotes.map((quote) => {
                    const quoteCreator = allUsers.find(u => u.id === quote.createdById);
                    const isActionable = quote.status === "draft" && task.estimateStatus !== "approved";

                    return (
                      <div
                        key={quote.id}
                        className={`p-4 rounded-md border ${
                          quote.status === "approved"
                            ? "border-green-500/50 bg-green-500/5"
                            : quote.status === "rejected"
                            ? "border-red-500/30 bg-red-500/5 opacity-60"
                            : "border-border"
                        }`}
                        data-testid={`review-quote-card-${quote.id}`}
                      >
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-lg" data-testid={`text-quote-cost-${quote.id}`}>
                                ${(quote.estimatedCost || 0).toLocaleString()}
                              </span>
                              {quote.status === "approved" && (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              )}
                              {quote.status !== "draft" && (
                                <Badge
                                  variant="outline"
                                  className={
                                    quote.status === "approved"
                                      ? "text-green-700 border-green-300 dark:text-green-400 dark:border-green-700"
                                      : "text-red-700 border-red-300 dark:text-red-400 dark:border-red-700"
                                  }
                                >
                                  {quote.status}
                                </Badge>
                              )}
                            </div>
                            {quote.vendorName && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Vendor: {quote.vendorName}
                              </p>
                            )}
                            {quoteCreator && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Submitted by {quoteCreator.firstName && quoteCreator.lastName
                                  ? `${quoteCreator.firstName} ${quoteCreator.lastName}`
                                  : quoteCreator.username}
                                {quote.createdAt && ` on ${new Date(quote.createdAt).toLocaleDateString()}`}
                              </p>
                            )}
                            {quote.notes && (
                              <p className="text-sm mt-2 whitespace-pre-wrap">{quote.notes}</p>
                            )}
                            <QuoteAttachments quoteId={quote.id} />
                          </div>

                          {isActionable && (
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => approveQuoteMutation.mutate(quote.id)}
                                disabled={approveQuoteMutation.isPending || rejectQuoteMutation.isPending}
                                data-testid={`button-review-approve-${quote.id}`}
                              >
                                {approveQuoteMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4 mr-1" />
                                )}
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => rejectQuoteMutation.mutate(quote.id)}
                                disabled={approveQuoteMutation.isPending || rejectQuoteMutation.isPending}
                                data-testid={`button-review-reject-${quote.id}`}
                              >
                                {rejectQuoteMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4 mr-1" />
                                )}
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
