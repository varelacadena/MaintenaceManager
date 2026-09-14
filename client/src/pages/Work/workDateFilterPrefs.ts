import { useCallback, useState } from "react";

export type WorkDateFilter = "today" | "week" | "all";

const STORAGE_KEY = "work-date-filter";

export function isWorkDateFilter(value: string | null | undefined): value is WorkDateFilter {
  return value === "today" || value === "week" || value === "all";
}

export function loadWorkDateFilter(): WorkDateFilter {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (isWorkDateFilter(raw)) return raw;
  } catch {
    // private mode / unavailable
  }
  return "today";
}

export function saveWorkDateFilter(value: WorkDateFilter) {
  try {
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore quota / private mode
  }
}

/** Date filter that survives leaving Work to open a task and coming back. */
export function useWorkDateFilter() {
  const [dateFilter, setDateFilterState] = useState<WorkDateFilter>(loadWorkDateFilter);
  const setDateFilter = useCallback((value: WorkDateFilter) => {
    saveWorkDateFilter(value);
    setDateFilterState(value);
  }, []);
  return [dateFilter, setDateFilter] as const;
}
