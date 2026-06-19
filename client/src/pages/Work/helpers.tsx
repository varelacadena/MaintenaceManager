import type { Task } from "@shared/schema";

export type TaskWithHelperFlag = Task & { isHelper?: boolean };

/** Tasks shown on the student Work page (assigned, pool, or helper). */
export function filterStudentWorkTasks(tasks: Task[], userId: string): Task[] {
  return tasks.filter((t) => {
    if (t.parentTaskId) return false;
    const ext = t as TaskWithHelperFlag;
    if (ext.isHelper) return true;
    if (t.assignedToId === userId) return true;
    if (t.assignedPool === "student_pool" && !t.assignedToId) return true;
    return false;
  });
}

/** Tasks shown on the technician Work page (assigned, additional assignee, or helper). Pool jobs use Grab a Job. */
export function filterTechnicianWorkTasks(tasks: Task[], userId: string): Task[] {
  return tasks.filter((t) => {
    if (t.parentTaskId) return false;
    const ext = t as TaskWithHelperFlag;
    if (ext.isHelper) return true;
    return t.assignedToId === userId;
  });
}

export const getTaskDate = (task: Task): Date | null => {
  if (task.status === "completed" && task.actualCompletionDate) {
    return new Date(task.actualCompletionDate);
  }
  if (task.initialDate) return new Date(task.initialDate);
  if (task.estimatedCompletionDate) return new Date(task.estimatedCompletionDate);
  return null;
};

const startOfLocalDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getWeekStart = (now: Date) => {
  const start = startOfLocalDay(now);
  start.setDate(now.getDate() - now.getDay());
  return start;
};

/** Schedule day used for Today/Week filters on active tasks. */
export const getTaskScheduleDay = (task: Task): Date | null => {
  const raw = task.initialDate ?? task.estimatedCompletionDate;
  if (!raw) return null;
  return startOfLocalDay(new Date(raw as unknown as string));
};

export const isToday = (d: Date) => {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

export const isThisWeek = (d: Date) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
};

export const filterTasksByDate = (allTasks: Task[], dateFilter: "today" | "week" | "all") => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const todayStart = startOfLocalDay(new Date());
  const weekStart = getWeekStart(new Date());

  return allTasks.filter((t) => {
    if (t.status === "completed") {
      const completedDate = t.actualCompletionDate ? new Date(t.actualCompletionDate) : null;
      if (!completedDate || completedDate < sevenDaysAgo) return false;
      if (dateFilter === "today") return isToday(completedDate);
      if (dateFilter === "week") return isThisWeek(completedDate);
      return true;
    }

    if (dateFilter === "all") return true;

    // Active tasks: always show in-progress and undated assignments.
    if (t.status === "in_progress") return true;
    const scheduleDay = getTaskScheduleDay(t);
    if (!scheduleDay) return true;

    if (dateFilter === "today") {
      return scheduleDay.getTime() === todayStart.getTime() || scheduleDay.getTime() < todayStart.getTime();
    }
    if (dateFilter === "week") {
      return isThisWeek(scheduleDay) || scheduleDay.getTime() < weekStart.getTime();
    }
    return true;
  });
};

export const groupTasksByDay = (taskList: Task[]): { label: string; dateKey: string; tasks: Task[] }[] => {
  const groups: Record<string, Task[]> = {};
  const unscheduled: Task[] = [];

  for (const t of taskList) {
    const d = getTaskDate(t);
    if (!d) {
      unscheduled.push(t);
    } else {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
  }

  const sortedKeys = Object.keys(groups).sort();
  const result: { label: string; dateKey: string; tasks: Task[] }[] = [];

  for (const key of sortedKeys) {
    const [y, m, day] = key.split("-").map(Number);
    const d = new Date(y, m - 1, day);
    const dayName = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const todayLabel = isToday(d) ? " (Today)" : "";
    result.push({ label: `${dayName}${todayLabel}`, dateKey: key, tasks: groups[key] });
  }

  if (unscheduled.length > 0) {
    result.push({ label: "Unscheduled", dateKey: "unscheduled", tasks: unscheduled });
  }

  return result;
};

export function DateFilterBar({ dateFilter, setDateFilter }: { dateFilter: "today" | "week" | "all"; setDateFilter: (v: "today" | "week" | "all") => void }) {
  return (
    <div className="flex gap-1 bg-muted rounded-md p-1" data-testid="date-filter-bar">
      {([["today", "Today"], ["week", "This Week"], ["all", "All"]] as const).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={dateFilter === value}
          onClick={() => setDateFilter(value)}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
            dateFilter === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover-elevate"
          }`}
          data-testid={`button-filter-${value}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Flatten day groups with a single running index (for numbered field cards). */
export function flattenDayGroups<T extends { tasks: Task[] }>(
  groups: T[]
): { group: T; task: Task; globalIndex: number }[] {
  const result: { group: T; task: Task; globalIndex: number }[] = [];
  let globalIndex = 0;
  for (const group of groups) {
    for (const task of group.tasks) {
      result.push({ group, task, globalIndex });
      globalIndex += 1;
    }
  }
  return result;
}

export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2" data-testid={`day-separator-${label}`}>
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
