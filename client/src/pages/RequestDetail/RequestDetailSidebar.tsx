import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from "lucide-react";
import type { RequestDetailHookReturn } from "./useRequestDetail";

type RequestDetailSidebarProps = Pick<
  RequestDetailHookReturn,
  | "request"
  | "requester"
  | "property"
  | "space"
>;

export function RequestDetailSidebar({
  request,
  requester,
  property,
  space,
}: RequestDetailSidebarProps) {
  if (!request) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
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
  );
}

type AiTriageCardProps = Pick<
  RequestDetailHookReturn,
  | "user"
  | "request"
  | "aiTriageLog"
  | "aiTriageLoading"
  | "handleRunAiTriage"
  | "handleReviewAiLog"
>;

export function AiTriageCard({
  user,
  request,
  aiTriageLog,
  aiTriageLoading,
  handleRunAiTriage,
  handleReviewAiLog,
}: AiTriageCardProps) {
  if (!request || user?.role !== "admin" || request.status !== "pending") return null;

  return (
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
  );
}
