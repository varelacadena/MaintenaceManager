import type { Task } from "@shared/schema";
import { queryClient } from "./queryClient";

function isTaskListQueryKey(key: readonly unknown[]): boolean {
  if (!Array.isArray(key) || key[0] !== "/api/tasks") return false;
  if (key.length === 1) return true;
  if (key.length === 2 && typeof key[1] === "object") return true;
  if (key.length >= 2 && (key[1] === "available" || key[1] === "available/count")) return false;
  return false;
}

export function patchTaskInListCaches(taskId: string, patch: Partial<Task>) {
  queryClient.setQueriesData<Task[]>(
    {
      predicate: (query) => isTaskListQueryKey(query.queryKey),
    },
    (old) => old?.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
  );
}

export function invalidateTaskLists() {
  queryClient.invalidateQueries({
    predicate: (query) => isTaskListQueryKey(query.queryKey),
  });
}

export function invalidateTaskDetail(taskId: string) {
  queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "detail"] });
  queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
  queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "subtasks"] });
}

export function invalidateDashboard() {
  queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
}

/** Prefer targeted list/detail refresh over invalidating every task query. */
export function invalidateTaskAfterMutation(
  taskId?: string,
  options?: { patch?: Partial<Task>; broad?: boolean },
) {
  if (options?.patch && taskId) {
    patchTaskInListCaches(taskId, options.patch);
  }
  if (taskId) {
    invalidateTaskDetail(taskId);
  }
  if (options?.broad) {
    invalidateTaskLists();
    invalidateDashboard();
    return;
  }
  invalidateTaskLists();
  invalidateDashboard();
}
