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
  Package,
  Trash2,
  AlertCircle,
  Building2,
  MapPin,
  DoorOpen,
  ChevronRight,
  CheckCircle2,
  ClipboardCheck,
  Globe,
  Users,
  ArrowLeft,
} from "lucide-react";
import { statusColors, urgencyColors } from "./constants";
import { MultiPropertyDisplay } from "./helpers";
import { taskStatusLabels as statusLabels } from "@/lib/constants";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminViewHeader({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, user,
    property, multiProperties,
    equipment, space,
    taskHelpers,
    parentTask,
    setSummaryTaskId,
    safeNavigate,
    isTechnicianOrAdmin,
    assignedUser,
    dateLabel, isOverdue,
    isSubTask, deleteTaskMutation,
  } = ctx;

  if (!task) return null;

  return (
    <>
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
    </>
  );
}
