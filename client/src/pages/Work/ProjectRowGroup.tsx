import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Calendar,
  Flag,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  MapPin,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  taskStatusBadgeColors as taskStatusColors,
} from "@/utils/taskUtils";
import type { Task, User, Property, Project } from "@shared/schema";
import type { StatusType } from "./constants";
import { projectStatusMapping, projectPriorityConfig } from "./constants";
import { TaskTableRow } from "./TaskTableRow";

export function ProjectRowGroup({
  project,
  childTasks,
  completedChildTasks,
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
  getPropertyName,
  handleProjectStatusChange,
  isAdmin,
  onReviewEstimates,
  onViewSummary,
  onSelectTask,
  selectedTaskId,
}: {
  project: Project;
  childTasks: Task[];
  completedChildTasks: number;
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
  getPropertyName: (propertyId: string | null) => string | null;
  handleProjectStatusChange: (projectId: string, status: string) => void;
  isAdmin?: boolean;
  onReviewEstimates?: (taskId: string) => void;
  onViewSummary?: (taskId: string) => void;
  onSelectTask?: (taskId: string) => void;
  selectedTaskId?: string | null;
}) {
  const propertyName = getPropertyName(project.propertyId);
  const projectStatusToUnified = projectStatusMapping[project.status] || "not_started";
  const urg = projectPriorityConfig[project.priority] || projectPriorityConfig.low;

  return (
    <>
      <TableRow
        data-testid={`row-project-${project.id}`}
        className={isExpanded ? "bg-muted/20" : ""}
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
              data-testid={`button-expand-project-${project.id}`}
              className="shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            <FolderKanban className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Link href={`/projects/${project.id}`}>
              <span
                className="cursor-pointer hover:underline font-medium"
                data-testid={`text-project-name-${project.id}`}
              >
                {project.name}
              </span>
            </Link>
            <span className="text-xs text-muted-foreground" data-testid={`text-project-progress-${project.id}`}>
              {completedChildTasks}/{childTasks.length} tasks
            </span>
          </div>
        </TableCell>
        <TableCell className="py-2.5">
          <span className="text-sm text-muted-foreground">-</span>
        </TableCell>
        <TableCell className="py-2.5">
          <span className="text-sm text-muted-foreground">-</span>
        </TableCell>
        <TableCell className="py-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm">
              {project.targetEndDate
                ? format(new Date(project.targetEndDate), "M/d/yyyy")
                : "-"}
            </span>
          </div>
        </TableCell>
        <TableCell className="py-2.5">
          <Select
            value={project.status}
            onValueChange={(val) => handleProjectStatusChange(project.id, val)}
          >
            <SelectTrigger
              className="text-xs border-0 bg-transparent p-0 shadow-none h-auto"
              data-testid={`select-project-status-${project.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Badge
                variant="outline"
                className={`${taskStatusColors[projectStatusToUnified] || taskStatusColors.not_started} text-xs font-semibold uppercase tracking-wider cursor-pointer no-default-hover-elevate no-default-active-elevate`}
              >
                <SelectValue />
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="py-2.5">
          <span className="flex items-center gap-1">
            <Flag className={`w-3.5 h-3.5 ${urg.color} shrink-0`} />
            <span className={`text-xs ${urg.color}`}>{urg.label}</span>
          </span>
        </TableCell>
        <TableCell className="py-2.5 hidden md:table-cell">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {propertyName || "-"}
          </span>
        </TableCell>
      </TableRow>

      {isExpanded &&
        childTasks.map((task, idx) => (
          <TaskTableRow
            key={task.id}
            task={task}
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
