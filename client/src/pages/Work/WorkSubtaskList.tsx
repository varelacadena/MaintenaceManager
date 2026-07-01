import { memo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import { useScrollAwareClick } from "@/hooks/useScrollAwareClick";
import type { Task, User } from "@shared/schema";
import { getAvatarColor } from "@/utils/taskUtils";
import type { StatusType } from "./constants";

const WORK_TABLE_COLUMN_COUNT = 7;

function SubtaskOpenButton({
  subtask,
  onOpen,
}: {
  subtask: Task;
  onOpen: () => void;
}) {
  const { onPointerDown, handleClick } = useScrollAwareClick(onOpen);
  const isCompleted = subtask.status === "completed";

  return (
    <button
      type="button"
      className={`flex-1 min-w-0 text-left text-sm truncate touch-manipulation ${
        isCompleted ? "text-muted-foreground line-through" : "text-foreground"
      }`}
      onPointerDown={onPointerDown}
      onClick={(e) => handleClick(e)}
      data-testid={`button-open-subtask-${subtask.id}`}
    >
      {subtask.name}
    </button>
  );
}

type WorkSubtaskListProps = {
  subtasks: Task[];
  parentTaskId: string;
  indentLevel?: number;
  allUsers: User[] | undefined;
  handleStatusChange: (taskId: string, newStatus: StatusType) => void;
  onSelectTask?: (taskId: string) => void;
};

export const WorkSubtaskList = memo(function WorkSubtaskList({
  subtasks,
  parentTaskId,
  indentLevel = 0,
  allUsers,
  handleStatusChange,
  onSelectTask,
}: WorkSubtaskListProps) {
  const completed = subtasks.filter((t) => t.status === "completed").length;
  const progress = subtasks.length > 0 ? (completed / subtasks.length) * 100 : 0;
  const indentClass = indentLevel >= 2 ? "ml-16" : indentLevel >= 1 ? "ml-10" : "ml-8";

  return (
    <TableRow
      className="hover:bg-transparent border-0"
      data-testid={`subtask-panel-${parentTaskId}`}
    >
      <TableCell colSpan={WORK_TABLE_COLUMN_COUNT} className="p-0 pb-2 pt-0">
        <div className={`${indentClass} mr-3`}>
          <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2 border-b border-border/40 bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground">Subtasks</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[120px]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    completed === subtasks.length ? "bg-emerald-500" : "bg-primary/70"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums ml-auto">
                {completed} of {subtasks.length} complete
              </span>
            </div>

            <ul className="divide-y divide-border/40">
              {subtasks.map((subtask) => {
                const isCompleted = subtask.status === "completed";
                const assignee = subtask.assignedToId
                  ? allUsers?.find((u) => u.id === subtask.assignedToId)
                  : null;
                const assigneeInitials = assignee
                  ? (
                      assignee.firstName && assignee.lastName
                        ? `${assignee.firstName[0]}${assignee.lastName[0]}`
                        : assignee.username?.[0] || "?"
                    ).toUpperCase()
                  : null;

                return (
                  <li
                    key={subtask.id}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 transition-colors"
                    data-testid={`row-task-${subtask.id}`}
                  >
                    <button
                      type="button"
                      aria-label={
                        isCompleted
                          ? `Mark ${subtask.name} as not complete`
                          : `Mark ${subtask.name} as complete`
                      }
                      data-no-row-open
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(
                          subtask.id,
                          isCompleted ? "not_started" : "completed",
                        );
                      }}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isCompleted
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-muted-foreground/30 hover:border-primary/50"
                      }`}
                      data-testid={`button-subtask-toggle-${subtask.id}`}
                    >
                      {isCompleted && <Check className="w-3 h-3" strokeWidth={3} />}
                    </button>

                    <SubtaskOpenButton
                      subtask={subtask}
                      onOpen={() => onSelectTask?.(subtask.id)}
                    />

                    {assignee ? (
                      <Avatar
                        className="w-6 h-6 shrink-0"
                        title={
                          assignee.firstName && assignee.lastName
                            ? `${assignee.firstName} ${assignee.lastName}`
                            : assignee.username
                        }
                      >
                        <AvatarFallback
                          className={`${getAvatarColor(assignee.id)} text-white text-[10px] font-medium`}
                        >
                          {assigneeInitials}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="w-6 h-6 shrink-0" aria-hidden />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
});
