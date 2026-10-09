import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Building2, Calendar, CheckCircle2, Plus } from "lucide-react";
import type { Property, Task, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { dateInputValueToTaskTimestamp } from "@/lib/taskCalendarDates";
import { invalidateTaskAfterMutation } from "@/lib/taskQueryInvalidation";
import { cn } from "@/lib/utils";
import { FieldWorkTaskCard } from "./FieldWorkTaskCard";
import { filterTechnicianWorkTasks, type TaskWithHelperFlag } from "./helpers";
import {
  buildTechWorkPlan,
  formatDayLabel,
  isTaskOverdue,
  taskDueKey,
  taskScheduleKey,
  techTaskStatusLabel,
  type TechDay,
  type TechWorkPlan,
} from "./techWorkSchedule";
import { loadTechWorkView, saveTechWorkView, type TechWorkView } from "./techWorkViewPrefs";

interface TechnicianWorkViewProps {
  user: User;
  tasks: Task[];
  properties?: Property[];
  navigate: (path: string) => void;
}

function toneClass(task: Task, todayKey: string): string {
  if (isTaskOverdue(task, todayKey)) return "text-red-600 dark:text-red-400";
  if (task.urgency === "high") return "text-primary";
  if (task.status === "in_progress") return "text-blue-700 dark:text-blue-400";
  return "text-muted-foreground";
}

function cardClass(task: Task, todayKey: string): string {
  if (isTaskOverdue(task, todayKey)) {
    return "border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/40";
  }
  if (task.urgency === "high") return "border-primary bg-card";
  if (task.status === "in_progress") {
    return "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40";
  }
  return "border-border bg-card";
}

function dotClass(task: Task, todayKey: string): string {
  if (isTaskOverdue(task, todayKey)) return "bg-red-500";
  if (task.urgency === "high") return "bg-primary";
  if (task.status === "in_progress") return "bg-blue-600";
  return "bg-muted-foreground/45";
}

function taskDateLabel(task: Task, todayKey: string): string | null {
  const due = taskDueKey(task);
  const schedule = taskScheduleKey(task);
  const showDate = due && (due < todayKey || (schedule !== null && schedule < todayKey));
  return showDate ? formatDayLabel(due) : null;
}

function CardMeta({
  propertyName,
  dateLabel,
  note,
}: {
  propertyName?: string;
  dateLabel: string | null;
  note?: string;
}) {
  if (!propertyName && !dateLabel && !note) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground mt-0.5 min-w-0">
      {propertyName && (
        <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
          <Building2 className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{propertyName}</span>
        </span>
      )}
      {dateLabel && (
        <span className="inline-flex items-center gap-1 shrink-0">
          <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{dateLabel}</span>
        </span>
      )}
      {note && <span className="shrink-0">{note}</span>}
    </p>
  );
}

function JobBody({
  task,
  todayKey,
  propertyName,
  isHelper,
}: {
  task: Task;
  todayKey: string;
  propertyName?: string;
  isHelper: boolean;
}) {
  const dateLabel = taskDateLabel(task, todayKey);
  return (
    <div className="flex items-start gap-2 min-w-0">
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-base leading-snug break-words [overflow-wrap:anywhere]" data-testid={`text-task-name-${task.id}`}>
          {task.name}
        </h3>
        <CardMeta propertyName={propertyName} dateLabel={dateLabel} />
        {isHelper && (
          <p className="text-[11px] font-medium text-muted-foreground mt-1" data-testid={`badge-helper-${task.id}`}>
            Team
          </p>
        )}
      </div>
      <span className={cn("text-xs font-semibold shrink-0 pt-0.5", toneClass(task, todayKey))} data-testid={`badge-status-${task.id}`}>
        {techTaskStatusLabel(task, todayKey)}
      </span>
    </div>
  );
}

function TechJobCard({
  task,
  todayKey,
  propertyName,
  isHelper,
  onOpen,
  scheduleAction,
  scheduleOpen,
  schedulePending,
  days,
  onToggleSchedule,
  onPlace,
}: {
  task: Task;
  todayKey: string;
  propertyName?: string;
  isHelper: boolean;
  onOpen: () => void;
  scheduleAction: "reschedule" | "set-day" | null;
  scheduleOpen: boolean;
  schedulePending: boolean;
  days: TechDay[];
  onToggleSchedule: () => void;
  onPlace: (dayKey: string) => void;
}) {
  const body = <JobBody task={task} todayKey={todayKey} propertyName={propertyName} isHelper={isHelper} />;
  const opener = (
    <FieldWorkTaskCard
      taskId={task.id}
      taskName={task.name}
      ariaLabel={`Open task ${task.name}`}
      testIdPrefix="tech"
      onOpen={onOpen}
      className={cn(
        "min-w-0 cursor-pointer active-elevate-2 transition-colors",
        scheduleAction ? "flex-1 border-0 bg-transparent p-1 rounded-md" : cn("rounded-lg border-2 p-3", cardClass(task, todayKey)),
      )}
    >
      {body}
    </FieldWorkTaskCard>
  );

  if (!scheduleAction) return opener;

  const dateLabel = taskDateLabel(task, todayKey);
  return (
    <div
      className={cn(
        "rounded-lg border-2 min-w-0 overflow-hidden",
        cardClass(task, todayKey),
        scheduleOpen && "border-primary",
      )}
    >
      <div className="flex items-center gap-1.5 p-1.5 min-w-0">
        <button
          type="button"
          aria-expanded={scheduleOpen}
          aria-controls={`schedule-days-${task.id}`}
          disabled={schedulePending}
          onClick={onToggleSchedule}
          className="inline-flex shrink-0 w-[4.5rem] h-11 items-center justify-center overflow-hidden rounded-md bg-primary px-1 text-center text-[11px] font-semibold leading-tight text-primary-foreground whitespace-normal touch-manipulation disabled:opacity-50"
          data-testid={scheduleAction === "reschedule" ? `button-reschedule-${task.id}` : `button-set-day-${task.id}`}
        >
          {scheduleAction === "reschedule" ? "Reschedule" : "Set day"}
        </button>
        {opener}
      </div>
      {scheduleOpen && (
        <div id={`schedule-days-${task.id}`} className="px-1.5 pb-1.5 space-y-1.5 min-w-0">
          <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground px-0.5">
            {scheduleAction === "reschedule" ? (
              <>
                <span>Work day only.</span>
                {dateLabel && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
                    {dateLabel} stays.
                  </span>
                )}
              </>
            ) : (
              <span>This is the day it shows on My Tasks.</span>
            )}
          </p>
          <div className="grid grid-cols-7 gap-1" data-testid={`place-days-${task.id}`}>
            {days.map((day) => (
              <button
                key={day.key}
                type="button"
                disabled={schedulePending}
                onClick={() => onPlace(day.key)}
                className={cn(
                  "inline-flex min-w-0 h-11 w-full flex-col items-center justify-center rounded-md border bg-background px-0 text-[10px] font-semibold leading-none touch-manipulation disabled:opacity-50",
                  day.isToday ? "border-primary text-primary" : "border-border text-foreground",
                )}
                aria-label={`Do ${task.name} on ${day.name}`}
                data-testid={`button-place-${task.id}-${day.key}`}
              >
                <span className="block">{day.short}</span>
                <span className={cn("block text-[10px] font-medium", day.isToday ? "text-primary" : "text-muted-foreground")}>{day.dateNum}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DayDots({ dayKey, tasks, todayKey }: { dayKey: string; tasks: Task[]; todayKey: string }) {
  return (
    <span className="flex w-full h-1 gap-px overflow-hidden" data-testid={`tech-week-meter-${dayKey}`}>
      {tasks.map((task) => (
        <span key={task.id} className={cn("h-1 flex-1 min-w-0 rounded-sm", dotClass(task, todayKey))} data-testid={`tech-week-dot-${dayKey}-${task.id}`} />
      ))}
    </span>
  );
}

function WeekStrip({
  plan,
  selectedDay,
  onSelect,
}: {
  plan: TechWorkPlan;
  selectedDay: string;
  onSelect: (dayKey: string) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1 w-full min-w-0" data-testid="tech-week-strip">
      {plan.days.map((day) => {
        const jobs = plan.byDay[day.key] ?? [];
        const selected = day.key === selectedDay;
        const hasOverdue = jobs.some((task) => isTaskOverdue(task, plan.todayKey));
        const hasUrgent = jobs.some((task) => task.urgency === "high" && !isTaskOverdue(task, plan.todayKey));
        return (
          <button
            key={day.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(day.key)}
            className={cn(
              "min-w-0 min-h-11 rounded-md border px-0.5 py-1.5 flex flex-col items-center gap-1 touch-manipulation",
              selected ? "border-primary bg-primary/10" : "border-border bg-card",
            )}
            data-testid={`tech-week-day-${day.key}`}
          >
            <span className="text-[10px] leading-none text-muted-foreground">{day.short}</span>
            <span className={cn("text-sm font-semibold leading-none", day.isToday && "text-primary")}>{day.dateNum}</span>
            <DayDots dayKey={day.key} tasks={jobs} todayKey={plan.todayKey} />
            <span
              className={cn(
                "text-[10px] leading-none font-medium",
                hasOverdue ? "text-red-600 dark:text-red-400" : hasUrgent ? "text-primary" : "text-muted-foreground",
              )}
              data-testid={`tech-week-count-${day.key}`}
            >
              {jobs.length === 0 ? "Open" : jobs.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TechnicianWorkView({ user, tasks, properties, navigate }: TechnicianWorkViewProps) {
  const { toast } = useToast();
  const [view, setView] = useState<TechWorkView>(loadTechWorkView);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [scheduleTaskId, setScheduleTaskId] = useState<string | null>(null);
  const plan = useMemo(
    () => buildTechWorkPlan(filterTechnicianWorkTasks(tasks, user.id), new Date()),
    [tasks, user.id],
  );
  const activeDay = plan.days.some((day) => day.key === selectedDay) ? selectedDay! : plan.todayKey;
  const activeDayInfo = plan.days.find((day) => day.key === activeDay) ?? plan.days[0];
  const openCount =
    plan.overdue.length +
    plan.undated.length +
    plan.later.length +
    plan.days.reduce((sum, day) => sum + (plan.byDay[day.key]?.length ?? 0), 0);

  const placeMutation = useMutation({
    mutationFn: async ({ taskId, dayKey }: { taskId: string; dayKey: string }) => {
      await apiRequest("PATCH", `/api/tasks/${taskId}`, {
        initialDate: dateInputValueToTaskTimestamp(dayKey),
      });
      return { taskId, dayKey };
    },
    onSuccess: ({ taskId, dayKey }) => {
      invalidateTaskAfterMutation(taskId, {
        patch: { initialDate: new Date(dateInputValueToTaskTimestamp(dayKey)) },
        broad: true,
      });
      setSelectedDay(dayKey);
      setScheduleTaskId(null);
      const day = plan.days.find((item) => item.key === dayKey);
      toast({ title: "Scheduled", description: day ? `Moved to ${day.name}.` : "Work day updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not schedule", description: error.message, variant: "destructive" });
    },
  });

  const propertyName = (propertyId: string | null) => properties?.find((property) => property.id === propertyId)?.name;

  const switchView = (next: TechWorkView) => {
    saveTechWorkView(next);
    setView(next);
  };

  const renderJob = (task: Task, scheduleAction: "reschedule" | "set-day" | null = null) => (
    <TechJobCard
      key={task.id}
      task={task}
      todayKey={plan.todayKey}
      propertyName={propertyName(task.propertyId)}
      isHelper={Boolean((task as TaskWithHelperFlag).isHelper)}
      onOpen={() => navigate(`/tasks/${task.id}`)}
      scheduleAction={scheduleAction}
      scheduleOpen={scheduleTaskId === task.id}
      schedulePending={placeMutation.isPending && placeMutation.variables?.taskId === task.id}
      days={plan.days}
      onToggleSchedule={() => setScheduleTaskId(scheduleTaskId === task.id ? null : task.id)}
      onPlace={(dayKey) => placeMutation.mutate({ taskId: task.id, dayKey })}
    />
  );

  const listDays = plan.days.filter((day) => (plan.byDay[day.key]?.length ?? 0) > 0);

  return (
    <div className="w-full max-w-lg mx-auto min-w-0 overflow-x-hidden px-3 py-4 pb-8 sm:px-4 space-y-4">
      <div className="pt-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            My Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {openCount === 0 ? "Nothing assigned right now" : `${openCount} task${openCount === 1 ? "" : "s"} to do`}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 h-11 min-w-11 px-3"
          onClick={() => navigate("/work/add-job")}
          aria-label="Add job"
          data-testid="button-add-field-job"
        >
          <Plus className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Add Job</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" data-testid="tech-view-switch">
        {(["list", "week"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={view === mode}
            onClick={() => switchView(mode)}
            className={cn(
              "h-11 rounded-md text-sm font-semibold touch-manipulation",
              view === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
            data-testid={`button-view-${mode}`}
          >
            {mode === "list" ? "List" : "Week"}
          </button>
        ))}
      </div>

      {openCount === 0 && plan.completed.length === 0 ? (
        <div className="text-center py-10 px-2">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <p className="text-xl font-semibold">All done!</p>
          <p className="text-muted-foreground mt-1">No tasks assigned to you right now.</p>
          <Button type="button" className="mt-6 w-full sm:w-auto h-11" onClick={() => navigate("/work/add-job")} data-testid="button-add-field-job-empty">
            <Plus className="w-4 h-4 mr-2" />
            Add Job
          </Button>
        </div>
      ) : (
        <div className="space-y-4 min-w-0">
          {plan.overdue.length > 0 && (
            <section className="space-y-2" data-testid="tech-overdue-section">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">Overdue</h2>
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">{plan.overdue.length}</span>
              </div>
              {plan.overdue.map((task) => (
                <div key={task.id}>{renderJob(task, "reschedule")}</div>
              ))}
            </section>
          )}

          {view === "week" ? (
            <section className="space-y-3 min-w-0">
              <WeekStrip plan={plan} selectedDay={activeDay} onSelect={setSelectedDay} />
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">
                  {activeDayInfo.name} {activeDayInfo.dateNum}
                  {activeDayInfo.isToday ? " · Today" : ""}
                </h2>
                <p className="text-sm text-muted-foreground" data-testid="tech-selected-day-count">
                  {(plan.byDay[activeDay]?.length ?? 0) === 0
                    ? "Open"
                    : `${plan.byDay[activeDay].length} job${plan.byDay[activeDay].length === 1 ? "" : "s"}`}
                </p>
              </div>
              {(plan.byDay[activeDay]?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Open day.</p>
              ) : (
                <div className="space-y-2">
                  {plan.byDay[activeDay].map((task) => renderJob(task, isTaskOverdue(task, plan.todayKey) ? "reschedule" : null))}
                </div>
              )}
            </section>
          ) : (
            <div className="space-y-4">
              {listDays.map((day) => {
                const jobs = plan.byDay[day.key] ?? [];
                const urgent = jobs.filter((task) => task.urgency === "high" && !isTaskOverdue(task, plan.todayKey)).length;
                const late = jobs.some((task) => isTaskOverdue(task, plan.todayKey));
                return (
                  <section key={day.key} className="space-y-2" data-testid={`tech-day-section-${day.key}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className={cn("font-semibold", day.isToday && "text-primary")}>
                        {day.short} {day.dateNum}
                        {day.isToday ? " · Today" : ""}
                      </h2>
                      <p className={cn("text-xs font-semibold", late ? "text-red-600 dark:text-red-400" : urgent > 0 ? "text-primary" : "text-muted-foreground")}>
                        {jobs.length}
                        {late ? " · overdue" : urgent > 0 ? ` · ${urgent} urgent` : ""}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {jobs.map((task) => renderJob(task, isTaskOverdue(task, plan.todayKey) ? "reschedule" : null))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {plan.undated.length > 0 && (
            <section className="space-y-2" data-testid="tech-undated-section">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Needs a day</h2>
              {plan.undated.map((task) => (
                <div key={task.id}>{renderJob(task, "set-day")}</div>
              ))}
            </section>
          )}

          {plan.later.length > 0 && (
            <section className="space-y-2" data-testid="tech-later-section">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">After this week</h2>
              <div className="space-y-2">{plan.later.map((task) => renderJob(task))}</div>
            </section>
          )}

          {view === "list" && plan.completed.length > 0 && (
            <section className="space-y-2" data-testid="tech-completed-section">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completed</h2>
              {plan.completed.map((task) => {
                const property = propertyName(task.propertyId);
                return (
                  <FieldWorkTaskCard
                    key={task.id}
                    taskId={task.id}
                    taskName={task.name}
                    ariaLabel={`Open completed task ${task.name}`}
                    testIdPrefix="tech"
                    onOpen={() => navigate(`/tasks/${task.id}`)}
                    className="rounded-lg border-2 border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3 cursor-pointer active-elevate-2"
                  >
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base leading-snug break-words [overflow-wrap:anywhere] text-green-900 dark:text-green-100" data-testid={`text-task-name-${task.id}`}>
                        {task.name}
                      </h3>
                      {property && (
                        <p className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400 mt-0.5 min-w-0">
                          <Building2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{property}</span>
                        </p>
                      )}
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mt-1">Done</p>
                    </div>
                  </FieldWorkTaskCard>
                );
              })}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
