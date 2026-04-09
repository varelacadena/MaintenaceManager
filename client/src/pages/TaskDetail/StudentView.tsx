import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Package,
  ArrowLeft,
  Paperclip,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  Camera,
  Layers,
  BookOpen,
  Car,
  MapPin,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { ObjectUploader } from "@/components/ObjectUploader";
import { statusColors } from "./constants";
import { taskStatusLabels as statusLabels } from "@/lib/constants";
import type { TaskDetailContext } from "./useTaskDetail";
import { StudentBottomBar, StudentDialogs } from "./StudentViewSections";

export function StudentView({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, safeNavigate, isSubTask, parentTask, isParentTask, subTasks,
    completedSubTasks, subTaskProgress, property, space, checklistGroups,
    uploads, activeTimer, totalHours, remainingMins,
    totalChecklistItems, completedChecklistItems,
    addNoteMutation, toggleChecklistItemMutation,
    getUploadParameters, handleAutoSaveUpload, toast, taskIsHelper,
    allTaskResources, setIsResourcesSheetOpen,
    addUploadMutation, notes, estimateBlocksCompletion,
    newNote, setNewNote,
  } = ctx;

  if (!task) return null;

  return (
      <div className="flex flex-col h-full bg-background pb-28">
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">
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
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold leading-tight" data-testid="text-task-name">
                  {task.name}
                </h1>
                {taskIsHelper && (
                  <Badge variant="outline" data-testid="badge-helper">Helper</Badge>
                )}
              </div>
              {property && (
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {property.name}
                  {space && ` - ${space.name}`}
                </p>
              )}
            </div>

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
              </div>
            )}

            {task.instructions && (
              <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-lg" data-testid="task-instructions">
                <p className="font-semibold text-sm mb-1 text-primary">Instructions</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.instructions}</p>
              </div>
            )}

            {task.description && !task.instructions && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm leading-relaxed" data-testid="text-description">{task.description}</p>
              </div>
            )}

            {task.requiresEstimate && (
              task.estimateStatus === "approved" ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md" data-testid="banner-estimate-approved">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-300">Estimate approved — you can complete this task.</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md" data-testid="banner-estimate-pending">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">This task requires approved estimates. Contact your supervisor.</p>
                </div>
              )
            )}

            {allTaskResources.length > 0 && (
              <button
                className="flex items-center justify-between w-full p-4 bg-muted/30 rounded-lg text-left cursor-pointer hover-elevate"
                onClick={() => setIsResourcesSheetOpen(true)}
                data-testid="button-resources"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span className="font-medium">Resources</span>
                  <Badge variant="secondary">{allTaskResources.length}</Badge>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}

            {checklistGroups.length > 0 && (
              <div className="space-y-3">
                <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Checklist ({completedChecklistItems}/{totalChecklistItems})
                </p>
                {checklistGroups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    {checklistGroups.length > 1 && (
                      <p className="text-sm font-medium">{group.name}</p>
                    )}
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-4 p-4 bg-muted/30 rounded-lg min-h-[56px] ${taskIsHelper ? "opacity-80" : "cursor-pointer active-elevate-2"}`}
                        onClick={taskIsHelper ? undefined : () => toggleChecklistItemMutation.mutate({ itemId: item.id, isCompleted: !item.isCompleted })}
                        data-testid={`checklist-item-${item.id}`}
                      >
                        <Checkbox checked={item.isCompleted} disabled={taskIsHelper} className="w-6 h-6" />
                        <span className={`text-base flex-1 ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-muted/30 rounded-lg flex items-center justify-between" data-testid="time-logged-card">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeTimer ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted"}`}>
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time Logged</p>
                  <p className="text-xl font-bold" data-testid="text-time-logged">{totalHours}h {remainingMins}m</p>
                </div>
              </div>
              {activeTimer && (
                <Badge variant="default" className="animate-pulse">Running</Badge>
              )}
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Notes</p>
              <div className="flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this task..."
                  rows={3}
                  className="text-base"
                  data-testid="textarea-new-note"
                />
              </div>
              {newNote.trim() && (
                <Button
                  className="w-full"
                  onClick={() => addNoteMutation.mutate({ content: newNote, noteType: "job_note" })}
                  disabled={addNoteMutation.isPending}
                  data-testid="button-submit-note"
                >
                  Save Note
                </Button>
              )}
              {notes.length > 0 && (
                <div className="space-y-2">
                  {notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {note.createdAt && formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Photos</p>
              <div className="grid grid-cols-2 gap-3">
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={10485760}
                  onGetUploadParameters={getUploadParameters}
                  onComplete={handleAutoSaveUpload}
                  onError={(error) => {
                    toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                  }}
                  buttonVariant="outline"
                  buttonClassName="h-14 flex-col gap-1 w-full"
                  buttonTestId="button-take-photo"
                  isLoading={addUploadMutation.isPending}
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-medium">Take Photo</span>
                </ObjectUploader>

                {uploads.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg" data-testid="text-photo-count">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{uploads.length} photo{uploads.length !== 1 ? "s" : ""} attached</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <StudentBottomBar ctx={ctx} />
        <StudentDialogs ctx={ctx} />
      </div>
  );
}
