import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import type { Property } from "@shared/schema";
import { useWorkTasksQuery } from "./useWorkTasksQuery";

/** Lightweight Work data for students and technicians. */
export function useWorkField() {
  const { user } = useAuth();
  const navigate = useLocation()[1];
  const role = user?.role;
  const enabled = role === "student" || role === "technician";

  const tasksQuery = useWorkTasksQuery(enabled);

  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    enabled,
  });

  return {
    user,
    navigate,
    properties,
    isLoading: enabled && (tasksQuery.tasksLoading || propertiesLoading),
    canAccessTasks: enabled,
    ...tasksQuery,
  };
}

export type WorkFieldContext = ReturnType<typeof useWorkField>;
