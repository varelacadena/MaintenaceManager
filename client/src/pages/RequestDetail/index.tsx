import { useRequestDetail } from "./useRequestDetail";
import { RequestDetailMobile } from "./RequestDetailMobile";
import { RequestDetailDesktop } from "./RequestDetailDesktop";
import { Button } from "@/components/ui/button";

export default function RequestDetail() {
  const hook = useRequestDetail();
  const { isMobile, isLoading, request, navigate } = hook;

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
        id={hook.id}
        user={hook.user}
        toast={hook.toast}
        newMessage={hook.newMessage}
        setNewMessage={hook.setNewMessage}
        rejectionReason={hook.rejectionReason}
        setRejectionReason={hook.setRejectionReason}
        detailsOpen={hook.detailsOpen}
        setDetailsOpen={hook.setDetailsOpen}
        request={request}
        messages={hook.messages}
        attachments={hook.attachments}
        users={hook.users}
        rejectRequestMutation={hook.rejectRequestMutation}
        sendMessageMutation={hook.sendMessageMutation}
        requester={hook.requester}
        property={hook.property}
        space={hook.space}
        canTakeAction={hook.canTakeAction}
        getStatusVariant={hook.getStatusVariant}
        getStatusLabel={hook.getStatusLabel}
        getPriorityColor={hook.getPriorityColor}
      />
    );
  }

  return (
    <RequestDetailDesktop
      id={hook.id}
      user={hook.user}
      toast={hook.toast}
      newMessage={hook.newMessage}
      setNewMessage={hook.setNewMessage}
      rejectionReason={hook.rejectionReason}
      setRejectionReason={hook.setRejectionReason}
      request={request}
      messages={hook.messages}
      attachments={hook.attachments}
      users={hook.users}
      rejectRequestMutation={hook.rejectRequestMutation}
      sendMessageMutation={hook.sendMessageMutation}
      requester={hook.requester}
      property={hook.property}
      space={hook.space}
      canTakeAction={hook.canTakeAction}
      getStatusVariant={hook.getStatusVariant}
      getStatusLabel={hook.getStatusLabel}
      getPriorityColor={hook.getPriorityColor}
      aiTriageLog={hook.aiTriageLog}
      aiTriageLoading={hook.aiTriageLoading}
      handleRunAiTriage={hook.handleRunAiTriage}
      handleReviewAiLog={hook.handleReviewAiLog}
    />
  );
}
