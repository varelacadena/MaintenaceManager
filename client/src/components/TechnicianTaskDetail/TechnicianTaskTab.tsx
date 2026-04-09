import {
  Check,
  Lock,
  ChevronRight,
  FileText,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toDisplayUrl } from "@/lib/imageUtils";
import { format } from "date-fns";
import type { Task, TaskNote, Upload } from "@shared/schema";
import type { ChecklistGroupWithItems, TaskHelperDisplay } from "./types";

interface TechnicianTaskTabProps {
  task: Task;
  taskStarted: boolean;
  isCompleted: boolean;
  estimateBlocksCompletion: boolean;
  taskHelpers: TaskHelperDisplay[];
  subTasks: Task[];
  completedSubTasks: number;
  subTaskProgress: number;
  checklistGroups: ChecklistGroupWithItems[];
  completedChecklistItems: number;
  totalChecklistItems: number;
  notes: TaskNote[];
  uploads: Upload[];
  noteText: string;
  saveIndicator: "idle" | "saving" | "saved";
  handleNoteChange: (value: string) => void;
  setPreviewUpload: (upload: Upload | null) => void;
  toggleChecklistItemMutation: any;
  updateSubtaskStatusMutation: any;
  safeNavigate: (path: string) => void;
  currentNoteId: string | null;
}

export function TechnicianTaskTab({
  task,
  taskStarted,
  isCompleted,
  estimateBlocksCompletion,
  taskHelpers,
  subTasks,
  completedSubTasks,
  subTaskProgress,
  checklistGroups,
  completedChecklistItems,
  totalChecklistItems,
  notes,
  uploads,
  noteText,
  saveIndicator,
  handleNoteChange,
  setPreviewUpload,
  toggleChecklistItemMutation,
  updateSubtaskStatusMutation,
  safeNavigate,
  currentNoteId,
}: TechnicianTaskTabProps) {
  return (
    <>
      {isCompleted && (
        <div
          className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
          data-testid="banner-completed"
        >
          <div
            className="flex items-center justify-center rounded-full bg-green-600 shrink-0"
            style={{ width: 32, height: 32 }}
          >
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              Task Completed
            </p>
            <p className="text-xs text-green-700 dark:text-green-400">
              You can still add photos, parts, and notes.
            </p>
          </div>
        </div>
      )}

      {estimateBlocksCompletion && (
        <div
          className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
          data-testid="banner-estimate-pending"
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              Estimate pending approval
            </p>
            <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-400">
              This task cannot be completed until the estimate is approved by an admin.
            </p>
          </div>
        </div>
      )}

      {task.instructions && (
        <div
          className="p-3 rounded-xl bg-background border border-border"
          data-testid="card-instructions"
        >
          <p
            className="text-xs uppercase font-medium mb-2 text-muted-foreground"
            style={{ letterSpacing: "0.05em" }}
          >
            Instructions
          </p>
          <div
            className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"
            style={{ borderRadius: 9 }}
          >
            <p
              className="text-xs whitespace-pre-wrap text-indigo-900 dark:text-indigo-200"
              style={{ lineHeight: 1.65 }}
            >
              {task.instructions}
            </p>
          </div>
        </div>
      )}

      {task.description && !task.instructions && (
        <div
          className="p-3 rounded-xl bg-background border border-border"
          data-testid="card-description"
        >
          <p
            className="text-xs uppercase font-medium mb-2 text-muted-foreground"
            style={{ letterSpacing: "0.05em" }}
          >
            Description
          </p>
          <p className="text-sm text-foreground" style={{ lineHeight: 1.65 }}>
            {task.description}
          </p>
        </div>
      )}

      {taskHelpers.length > 0 && (
        <div
          className="p-3 rounded-xl bg-background border border-border"
          data-testid="card-student-helpers"
        >
          <p
            className="text-xs uppercase font-medium mb-2 text-muted-foreground"
            style={{ letterSpacing: "0.05em" }}
          >
            Student Helpers ({taskHelpers.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {taskHelpers.map((h) => (
              <Badge key={h.userId} variant="secondary" data-testid={`badge-helper-${h.userId}`}>
                {h.user?.name || "Unknown"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {subTasks.length > 0 && (
        <div
          className="p-3 rounded-xl bg-background border border-border"
          data-testid="card-subtasks"
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-xs uppercase font-medium text-muted-foreground"
              style={{ letterSpacing: "0.05em" }}
            >
              Subtasks
            </p>
            <span className="text-xs text-muted-foreground">
              {completedSubTasks} / {subTasks.length}
            </span>
          </div>
          <div
            className="rounded-full mb-3 overflow-hidden bg-muted"
            style={{ height: 3 }}
          >
            <div
              className="h-full rounded-full transition-all bg-primary"
              style={{ width: `${subTaskProgress}%` }}
            />
          </div>
          <div
            className="space-y-1"
            style={{
              opacity: taskStarted ? 1 : 0.4,
              pointerEvents: taskStarted ? "auto" : "none",
            }}
          >
            {subTasks.map((st) => {
              const isDone = st.status === "completed";
              return (
                <div
                  key={st.id}
                  className="flex items-center gap-3 py-2 cursor-pointer rounded-md hover-elevate"
                  onClick={() => taskStarted && safeNavigate(`/tasks/${st.id}`)}
                  data-testid={`subtask-row-${st.id}`}
                >
                  <div
                    className={`flex items-center justify-center shrink-0 rounded-md ${isDone ? "bg-primary" : "border-2 border-muted-foreground/30"}`}
                    style={{ width: 22, height: 22 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!taskStarted) return;
                      const newStatus = isDone ? "not_started" : "completed";
                      updateSubtaskStatusMutation.mutate({ subtaskId: st.id, status: newStatus });
                    }}
                  >
                    {isDone && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span
                    className={`flex-1 ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}
                    style={{ fontSize: 13 }}
                  >
                    {st.name}
                  </span>
                  {taskStarted && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          {!taskStarted && (
            <div
              className="flex items-center justify-center gap-2 py-2.5 mt-2 rounded-lg bg-muted/50 border-t border-border"
              data-testid="lock-banner-subtasks"
            >
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Start the task to unlock subtasks
              </span>
            </div>
          )}
        </div>
      )}

      {checklistGroups.length > 0 && (
        <div
          className="p-3 rounded-xl bg-background border border-border"
          data-testid="card-checklist"
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-xs uppercase font-medium text-muted-foreground"
              style={{ letterSpacing: "0.05em" }}
            >
              Checklist
            </p>
            <span className="text-xs text-muted-foreground">
              {completedChecklistItems} / {totalChecklistItems}
            </span>
          </div>
          <div
            className="rounded-full mb-3 overflow-hidden bg-muted"
            style={{ height: 3 }}
          >
            <div
              className="h-full rounded-full transition-all bg-primary"
              style={{
                width: totalChecklistItems > 0
                  ? `${(completedChecklistItems / totalChecklistItems) * 100}%`
                  : "0%",
              }}
            />
          </div>
          <div className="space-y-1">
            {checklistGroups.map((group) =>
              group.items.map((item) => {
                const isDone = item.isCompleted;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-2 cursor-pointer"
                    onClick={() =>
                      toggleChecklistItemMutation.mutate({
                        itemId: item.id,
                        isCompleted: !item.isCompleted,
                      })
                    }
                    data-testid={`checklist-item-${item.id}`}
                  >
                    <div
                      className={`flex items-center justify-center shrink-0 ${isDone ? "bg-primary" : "border-2 border-muted-foreground/30"}`}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                      }}
                    >
                      {isDone && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span
                      className={`flex-1 ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}
                      style={{ fontSize: 13 }}
                    >
                      {item.text}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <div
        className="p-3 rounded-xl bg-background border border-border"
        data-testid="card-notes-photos"
      >
        <div className="flex items-center justify-between mb-2">
          <p
            className="text-xs uppercase font-medium text-muted-foreground"
            style={{ letterSpacing: "0.05em" }}
          >
            Notes
          </p>
          {saveIndicator === "saving" && (
            <span className="text-xs text-primary">
              Saving...
            </span>
          )}
          {saveIndicator === "saved" && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Saved
            </span>
          )}
        </div>
        <textarea
          value={noteText}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Type your observations... auto-saved as you type"
          rows={3}
          className="w-full resize-none bg-transparent outline-none text-foreground"
          style={{
            border: "none",
            fontSize: 13,
            lineHeight: 1.5,
            minHeight: 72,
          }}
          data-testid="textarea-auto-note"
        />
        {notes.filter((n) => n.id !== currentNoteId).length > 0 && (
          <div className="space-y-2 mt-3">
            {[...notes]
              .filter((n) => n.id !== currentNoteId)
              .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
              .map((note) => (
                <div
                  key={note.id}
                  className="px-2.5 py-2 rounded-lg bg-muted/50"
                  data-testid={`saved-note-${note.id}`}
                >
                  <p className="text-xs text-foreground">
                    {note.content}
                  </p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    {note.createdAt && format(new Date(note.createdAt), "h:mm a")}
                  </p>
                </div>
              ))}
          </div>
        )}

        {uploads.length > 0 && (
          <div className="mt-3">
            <p className="text-xs uppercase font-medium mb-2 text-muted-foreground tracking-wide">
              Photos ({uploads.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {uploads.map((upload) => {
                const isImage = upload.fileType?.startsWith("image/");
                return (
                  <button
                    key={upload.id}
                    className="relative rounded-md overflow-hidden shrink-0 group"
                    style={{ width: 56, height: 56 }}
                    onClick={() => setPreviewUpload(upload)}
                    data-testid={`photo-thumb-${upload.id}`}
                  >
                    {isImage ? (
                      <img
                        src={toDisplayUrl(upload.objectUrl)}
                        alt={upload.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
