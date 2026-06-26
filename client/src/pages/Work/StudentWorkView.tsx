import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { TaskWithHelperFlag } from "./helpers";
import { CheckCircle2, Eye, EyeOff, MapPin } from "lucide-react";
import type { Task, Property, User } from "@shared/schema";
import {
  filterStudentWorkTasks,
  filterTasksByDate,
  groupTasksByDay,
  DateFilterBar,
  DaySeparator,
} from "./helpers";
import { FieldWorkActiveList } from "./FieldWorkActiveList";
import { FieldWorkTaskCard } from "./FieldWorkTaskCard";

interface StudentWorkViewProps {
  user: User;
  tasks: Task[];
  properties?: Property[];
  navigate: (path: string) => void;
}

export function StudentWorkView({ user, tasks, properties, navigate }: StudentWorkViewProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today");
  const getPropertyById = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find((p) => p.id === propertyId) || null;
  };

  const studentTasks = filterStudentWorkTasks(tasks, user.id);

  const filteredTasks = filterTasksByDate(studentTasks, dateFilter);
  const activeTasks = filteredTasks.filter((t) => t.status !== "completed");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");
  const activeGroups = groupTasksByDay(activeTasks);
  const completedGroups = groupTasksByDay(completedTasks);

  const renderActiveCard = (task: Task, index: number) => {
    const property = getPropertyById(task.propertyId);
    const isInProgress = task.status === "in_progress";
    const isHighUrgency = task.urgency === "high";
    const isHelper = (task as TaskWithHelperFlag).isHelper;
    return (
      <FieldWorkTaskCard
        key={task.id}
        taskId={task.id}
        taskName={task.name}
        ariaLabel={`Open task ${task.name}`}
        testIdPrefix="student"
        onOpen={() => navigate(`/tasks/${task.id}`)}
        className={`rounded-lg border-2 p-3.5 sm:p-4 cursor-pointer active-elevate-2 transition-colors ${
          isInProgress
            ? "border-primary bg-primary/5"
            : isHighUrgency
            ? "border-red-400 dark:border-red-600"
            : "border-border"
        }`}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-base sm:text-lg font-bold shrink-0 ${
            isInProgress
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-semibold text-base leading-snug break-words [overflow-wrap:anywhere]" data-testid={`text-task-name-${task.id}`}>
              {task.name}
            </h3>
            {(isHelper || isInProgress || (isHighUrgency && !isInProgress)) && (
              <div className="flex flex-wrap gap-1.5">
                {isHelper && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs" data-testid={`badge-helper-${task.id}`}>
                    Helper
                  </Badge>
                )}
                {isInProgress && (
                  <Badge variant="default" className="text-[10px] sm:text-xs" data-testid={`badge-status-${task.id}`}>
                    In Progress
                  </Badge>
                )}
                {isHighUrgency && !isInProgress && (
                  <Badge variant="destructive" className="text-[10px] sm:text-xs" data-testid={`badge-urgency-${task.id}`}>
                    Urgent
                  </Badge>
                )}
              </div>
            )}
            {property && (
              <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {property.name}
              </p>
            )}
          </div>
        </div>
      </FieldWorkTaskCard>
    );
  };

  const renderCompletedCard = (task: Task) => {
    const property = getPropertyById(task.propertyId);
    return (
      <FieldWorkTaskCard
        key={task.id}
        taskId={task.id}
        taskName={task.name}
        ariaLabel={`Open completed task ${task.name}`}
        testIdPrefix="student"
        onOpen={() => navigate(`/tasks/${task.id}`)}
        className="rounded-lg border border-border/50 p-3 cursor-pointer opacity-60"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-medium text-sm line-through break-words leading-snug [overflow-wrap:anywhere]" data-testid={`text-task-name-${task.id}`}>
              {task.name}
            </h3>
            {property && (
              <p className="text-xs text-muted-foreground truncate">{property.name}</p>
            )}
          </div>
        </div>
      </FieldWorkTaskCard>
    );
  };

  return (
    <div className="px-3 py-4 pb-28 sm:p-4 sm:pb-28 space-y-5 max-w-lg mx-auto">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Your Tasks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeTasks.length === 0
            ? "Nothing assigned right now"
            : `${activeTasks.length} task${activeTasks.length !== 1 ? "s" : ""} to do`}
        </p>
      </div>

      <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} />

      {activeTasks.length === 0 && completedTasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <p className="text-xl font-semibold">All done!</p>
          <p className="text-muted-foreground mt-1">
            {dateFilter === "today" ? "No tasks for today." : dateFilter === "week" ? "No tasks this week." : "No tasks assigned to you right now."}
          </p>
        </div>
      ) : activeTasks.length > 0 ? (
        <FieldWorkActiveList groups={activeGroups} renderCard={renderActiveCard} />
      ) : completedTasks.length > 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4" data-testid="no-active-tasks-hint">
          {dateFilter === "today"
            ? "No active tasks scheduled for today."
            : dateFilter === "week"
            ? "No active tasks scheduled this week."
            : "No active tasks right now."}
        </p>
      ) : null}

      {completedTasks.length > 0 && (
        <div>
          <button
            type="button"
            aria-expanded={showCompleted}
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-sm text-muted-foreground flex items-center gap-1 mb-2"
            data-testid="toggle-completed-tasks"
          >
            {showCompleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showCompleted ? "Hide" : "Show"} {completedTasks.length} completed
          </button>
          {showCompleted && (
            <div className="space-y-2">
              {completedGroups.map((group) => (
                <div key={group.dateKey} className="space-y-2">
                  <DaySeparator label={group.label} />
                  {group.tasks.map((task) => renderCompletedCard(task))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
