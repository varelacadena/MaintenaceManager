import type { Task } from "@shared/schema";
import { parseISO, isPast } from "date-fns";

export const UNASSIGNED_DEPARTMENT_ID = "__unassigned__";

export type DepartmentHealthLevel = "green" | "yellow" | "orange" | "red";

export interface DepartmentTaskStats {
  open: number;
  overdue: number;
  urgent: number;
  unassigned: number;
  blocked: number;
}

export interface DepartmentHealth {
  departmentId: string;
  departmentName: string;
  stats: DepartmentTaskStats;
  score: number;
  level: DepartmentHealthLevel;
}

export function isTaskOverdue(task: Task): boolean {
  if (task.status === "completed" || !task.estimatedCompletionDate) return false;
  return isPast(parseISO(task.estimatedCompletionDate as unknown as string));
}

export function isTaskUnassigned(task: Task): boolean {
  if (task.status === "completed") return false;
  return !task.assignedToId;
}

export function computeDepartmentTaskStats(tasks: Task[]): DepartmentTaskStats {
  const openTasks = tasks.filter((t) => t.status !== "completed");
  return {
    open: openTasks.length,
    overdue: openTasks.filter(isTaskOverdue).length,
    urgent: openTasks.filter((t) => t.urgency === "high").length,
    unassigned: openTasks.filter(isTaskUnassigned).length,
    blocked: openTasks.filter((t) => t.status === "on_hold").length,
  };
}

export function computeHealthScore(stats: DepartmentTaskStats): number {
  return (
    stats.overdue * 4 +
    stats.urgent * 2 +
    stats.unassigned * 2 +
    stats.blocked * 3 +
    Math.min(stats.open, 10) * 0.5
  );
}

export function scoreToHealthLevel(score: number, stats: DepartmentTaskStats): DepartmentHealthLevel {
  if (score >= 12 || stats.overdue >= 3) return "red";
  if (score >= 6 || stats.overdue >= 1 || stats.blocked >= 2) return "orange";
  if (score >= 2 || stats.unassigned >= 2 || stats.urgent >= 1) return "yellow";
  return "green";
}

export const healthLevelStyles: Record<
  DepartmentHealthLevel,
  { border: string; bg: string; badge: string; label: string }
> = {
  green: {
    border: "border-emerald-300 dark:border-emerald-800",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    label: "Normal",
  },
  yellow: {
    border: "border-amber-300 dark:border-amber-800",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    label: "Elevated",
  },
  orange: {
    border: "border-orange-300 dark:border-orange-800",
    bg: "bg-orange-50/50 dark:bg-orange-950/20",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    label: "Needs attention",
  },
  red: {
    border: "border-red-400 dark:border-red-800",
    bg: "bg-red-50/60 dark:bg-red-950/30",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    label: "Needs help",
  },
};

export function buildDepartmentHealthList(
  tasks: Task[],
  areas: { id: string; name: string }[],
): DepartmentHealth[] {
  const openTasks = tasks.filter((t) => t.status !== "completed");
  const unassignedTasks = openTasks.filter((t) => !t.areaId);

  const departmentHealth: DepartmentHealth[] = areas.map((area) => {
    const deptTasks = openTasks.filter((t) => t.areaId === area.id);
    const stats = computeDepartmentTaskStats(deptTasks);
    const score = computeHealthScore(stats);
    return {
      departmentId: area.id,
      departmentName: area.name,
      stats,
      score,
      level: scoreToHealthLevel(score, stats),
    };
  });

  if (unassignedTasks.length > 0) {
    const stats = computeDepartmentTaskStats(unassignedTasks);
    const score = computeHealthScore(stats);
    departmentHealth.push({
      departmentId: UNASSIGNED_DEPARTMENT_ID,
      departmentName: "Unassigned Department",
      stats,
      score,
      level: scoreToHealthLevel(score, stats),
    });
  }

  const levelOrder: Record<DepartmentHealthLevel, number> = {
    red: 0,
    orange: 1,
    yellow: 2,
    green: 3,
  };

  return departmentHealth.sort((a, b) => {
    const levelDiff = levelOrder[a.level] - levelOrder[b.level];
    if (levelDiff !== 0) return levelDiff;
    return b.score - a.score;
  });
}

export function matchesDepartmentFilter(
  areaId: string | null | undefined,
  departmentFilter: string,
): boolean {
  if (!departmentFilter) return true;
  if (departmentFilter === UNASSIGNED_DEPARTMENT_ID) return !areaId;
  return areaId === departmentFilter;
}
