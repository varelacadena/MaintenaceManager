import { useQuery } from "@tanstack/react-query";
import type { Task } from "@shared/schema";
import { WORK_TASKS_STALE_MS } from "./workConstants";

export function useWorkTasksQuery(enabled: boolean) {
  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksQueryError,
    refetch: refetchTasks,
  } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    staleTime: WORK_TASKS_STALE_MS,
    enabled,
  });

  const tasksErrorMessage =
    tasksQueryError instanceof Error ? tasksQueryError.message : "Could not load tasks.";

  return {
    tasks,
    tasksLoading,
    tasksError,
    tasksErrorMessage,
    refetchTasks,
  };
}
