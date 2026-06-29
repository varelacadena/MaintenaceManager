import { memo } from "react";
import type { Task, User, Property, Area } from "@shared/schema";
import type { StatusType } from "./constants";
import { TaskTableRow } from "./TaskTableRow";
import { SubtaskProgressIndicator } from "./SubtaskProgressIndicator";
import { WorkSubtaskList } from "./WorkSubtaskList";

type ParentTaskRowGroupProps = {
  task: Task;
  childSubTasks: Task[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  parentIndentLevel?: number;
  userGroups: { label: string; items: User[] }[];
  allUsers: User[] | undefined;
  properties: Property[] | undefined;
  handleStatusChange: (taskId: string, newStatus: StatusType) => void;
  handleUrgencyChange: (taskId: string, urgency: string) => void;
  handleAssigneeChange: (taskId: string, assignedToId: string) => void;
  handlePropertyChange: (taskId: string, propertyId: string) => void;
  handleDepartmentChange: (taskId: string, areaId: string) => void;
  areas: Area[];
  handleInlineEdit: (taskId: string, field: string, value: string) => void;
  isAdmin?: boolean;
  onReviewEstimates?: (taskId: string) => void;
  onSelectTask?: (taskId: string) => void;
  selectedTaskId?: string | null;
};

export const ParentTaskRowGroup = memo(function ParentTaskRowGroup({
  task,
  childSubTasks,
  isExpanded,
  onToggleExpand,
  parentIndentLevel = 0,
  allUsers,
  handleStatusChange,
  onSelectTask,
  ...rowProps
}: ParentTaskRowGroupProps) {
  const completedSubTasks = childSubTasks.filter((t) => t.status === "completed").length;

  return (
    <>
      <TaskTableRow
        task={task}
        isParentWithSubtasks
        indentLevel={parentIndentLevel}
        nameExtra={
          <SubtaskProgressIndicator
            completed={completedSubTasks}
            total={childSubTasks.length}
            taskId={task.id}
            isExpanded={isExpanded}
            onToggle={onToggleExpand}
          />
        }
        rowClassName={isExpanded ? "bg-muted/15" : undefined}
        {...rowProps}
        allUsers={allUsers}
        handleStatusChange={handleStatusChange}
        onSelectTask={onSelectTask}
      />
      {isExpanded && (
        <WorkSubtaskList
          subtasks={childSubTasks}
          parentTaskId={task.id}
          indentLevel={parentIndentLevel}
          allUsers={allUsers}
          handleStatusChange={handleStatusChange}
          onSelectTask={onSelectTask}
        />
      )}
    </>
  );
});
