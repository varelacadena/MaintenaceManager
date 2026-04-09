import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { SubtaskNote } from "../SubtaskNote";
import { SubtaskPhotos } from "../SubtaskPhotos";

interface Subtask {
  id: string;
  name: string;
  status: string;
  [key: string]: any;
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
}: PanelSubtasksSectionProps) {
  const isReadOnly = !isFullscreen;

  return (
    <div className="px-5 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium tracking-wider uppercase" style={{ color: "#9CA3AF" }}>
          SUBTASKS
        </p>
        <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
          {completedSubtasks} / {totalSubtasks}
        </span>
      </div>

      {isStarted && totalSubtasks > 0 && (
        <div className="w-full rounded-full overflow-hidden mb-3" style={{ height: "4px", backgroundColor: "#EEEEEE" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0}%`,
              backgroundColor: "#4338CA",
            }}
          />
        </div>
      )}

      {isStarted && totalSubtasks > 0 && !allSubtasksComplete && (
        <div
          className="flex items-center gap-2 text-xs py-2 px-3 rounded mb-3"
          style={{ borderLeft: "3px solid #D94F4F", backgroundColor: "#FEF2F2", color: "#D94F4F" }}
          data-testid="warning-subtasks-incomplete"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          All subtasks must be completed before marking this task as done
        </div>
      )}

      {totalSubtasks === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>
          No subtasks
        </p>
      ) : (
        <div className="space-y-1">
          {subtasks?.map((subtask) => {
            const isSubCompleted = subtask.status === "completed";
            const isExpanded = expandedSubtasks.has(subtask.id);
            const isLocked = !isStarted && !isCompleted;

            return (
              <div key={subtask.id} data-testid={`panel-subtask-${subtask.id}`}>
                <div
                  className={`flex items-center gap-3 py-2.5 px-2 rounded transition-opacity ${isReadOnly ? "" : "cursor-pointer"}`}
                  style={isLocked && !isReadOnly ? { opacity: 0.45 } : undefined}
                  onClick={() => !isLocked && !isReadOnly && toggleSubtaskExpanded(subtask.id)}
                >
                  <span
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{
                      borderColor: isSubCompleted ? "#4338CA" : "#D1D5DB",
                      backgroundColor: isSubCompleted ? "#4338CA" : "transparent",
                    }}
                    data-testid={`checkbox-subtask-${subtask.id}`}
                  >
                    {isSubCompleted && (
                      <CheckCircle2 className="w-3 h-3" style={{ color: "#FFFFFF" }} />
                    )}
                  </span>
                  <span
                    className={`text-sm flex-1 ${isSubCompleted ? "line-through" : ""}`}
                    style={{ color: isSubCompleted ? "#9CA3AF" : "#1A1A1A" }}
                  >
                    {subtask.name}
                  </span>
                  {!isLocked && !isReadOnly && (
                    isExpanded ? (
                      <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                    )
                  )}
                </div>

                {isExpanded && !isLocked && !isReadOnly && (
                  <div className="ml-8 pb-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SubtaskPhotos subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="panel-subtask" />
                    </div>
                    <SubtaskNote subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="panel-subtask" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
