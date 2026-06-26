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
import { memo, type ReactNode } from "react";
import {
  User as UserIcon,
  Calendar,
  AlertTriangle,
  Flag,
  MapPin,
  ChevronDown,
  ChevronRight,
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
import { PropertySelectItems } from "@/components/PropertySelectItems";
import type { Task, User, Property, Area } from "@shared/schema";
import type { StatusType } from "./constants";
import { buildTaskRowAriaLabel, handleKeyboardActivate } from "./workA11y";
import { formatTaskReferenceId } from "@/utils/taskUtils";

export const TaskTableRow = memo(function TaskTableRow({
  task,
  userGroups,
  allUsers,
  properties,
  handleStatusChange,
  handleUrgencyChange,
  handleAssigneeChange,
  handlePropertyChange,
  handleDepartmentChange,
  areas,
  handleInlineEdit,
  isChildTask,
  rowIndex,
  onReviewEstimates,
  isAdmin,
  onSelectTask,
  selectedTaskId,
  expandControl,
  nameExtra,
  rowClassName,
}: {
  task: Task;
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
  isChildTask?: boolean;
  rowIndex?: number;
  onReviewEstimates?: (taskId: string) => void;
  isAdmin?: boolean;
  onSelectTask?: (taskId: string) => void;
  selectedTaskId?: string | null;
  expandControl?: { isExpanded: boolean; onToggle: () => void };
  nameExtra?: ReactNode;
  rowClassName?: string;
}) {
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

  const openTask = () => onSelectTask?.(task.id);
  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return !!target.closest(
      "a,button,input,textarea,select,[role='button'],[role='combobox'],[contenteditable='true'],[data-no-row-open]"
    );
  };

  return (
    <TableRow
      key={task.id}
      data-testid={`row-task-${task.id}`}
      aria-selected={onSelectTask ? selectedTaskId === task.id : undefined}
      aria-label={onSelectTask ? buildTaskRowAriaLabel(task) : undefined}
      className={`[content-visibility:auto] [contain-intrinsic-size:0_52px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${selectedTaskId === task.id ? "!bg-[#EEF2FF]" : ""} ${rowClassName ?? ""}`}
      onClick={(e) => {
        if (isInteractiveTarget(e.target)) return;
        openTask();
      }}
      tabIndex={onSelectTask ? 0 : undefined}
      onKeyDown={onSelectTask ? (e) => {
        if (isInteractiveTarget(e.target)) return;
        handleKeyboardActivate(e, () => openTask());
      } : undefined}
    >
      <TableCell className="py-2.5">
        <div className={`flex items-center gap-2 ${isChildTask ? "pl-8" : ""}`}>
          {expandControl && (
            <Button
              size="icon"
              variant="ghost"
              aria-expanded={expandControl.isExpanded}
              aria-label={
                expandControl.isExpanded
                  ? `Collapse subtasks for ${task.name}`
                  : `Expand subtasks for ${task.name}`
              }
              onClick={(e) => {
                e.stopPropagation();
                expandControl.onToggle();
              }}
              data-testid={`button-expand-subtasks-${task.id}`}
              className="shrink-0"
            >
              {expandControl.isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          )}
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotColors[task.status] || "bg-gray-400"}`} />
          <EditableTextCell
            value={task.name}
            taskId={task.id}
            field="name"
            onSave={handleInlineEdit}
            linkTo={onSelectTask ? undefined : `/tasks/${task.id}`}
          />
          <span
            className="shrink-0 text-[10px] font-mono text-muted-foreground"
            data-testid={`text-task-id-${task.id}`}
            title={task.id}
          >
            {formatTaskReferenceId(task.id)}
          </span>
          {nameExtra}
          {(() => {
            const ext = task as Task & { isHelper?: boolean; helperCount?: number };
            return (
              <>
                {ext.isHelper && (
                  <Badge variant="outline" className="shrink-0 text-xs px-1.5 py-0" data-testid={`badge-helper-${task.id}`}>
                    Additional
                  </Badge>
                )}
                {ext.helperCount != null && ext.helperCount > 0 && (
                  <Badge variant="secondary" className="shrink-0 text-xs px-1.5 py-0" data-testid={`badge-helpers-count-${task.id}`}>
                    {ext.helperCount} Additional
                  </Badge>
                )}
              </>
            );
          })()}
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
            data-no-row-open
            onPointerDown={(e) => e.stopPropagation()}
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
              data-no-row-open
              onPointerDown={(e) => e.stopPropagation()}
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
            data-no-row-open
            onPointerDown={(e) => e.stopPropagation()}
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
      <TableCell className="py-2.5 hidden lg:table-cell">
        <Select
          value={task.areaId || "__none__"}
          onValueChange={(val) => handleDepartmentChange(task.id, val)}
        >
          <SelectTrigger
            className="text-sm border-0 bg-transparent p-0 shadow-none h-auto text-left"
            data-testid={`select-department-${task.id}`}
            data-no-row-open
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue placeholder="No department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Unassigned</SelectItem>
            {(areas || []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
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
            data-no-row-open
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <SelectValue placeholder="No property" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <PropertySelectItems
              properties={properties ?? []}
              noneLabel="No property"
            />
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
});
