import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Eye, EyeOff, MapPin, ClipboardCheck } from "lucide-react";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import type { Task, Property, User } from "@shared/schema";
import { filterTasksByDate, groupTasksByDay, DateFilterBar, DaySeparator } from "./helpers";

interface StudentWorkViewProps {
  user: User;
  tasks: Task[];
  properties?: Property[];
  navigate: (path: string) => void;
}

export function StudentWorkView({ user, tasks, properties, navigate }: StudentWorkViewProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today");
  const [summaryTaskId, setSummaryTaskId] = useState<string | null>(null);

  const getPropertyById = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find((p) => p.id === propertyId) || null;
  };

  const studentTasks = tasks.filter((t) => {
    if (t.parentTaskId) return false;
    const isAssignedToMe = t.assignedToId === user.id;
    const isStudentPoolTask = t.assignedToId === "student_pool";
    return isAssignedToMe || isStudentPoolTask;
  });

  const filteredTasks = filterTasksByDate(studentTasks, dateFilter);
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
        data-testid={`student-task-card-${task.id}`}
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
        className="rounded-lg border border-border/50 p-3 cursor-pointer opacity-60"
        data-testid={`student-task-card-${task.id}`}
        onClick={() => navigate(`/tasks/${task.id}`)}
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-through truncate" data-testid={`text-task-name-${task.id}`}>
              {task.name}
            </h3>
            {property && (
              <p className="text-xs text-muted-foreground truncate">{property.name}</p>
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
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 pb-28 space-y-5 max-w-lg mx-auto">
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
      ) : (
        <div className="space-y-3">
          {activeGroups.map((group) => (
            <div key={group.dateKey} className="space-y-3">
              <DaySeparator label={group.label} />
              {group.tasks.map((task, index) => renderActiveCard(task, index))}
            </div>
          ))}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div>
          <button
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

      <CompletedTaskSummary
        taskId={summaryTaskId!}
        open={!!summaryTaskId}
        onOpenChange={(open) => !open && setSummaryTaskId(null)}
      />
    </div>
  );
}
