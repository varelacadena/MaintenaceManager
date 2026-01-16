import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MapPin,
  Clock,
  MoreVertical,
  Play,
  CheckCircle2,
  Pause,
  User,
  AlertCircle,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, User as UserType, Property } from "@shared/schema";
import { format, isToday, isPast, parseISO } from "date-fns";

interface TaskCardProps {
  task: Task;
  assignee?: UserType | null;
  property?: Property | null;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  onViewDetails: (task: Task) => void;
  isPending?: boolean;
}

const urgencyConfig = {
  high: {
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800",
    icon: "text-red-500",
  },
  medium: {
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    icon: "text-yellow-500",
  },
  low: {
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-green-800",
    icon: "text-green-500",
  },
};

const statusConfig = {
  not_started: {
    label: "Not Started",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
  on_hold: {
    label: "On Hold",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  },
};

export default function TaskCard({
  task,
  assignee,
  property,
  onStatusChange,
  onViewDetails,
  isPending,
}: TaskCardProps) {
  const urgency = urgencyConfig[task.urgency] || urgencyConfig.low;
  const status = statusConfig[task.status] || statusConfig.not_started;

  const isOverdue =
    task.estimatedCompletionDate &&
    isPast(parseISO(task.estimatedCompletionDate as unknown as string)) &&
    task.status !== "completed";

  const isDueToday =
    task.estimatedCompletionDate &&
    isToday(parseISO(task.estimatedCompletionDate as unknown as string));

  const getInitials = (user?: UserType | null) => {
    if (!user) return "?";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return user.username?.[0]?.toUpperCase() || "?";
  };

  const formatDueDate = (date: Date | string | null) => {
    if (!date) return null;
    const d = typeof date === "string" ? parseISO(date) : date;
    if (isToday(d)) return "Today";
    return format(d, "MMM d");
  };

  return (
    <Card
      className={cn(
        "group relative transition-all duration-150 hover-elevate cursor-pointer",
        isOverdue && "border-red-300 dark:border-red-800",
        isPending && "opacity-60 pointer-events-none"
      )}
      onClick={() => onViewDetails(task)}
      data-testid={`task-card-${task.id}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {task.urgency === "high" && (
                    <AlertCircle className={cn("w-4 h-4 flex-shrink-0", urgency.icon)} />
                  )}
                  <h3 className="font-medium text-sm md:text-base truncate">
                    {task.name}
                  </h3>
                </div>
                {property && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{property.name}</span>
                  </div>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`task-menu-${task.id}`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    onClick={() => onViewDetails(task)}
                    data-testid={`task-view-${task.id}`}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {task.status !== "in_progress" && (
                    <DropdownMenuItem
                      onClick={() => onStatusChange(task.id, "in_progress")}
                      data-testid={`task-start-${task.id}`}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Task
                    </DropdownMenuItem>
                  )}
                  {task.status === "in_progress" && (
                    <DropdownMenuItem
                      onClick={() => onStatusChange(task.id, "on_hold")}
                      data-testid={`task-hold-${task.id}`}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Put On Hold
                    </DropdownMenuItem>
                  )}
                  {task.status !== "completed" && (
                    <DropdownMenuItem
                      onClick={() => onStatusChange(task.id, "completed")}
                      data-testid={`task-complete-${task.id}`}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0", status.color)}
              >
                {status.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 capitalize", urgency.badge)}
              >
                {task.urgency}
              </Badge>
              {(isOverdue || isDueToday) && task.estimatedCompletionDate && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    isOverdue
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200"
                  )}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDueDate(task.estimatedCompletionDate as unknown as string)}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                {assignee ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(assignee)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {assignee.firstName || assignee.username}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-orange-500">
                    <User className="w-4 h-4" />
                    <span className="text-xs">Unassigned</span>
                  </div>
                )}
              </div>

              {task.status !== "completed" && (
                <div className="flex items-center gap-1">
                  {task.status === "not_started" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(task.id, "in_progress");
                      }}
                      data-testid={`task-quick-start-${task.id}`}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Start
                    </Button>
                  )}
                  {task.status === "in_progress" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-green-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(task.id, "completed");
                      }}
                      data-testid={`task-quick-complete-${task.id}`}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Complete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
