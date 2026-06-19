import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MapPin, Plus } from "lucide-react";
import type { Task, Property, User } from "@shared/schema";
import {
  filterTechnicianWorkTasks,
  filterTasksByDate,
  groupTasksByDay,
  DateFilterBar,
  DaySeparator,
  type TaskWithHelperFlag,
} from "./helpers";
import { formatTaskReferenceId } from "@/utils/taskUtils";
import { FieldWorkActiveList } from "./FieldWorkActiveList";
import { FieldWorkTaskCard } from "./FieldWorkTaskCard";

interface TechnicianWorkViewProps {
  user: User;
  tasks: Task[];
  properties?: Property[];
  navigate: (path: string) => void;
}

export function TechnicianWorkView({ user, tasks, properties, navigate }: TechnicianWorkViewProps) {
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today");
  const getPropertyById = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find((p) => p.id === propertyId) || null;
  };

  const techTasks = filterTechnicianWorkTasks(tasks, user.id);

  const filteredTasks = filterTasksByDate(techTasks, dateFilter);
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
        testIdPrefix="tech"
        onOpen={() => navigate(`/tasks/${task.id}`)}
        className={`rounded-lg border-2 p-3.5 sm:p-4 cursor-pointer active-elevate-2 transition-colors ${
          isInProgress
            ? "border-primary bg-primary/5"
            : isHighUrgency
            ? "border-red-400 dark:border-red-600"
            : "border-border"
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-base sm:text-lg font-bold shrink-0 ${
            isInProgress
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate" data-testid={`text-task-name-${task.id}`}>
              {task.name}
            </h3>
            <p
              className="text-[11px] font-mono text-muted-foreground mt-0.5"
              data-testid={`text-task-id-${task.id}`}
              title={task.id}
            >
              ID {formatTaskReferenceId(task.id)}
            </p>
            {property && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {property.name}
              </p>
            )}
          </div>
          {isInProgress && (
            <Badge variant="default" className="shrink-0 max-w-[5.75rem] justify-center truncate text-[10px] sm:text-xs" data-testid={`badge-status-${task.id}`}>
              In Progress
            </Badge>
          )}
          {isHelper && !isInProgress && (
            <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs" data-testid={`badge-helper-${task.id}`}>
              Team
            </Badge>
          )}
          {isHighUrgency && !isInProgress && (
            <Badge variant="destructive" className="shrink-0 text-[10px] sm:text-xs" data-testid={`badge-urgency-${task.id}`}>
              Urgent
            </Badge>
          )}
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
        testIdPrefix="tech"
        onOpen={() => navigate(`/tasks/${task.id}`)}
        className="rounded-lg border-2 border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3.5 sm:p-4 cursor-pointer active-elevate-2 transition-colors"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 bg-green-100 dark:bg-green-900/50">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate text-green-900 dark:text-green-100" data-testid={`text-task-name-${task.id}`}>
              {task.name}
            </h3>
            <p
              className="text-[11px] font-mono text-green-700/80 dark:text-green-400/80 mt-0.5"
              data-testid={`text-task-id-${task.id}`}
              title={task.id}
            >
              ID {formatTaskReferenceId(task.id)}
            </p>
            {property && (
              <p className="text-sm text-green-700 dark:text-green-400 mt-0.5 truncate flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {property.name}
              </p>
            )}
          </div>
          <Badge variant="outline" className="shrink-0 border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 text-[10px] sm:text-xs" data-testid={`badge-completed-${task.id}`}>
            Done
          </Badge>
        </div>
      </FieldWorkTaskCard>
    );
  };

  return (
    <div className="px-3 py-4 pb-8 sm:p-4 sm:pb-8 space-y-5 max-w-lg mx-auto">
      <div className="pt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            My Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTasks.length === 0
              ? "Nothing assigned right now"
              : `${activeTasks.length} task${activeTasks.length !== 1 ? "s" : ""} to do`}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 h-10 px-3"
          onClick={() => navigate("/work/add-job")}
          aria-label="Add job"
          data-testid="button-add-field-job"
        >
          <Plus className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Add Job</span>
        </Button>
      </div>

      <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} />

      {activeTasks.length === 0 && completedTasks.length === 0 ? (
        <div className="text-center py-10 px-2">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <p className="text-xl font-semibold">All done!</p>
          <p className="text-muted-foreground mt-1">
            {dateFilter === "today" ? "No tasks for today." : dateFilter === "week" ? "No tasks this week." : "No tasks assigned to you right now."}
          </p>
          <Button
            type="button"
            className="mt-6 w-full sm:w-auto h-11"
            onClick={() => navigate("/work/add-job")}
            data-testid="button-add-field-job-empty"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Job
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTasks.length > 0 ? (
            <FieldWorkActiveList groups={activeGroups} renderCard={renderActiveCard} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="no-active-tasks-hint">
              {dateFilter === "today"
                ? "No active tasks scheduled for today."
                : dateFilter === "week"
                ? "No active tasks scheduled this week."
                : "No active tasks right now."}
            </p>
          )}

          {completedTasks.length > 0 && (
            <>
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Completed</p>
              </div>
              {completedGroups.map((group) => (
                <div key={group.dateKey} className="space-y-3">
                  <DaySeparator label={group.label} />
                  {group.tasks.map((task) => renderCompletedCard(task))}
                </div>
              ))}
            </>
          )}
        </div>
      )}

    </div>
  );
}
