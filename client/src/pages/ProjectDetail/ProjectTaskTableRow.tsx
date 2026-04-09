import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Calendar, User as UserIcon, Flag, MapPin, AlertTriangle, ClipboardCheck } from "lucide-react";
import { EditableTextCell } from "@/components/EditableTextCell";
import { EditableDateCell } from "@/components/EditableDateCell";
import type { Task, User, Property } from "@shared/schema";
import type { StatusType } from "./useProjectDetail";
import {
  urgencyConfig,
  taskStatusBadgeColors as tableBadgeColors,
  statusDotColors,
  taskStatusConfig,
  getAvatarColor,
} from "@/utils/taskUtils";

export function ProjectTaskTableRow({
  task,
  userGroups,
  allUsers,
  properties,
  handleStatusChange,
  handleUrgencyChange,
  handleAssigneeChange,
  handlePropertyChange,
  handleInlineEdit,
  onReviewEstimates,
  isAdmin,
  onViewSummary,
}: {
  task: Task;
  userGroups: { label: string; items: User[] }[];
  allUsers: User[] | undefined;
  properties: Property[] | undefined;
  handleStatusChange: (taskId: string, newStatus: StatusType) => void;
  handleUrgencyChange: (taskId: string, urgency: string) => void;
  handleAssigneeChange: (taskId: string, assignedToId: string) => void;
  handlePropertyChange: (taskId: string, propertyId: string) => void;
  handleInlineEdit: (taskId: string, field: string, value: string) => void;
  onReviewEstimates?: (taskId: string) => void;
  isAdmin?: boolean;
  onViewSummary?: (taskId: string) => void;
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

  return (
    <TableRow
      key={task.id}
      data-testid={`row-task-${task.id}`}
    >
      <TableCell className="py-2.5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotColors[task.status] || "bg-gray-400"}`} />
          <EditableTextCell
            value={task.name}
            taskId={task.id}
            field="name"
            onSave={handleInlineEdit}
            linkTo={`/tasks/${task.id}`}
          />
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
                className={`${tableBadgeColors[task.status] || ""} text-xs font-semibold uppercase tracking-wider cursor-pointer no-default-hover-elevate no-default-active-elevate`}
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
          {task.status === "completed" && onViewSummary && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onViewSummary(task.id);
              }}
              data-testid={`button-view-summary-${task.id}`}
            >
              <ClipboardCheck className="w-4 h-4" />
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
  );
}
