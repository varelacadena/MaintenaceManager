import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Package,
  FileText,
  Paperclip,
  CheckCircle2,
  StickyNote,
  UserPlus,
  Layers,
  Users,
  Search,
  QrCode,
  Car,
  ScanLine,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ObjectUploader } from "@/components/ObjectUploader";
import { statusColors } from "./constants";
import { TaskResourcesSection } from "./helpers";
import { taskStatusLabels as statusLabels } from "@/lib/constants";
import { AdminDialogs } from "./AdminDialogs";
import { AdminDialogsA } from "./AdminDialogsA";
import { AdminDialogsExtra } from "./AdminDialogsExtra";
import { AdminDialogsB } from "./AdminDialogsB";
import { AdminDetailSection } from "./AdminDetailSection";
import { AdminCollapsibleSections } from "./AdminCollapsibleSections";
import { AdminViewHeader } from "./AdminViewHeader";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminView({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, toast,
    property,
    subTasks, allTaskResources,
    activeTimer, taskHelpers,
    setSummaryTaskId,
    setIsScanEquipmentOpen, setIsAddSubTaskDialogOpen,
    setIsAddNoteDialogOpen,
    safeNavigate,
    handleStartOrPause, handleComplete,
    getUploadParameters, handleAutoSaveUpload,
    startTimerMutation, stopTimerMutation,
    updateStatusMutation, addUploadMutation,
    estimateBlocksCompletion,
    isParentTask, completedSubTasks, subTaskProgress,
    isEquipmentLoading,
  } = ctx;

  if (!task) return null;

  return (
    <div className="flex flex-col h-full bg-background" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
          <AdminViewHeader ctx={ctx} />

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
