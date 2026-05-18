import { useRequestDetail } from "./useRequestDetail";
import { RequestDetailMobile } from "./RequestDetailMobile";
import { RequestDetailDesktop } from "./RequestDetailDesktop";
import { Button } from "@/components/ui/button";
import { WorkLoadError } from "@/pages/Work/WorkLoadError";

export default function RequestDetail() {
  const hook = useRequestDetail();
  const { isMobile, isLoading, isError, error, refetch, request, navigate } = hook;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading request details...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <WorkLoadError
          title="Could not load request"
          message={error instanceof Error ? error.message : "Something went wrong."}
          onRetry={() => refetch()}
        />
        <Button variant="outline" className="mt-4 w-full" onClick={() => navigate("/requests")}>
          Back to Requests
        </Button>
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
        id={hook.id}
        toast={hook.toast}
        rejectionReason={hook.rejectionReason}
        setRejectionReason={hook.setRejectionReason}
        detailsOpen={hook.detailsOpen}
        setDetailsOpen={hook.setDetailsOpen}
        request={request}
        attachments={hook.attachments}
        rejectRequestMutation={hook.rejectRequestMutation}
        markUnderReviewMutation={hook.markUnderReviewMutation}
        requester={hook.requester}
        property={hook.property}
        space={hook.space}
        linkedTask={hook.linkedTask}
        canReviewRequest={hook.canReviewRequest}
        canMarkUnderReview={hook.canMarkUnderReview}
        getStatusVariant={hook.getStatusVariant}
        getStatusLabel={hook.getStatusLabel}
        getPriorityColor={hook.getPriorityColor}
        getUrgencyLabel={hook.getUrgencyLabel}
      />
    );
  }

  return (
    <RequestDetailDesktop
      id={hook.id}
      toast={hook.toast}
      rejectionReason={hook.rejectionReason}
      setRejectionReason={hook.setRejectionReason}
      request={request}
      attachments={hook.attachments}
      rejectRequestMutation={hook.rejectRequestMutation}
      markUnderReviewMutation={hook.markUnderReviewMutation}
      requester={hook.requester}
      property={hook.property}
      space={hook.space}
      linkedTask={hook.linkedTask}
      canReviewRequest={hook.canReviewRequest}
      canMarkUnderReview={hook.canMarkUnderReview}
      getStatusVariant={hook.getStatusVariant}
      getStatusLabel={hook.getStatusLabel}
      getPriorityColor={hook.getPriorityColor}
      getUrgencyLabel={hook.getUrgencyLabel}
    />
  );
}

