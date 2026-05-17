import { unifiedStatusConfig } from "./constants";

const STORAGE_KEY = "work-status-groups-collapsed";

export function loadCollapsedGroupsFromStorage(): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCollapsedGroupsToStorage(groups: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // ignore quota / private mode
  }
}

/** Default: collapsed when empty, expanded when the group has items. */
export function buildDefaultCollapsedGroups(
  itemCountsByStatus: Record<string, number>
): Record<string, boolean> {
  const groups: Record<string, boolean> = {};
  unifiedStatusConfig.forEach((s) => {
    const count = itemCountsByStatus[s.key] ?? 0;
    groups[s.key] = count === 0;
  });
  return groups;
}
