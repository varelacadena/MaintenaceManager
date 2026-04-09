import { Input } from "@/components/ui/input";
import { Search, Calendar } from "lucide-react";
import { Link } from "wouter";
import { TaskCard } from "@/components/tasks/TaskCard";
import type { PropertyDetailContext } from "./usePropertyDetail";

interface PropertyWorkHistoryTabProps {
  ctx: PropertyDetailContext;
}

export function PropertyWorkHistoryTab({ ctx }: PropertyWorkHistoryTabProps) {
  const {
    taskSearch, setTaskSearch,
    setSummaryTaskId,
    filteredTasks,
    getAssigneeName,
  } = ctx;

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-tasks"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{taskSearch ? "No tasks match your search" : "No tasks assigned to this property yet"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              if (task.status === "completed") {
                return (
                  <div key={task.id}>
                    <TaskCard
                      task={task}
                      getAssigneeName={getAssigneeName}
                      onClick={() => setSummaryTaskId(task.id)}
                    />
                  </div>
                );
              }
              return (
                <Link key={task.id} href={`/tasks/${task.id}`}>
                  <TaskCard
                    task={task}
                    getAssigneeName={getAssigneeName}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
