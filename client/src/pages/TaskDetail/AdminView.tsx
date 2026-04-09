import { Button } from "@/components/ui/button";
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
  Clock,
  User,
  Calendar,
  Play,
  Pause,
  Package,
  FileText,
  Trash2,
  Paperclip,
  AlertCircle,
  Building2,
  MapPin,
  DoorOpen,
  ChevronRight,
  CheckCircle2,
  StickyNote,
  UserPlus,
  Layers,
  ClipboardCheck,
  Globe,
  Users,
  ArrowLeft,
  Search,
  QrCode,
  Car,
  ScanLine,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ObjectUploader } from "@/components/ObjectUploader";
import { statusColors, urgencyColors } from "./constants";
import { MultiPropertyDisplay, TaskResourcesSection } from "./helpers";
import { taskStatusLabels as statusLabels } from "@/lib/constants";
import { AdminDialogs } from "./AdminDialogs";
import { AdminDialogsA } from "./AdminDialogsA";
import { AdminDialogsExtra } from "./AdminDialogsExtra";
import { AdminDialogsB } from "./AdminDialogsB";
import { AdminDetailSection } from "./AdminDetailSection";
import { AdminCollapsibleSections } from "./AdminCollapsibleSections";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminView({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, user, toast,
    property, multiProperties,
    equipment, space, contactStaff,
    subTasks, parentTask, allTaskResources,
    activeTimer,
    taskHelpers,
    setSummaryTaskId,
    setIsScanEquipmentOpen, setIsAddSubTaskDialogOpen,
    setIsAddNoteDialogOpen,
    safeNavigate,
    handleStartOrPause, handleComplete,
    getUploadParameters, handleAutoSaveUpload,
    startTimerMutation, stopTimerMutation,
    updateStatusMutation, addUploadMutation,
    isTechnicianOrAdmin,
    assignedUser, estimateBlocksCompletion,
    totalHours, remainingMins,
    dateLabel, isOverdue,
    isParentTask, isSubTask, completedSubTasks, subTaskProgress,
    isEquipmentLoading, deleteTaskMutation,
  } = ctx;

  if (!task) return null;

  return (
    <div className="flex flex-col h-full bg-background" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
          {isSubTask && parentTask && (
            <button
              className="flex items-center gap-1.5 text-sm text-primary"
              onClick={() => safeNavigate(`/tasks/${task.parentTaskId}`)}
              data-testid="link-back-to-parent"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to {parentTask.name}
            </button>
          )}

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold leading-tight line-clamp-2" data-testid="text-task-name">
                  {task.name}
                </h1>
              </div>

              {isTechnicianOrAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-delete-task">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. All associated data will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteTaskMutation.mutate()}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={`text-xs ${statusColors[task.status]}`} data-testid="badge-status">
                  {statusLabels[task.status]}
                </Badge>
                <Badge variant="outline" className={`text-xs capitalize ${urgencyColors[task.urgency]}`} data-testid="badge-urgency">
                  {task.urgency}
                </Badge>
                <Badge variant="secondary" className="text-xs capitalize" data-testid="badge-task-type">
                  {task.taskType.replace("_", " ")}
                </Badge>
                {task.status === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSummaryTaskId(task.id)}
                    data-testid="button-view-summary"
                  >
                    <ClipboardCheck className="w-4 h-4 mr-1" />
                    View Summary
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span data-testid="text-assignee">
                    {task.assignedToId === user?.id 
                      ? "You"
                      : assignedUser?.firstName && assignedUser?.lastName 
                        ? `${assignedUser.firstName} ${assignedUser.lastName}` 
                        : task.assignedPool === "student_pool" 
                          ? "Student Pool"
                          : task.assignedPool === "technician_pool"
                            ? "Technician Pool"
                            : "Unassigned"}
                  </span>
                </div>
                {taskHelpers.length > 0 && (
                  <div className="flex items-center gap-1" data-testid="text-helpers-count">
                    <Users className="w-3.5 h-3.5" />
                    <span>{taskHelpers.length} helper{taskHelpers.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
                <div className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span data-testid="text-due-date">{dateLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {task.requiresEstimate && (
            task.estimateStatus === "needs_estimate" ? (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md" data-testid="banner-estimate-needs">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">This task requires an estimate. Estimates must be submitted and approved before completion.</p>
              </div>
            ) : task.estimateStatus === "waiting_approval" ? (
              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-md" data-testid="banner-estimate-waiting">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <p className="text-sm text-purple-800 dark:text-purple-300">Estimates submitted and pending approval.</p>
              </div>
            ) : task.estimateStatus === "approved" ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md" data-testid="banner-estimate-approved">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-300">Estimate approved — this task can be completed.</p>
              </div>
            ) : null
          )}

          {task?.isCampusWide && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-md border border-primary/20" data-testid="display-campus-wide">
              <Globe className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">All Campus Buildings</p>
                <p className="text-sm text-muted-foreground">This task applies to all campus buildings</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">Campus-Wide</Badge>
            </div>
          )}

          {!task?.isCampusWide && multiProperties.length > 0 && (
            <MultiPropertyDisplay
              properties={multiProperties}
              isTechnicianOrAdmin={isTechnicianOrAdmin}
              safeNavigate={safeNavigate}
            />
          )}

          {!task?.isCampusWide && multiProperties.length === 0 && property && (
            isTechnicianOrAdmin ? (
              <div 
                onClick={() => safeNavigate(`/properties/${property.id}`)}
                className="flex items-center gap-2 p-3 bg-muted/50 rounded-md hover-elevate active-elevate-2 cursor-pointer" 
                data-testid="link-property"
              >
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{property.name}</p>
                  {property.address && (
                    <p className="text-sm text-muted-foreground truncate">{property.address}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md" data-testid="display-property">
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{property.name}</p>
                  {property.address && (
                    <p className="text-sm text-muted-foreground truncate">{property.address}</p>
                  )}
                </div>
              </div>
            )
          )}

          {!task?.isCampusWide && multiProperties.length === 0 && !property && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md border border-dashed border-muted-foreground/20" data-testid="display-no-location">
              <MapPin className="w-5 h-5 text-muted-foreground/50 shrink-0" />
              <p className="text-sm text-muted-foreground">No location assigned</p>
            </div>
          )}

          {!task?.isCampusWide && multiProperties.length === 0 && space && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md" data-testid="display-space">
              <DoorOpen className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{space.name}</p>
                {space.floor && (
                  <p className="text-sm text-muted-foreground">Floor {space.floor}</p>
                )}
              </div>
            </div>
          )}

          {!task?.isCampusWide && multiProperties.length === 0 && equipment && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md" data-testid="display-equipment">
              <Package className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{equipment.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{equipment.category}</p>
              </div>
            </div>
          )}

          {isParentTask && (
            <div className="space-y-3" data-testid="subtasks-section">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Sub-Tasks
                </p>
                <span className="text-sm text-muted-foreground" data-testid="text-subtask-progress">
                  {completedSubTasks} of {subTasks.length} complete
                </span>
              </div>
              <Progress value={subTaskProgress} className="h-2" data-testid="progress-subtasks" />
              <div className="space-y-2">
                {subTasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover-elevate"
                    onClick={() => safeNavigate(`/tasks/${st.id}`)}
                    data-testid={`subtask-card-${st.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {st.vehicleId ? (
                        <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{st.name}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${statusColors[st.status] || ""}`}>
                      {statusLabels[st.status] || st.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsScanEquipmentOpen(true)}
                disabled={isEquipmentLoading}
                data-testid="button-add-subtask-scan"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Scan QR to Add Sub-Task
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsAddSubTaskDialogOpen(true)}
                data-testid="button-add-subtask-search"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Equipment / Vehicle
              </Button>
            </div>
          )}

          {task.instructions && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg" data-testid="task-instructions">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Instructions</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{task.instructions}</p>
                </div>
              </div>
            </div>
          )}

          {taskHelpers.length > 0 && (
            <div className="p-4 bg-muted/30 border rounded-lg" data-testid="task-helpers-section">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium mb-2">Student Helpers</p>
                  <div className="flex flex-wrap gap-2">
                    {taskHelpers.map((h: { userId: string; user?: { id: string; name: string; email: string; role: string } }) => (
                      <Badge key={h.userId} variant="secondary" data-testid={`badge-helper-${h.userId}`}>
                        {h.user?.name || "Unknown"}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {allTaskResources.length > 0 && (
            <TaskResourcesSection resources={allTaskResources} propertyName={property?.name} />
          )}

          <AdminDetailSection ctx={ctx} />
          <AdminCollapsibleSections ctx={ctx} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-2 max-w-2xl mx-auto gap-2">
          {isParentTask ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-2" data-testid="bottom-parent-info">
              <Layers className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{completedSubTasks} of {subTasks.length} sub-tasks complete</span>
            </div>
          ) : task.status === "completed" ? (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-14 flex-col gap-0.5 text-green-600 dark:text-green-400"
              disabled
              data-testid="bottom-button-done"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span className="text-xs font-medium">Completed</span>
            </Button>
          ) : activeTimer ? (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-14 flex-col gap-0.5"
              onClick={handleStartOrPause}
              disabled={stopTimerMutation.isPending}
              data-testid="bottom-button-pause"
            >
              <Pause className="w-6 h-6" />
              <span className="text-xs font-medium">Pause Timer</span>
            </Button>
          ) : task.status === "in_progress" ? (
            <div className="flex flex-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-14 flex-col gap-0.5"
                onClick={handleStartOrPause}
                disabled={startTimerMutation.isPending}
                data-testid="bottom-button-resume"
              >
                <Play className="w-6 h-6" />
                <span className="text-xs font-medium">Resume</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="flex-1 h-14 flex-col gap-0.5 bg-green-600"
                onClick={handleComplete}
                disabled={updateStatusMutation.isPending || !!estimateBlocksCompletion}
                title={estimateBlocksCompletion ? "Estimates must be approved first" : undefined}
                data-testid="bottom-button-complete"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-xs font-medium">{estimateBlocksCompletion ? "Estimate Required" : "Complete"}</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-14 flex-col gap-0.5"
              onClick={handleStartOrPause}
              disabled={startTimerMutation.isPending}
              data-testid="bottom-button-start"
            >
              <Play className="w-6 h-6" />
              <span className="text-xs font-medium">Start Task</span>
            </Button>
          )}

          <ObjectUploader
            maxNumberOfFiles={5}
            maxFileSize={10485760}
            onGetUploadParameters={getUploadParameters}
            onComplete={handleAutoSaveUpload}
            onError={(error) => {
              toast({ title: "Upload failed", description: error.message, variant: "destructive" });
            }}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
            buttonClassName="h-14 px-4 flex-col gap-0.5 w-full"
            buttonVariant="ghost"
            buttonTestId="bottom-button-upload"
            isLoading={addUploadMutation.isPending}
          >
            <Paperclip className="w-5 h-5" />
            <span className="text-xs">Photos/Docs</span>
          </ObjectUploader>

          <Button
            variant="ghost"
            size="sm"
            className="flex-col gap-0.5 h-14 px-3"
            onClick={() => setIsScanEquipmentOpen(true)}
            disabled={isEquipmentLoading}
            data-testid="bottom-button-scan-equipment"
          >
            {isEquipmentLoading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <ScanLine className="w-5 h-5" />
            )}
            <span className="text-xs">Scan</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-12 flex-col gap-0.5"
            onClick={() => setIsAddNoteDialogOpen(true)}
            data-testid="bottom-button-add-note"
          >
            <StickyNote className="w-5 h-5" />
            <span className="text-xs">Note</span>
          </Button>
        </div>
      </div>

      <AdminDialogs ctx={ctx} />
      <AdminDialogsA ctx={ctx} />
      <AdminDialogsExtra ctx={ctx} />
      <AdminDialogsB ctx={ctx} />
    </div>
  );
}
