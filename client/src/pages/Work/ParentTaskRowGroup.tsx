import { Badge } from "@/components/ui/badge";
import type { Task, User, Property } from "@shared/schema";
import type { StatusType } from "./constants";
import { TaskTableRow } from "./TaskTableRow";

type ParentTaskRowGroupProps = {
  task: Task;
  childSubTasks: Task[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  userGroups: { label: string; items: User[] }[];
  allUsers: User[] | undefined;
  properties: Property[] | undefined;
  handleStatusChange: (taskId: string, newStatus: StatusType) => void;
  handleUrgencyChange: (taskId: string, urgency: string) => void;
  handleAssigneeChange: (taskId: string, assignedToId: string) => void;
  handlePropertyChange: (taskId: string, propertyId: string) => void;
  handleInlineEdit: (taskId: string, field: string, value: string) => void;
  isAdmin?: boolean;
  onReviewEstimates?: (taskId: string) => void;
  onSelectTask?: (taskId: string) => void;
  selectedTaskId?: string | null;
};

export function ParentTaskRowGroup({
  task,
  childSubTasks,
  isExpanded,
  onToggleExpand,
  ...rowProps
}: ParentTaskRowGroupProps) {
  const completedSubTasks = childSubTasks.filter((t) => t.status === "completed").length;

  return (
    <>
      <TaskTableRow
        task={task}
        expandControl={{ isExpanded, onToggle: onToggleExpand }}
        nameExtra={
          <Badge
            variant="outline"
            className="text-xs shrink-0 no-default-hover-elevate no-default-active-elevate"
            data-testid={`badge-subtask-count-${task.id}`}
          >
            {completedSubTasks}/{childSubTasks.length} complete
          </Badge>
        }
        rowClassName={isExpanded ? "bg-muted/20" : undefined}
        {...rowProps}
      />
      {isExpanded &&
        childSubTasks.map((subTask, idx) => (
          <TaskTableRow
            key={subTask.id}
            task={subTask}
            isChildTask
            rowIndex={idx}
            {...rowProps}
          />
        ))}
    </>
  );
}
