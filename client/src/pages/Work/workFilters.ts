export const UNASSIGNED_TECH_ID = "__unassigned_tech__";

const TECH_FILTER_STORAGE_KEY = "work-tech-filter";

export function matchesTechFilter(
  assignedToId: string | null | undefined,
  techFilter: string,
): boolean {
  if (!techFilter) return true;
  if (techFilter === UNASSIGNED_TECH_ID) return !assignedToId;
  return assignedToId === techFilter;
}

export function loadTechFilter(): string {
  try {
    return sessionStorage.getItem(TECH_FILTER_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveTechFilter(techId: string) {
  try {
    if (techId) sessionStorage.setItem(TECH_FILTER_STORAGE_KEY, techId);
    else sessionStorage.removeItem(TECH_FILTER_STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
}

const WORK_TAB_STORAGE_KEY = "work-active-tab";

export function loadWorkTab(): "tasks" | "projects" {
  try {
    return sessionStorage.getItem(WORK_TAB_STORAGE_KEY) === "projects" ? "projects" : "tasks";
  } catch {
    return "tasks";
  }
}

export function saveWorkTab(tab: "tasks" | "projects") {
  try {
    sessionStorage.setItem(WORK_TAB_STORAGE_KEY, tab);
  } catch {
    // ignore quota / private mode
  }
}
