import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MapPin, ClipboardCheck } from "lucide-react";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import type { Task, Property, User } from "@shared/schema";
import { filterTasksByDate, groupTasksByDay, DateFilterBar, DaySeparator } from "./helpers";

interface TechnicianWorkViewProps {
  user: User;
  tasks: Task[];
  properties?: Property[];
  navigate: (path: string) => void;
}

export function TechnicianWorkView({ user, tasks, properties, navigate }: TechnicianWorkViewProps) {
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today");
  const [summaryTaskId, setSummaryTaskId] = useState<string | null>(null);

  const getPropertyById = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find((p) => p.id === propertyId) || null;
  };

  const techTasks = tasks.filter((t) => {
    if (t.parentTaskId) return false;
    const isAssignedToMe = t.assignedToId === user.id;
    const isTechPoolTask = t.assignedToId === "technician_pool" || t.assignedPool === "technician_pool";
    return isAssignedToMe || isTechPoolTask;
  });

  const filteredTasks = filterTasksByDate(techTasks, dateFilter);
  const activeTasks = filteredTasks.filter((t) => t.status !== "completed");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");
  const activeGroups = groupTasksByDay(activeTasks);
  const completedGroups = groupTasksByDay(completedTasks);

  const renderActiveCard = (task: Task, index: number) => {
    const property = getPropertyById(task.propertyId);
    const isInProgress = task.status === "in_progress";
    const isHighUrgency = task.urgency === "high";
    return (
      <div
        key={task.id}
        className={`rounded-lg border-2 p-4 cursor-pointer active-elevate-2 transition-colors ${
          isInProgress
            ? "border-primary bg-primary/5"
            : isHighUrgency
            ? "border-red-400 dark:border-red-600"
            : "border-border"
        }`}
        data-testid={`tech-task-card-${task.id}`}
        onClick={() => navigate(`/tasks/${task.id}`)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
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
            {property && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {property.name}
              </p>
            )}
          </div>
          {isInProgress && (
            <Badge variant="default" className="shrink-0" data-testid={`badge-status-${task.id}`}>
              In Progress
            </Badge>
          )}
          {isHighUrgency && !isInProgress && (
            <Badge variant="destructive" className="shrink-0" data-testid={`badge-urgency-${task.id}`}>
              Urgent
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const renderCompletedCard = (task: Task) => {
    const property = getPropertyById(task.propertyId);
    return (
      <div
        key={task.id}
        className="rounded-lg border-2 border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 cursor-pointer active-elevate-2 transition-colors"
        data-testid={`tech-task-card-${task.id}`}
        onClick={() => navigate(`/tasks/${task.id}`)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-green-100 dark:bg-green-900/50">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate text-green-900 dark:text-green-100" data-testid={`text-task-name-${task.id}`}>
              {task.name}
            </h3>
            {property && (
              <p className="text-sm text-green-700 dark:text-green-400 mt-0.5 truncate flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {property.name}
              </p>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setSummaryTaskId(task.id);
            }}
            data-testid={`button-view-summary-${task.id}`}
          >
            <ClipboardCheck className="w-4 h-4" />
          </Button>
          <Badge variant="outline" className="shrink-0 border-green-400 dark:border-green-700 text-green-700 dark:text-green-400" data-testid={`badge-completed-${task.id}`}>
            Done
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 pb-8 space-y-5 max-w-lg mx-auto">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          My Tasks
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
      ) : (
        <div className="space-y-3">
          {activeGroups.map((group) => (
            <div key={group.dateKey} className="space-y-3">
              <DaySeparator label={group.label} />
              {group.tasks.map((task, index) => renderActiveCard(task, index))}
            </div>
          ))}

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

      <CompletedTaskSummary
        taskId={summaryTaskId!}
        open={!!summaryTaskId}
        onOpenChange={(open) => !open && setSummaryTaskId(null)}
      />
    </div>
  );
}
