import type { Task } from "@shared/schema";

export const getTaskDate = (task: Task): Date | null => {
  if (task.status === "completed" && task.actualCompletionDate) {
    return new Date(task.actualCompletionDate);
  }
  if (task.estimatedCompletionDate) return new Date(task.estimatedCompletionDate);
  if (task.initialDate) return new Date(task.initialDate);
  return null;
};

export const isToday = (d: Date) => {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

export const isThisWeek = (d: Date) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
};

export const filterTasksByDate = (allTasks: Task[], dateFilter: "today" | "week" | "all") => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return allTasks.filter((t) => {
    if (t.status === "completed") {
      const completedDate = t.actualCompletionDate ? new Date(t.actualCompletionDate) : null;
      if (!completedDate || completedDate < sevenDaysAgo) return false;
      if (dateFilter === "today") return isToday(completedDate);
      if (dateFilter === "week") return isThisWeek(completedDate);
      return true;
    }
    const taskDate = getTaskDate(t);
    if (dateFilter === "today") {
      return !taskDate || isToday(taskDate);
    }
    if (dateFilter === "week") {
      return !taskDate || isThisWeek(taskDate);
    }
    return true;
  });
};

export const groupTasksByDay = (taskList: Task[]): { label: string; dateKey: string; tasks: Task[] }[] => {
  const groups: Record<string, Task[]> = {};
  const unscheduled: Task[] = [];

  for (const t of taskList) {
    const d = getTaskDate(t);
    if (!d) {
      unscheduled.push(t);
    } else {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
  }

  const sortedKeys = Object.keys(groups).sort();
  const result: { label: string; dateKey: string; tasks: Task[] }[] = [];

  for (const key of sortedKeys) {
    const [y, m, day] = key.split("-").map(Number);
    const d = new Date(y, m - 1, day);
    const dayName = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const todayLabel = isToday(d) ? " (Today)" : "";
    result.push({ label: `${dayName}${todayLabel}`, dateKey: key, tasks: groups[key] });
  }

  if (unscheduled.length > 0) {
    result.push({ label: "Unscheduled", dateKey: "unscheduled", tasks: unscheduled });
  }

  return result;
};

export function DateFilterBar({ dateFilter, setDateFilter }: { dateFilter: "today" | "week" | "all"; setDateFilter: (v: "today" | "week" | "all") => void }) {
  return (
    <div className="flex gap-1 bg-muted rounded-md p-1" data-testid="date-filter-bar">
      {([["today", "Today"], ["week", "This Week"], ["all", "All"]] as const).map(([value, label]) => (
        <button
          key={value}
          onClick={() => setDateFilter(value)}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
            dateFilter === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover-elevate"
          }`}
          data-testid={`button-filter-${value}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2" data-testid={`day-separator-${label}`}>
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
