import { toCalendarDate } from "@/lib/taskCalendarDates";

export type WorkStatus = "not_started" | "in_progress" | "completed";

const HIDDEN_STATUSES = new Set(["on_hold", "cancelled"]);

/** Board stages this page no longer shows as their own groups. */
export function toWorkStatus(status: string | null | undefined): WorkStatus | null {
  if (!status || HIDDEN_STATUSES.has(status)) return null;
  if (status === "completed") return "completed";
  if (status === "in_progress") return "in_progress";
  return "not_started";
}

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export const WORK_STACK_MARK: Record<WorkStatus, string> = {
  not_started: "bg-yellow-500",
  in_progress: "bg-cyan-500",
  completed: "bg-emerald-600",
};

export const WORK_STACK_LINE: Record<WorkStatus, string> = {
  not_started: "border-yellow-500",
  in_progress: "border-cyan-500",
  completed: "border-emerald-600",
};

export function startOfToday(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function dueStamp(value: Date | string | null | undefined): number | null {
  const date = toCalendarDate(value);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function isWorkOverdue(
  due: Date | string | null | undefined,
  status: string | null | undefined,
  now = new Date(),
): boolean {
  if (toWorkStatus(status) === "completed" || toWorkStatus(status) === null) return false;
  const stamp = dueStamp(due);
  if (stamp == null) return false;
  return stamp < startOfToday(now);
}

export function compareWorkItems(
  a: { overdue: boolean; due: number | null; name: string },
  b: { overdue: boolean; due: number | null; name: string },
): number {
  if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
  if (a.due == null && b.due == null) return a.name.localeCompare(b.name);
  if (a.due == null) return 1;
  if (b.due == null) return -1;
  if (a.due !== b.due) return a.due - b.due;
  return a.name.localeCompare(b.name);
}

export function byName(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function taskVisible(input: {
  status: string | null | undefined;
  due: Date | string | null | undefined;
  assigneeId: string | null | undefined;
  propertyId: string | null | undefined;
  name: string;
  statuses: readonly WorkStatus[];
  overdueOnly: boolean;
  techIds: readonly string[];
  propertyIds: readonly string[];
  query: string;
  taskPropertyIds?: readonly string[] | null;
  now?: Date;
}): boolean {
  const status = toWorkStatus(input.status);
  if (!status) return false;
  if (input.statuses.length > 0 && !input.statuses.includes(status)) return false;
  if (input.overdueOnly && !isWorkOverdue(input.due, input.status, input.now)) return false;
  if (input.techIds.length > 0 && !input.techIds.includes(input.assigneeId || "")) return false;
  if (input.propertyIds.length > 0) {
    const onTask = [input.propertyId, ...(input.taskPropertyIds || [])].filter((id): id is string => !!id);
    if (!onTask.some((id) => input.propertyIds.includes(id))) return false;
  }
  const q = input.query.trim().toLowerCase();
  if (q && !input.name.toLowerCase().includes(q)) return false;
  return true;
}
