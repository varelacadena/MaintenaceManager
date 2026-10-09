import type { Task } from "@shared/schema";
import { getCalendarDateKey } from "@/lib/taskCalendarDates";

export const TECH_WEEK_LENGTH = 7;

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type TechDay = {
  key: string;
  short: string;
  dateNum: string;
  name: string;
  isToday: boolean;
};

export type TechWorkPlan = {
  todayKey: string;
  days: TechDay[];
  overdue: Task[];
  byDay: Record<string, Task[]>;
  undated: Task[];
  later: Task[];
  completed: Task[];
};

export function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day + days, 12, 0, 0, 0);
  return localDayKey(date);
}

export function rollingTechDays(today: Date, length = TECH_WEEK_LENGTH): TechDay[] {
  const start = localDayKey(today);
  return Array.from({ length }, (_, index) => {
    const key = addCalendarDays(start, index);
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    return {
      key,
      short: WEEKDAY_SHORT[date.getDay()],
      dateNum: String(day),
      name: WEEKDAY_LONG[date.getDay()],
      isToday: index === 0,
    };
  });
}

export function formatDayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function taskScheduleKey(task: Pick<Task, "initialDate">): string | null {
  return getCalendarDateKey(task.initialDate);
}

export function taskDueKey(task: Pick<Task, "estimatedCompletionDate">): string | null {
  return getCalendarDateKey(task.estimatedCompletionDate);
}

export function isTaskStarted(status: string | null | undefined): boolean {
  return status === "in_progress" || status === "on_hold";
}

export function isTaskOverdue(
  task: Pick<Task, "status" | "estimatedCompletionDate">,
  todayKey: string,
): boolean {
  if (task.status === "completed" || isTaskStarted(task.status)) return false;
  const due = taskDueKey(task);
  return !!due && due < todayKey;
}

function completionKey(task: Task): string | null {
  return getCalendarDateKey(task.actualCompletionDate) ?? getCalendarDateKey(task.updatedAt);
}

export function taskSortRank(task: Task, todayKey: string): number {
  if (isTaskOverdue(task, todayKey)) return 0;
  if (task.urgency === "high") return 1;
  if (task.status === "in_progress") return 2;
  if (task.urgency === "medium") return 3;
  return 4;
}

export function sortTechTasks(tasks: Task[], todayKey: string): Task[] {
  return [...tasks].sort(
    (a, b) => taskSortRank(a, todayKey) - taskSortRank(b, todayKey) || a.name.localeCompare(b.name),
  );
}

export function buildTechWorkPlan(tasks: Task[], today: Date): TechWorkPlan {
  const todayKey = localDayKey(today);
  const days = rollingTechDays(today);
  const lastKey = days[days.length - 1].key;
  const weekAgo = addCalendarDays(todayKey, -7);
  const overdue: Task[] = [];
  const byDay: Record<string, Task[]> = {};
  for (const day of days) byDay[day.key] = [];
  const undated: Task[] = [];
  const later: Task[] = [];
  const completed: Task[] = [];

  for (const task of tasks) {
    if (task.status === "completed") {
      const done = completionKey(task);
      if (done && done >= weekAgo && done <= todayKey) completed.push(task);
      continue;
    }

    const schedule = taskScheduleKey(task);
    const due = taskDueKey(task);
    const started = isTaskStarted(task.status);
    if (started && due && due < todayKey) {
      byDay[todayKey].push(task);
      continue;
    }
    const late = isTaskOverdue(task, todayKey);
    if (!schedule) {
      if (late) overdue.push(task);
      else if (started) byDay[todayKey].push(task);
      else undated.push(task);
      continue;
    }
    if (schedule < todayKey) {
      if (late) overdue.push(task);
      else byDay[todayKey].push(task);
      continue;
    }
    if (schedule > lastKey) {
      later.push(task);
      continue;
    }
    byDay[schedule].push(task);
  }

  for (const key of Object.keys(byDay)) {
    byDay[key] = sortTechTasks(byDay[key], todayKey);
  }

  completed.sort((a, b) => (completionKey(b) ?? "").localeCompare(completionKey(a) ?? ""));

  return {
    todayKey,
    days,
    overdue: sortTechTasks(overdue, todayKey),
    byDay,
    undated: sortTechTasks(undated, todayKey),
    later: sortTechTasks(later, todayKey),
    completed,
  };
}

export function techTaskStatusLabel(task: Task, todayKey: string): string {
  if (isTaskOverdue(task, todayKey)) return "Overdue";
  if (task.urgency === "high") return "Urgent";
  if (task.status === "in_progress") return "In progress";
  if (task.status === "on_hold") return "On hold";
  if (task.urgency === "low") return "Low";
  return "Normal";
}
