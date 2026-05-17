import { ChevronRight, ChevronDown, CheckCircle2, AlertTriangle } from "lucide-react";
import { SubtaskNote } from "../SubtaskNote";
import { SubtaskPhotos } from "../SubtaskPhotos";

interface Subtask {
  id: string;
  name: string;
  status: string;
  [key: string]: unknown;
}

interface PanelSubtasksSectionProps {
  subtasks: Subtask[] | undefined;
  expandedSubtasks: Set<string>;
  completedSubtasks: number;
  totalSubtasks: number;
  allSubtasksComplete: boolean;
  isStarted: boolean;
  isCompleted: boolean;
  isFullscreen: boolean;
  toggleSubtaskExpanded: (id: string) => void;
  variant?: "compact" | "full";
}

export function PanelSubtasksSection({
  subtasks,
  expandedSubtasks,
  completedSubtasks,
  totalSubtasks,
  allSubtasksComplete,
  isStarted,
  isCompleted,
  isFullscreen,
  toggleSubtaskExpanded,
  variant = "full",
}: PanelSubtasksSectionProps) {
  const isReadOnly = !isFullscreen;
  const isCompact = variant === "compact";

  const listContent = (
    <>
      {isStarted && totalSubtasks > 0 && (
        <div className="w-full h-1 rounded-full overflow-hidden mb-3 bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
          />
        </div>
      )}

      {isStarted && totalSubtasks > 0 && !allSubtasksComplete && (
        <div
          className="flex items-center gap-2 text-xs py-2 px-3 rounded mb-3 border-l-[3px] border-destructive bg-destructive/10 text-destructive"
          data-testid="warning-subtasks-incomplete"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          All subtasks must be completed before marking this task as done
        </div>
      )}

      {totalSubtasks === 0 ? (
        <p className="text-xs text-center py-3 text-muted-foreground">No subtasks</p>
      ) : (
        <div className="space-y-1">
          {subtasks?.map((subtask) => {
            const isSubCompleted = subtask.status === "completed";
            const isExpanded = expandedSubtasks.has(subtask.id);
            const isLocked = !isStarted && !isCompleted;

            return (
              <div key={subtask.id} data-testid={`panel-subtask-${subtask.id}`}>
                <div
                  className={`flex items-center gap-3 py-2 px-2 rounded-md transition-opacity ${
                    isReadOnly ? "" : "cursor-pointer hover:bg-muted/40"
                  }`}
                  style={isLocked && !isReadOnly ? { opacity: 0.45 } : undefined}
                  onClick={() => !isLocked && !isReadOnly && toggleSubtaskExpanded(subtask.id)}
                >
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSubCompleted ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}
                    data-testid={`checkbox-subtask-${subtask.id}`}
                  >
                    {isSubCompleted && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </span>
                  <span
                    className={`text-sm flex-1 ${
                      isSubCompleted ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {subtask.name}
                  </span>
                  {!isLocked && !isReadOnly &&
                    (isExpanded ? (
                      <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                    ))}
                </div>

                {isExpanded && !isLocked && !isReadOnly && (
                  <div className="ml-8 pb-3 space-y-2">
                    <SubtaskPhotos subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="panel-subtask" />
                    <SubtaskNote subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="panel-subtask" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (isCompact) {
    return <div className="space-y-2">{listContent}</div>;
  }

  return (
    <div className="px-5 py-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">SUBTASKS</p>
        <span className="text-sm font-medium text-foreground">
          {completedSubtasks} / {totalSubtasks}
        </span>
      </div>
      {listContent}
    </div>
  );
}
