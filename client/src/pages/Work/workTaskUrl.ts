export const WORK_TASK_QUERY_KEY = "task";

export function getTaskIdFromWorkSearch(search: string): string | null {
  const id = new URLSearchParams(search).get(WORK_TASK_QUERY_KEY);
  return id?.trim() ? id : null;
}

export function buildWorkPath(taskId: string | null, search: string): string {
  const params = new URLSearchParams(search);
  if (taskId) params.set(WORK_TASK_QUERY_KEY, taskId);
  else params.delete(WORK_TASK_QUERY_KEY);
  const qs = params.toString();
  return qs ? `/work?${qs}` : "/work";
}
