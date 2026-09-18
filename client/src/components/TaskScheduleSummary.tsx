import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Task } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatTaskDate, formatTaskDateTime } from "@/utils/taskUtils";

type ScheduleTask = Pick<
  Task,
  "initialDate" | "estimatedCompletionDate" | "actualCompletionDate" | "estimatedHours"
>;

interface TaskScheduleSummaryProps {
  task: ScheduleTask;
  isOverdue?: boolean;
  variant?: "card" | "hero";
  className?: string;
}

export function TaskScheduleSummary({
  task,
  isOverdue = false,
  variant = "card",
  className,
}: TaskScheduleSummaryProps) {
  const start = formatTaskDate(task.initialDate, "Not set");
  const due = formatTaskDate(task.estimatedCompletionDate, "Not set");
  const completed = formatTaskDateTime(task.actualCompletionDate, "Not set");
  const hours = task.estimatedHours != null ? `${task.estimatedHours}h` : "Not set";

  if (variant === "hero") {
    return (
      <div className={cn("space-y-1 mt-1.5", className)} data-testid="task-schedule-summary">
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <span className="text-xs sm:text-sm truncate">Start {start}</span>
        </div>
        <div className={cn("flex items-center gap-1.5 min-w-0", isOverdue && "text-red-100")}>
          <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <span className="text-xs sm:text-sm truncate">Due {due}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <span className="text-xs sm:text-sm truncate">Completed {completed}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-lg border border-border bg-muted/30 p-4", className)}
      data-testid="task-schedule-summary"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Schedule</p>
      <div className="grid grid-cols-2 gap-3">
        <ScheduleItem icon={<Calendar className="w-3.5 h-3.5" />} label="Start" value={start} />
        <ScheduleItem
          icon={<Calendar className="w-3.5 h-3.5" />}
          label="Due"
          value={due}
          valueClassName={isOverdue ? "text-destructive" : undefined}
        />
        <ScheduleItem
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          label="Completed"
          value={completed}
          valueClassName={task.actualCompletionDate ? "text-green-700 dark:text-green-400" : undefined}
        />
        {task.estimatedHours != null && (
          <ScheduleItem icon={<Clock className="w-3.5 h-3.5" />} label="Est. hours" value={hours} />
        )}
      </div>
    </div>
  );
}

function ScheduleItem({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn("text-sm font-medium truncate", value === "Not set" && "text-muted-foreground font-normal", valueClassName)}>
        {value}
      </p>
    </div>
  );
}
