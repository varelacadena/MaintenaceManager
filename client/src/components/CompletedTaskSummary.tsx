import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SecureImage } from "@/components/SecureImage";
import { useFileDownload } from "@/hooks/use-download";
import {
  Printer,
  Clock,
  MapPin,
  User,
  Calendar,
  Wrench,
  Package,
  DollarSign,
  FileText,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Download,
  Car,
  Flag,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import type {
  Task,
  TimeEntry,
  PartUsed,
  Upload,
  Quote,
  Equipment,
  Property,
  User as UserType,
  Vehicle,
} from "@shared/schema";
import { useState } from "react";
import {
  urgencyBadgeStyles as urgencyColors,
  statusBadgeStyles as statusColors,
  statusLabels,
} from "@/utils/taskUtils";

interface CompletedTaskSummaryProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function isImageFile(fileType: string): boolean {
  return fileType.startsWith("image/");
}

export function CompletedTaskSummary({ taskId, open, onOpenChange }: CompletedTaskSummaryProps) {
  const { downloadFile } = useFileDownload();
  const [subSummaryTaskId, setSubSummaryTaskId] = useState<string | null>(null);

  const { data: task, isLoading: taskLoading } = useQuery<Task>({
    queryKey: ["/api/tasks", taskId],
    enabled: open && !!taskId,
  });

  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries/task", taskId],
    enabled: open && !!taskId,
  });

  const { data: parts = [] } = useQuery<PartUsed[]>({
    queryKey: ["/api/parts/task", taskId],
    enabled: open && !!taskId,
  });

  const { data: uploads = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/task", taskId],
    enabled: open && !!taskId,
  });

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/tasks", taskId, "quotes"],
    enabled: open && !!taskId,
  });

  const { data: equipmentData } = useQuery<Equipment>({
    queryKey: ["/api/equipment", task?.equipmentId],
    enabled: open && !!task?.equipmentId,
  });

  const { data: vehicleData } = useQuery<Vehicle>({
    queryKey: ["/api/vehicles", task?.vehicleId],
    enabled: open && !!task?.vehicleId,
  });

  const { data: property } = useQuery<Property>({
    queryKey: ["/api/properties", task?.propertyId],
    enabled: open && !!task?.propertyId,
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: open,
  });

  const { data: subTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", taskId, "subtasks"],
    enabled: open && !!taskId,
  });

  const assignee = task?.assignedToId ? users.find(u => u.id === task.assignedToId) : null;
  const assigneeName = assignee
    ? (assignee.firstName && assignee.lastName ? `${assignee.firstName} ${assignee.lastName}` : assignee.username)
    : "Unassigned";

  const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);

  const partsCost = parts.reduce((sum, p) => sum + (p.cost * parseFloat(String(p.quantity))), 0);

  const approvedQuote = quotes.find(q => q.status === "approved");
  const quoteCost = approvedQuote?.estimatedCost || 0;
  const totalCost = partsCost + quoteCost;

  const imageUploads = uploads.filter(u => isImageFile(u.fileType));
  const documentUploads = uploads.filter(u => !isImageFile(u.fileType));

  const handlePrint = () => {
    window.print();
  };

  if (subSummaryTaskId) {
    return (
      <>
        <Sheet open={open} onOpenChange={(o) => {
          if (!o) setSubSummaryTaskId(null);
          onOpenChange(o);
        }}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-2xl overflow-y-auto print:overflow-visible print:max-w-none print:w-full print:shadow-none print:border-none"
            data-testid="sheet-completed-task-summary"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Sub-Task Summary</SheetTitle>
              <SheetDescription>Sub-task details</SheetDescription>
            </SheetHeader>
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSubSummaryTaskId(null)}
                data-testid="button-back-to-parent-summary"
              >
                Back to parent summary
              </Button>
            </div>
            <SummaryContent
              taskId={subSummaryTaskId}
              onSubTaskClick={setSubSummaryTaskId}
              onPrint={handlePrint}
              onDownload={downloadFile}
            />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto print:overflow-visible print:max-w-none print:w-full print:shadow-none print:border-none"
        data-testid="sheet-completed-task-summary"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Task Summary</SheetTitle>
          <SheetDescription>Completed task details</SheetDescription>
        </SheetHeader>
        <SummaryContent
          taskId={taskId}
          onSubTaskClick={setSubSummaryTaskId}
          onPrint={handlePrint}
          onDownload={downloadFile}
        />
      </SheetContent>
    </Sheet>
  );
}

function SummaryContent({
  taskId,
  onSubTaskClick,
  onPrint,
  onDownload,
}: {
  taskId: string;
  onSubTaskClick: (id: string) => void;
  onPrint: () => void;
  onDownload: (uploadId: string, objectUrl: string) => Promise<boolean>;
}) {
  const { data: task, isLoading: taskLoading } = useQuery<Task>({
    queryKey: ["/api/tasks", taskId],
    enabled: !!taskId,
  });

  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries/task", taskId],
    enabled: !!taskId,
  });

  const { data: parts = [] } = useQuery<PartUsed[]>({
    queryKey: ["/api/parts/task", taskId],
    enabled: !!taskId,
  });

  const { data: uploads = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/task", taskId],
    enabled: !!taskId,
  });

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/tasks", taskId, "quotes"],
    enabled: !!taskId,
  });

  const { data: equipmentData } = useQuery<Equipment>({
    queryKey: ["/api/equipment", task?.equipmentId],
    enabled: !!task?.equipmentId,
  });

  const { data: vehicleData } = useQuery<Vehicle>({
    queryKey: ["/api/vehicles", task?.vehicleId],
    enabled: !!task?.vehicleId,
  });

  const { data: property } = useQuery<Property>({
    queryKey: ["/api/properties", task?.propertyId],
    enabled: !!task?.propertyId,
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: subTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", taskId, "subtasks"],
    enabled: !!taskId,
  });

  const assignee = task?.assignedToId ? users.find(u => u.id === task.assignedToId) : null;
  const assigneeName = assignee
    ? (assignee.firstName && assignee.lastName ? `${assignee.firstName} ${assignee.lastName}` : assignee.username)
    : "Unassigned";

  const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);

  const partsCost = parts.reduce((sum, p) => sum + (p.cost * parseFloat(String(p.quantity))), 0);

  const approvedQuote = quotes.find(q => q.status === "approved");
  const quoteCost = approvedQuote?.estimatedCost || 0;
  const totalCost = partsCost + quoteCost;

  const imageUploads = uploads.filter(u => isImageFile(u.fileType));
  const documentUploads = uploads.filter(u => !isImageFile(u.fileType));

  if (taskLoading) {
    return (
      <div className="space-y-4 pt-6" data-testid="summary-loading">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground" data-testid="summary-not-found">
        Task not found
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2 print:pt-0" data-testid="summary-content">
      <div className="flex items-start justify-between gap-4 flex-wrap" data-testid="summary-header">
        <div className="space-y-1 min-w-0 flex-1">
          <h2 className="text-xl font-semibold leading-tight" data-testid="text-task-name">
            {task.name}
          </h2>
          <p className="text-sm text-muted-foreground" data-testid="text-task-id">
            Reference: {task.id.slice(0, 8).toUpperCase()}
          </p>
          {task.actualCompletionDate && (
            <p className="text-sm text-muted-foreground" data-testid="text-completion-date">
              Completed {format(new Date(task.actualCompletionDate), "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`${statusColors[task.status] || ""} text-xs font-semibold uppercase tracking-wider no-default-hover-elevate`}
            data-testid="badge-task-status"
          >
            {statusLabels[task.status] || task.status}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={onPrint}
            className="print:hidden"
            data-testid="button-print-summary"
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card data-testid="section-overview">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Overview
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {property && (
              <div className="flex items-start gap-2" data-testid="text-property">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Location</p>
                  <p>{property.name}</p>
                </div>
              </div>
            )}
            {equipmentData && (
              <div className="flex items-start gap-2" data-testid="text-equipment">
                <Wrench className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Equipment</p>
                  <p>{equipmentData.name}</p>
                </div>
              </div>
            )}
            {vehicleData && (
              <div className="flex items-start gap-2" data-testid="text-vehicle">
                <Car className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Vehicle</p>
                  <p>{vehicleData.make} {vehicleData.model} {vehicleData.year} — {vehicleData.vehicleId}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2" data-testid="text-assignee">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Technician</p>
                <p>{assigneeName}</p>
              </div>
            </div>
            <div className="flex items-start gap-2" data-testid="text-urgency">
              <Flag className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Urgency</p>
                <Badge
                  variant="outline"
                  className={`${urgencyColors[task.urgency] || ""} text-[10px] no-default-hover-elevate`}
                >
                  {task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1)}
                </Badge>
              </div>
            </div>
            <div className="flex items-start gap-2" data-testid="text-dates">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Date Range</p>
                <p>
                  {format(new Date(task.initialDate), "MMM d")}
                  {task.actualCompletionDate && (
                    <> — {format(new Date(task.actualCompletionDate), "MMM d, yyyy")}</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {timeEntries.length > 0 && (
        <Card data-testid="section-time">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Time Summary
            </h3>
            <div className="flex items-center gap-2 text-lg font-semibold" data-testid="text-total-time">
              {formatDuration(totalMinutes)}
              <span className="text-sm font-normal text-muted-foreground">total</span>
            </div>
            <Separator />
            <div className="space-y-2">
              {timeEntries.map((entry) => {
                const entryUser = users.find(u => u.id === entry.userId);
                const entryName = entryUser
                  ? (entryUser.firstName && entryUser.lastName
                      ? `${entryUser.firstName} ${entryUser.lastName}`
                      : entryUser.username)
                  : "Unknown";
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 text-sm"
                    data-testid={`row-time-entry-${entry.id}`}
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{entry.startTime ? format(new Date(entry.startTime), "MMM d") : "-"}</span>
                      <span>{entryName}</span>
                    </div>
                    <span className="font-medium">
                      {entry.durationMinutes ? formatDuration(entry.durationMinutes) : "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {task.description && (
        <Card data-testid="section-work-performed">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Work Performed
            </h3>
            <p className="text-sm whitespace-pre-wrap" data-testid="text-description">
              {task.description}
            </p>
          </CardContent>
        </Card>
      )}

      {parts.length > 0 && (
        <Card data-testid="section-parts">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              Parts & Materials
            </h3>
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium pb-1 border-b">
                <span>Part</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Cost</span>
                <span className="text-right">Total</span>
              </div>
              {parts.map((part) => {
                const qty = parseFloat(String(part.quantity));
                const lineTotal = part.cost * qty;
                return (
                  <div
                    key={part.id}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1 text-sm py-1"
                    data-testid={`row-part-${part.id}`}
                  >
                    <span>{part.partName}</span>
                    <span className="text-right">{qty}</span>
                    <span className="text-right">${part.cost.toFixed(2)}</span>
                    <span className="text-right font-medium">${lineTotal.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm font-semibold" data-testid="text-parts-total">
              <span>Parts Total</span>
              <span>${partsCost.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {approvedQuote && (
        <Card data-testid="section-quotes">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Estimates / Quotes
            </h3>
            <div className="text-sm space-y-1" data-testid="text-approved-quote">
              {approvedQuote.vendorName && (
                <p><span className="text-muted-foreground">Vendor:</span> {approvedQuote.vendorName}</p>
              )}
              <p><span className="text-muted-foreground">Cost:</span> ${approvedQuote.estimatedCost.toFixed(2)}</p>
              {approvedQuote.notes && (
                <p><span className="text-muted-foreground">Notes:</span> {approvedQuote.notes}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(parts.length > 0 || approvedQuote) && (
        <div className="flex items-center justify-between px-1 text-base font-semibold" data-testid="text-grand-total">
          <span>Grand Total</span>
          <span>${totalCost.toFixed(2)}</span>
        </div>
      )}

      {(imageUploads.length > 0 || documentUploads.length > 0) && (
        <Card data-testid="section-photos">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4 text-muted-foreground" />
              Photos & Documents
            </h3>
            {imageUploads.length > 0 && (
              <div className="grid grid-cols-3 gap-2" data-testid="grid-photos">
                {imageUploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="aspect-square rounded-md overflow-hidden cursor-pointer"
                    onClick={() => onDownload(upload.id, upload.objectUrl)}
                    data-testid={`img-upload-${upload.id}`}
                  >
                    <SecureImage
                      uploadId={upload.id}
                      objectUrl={upload.objectUrl}
                      fileName={upload.fileName}
                      className="w-full h-full object-cover"
                      alt={upload.fileName}
                    />
                  </div>
                ))}
              </div>
            )}
            {documentUploads.length > 0 && (
              <div className="space-y-1" data-testid="list-documents">
                {documentUploads.map((upload) => (
                  <Button
                    key={upload.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-sm"
                    onClick={() => onDownload(upload.id, upload.objectUrl)}
                    data-testid={`button-download-${upload.id}`}
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span className="truncate">{upload.fileName}</span>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {subTasks.length > 0 && (
        <Card data-testid="section-subtasks">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              Sub-Tasks
            </h3>
            <div className="space-y-2">
              {subTasks.map((sub) => {
                const subAssignee = sub.assignedToId ? users.find(u => u.id === sub.assignedToId) : null;
                const subName = subAssignee
                  ? (subAssignee.firstName && subAssignee.lastName
                      ? `${subAssignee.firstName} ${subAssignee.lastName}`
                      : subAssignee.username)
                  : "Unassigned";
                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 cursor-pointer hover-elevate"
                    onClick={() => onSubTaskClick(sub.id)}
                    data-testid={`card-subtask-${sub.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{sub.name}</p>
                      <p className="text-xs text-muted-foreground">{subName}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`${statusColors[sub.status] || ""} text-[10px] no-default-hover-elevate`}
                      >
                        {statusLabels[sub.status] || sub.status}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
