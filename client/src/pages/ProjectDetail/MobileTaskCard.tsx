import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User as UserIcon, Flag, AlertTriangle, ClipboardCheck } from "lucide-react";
import type { Task, User } from "@shared/schema";
import type { StatusType } from "./useProjectDetail";
import {
  urgencyConfig,
  taskStatusBadgeColors as tableBadgeColors,
  statusDotColors,
} from "@/utils/taskUtils";

export function MobileTaskCard({
  task,
  allUsers,
  handleStatusChange,
  handleUrgencyChange,
  onReviewEstimates,
  isAdmin,
  onViewSummary,
}: {
  task: Task;
  allUsers: User[] | undefined;
  handleStatusChange: (taskId: string, newStatus: StatusType) => void;
  handleUrgencyChange: (taskId: string, urgency: string) => void;
  onReviewEstimates?: (taskId: string) => void;
  isAdmin?: boolean;
  onViewSummary?: (taskId: string) => void;
}) {
  const isOverdue = task.estimatedCompletionDate
    && task.status !== "completed"
    && new Date(task.estimatedCompletionDate) < new Date();
  const assignee = task.assignedToId ? allUsers?.find(u => u.id === task.assignedToId) : null;
  const urg = urgencyConfig[task.urgency] || urgencyConfig.low;

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className="p-3 rounded-md border hover-elevate cursor-pointer space-y-2" data-testid={`task-card-${task.id}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotColors[task.status] || "bg-gray-400"}`} />
            <p className="font-medium truncate">{task.name}</p>
            {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
          </div>
          <Badge
            variant="outline"
            className={`${tableBadgeColors[task.status] || ""} text-xs font-semibold uppercase tracking-wider shrink-0 no-default-hover-elevate no-default-active-elevate`}
          >
            {task.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {assignee && (
            <span className="flex items-center gap-1">
              <UserIcon className="w-3 h-3" />
              {assignee.firstName && assignee.lastName
                ? `${assignee.firstName} ${assignee.lastName}`
                : assignee.username}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Flag className={`w-3 h-3 ${urg.color}`} />
            <span className={urg.color}>{urg.label}</span>
          </span>
          {task.estimatedCompletionDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(task.estimatedCompletionDate).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.preventDefault()}>
          {isAdmin && task.requiresEstimate && task.estimateStatus === "waiting_approval" && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
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
                e.preventDefault();
                onViewSummary(task.id);
              }}
              data-testid={`button-view-summary-${task.id}`}
            >
              <ClipboardCheck className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}
