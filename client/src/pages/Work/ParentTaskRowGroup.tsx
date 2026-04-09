import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User as UserIcon,
  Calendar,
  AlertTriangle,
  Flag,
  ChevronDown,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { EditableTextCell } from "@/components/EditableTextCell";
import { EditableDateCell } from "@/components/EditableDateCell";
import {
  urgencyConfig,
  taskStatusBadgeColors as taskStatusColors,
  statusDotColors,
  taskStatusConfig,
  getAvatarColor,
} from "@/utils/taskUtils";
import type { Task, User, Property } from "@shared/schema";
import type { StatusType } from "./constants";
import { TaskTableRow } from "./TaskTableRow";

export function ParentTaskRowGroup({
  task,
  childSubTasks,
  isExpanded,
  onToggleExpand,
  userGroups,
  allUsers,
  properties,
  handleStatusChange,
  handleUrgencyChange,
  handleAssigneeChange,
  handlePropertyChange,
  handleTaskTypeChange,
  handleInlineEdit,
  isAdmin,
  onReviewEstimates,
  onViewSummary,
  onSelectTask,
  selectedTaskId,
}: {
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
  handleTaskTypeChange: (taskId: string, taskType: string) => void;
  handleInlineEdit: (taskId: string, field: string, value: string) => void;
  isAdmin?: boolean;
  onReviewEstimates?: (taskId: string) => void;
  onViewSummary?: (taskId: string) => void;
  onSelectTask?: (taskId: string) => void;
  selectedTaskId?: string | null;
}) {
  const completedSubTasks = childSubTasks.filter((t) => t.status === "completed").length;
  const isOverdue = task.estimatedCompletionDate
    && task.status !== "completed"
    && new Date(task.estimatedCompletionDate) < new Date();
  const assignee = task.assignedToId ? allUsers?.find(u => u.id === task.assignedToId) : null;
  const assigneeInitials = assignee
    ? (assignee.firstName && assignee.lastName
        ? `${assignee.firstName[0]}${assignee.lastName[0]}`
        : (assignee.username?.[0] || "?")).toUpperCase()
    : null;
  const urg = urgencyConfig[task.urgency] || urgencyConfig.low;

  return (
    <>
      <TableRow
        data-testid={`row-parent-task-${task.id}`}
        className={`cursor-pointer ${selectedTaskId === task.id ? "!bg-[#EEF2FF]" : isExpanded ? "bg-muted/20" : ""}`}
        onClick={() => onSelectTask?.(task.id)}
        tabIndex={onSelectTask ? 0 : undefined}
        onKeyDown={onSelectTask ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectTask(task.id); } } : undefined}
        role={onSelectTask ? "button" : undefined}
      >
        <TableCell className="py-2.5">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              data-testid={`button-expand-subtasks-${task.id}`}
              className="shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotColors[task.status] || "bg-gray-400"}`} />
            <EditableTextCell
              value={task.name}
              taskId={task.id}
              field="name"
              onSave={handleInlineEdit}
              linkTo={onSelectTask ? undefined : `/tasks/${task.id}`}
            />
            <Badge
              variant="outline"
              className="text-xs shrink-0 no-default-hover-elevate no-default-active-elevate"
              data-testid={`badge-subtask-count-${task.id}`}
            >
              {completedSubTasks}/{childSubTasks.length} complete
            </Badge>
            {isOverdue && (
              <span className="shrink-0" title="Overdue">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="py-2.5">
          <Select
            value={task.assignedToId || "__none__"}
            onValueChange={(val) => handleAssigneeChange(task.id, val)}
          >
            <SelectTrigger
              className="border-0 bg-transparent p-0 shadow-none h-auto"
              data-testid={`select-assignee-${task.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              {assignee ? (
                <Avatar className="w-7 h-7 cursor-pointer" data-testid={`avatar-assignee-${task.id}`}>
                  <AvatarFallback className={`${getAvatarColor(assignee.id)} text-white text-xs font-medium`}>
                    {assigneeInitials}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer" data-testid={`avatar-unassigned-${task.id}`}>
                  <UserIcon className="w-3 h-3 text-muted-foreground/40" />
                </span>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {userGroups.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.items.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName && u.lastName
                        ? `${u.firstName} ${u.lastName}`
                        : u.username}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="py-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <EditableDateCell
              value={task.initialDate}
              taskId={task.id}
              field="initialDate"
              onSave={handleInlineEdit}
            />
          </div>
        </TableCell>
        <TableCell className="py-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <EditableDateCell
              value={task.estimatedCompletionDate}
              taskId={task.id}
              field="estimatedCompletionDate"
              onSave={handleInlineEdit}
            />
            {isOverdue && (
              <span className="text-xs font-medium text-destructive whitespace-nowrap">Overdue</span>
            )}
          </div>
        </TableCell>
        <TableCell className="py-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Select
              value={task.status}
              onValueChange={(val) => handleStatusChange(task.id, val as StatusType)}
            >
              <SelectTrigger
                className="text-xs border-0 bg-transparent p-0 shadow-none h-auto"
                data-testid={`select-status-${task.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Badge
                  variant="outline"
                  className={`${taskStatusColors[task.status] || ""} text-xs font-semibold uppercase tracking-wider cursor-pointer no-default-hover-elevate no-default-active-elevate`}
                >
                  <SelectValue />
                </Badge>
              </SelectTrigger>
              <SelectContent>
                {taskStatusConfig
                  .filter((s) => {
                    if (s.key === "completed" && task.requiresEstimate && task.estimateStatus !== "approved") {
                      return false;
                    }
                    return true;
                  })
                  .map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && task.requiresEstimate && task.estimateStatus === "waiting_approval" && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onReviewEstimates?.(task.id);
                }}
                className="text-xs"
                data-testid={`button-review-estimates-${task.id}`}
              >
                Review & Approve
              </Button>
            )}
          </div>
        </TableCell>
        <TableCell className="py-2.5">
          <Select
            value={task.urgency}
            onValueChange={(val) => handleUrgencyChange(task.id, val)}
          >
            <SelectTrigger
              className="text-xs border-0 bg-transparent p-0 shadow-none h-auto"
              data-testid={`select-urgency-${task.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1 cursor-pointer">
                <Flag className={`w-3.5 h-3.5 ${urg.color} shrink-0`} />
                <span className={`text-xs ${urg.color}`}>{urg.label}</span>
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="py-2.5 hidden md:table-cell">
          <Select
            value={task.propertyId || "__none__"}
            onValueChange={(val) => handlePropertyChange(task.id, val)}
          >
            <SelectTrigger
              className="text-sm border-0 bg-transparent p-0 shadow-none h-auto text-left"
              data-testid={`select-property-${task.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <SelectValue placeholder="No property" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No property</SelectItem>
              {properties?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
      </TableRow>

      {isExpanded &&
        childSubTasks.map((subTask, idx) => (
          <TaskTableRow
            key={subTask.id}
            task={subTask}
            userGroups={userGroups}
            allUsers={allUsers}
            properties={properties}
            handleStatusChange={handleStatusChange}
            handleUrgencyChange={handleUrgencyChange}
            handleAssigneeChange={handleAssigneeChange}
            handlePropertyChange={handlePropertyChange}
            handleTaskTypeChange={handleTaskTypeChange}
            handleInlineEdit={handleInlineEdit}
            isChildTask
            rowIndex={idx}
            isAdmin={isAdmin}
            onReviewEstimates={onReviewEstimates}
            onViewSummary={onViewSummary}
            onSelectTask={onSelectTask}
            selectedTaskId={selectedTaskId}
          />
        ))}
    </>
  );
}
