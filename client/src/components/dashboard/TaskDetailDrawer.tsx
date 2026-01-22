import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Clock,
  User,
  Play,
  CheckCircle2,
  Pause,
  AlertCircle,
  Calendar,
  ArrowRight,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, User as UserType, Property } from "@shared/schema";
import { format, parseISO, isPast, isToday } from "date-fns";
import { Link } from "wouter";

interface TaskDetailDrawerProps {
  task: Task | null;
  assignee?: UserType | null;
  property?: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  isPending?: boolean;
}

const urgencyConfig = {
  high: {
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    label: "High Priority",
  },
  medium: {
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    label: "Medium Priority",
  },
  low: {
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    label: "Low Priority",
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

export default function TaskDetailDrawer({
  task,
  assignee,
  property,
  isOpen,
  onClose,
  onStatusChange,
  isPending,
}: TaskDetailDrawerProps) {
  if (!task) return null;

  const urgency = urgencyConfig[task.urgency] || urgencyConfig.low;
  const status = statusConfig[task.status] || statusConfig.not_started;

  const isOverdue =
    task.estimatedCompletionDate &&
    isPast(parseISO(task.estimatedCompletionDate as unknown as string)) &&
    task.status !== "completed";

  const getInitials = (user?: UserType | null) => {
    if (!user) return "?";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return user.username?.[0]?.toUpperCase() || "?";
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Not set";
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "MMM d, yyyy");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-3">
            {task.urgency === "high" && (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <SheetTitle className="text-left text-lg">{task.name}</SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-xs", status.color)}>
              {status.label}
            </Badge>
            <Badge variant="outline" className={cn("text-xs", urgency.badge)}>
              {urgency.label}
            </Badge>
            {isOverdue && (
              <Badge variant="outline" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                Overdue
              </Badge>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {task.status !== "in_progress" && task.status !== "completed" && (
              <Button
                onClick={() => onStatusChange(task.id, "in_progress")}
                disabled={isPending}
                className="flex-1"
                data-testid="drawer-start-task"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Task
              </Button>
            )}
            {task.status === "in_progress" && (
              <>
                <Button
                  onClick={() => onStatusChange(task.id, "completed")}
                  disabled={isPending}
                  className="flex-1"
                  data-testid="drawer-complete-task"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onStatusChange(task.id, "on_hold")}
                  disabled={isPending}
                  data-testid="drawer-hold-task"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Hold
                </Button>
              </>
            )}
            {task.status === "on_hold" && (
              <Button
                onClick={() => onStatusChange(task.id, "in_progress")}
                disabled={isPending}
                className="flex-1"
                data-testid="drawer-resume-task"
              >
                <Play className="w-4 h-4 mr-2" />
                Resume Task
              </Button>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{task.description || "No description"}</p>
              </div>
            </div>

            {property && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Location</p>
                  <p className="text-sm">{property.name}</p>
                  {property.address && (
                    <p className="text-xs text-muted-foreground">{property.address}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">Assigned To</p>
                {assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(assignee)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {assignee.firstName
                        ? `${assignee.firstName} ${assignee.lastName || ""}`
                        : assignee.username}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-orange-500">Unassigned</span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">Start Date</p>
                <p className="text-sm">{formatDate(task.initialDate as unknown as string)}</p>
              </div>
            </div>

            {task.estimatedCompletionDate && (
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Due Date</p>
                  <p
                    className={cn(
                      "text-sm",
                      isOverdue && "text-red-500 font-medium"
                    )}
                  >
                    {formatDate(task.estimatedCompletionDate as unknown as string)}
                    {isOverdue && " (Overdue)"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <Link href={`/tasks/${task.id}`}>
            <Button variant="outline" className="w-full" data-testid="drawer-view-full">
              View Full Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
