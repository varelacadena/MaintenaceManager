import { lazy, Suspense, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Flag,
  Calendar,
  Clock,
  ChevronRight,
  FileText,
  Video,
  Package,
  CheckCircle2,
  Plus,
  MoreVertical,
  MapPin,
  User as UserIcon,
  Play,
  Loader2,
  Image as ImageIcon,
  Wrench,
  Copy,
  ListChecks,
  ClipboardList,
  Map,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { User, TimeEntry, Property } from "@shared/schema";
import { toDisplayUrl } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";
import { minutesToHoursInputValue } from "@/lib/timeEntryUtils";
import { PhotoThumbnailGrid } from "./PanelResourcesSection";
import { PanelNoteList } from "./PanelNotesSection";
import { PanelPhotoUploadTrigger } from "./PanelPhotoUploadTrigger";
import { PanelFileInput } from "./PanelFileInput";
import { taskTypeLabels, getAvatarHexColor as getAvatarColorForId, formatTaskReferenceId } from "@/utils/taskUtils";
import { TaskDetailPanelDialogs } from "./TaskDetailPanelDialogs";
import type { TaskDetailPanelContext } from "./useTaskDetailPanel";
import { Link } from "wouter";

const PropertyMap = lazy(() => import("@/components/PropertyMap"));

interface PanelAdminFullscreenProps {
  ctx: TaskDetailPanelContext;
  onClose: () => void;
  allUsers?: User[];
  taskId: string;
}

function DossierCard({
  title,
  icon,
  badge,
  action,
  children,
  className,
  testId,
  contentClassName,
}: {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={cn("rounded-xl border border-border bg-card shadow-sm flex flex-col min-h-0", className)}
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && <span className="text-primary shrink-0">{icon}</span>}
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
          {badge}
        </div>
        {action}
      </div>
      <div className={cn("p-5 flex-1 min-h-0", contentClassName)}>{children}</div>
    </section>
  );
}

function MetaStripItem({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-4 min-w-0 sm:px-5 border-b sm:border-b-0 sm:border-r border-border last:border-r-0 last:border-b-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function formatLoggedTime(totalMinutes: number): string {
  if (totalMinutes <= 0) return "Not logged";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function getPropertyCoordinates(property?: Property | null): { lat: number; lng: number } | null {
  if (!property?.coordinates) return null;
  const coords = property.coordinates as { type?: string; coordinates?: number[] };
  if (coords.type === "Point" && Array.isArray(coords.coordinates) && coords.coordinates.length >= 2) {
    const [lng, lat] = coords.coordinates;
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  }
  return null;
}

export function PanelAdminFullscreen({ ctx, onClose, allUsers, taskId }: PanelAdminFullscreenProps) {
  const { toast } = useToast();
  const {
    isMobile, task, subtasks, uploads, taskParts, taskNotes,
    timeEntries, totalMinutes, statusPill, statusDot, statusLabel,
    urg, isOverdue, property, assignee, assigneeInitials, assigneeName,
    completedSubtasks, totalSubtasks, allSubtasksComplete,
    checklistGroups, totalChecklistItems, completedChecklistItems,
    toggleChecklistItemMutation,
    editingNoteId, setEditingNoteId, editNoteContent, setEditNoteContent,
    updateNoteMutation, setDeleteNoteId, setIsAddNoteDialogOpen,
    setIsEditMode, setDeleteDialogOpen,
    setEditingTimeEntryId, setEditTimeDuration, setDeleteTimeEntryId,
    setIsLogTimeDialogOpen,
    isNotStarted, isStarted, handleStartTask, handleMarkComplete, updateStatusMutation,
    isAdmin,
    fileInputRef, handleFileUpload, isFileUploading,
  } = ctx;

  if (!task) return null;

  const images = uploads?.filter((u) => u.fileType.startsWith("image/")) ?? [];
  const otherFiles = uploads?.filter((u) => !u.fileType.startsWith("image/")) ?? [];
  const coords = getPropertyCoordinates(property);
  const siteLabel = property?.name || "No site assigned";
  const siteDetail = property?.address || (coords
    ? `${Math.abs(coords.lat).toFixed(6)}° ${coords.lat >= 0 ? "N" : "S"}, ${Math.abs(coords.lng).toFixed(6)}° ${coords.lng >= 0 ? "E" : "W"}`
    : null);

  const copySite = async () => {
    const text = [siteLabel, property?.address].filter(Boolean).join(" — ");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Site location copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const adminActionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={isMobile ? "h-9 w-9 shrink-0" : undefined}
          data-testid="button-admin-more-menu"
        >
          <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isMobile && isNotStarted && (
          <DropdownMenuItem className="gap-2" onClick={handleStartTask} disabled={updateStatusMutation.isPending} data-testid="button-admin-start-task-mobile">
            <Play className="w-4 h-4" />
            Start Task
          </DropdownMenuItem>
        )}
        {isMobile && isStarted && (
          <DropdownMenuItem
            className="gap-2"
            onClick={handleMarkComplete}
            disabled={updateStatusMutation.isPending || (totalSubtasks > 0 && !allSubtasksComplete)}
            data-testid="button-admin-mark-complete-mobile"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete Task
          </DropdownMenuItem>
        )}
        {isMobile && (
          <DropdownMenuItem className="gap-2" onClick={() => setIsEditMode(true)} data-testid="button-admin-edit-mobile">
            <Pencil className="w-4 h-4" />
            Edit Task
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="text-red-600 gap-2" onClick={() => setDeleteDialogOpen(true)} data-testid="button-admin-delete">
          <Trash2 className="w-4 h-4" />
          Delete Task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="h-full flex flex-col bg-muted/30" data-testid="task-detail-panel">
      <div className="flex-1 overflow-y-auto">
        <div className={cn("mx-auto w-full space-y-5", isMobile ? "px-4 py-5" : "max-w-6xl px-6 py-6")}>
          {isMobile && (
            <div className="sticky top-0 z-10 -mx-4 px-4 py-2 flex items-center justify-between gap-3 bg-muted/30 backdrop-blur-sm border-b border-border/60">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-w-0"
                data-testid="button-panel-close"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="truncate">Return to Work</span>
              </button>
              {adminActionsMenu}
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="space-y-3 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs" data-testid="text-task-id">
                  {formatTaskReferenceId(task.id)}
                </Badge>
                <Badge
                  className="gap-1.5 uppercase text-[10px] tracking-wider font-semibold border-0"
                  style={{ backgroundColor: statusPill.bg, color: statusPill.text }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusDot }} />
                  {statusLabel}
                </Badge>
                <Badge variant="outline" className="gap-1.5 text-xs" style={{ color: urg.color, borderColor: `${urg.color}40` }}>
                  <Flag className="w-3 h-3" style={{ color: urg.color }} />
                  {urg.label} priority
                </Badge>
              </div>
              <h1
                className={cn("font-semibold leading-tight text-foreground", isMobile ? "text-2xl" : "text-3xl")}
                data-testid="text-panel-task-title"
              >
                {task.name}
              </h1>
              {task.description ? (
                <p
                  className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap max-w-3xl"
                  data-testid="text-panel-task-description"
                >
                  {task.description}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {taskTypeLabels[task.taskType] || task.taskType}
                {" · "}
                {task.executorType === "student" ? "Student pool" : "Technician pool"}
              </p>
            </div>

            {!isMobile && (
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {isNotStarted && (
                  <Button
                    className="gap-2"
                    onClick={handleStartTask}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-admin-start-task"
                  >
                    {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Start Task
                  </Button>
                )}
                {isStarted && (
                  <Button
                    className="gap-2 bg-green-700 hover:bg-green-800 text-white"
                    onClick={handleMarkComplete}
                    disabled={updateStatusMutation.isPending || (totalSubtasks > 0 && !allSubtasksComplete)}
                    data-testid="button-admin-mark-complete"
                  >
                    {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Complete Task
                  </Button>
                )}
                <Button variant="outline" className="gap-2" onClick={() => setIsEditMode(true)} data-testid="button-admin-edit">
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
                {adminActionsMenu}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <MetaStripItem icon={<UserIcon className="w-3.5 h-3.5" />} label="Lead technician">
                {assignee ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback
                        className="text-xs text-white"
                        style={{ backgroundColor: getAvatarColorForId(assignee.id) }}
                      >
                        {assigneeInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{assigneeName}</p>
                      <p className="text-xs text-muted-foreground truncate">{assignee.role || "Technician"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                )}
              </MetaStripItem>
              <MetaStripItem icon={<Calendar className="w-3.5 h-3.5" />} label="Scheduled target">
                <p className={cn("text-sm font-medium", isOverdue && "text-destructive")}>
                  {task.estimatedCompletionDate
                    ? format(new Date(task.estimatedCompletionDate), "MMM d, yyyy")
                    : "Not set"}
                </p>
              </MetaStripItem>
              <MetaStripItem icon={<Clock className="w-3.5 h-3.5" />} label="Time logged">
                <p className="text-sm font-medium">{formatLoggedTime(totalMinutes)}</p>
              </MetaStripItem>
              <MetaStripItem icon={<MapPin className="w-3.5 h-3.5" />} label="Assigned site">
                <div className="flex items-start gap-2 min-w-0">
                  <p className="text-sm font-medium truncate flex-1">{siteLabel}</p>
                  {property && (
                    <button
                      type="button"
                      onClick={copySite}
                      className="shrink-0 text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  )}
                </div>
                {siteDetail && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{siteDetail}</p>
                )}
              </MetaStripItem>
            </div>
          </div>

          <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
            <DossierCard
              title="Field notes"
              icon={<FileText className="w-4 h-4" />}
              className="lg:row-span-1"
              testId="panel-field-notes"
            >
              {taskNotes.length > 0 ? (
                <PanelNoteList
                  embedded
                  taskNotes={taskNotes}
                  allUsers={allUsers}
                  editingNoteId={editingNoteId}
                  setEditingNoteId={setEditingNoteId}
                  editNoteContent={editNoteContent}
                  setEditNoteContent={setEditNoteContent}
                  setDeleteNoteId={setDeleteNoteId}
                  setIsAddNoteDialogOpen={setIsAddNoteDialogOpen}
                  updateNoteMutation={updateNoteMutation}
                  isAdmin={isAdmin}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No notes yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setIsAddNoteDialogOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add note
                  </Button>
                </div>
              )}
            </DossierCard>

            <DossierCard
              title="Equipment & spare parts"
              icon={<Wrench className="w-4 h-4" />}
              badge={
                taskParts.length > 0 ? (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {taskParts.length} allocated
                  </Badge>
                ) : null
              }
            >
              {taskParts.length === 0 ? (
                <div className="rounded-lg border border-dashed py-8 px-4 text-center">
                  <Package className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">No parts recorded</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {taskParts.map((part) => (
                    <li
                      key={part.id}
                      className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5"
                      data-testid={`panel-part-${part.id}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{part.partName}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty {part.quantity}
                          {part.cost != null && Number(part.cost) > 0 && ` · $${Number(part.cost).toFixed(2)}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DossierCard>

            <DossierCard
              title="Photographic evidence"
              icon={<ImageIcon className="w-4 h-4" />}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isFileUploading}
                  data-testid="button-admin-fullscreen-add-photo"
                >
                  {isFileUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Attach photo
                </Button>
              }
            >
              <PhotoThumbnailGrid
                uploads={images}
                columns={isMobile ? 3 : 4}
                trailing={
                  <PanelPhotoUploadTrigger
                    onClick={() => fileInputRef.current?.click()}
                    isUploading={isFileUploading}
                    testId="button-admin-fullscreen-add-photo-grid"
                  />
                }
              />
              {otherFiles.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    Documents ({otherFiles.length})
                  </p>
                  <div className="space-y-1.5">
                    {otherFiles.map((upload) => {
                      const isVideo = upload.fileType.startsWith("video/");
                      const TypeIcon = isVideo ? Video : FileText;
                      const ext = upload.fileName.split(".").pop()?.toLowerCase() || "";
                      const typeLabel = isVideo ? "VID"
                        : ext === "pdf" ? "PDF" : ext === "xls" || ext === "xlsx" ? "XLS"
                        : ext === "doc" || ext === "docx" ? "DOC" : "FILE";
                      return (
                        <a
                          key={upload.id}
                          href={toDisplayUrl(upload.objectUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
                          data-testid={`resource-item-${upload.id}`}
                        >
                          <TypeIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <Badge variant="outline" className="text-[10px] shrink-0">{typeLabel}</Badge>
                          <span className="text-sm truncate flex-1">{upload.fileName}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </DossierCard>

            <DossierCard
              title="Site location"
              icon={<MapPin className="w-4 h-4" />}
              contentClassName="p-0 flex flex-col"
              testId="task-site-location-card"
            >
              {property?.coordinates ? (
                <Suspense
                  fallback={
                    <div
                      className="flex items-center justify-center text-sm text-muted-foreground"
                      style={{ minHeight: isMobile ? 280 : 400 }}
                    >
                      Loading map...
                    </div>
                  }
                >
                  <div className="relative z-0 w-full" style={{ minHeight: isMobile ? 280 : 400 }}>
                    <PropertyMap
                      properties={[property]}
                      selectedPropertyId={property.id}
                      editable={false}
                    />
                  </div>
                </Suspense>
              ) : (
                <div
                  className="flex items-center justify-center text-center text-muted-foreground p-6"
                  style={{ minHeight: isMobile ? 200 : 280 }}
                >
                  <div>
                    <Map className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium text-sm">
                      {property ? "No map location set" : "No site assigned"}
                    </p>
                    <p className="text-xs mt-1">
                      {property
                        ? "Use the Properties map to draw this property location."
                        : "Assign a property to show site details."}
                    </p>
                  </div>
                </div>
              )}
              <div className="px-5 py-4 border-t border-border space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{siteLabel}</p>
                    {property?.address && (
                      <p className="text-xs text-muted-foreground mt-1">{property.address}</p>
                    )}
                    {coords && !property?.address && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {Math.abs(coords.lat).toFixed(4)}° {coords.lat >= 0 ? "N" : "S"} · {Math.abs(coords.lng).toFixed(4)}° {coords.lng >= 0 ? "E" : "W"}
                      </p>
                    )}
                  </div>
                  {property && (
                    <Link href={`/properties/${property.id}`}>
                      <Button variant="outline" size="sm" className="shrink-0 h-8 text-xs gap-1.5">
                        View property
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </DossierCard>
          </div>

          {totalSubtasks > 0 && (
            <DossierCard
              title="Subtasks"
              icon={<ListChecks className="w-4 h-4" />}
              badge={
                <Badge variant="secondary" className="text-[10px] font-normal tabular-nums">
                  {completedSubtasks}/{totalSubtasks}
                </Badge>
              }
            >
              <div className="w-full rounded-full overflow-hidden mb-4 h-1.5 bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                />
              </div>
              <ul className="space-y-1">
                {subtasks?.map((subtask) => {
                  const isSubCompleted = subtask.status === "completed";
                  return (
                    <li key={subtask.id} className="flex items-center gap-3 py-2 px-1" data-testid={`panel-subtask-${subtask.id}`}>
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                          isSubCompleted ? "border-primary bg-primary" : "border-muted-foreground/40",
                        )}
                      >
                        {isSubCompleted && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                      </span>
                      <span className={cn("text-sm flex-1", isSubCompleted && "line-through text-muted-foreground")}>
                        {subtask.name}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </DossierCard>
          )}

          {totalChecklistItems > 0 && (
            <DossierCard
              title="Checklists"
              icon={<ClipboardList className="w-4 h-4" />}
              badge={
                <Badge variant="secondary" className="text-[10px] font-normal tabular-nums">
                  {completedChecklistItems}/{totalChecklistItems}
                </Badge>
              }
              testId="panel-checklists"
            >
              <div className="w-full rounded-full overflow-hidden mb-4 h-1.5 bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${(completedChecklistItems / totalChecklistItems) * 100}%` }}
                />
              </div>
              <div className="space-y-4">
                {checklistGroups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.name}
                    </p>
                    <ul className="space-y-1">
                      {group.items.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className="flex items-center gap-3 w-full py-2 px-1 text-left rounded-md hover-elevate"
                            onClick={() =>
                              toggleChecklistItemMutation.mutate({
                                itemId: item.id,
                                isCompleted: !item.isCompleted,
                              })
                            }
                            data-testid={`checklist-item-${item.id}`}
                          >
                            <Checkbox
                              checked={item.isCompleted}
                              className="w-5 h-5 shrink-0 pointer-events-none"
                            />
                            <span
                              className={cn(
                                "text-sm flex-1",
                                item.isCompleted && "line-through text-muted-foreground",
                              )}
                            >
                              {item.text}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </DossierCard>
          )}

          <DossierCard
            title="Time log"
            icon={<Clock className="w-4 h-4" />}
            badge={
              <Badge variant="secondary" className="text-[10px] font-normal">
                {formatLoggedTime(totalMinutes)}
              </Badge>
            }
            testId="panel-right-sidebar"
          >
            {timeEntries.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 px-4 text-center">
                <Clock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No time logged yet</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {timeEntries.map((entry: TimeEntry) => {
                  const entryUser = allUsers?.find((u) => u.id === entry.userId);
                  const isRunning = entry.startTime && !entry.endTime;
                  const duration = entry.durationMinutes
                    ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m`
                    : isRunning ? "Running" : "—";
                  return (
                    <li key={entry.id} className="flex items-center justify-between gap-3" data-testid={`panel-history-${entry.id}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {entryUser
                            ? `${entryUser.firstName || ""} ${entryUser.lastName || ""}`.trim() || entryUser.username
                            : "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant={isRunning ? "default" : "outline"} className="text-xs font-medium">
                          {duration}
                        </Badge>
                        {!isRunning && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingTimeEntryId(entry.id);
                                setEditTimeDuration(minutesToHoursInputValue(entry.durationMinutes || 0));
                              }}
                              data-testid={`button-edit-time-${entry.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setDeleteTimeEntryId(entry.id)}
                              data-testid={`button-delete-time-${entry.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 gap-2 border-dashed"
              onClick={() => setIsLogTimeDialogOpen(true)}
              data-testid="button-panel-log-time-inline"
            >
              <Plus className="w-3.5 h-3.5" />
              Log time
            </Button>
          </DossierCard>
        </div>
      </div>

      <PanelFileInput fileInputRef={fileInputRef} onChange={handleFileUpload} />
      <TaskDetailPanelDialogs ctx={ctx} />
    </div>
  );
}
