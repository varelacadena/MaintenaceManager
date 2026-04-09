import {
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Package,
  History,
  CheckCircle2,
} from "lucide-react";
import { SubtaskNote } from "../SubtaskNote";
import { SubtaskPhotos } from "../SubtaskPhotos";
import type { MobileTaskDetailProps } from "./types";

interface MobileTaskContentExtraProps {
  ctx: MobileTaskDetailProps;
}

export function MobileTaskContentExtra({ ctx }: MobileTaskContentExtraProps) {
  const {
    task, subtasks, timeEntries,
    taskMessages, taskParts,
    expandedSubtasks, toggleSubtaskExpanded,
    setIsMessagesSheetOpen, setIsPartsSheetOpen, setIsHistorySheetOpen,
    updateSubtaskStatusMutation,
    taskStarted, isCompleted,
    completedSubtasks, totalSubtasks, allSubtasksDone, subtaskProgress,
  } = ctx;

  if (!task) return null;

  return (
    <>
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #EEEEEE" }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: taskStarted && totalSubtasks > 0 ? undefined : "1px solid #EEEEEE" }}>
          <p className="text-xs font-medium tracking-wider uppercase" style={{ color: "#9CA3AF" }}>
            SUBTASKS
          </p>
          <span className="text-sm font-medium" style={{ color: "#1A1A1A" }} data-testid="text-mobile-subtask-count">
            {completedSubtasks} / {totalSubtasks}
          </span>
        </div>

        {taskStarted && totalSubtasks > 0 && (
          <div className="px-4 py-2" style={{ borderBottom: "1px solid #EEEEEE" }}>
            <div className="w-full rounded-full overflow-hidden" style={{ height: "4px", backgroundColor: "#E5E7EB" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${subtaskProgress}%`,
                  backgroundColor: "#4338CA",
                  transition: "width 300ms ease",
                }}
                data-testid="mobile-subtask-progress"
              />
            </div>
          </div>
        )}

        {taskStarted && !isCompleted && !allSubtasksDone && (
          <div
            className="mx-4 mt-3 mb-1 px-3 py-2 rounded text-xs"
            style={{ backgroundColor: "#FEF2F2", borderLeft: "3px solid #D94F4F", color: "#D94F4F" }}
            data-testid="mobile-subtask-warning"
          >
            Complete all subtasks before marking task as done
          </div>
        )}

        <div className="divide-y divide-[#EEEEEE]">
          {(!subtasks || subtasks.length === 0) ? (
            <p className="text-xs text-center py-6" style={{ color: "#9CA3AF" }}>
              No subtasks
            </p>
          ) : (
            subtasks.map((subtask) => {
              const isLocked = !taskStarted;
              const isSubCompleted = subtask.status === "completed";
              const isSubExpanded = expandedSubtasks.has(subtask.id);

              return (
                <div key={subtask.id} data-testid={`mobile-subtask-${subtask.id}`}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    style={isLocked ? { opacity: 0.45 } : undefined}
                    onClick={() => !isLocked && toggleSubtaskExpanded(subtask.id)}
                  >
                    <button
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: isSubCompleted ? "#4338CA" : "#D1D5DB",
                        backgroundColor: isSubCompleted ? "#4338CA" : "transparent",
                      }}
                      disabled={isLocked || isCompleted}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isLocked && !isCompleted) {
                          updateSubtaskStatusMutation.mutate({
                            subtaskId: subtask.id,
                            status: isSubCompleted ? "in_progress" : "completed",
                          });
                        }
                      }}
                      data-testid={`mobile-subtask-checkbox-${subtask.id}`}
                      aria-label={`Mark subtask ${subtask.name} as ${isSubCompleted ? "incomplete" : "complete"}`}
                    >
                      {isSubCompleted && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </button>

                    <span
                      className={`text-sm flex-1 ${isSubCompleted ? "line-through" : ""}`}
                      style={{ color: isSubCompleted ? "#9CA3AF" : "#1A1A1A" }}
                    >
                      {subtask.name}
                    </span>

                    {isLocked ? (
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#D1D5DB" }} />
                    ) : isSubExpanded ? (
                      <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                    )}
                  </div>

                  {isSubExpanded && !isLocked && (
                    <div className="px-4 pb-3 pl-12 space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <SubtaskPhotos subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="mobile-subtask" />
                      </div>
                      <SubtaskNote subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="mobile-subtask" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #EEEEEE" }}>
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
          style={{ borderBottom: "1px solid #EEEEEE" }}
          onClick={() => setIsMessagesSheetOpen(true)}
          data-testid="link-mobile-messages"
        >
          <MessageSquare className="w-4 h-4" style={{ color: "#6B7280" }} />
          <span className="text-sm font-medium flex-1" style={{ color: "#1A1A1A" }}>Messages</span>
          {taskMessages.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}>
              {taskMessages.length}
            </span>
          )}
          <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        </button>
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
          style={{ borderBottom: "1px solid #EEEEEE" }}
          onClick={() => setIsPartsSheetOpen(true)}
          data-testid="link-mobile-parts"
        >
          <Package className="w-4 h-4" style={{ color: "#6B7280" }} />
          <span className="text-sm font-medium flex-1" style={{ color: "#1A1A1A" }}>Parts Used</span>
          {taskParts.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}>
              {taskParts.length}
            </span>
          )}
          <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        </button>
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
          onClick={() => setIsHistorySheetOpen(true)}
          data-testid="link-mobile-history"
        >
          <History className="w-4 h-4" style={{ color: "#6B7280" }} />
          <span className="text-sm font-medium flex-1" style={{ color: "#1A1A1A" }}>History</span>
          {(timeEntries?.length || 0) > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
              {timeEntries?.length}
            </span>
          )}
          <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        </button>
      </div>

      {isCompleted && (
        <div
          className="rounded-xl px-4 py-4 flex items-center gap-3"
          style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
          data-testid="mobile-completed-banner"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#15803D" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "#15803D" }}>Task completed</p>
            <p className="text-xs mt-0.5" style={{ color: "#16A34A" }}>
              All subtasks done{totalSubtasks > 0 ? ` (${totalSubtasks}/${totalSubtasks})` : ""} — evidence captured
            </p>
          </div>
        </div>
      )}
    </>
  );
}
