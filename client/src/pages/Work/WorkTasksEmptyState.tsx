import { Button } from "@/components/ui/button";
import { ClipboardList, FolderKanban, Plus, Search } from "lucide-react";
import { Link } from "wouter";

interface WorkTasksEmptyStateProps {
  hasSearchQuery: boolean;
  hasDepartmentFilter?: boolean;
  departmentFilterName?: string | null;
  hasTechFilter?: boolean;
  techFilterName?: string | null;
  onClearSearch: () => void;
  onClearDepartmentFilter?: () => void;
  onClearTechFilter?: () => void;
  onOpenProjectsTab: () => void;
}

export function WorkTasksEmptyState({
  hasSearchQuery,
  hasDepartmentFilter = false,
  departmentFilterName,
  hasTechFilter = false,
  techFilterName,
  onClearSearch,
  onClearDepartmentFilter,
  onClearTechFilter,
  onOpenProjectsTab,
}: WorkTasksEmptyStateProps) {
  if (hasDepartmentFilter) {
    return (
      <div className="text-center py-16 px-4" data-testid="work-tasks-empty-department">
        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium">
          No tasks in {departmentFilterName || "this department"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Try another department or view all work.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearDepartmentFilter}
          data-testid="button-clear-department-filter"
        >
          View all departments
        </Button>
      </div>
    );
  }

  if (hasTechFilter) {
    return (
      <div className="text-center py-16 px-4" data-testid="work-tasks-empty-tech">
        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium">
          No tasks assigned to {techFilterName || "this technician"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Try another technician or view all work.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearTechFilter}
          data-testid="button-clear-tech-filter"
        >
          View all technicians
        </Button>
      </div>
    );
  }

  if (hasSearchQuery) {
    return (
      <div className="text-center py-16 px-4" data-testid="work-tasks-empty-search">
        <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium">No tasks or projects match your search</p>
        <p className="text-xs text-muted-foreground mt-1 mb-4">Try a different term or clear the filter.</p>
        <Button variant="outline" size="sm" onClick={onClearSearch} data-testid="button-clear-work-search">
          Clear search
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-16 px-4" data-testid="work-tasks-empty">
      <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
      <p className="text-sm font-medium">No tasks on the board</p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Create a standalone task or add work under a project.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link href="/tasks/new">
          <Button data-testid="button-empty-new-task">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </Link>
        <Button variant="outline" onClick={onOpenProjectsTab} data-testid="button-empty-view-projects">
          <FolderKanban className="w-4 h-4 mr-2" />
          View Projects
        </Button>
      </div>
    </div>
  );
}
