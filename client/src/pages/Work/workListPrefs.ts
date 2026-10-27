import type { WorkStatus } from "./workListModel";

const STORAGE_KEY = "work-list-view";
const STATUSES: WorkStatus[] = ["not_started", "in_progress", "completed"];

export type WorkListViewMemory = {
  statuses: WorkStatus[];
  collapsedStacks: Record<WorkStatus, boolean>;
  overdueOnly: boolean;
  techIds: string[];
  propertyIds: string[];
  openProjects: Record<string, boolean>;
};

function isStatus(value: unknown): value is WorkStatus {
  return value === "not_started" || value === "in_progress" || value === "completed";
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isBoolRecord(value: unknown): value is Record<string, boolean> {
  return !!value && typeof value === "object" && !Array.isArray(value)
    && Object.values(value as Record<string, unknown>).every((item) => typeof item === "boolean");
}

export function loadWorkListView(): WorkListViewMemory | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkListViewMemory>;
    if (!parsed || typeof parsed !== "object") return null;
    const statuses = Array.isArray(parsed.statuses) ? parsed.statuses.filter(isStatus) : [];
    if (!isBoolRecord(parsed.collapsedStacks)) return null;
    if (typeof parsed.overdueOnly !== "boolean") return null;
    if (!isStringList(parsed.techIds) || !isStringList(parsed.propertyIds)) return null;
    if (!isBoolRecord(parsed.openProjects)) return null;
    return {
      statuses: statuses.length > 0 ? statuses : [...STATUSES],
      collapsedStacks: {
        not_started: parsed.collapsedStacks.not_started === true,
        in_progress: parsed.collapsedStacks.in_progress === true,
        completed: parsed.collapsedStacks.completed !== false,
      },
      overdueOnly: parsed.overdueOnly,
      techIds: parsed.techIds,
      propertyIds: parsed.propertyIds,
      openProjects: parsed.openProjects,
    };
  } catch {
    return null;
  }
}

export function saveWorkListView(value: WorkListViewMemory) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore quota / private mode
  }
}
