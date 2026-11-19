import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { parseApiError } from "@/lib/queryClient";

export const COMPLETED_SEARCH_CAP = 20;

export type CompletedTaskMatch = {
  id: string;
  name: string;
  propertyName: string | null;
  equipmentName: string | null;
  spaceName: string | null;
  assignedToName: string | null;
  actualCompletionDate: string | null;
  parentTaskId: string | null;
};

function completedOn(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "MMM d, yyyy");
}

export function useCompletedTaskSearch(query: string) {
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const active = debounced.length >= 2;
  const search = useQuery<CompletedTaskMatch[]>({
    queryKey: ["/api/tasks", { completedLookup: true, q: debounced }],
    queryFn: async () => {
      const params = new URLSearchParams({ completedLookup: "true", q: debounced });
      const res = await fetch(`/api/tasks?${params}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error(await parseApiError(res, "Could not search completed jobs."));
      }
      return res.json();
    },
    enabled: active,
  });

  return { ...search, active, debounced };
}

export function CompletedSearchResults({
  active,
  isLoading,
  isError,
  error,
  matches,
  onOpen,
  title = "Completed",
}: {
  active: boolean;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  matches: CompletedTaskMatch[];
  onOpen: (taskId: string) => void;
  title?: string;
}) {
  if (!active) return null;
  if (!isLoading && !isError && matches.length === 0) return null;

  return (
    <section className="space-y-1 border-t px-3 py-3" data-testid="find-completed-results">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Could not search completed jobs."}
        </p>
      ) : (
        <div className="space-y-1">
          {matches.map((task) => {
            const place = task.propertyName || task.equipmentName || task.spaceName;
            const when = completedOn(task.actualCompletionDate);
            const detail = [place, when, task.assignedToName].filter(Boolean).join(" · ");
            return (
              <button
                key={task.id}
                type="button"
                className="w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                onClick={() => onOpen(task.id)}
                data-testid={`find-completed-${task.id}`}
              >
                <span className="block font-medium leading-snug">{task.name}</span>
                {detail && <span className="block text-sm text-muted-foreground">{detail}</span>}
                {task.parentTaskId && <span className="block text-xs text-muted-foreground">Subtask</span>}
              </button>
            );
          })}
          {matches.length >= COMPLETED_SEARCH_CAP && (
            <p className="text-xs text-muted-foreground px-2 pt-1">
              Showing the {COMPLETED_SEARCH_CAP} most recent matches. Add more of the name to narrow it.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
