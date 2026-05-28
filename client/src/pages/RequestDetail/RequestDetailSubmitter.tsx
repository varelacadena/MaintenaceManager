import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileAttachmentList } from "@/components/FileAttachment";
import type { RequestDetailHookReturn } from "./useRequestDetail";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  Paperclip,
  XCircle,
} from "lucide-react";
import { getServiceRequestNumber } from "@shared/recordNumbers";

type RequestDetailSubmitterProps = Pick<
  RequestDetailHookReturn,
  | "request"
  | "attachments"
  | "property"
  | "space"
  | "linkedTask"
  | "navigate"
  | "getStatusLabel"
  | "getStatusVariant"
  | "getPriorityColor"
  | "getUrgencyLabel"
>;

export function RequestDetailSubmitter({
  request,
  attachments,
  property,
  space,
  linkedTask,
  navigate,
  getStatusLabel,
  getStatusVariant,
  getPriorityColor,
  getUrgencyLabel,
}: RequestDetailSubmitterProps) {
  if (!request) return null;

  const submittedDate = request.createdAt
    ? new Date(request.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not available";

  const statusMessage = (() => {
    switch (request.status) {
      case "under_review":
        return {
          icon: Clock,
          title: "Maintenance is reviewing your request.",
          description: "You do not need to do anything right now.",
          className: "border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-300",
        };
      case "converted_to_task":
        return {
          icon: CheckCircle2,
          title: "Your request was approved.",
          description: "It has been turned into a work order for the maintenance team.",
          className: "border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-300",
        };
      case "rejected":
        return {
          icon: XCircle,
          title: "This request was not approved.",
          description: request.rejectionReason || "Contact maintenance if you have questions.",
          className: "border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-300",
        };
      default:
        return {
          icon: Clock,
          title: "Your request was submitted.",
          description: "Maintenance will review it soon.",
          className: "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300",
        };
    }
  })();

  const StatusIcon = statusMessage.icon;

  return (
    <div className="max-w-2xl mx-auto p-3 md:p-6 space-y-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 px-0 text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/requests")}
        data-testid="button-back-to-requests"
      >
        <ArrowLeft className="h-4 w-4" />
        My requests
      </Button>

      <Card className={`border ${statusMessage.className}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <StatusIcon className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">{statusMessage.title}</p>
              <p className="text-sm opacity-90">{statusMessage.description}</p>
            </div>
          </div>
          {request.status === "converted_to_task" && linkedTask && (
            <Link href={`/tasks/${linkedTask.id}`}>
              <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 bg-background">
                <ExternalLink className="h-3.5 w-3.5" />
                View work order
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground" data-testid="text-request-id">
          Request {getServiceRequestNumber(request)}
        </p>
        <h1 className="text-xl md:text-2xl font-semibold leading-tight" data-testid="text-request-title">
          {request.title}
        </h1>
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
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-3">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">What you told us</p>
              <p className="text-sm leading-relaxed text-muted-foreground" data-testid="text-description">
                {request.description || "No description provided."}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Location</p>
              <p className="text-sm text-muted-foreground" data-testid="text-property">
                {property?.name || "Not specified"}
                {space && <span data-testid="text-space"> / {space.name}</span>}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Submitted</p>
              <p className="text-sm text-muted-foreground">{submittedDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {attachments.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Files you attached</p>
            </div>
            <FileAttachmentList attachments={attachments} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
