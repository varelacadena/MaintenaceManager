import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, FolderKanban, AlertTriangle, Flag } from "lucide-react";
import { format } from "date-fns";
import type { WorkContext } from "./useWork";
import { projectPriorityConfig } from "./constants";

export function ProjectsTab({ ctx }: { ctx: WorkContext }) {
  const {
    projectSearchQuery, setProjectSearchQuery,
    projectStatusFilter, setProjectStatusFilter,
    projectsTabFiltered, projectTasksMap,
    getPropertyName, navigate,
  } = ctx;

  const projectStatusBadgeColors: Record<string, string> = {
    planning: "bg-gray-500 dark:bg-gray-600 text-white border-transparent",
    in_progress: "bg-rose-500 dark:bg-rose-600 text-white border-transparent",
    on_hold: "bg-yellow-500 dark:bg-yellow-600 text-white border-transparent",
    completed: "bg-emerald-500 dark:bg-emerald-600 text-white border-transparent",
    cancelled: "bg-red-500 dark:bg-red-600 text-white border-transparent",
  };

  const statusLabel: Record<string, string> = {
    planning: "Planning",
    in_progress: "In Progress",
    on_hold: "On Hold",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={projectSearchQuery}
            onChange={(e) => setProjectSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-projects"
          />
        </div>
      </div>
      <div className="flex gap-1 flex-wrap" data-testid="project-status-filters">
        {([
          ["all", "All"],
          ["planning", "Planning"],
          ["in_progress", "In Progress"],
          ["on_hold", "On Hold"],
          ["completed", "Completed"],
          ["cancelled", "Cancelled"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setProjectStatusFilter(value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              projectStatusFilter === value
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover-elevate"
            }`}
            data-testid={`filter-project-status-${value}`}
          >
            {label}
          </button>
        ))}
      </div>

      {projectsTabFiltered.length === 0 ? (
        <div className="text-center py-12">
          <FolderKanban className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No projects found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {projectSearchQuery || projectStatusFilter !== "all"
              ? "Try adjusting your filters"
              : "Create a new project to get started"}
          </p>
        </div>
      ) : (
        <Card data-testid="projects-list">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[220px] text-xs font-medium text-muted-foreground">Name</TableHead>
                <TableHead className="w-[120px] text-xs font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="w-[100px] text-xs font-medium text-muted-foreground">Priority</TableHead>
                <TableHead className="w-[130px] text-xs font-medium text-muted-foreground">Progress</TableHead>
                <TableHead className="w-[150px] hidden md:table-cell text-xs font-medium text-muted-foreground">Property</TableHead>
                <TableHead className="w-[180px] hidden md:table-cell text-xs font-medium text-muted-foreground">Dates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectsTabFiltered.map((project) => {
                const childTasks = projectTasksMap[project.id] || [];
                const completedChildTasks = childTasks.filter((t) => t.status === "completed").length;
                const totalChildTasks = childTasks.length;
                const progressPercent = totalChildTasks > 0 ? Math.round((completedChildTasks / totalChildTasks) * 100) : 0;
                const propertyName = getPropertyName(project.propertyId);
                const isOverdue = project.targetEndDate
                  && project.status !== "completed"
                  && new Date(project.targetEndDate) < new Date();
                const priorityCfg = projectPriorityConfig[project.priority] || projectPriorityConfig.medium;

                return (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/projects/${project.id}`); } }}
                    tabIndex={0}
                    role="link"
                    data-testid={`project-row-${project.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderKanban className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate" data-testid={`text-project-name-${project.id}`}>
                          {project.name}
                        </span>
                        {isOverdue && (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" data-testid={`icon-overdue-${project.id}`} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${projectStatusBadgeColors[project.status] || ""}`} data-testid={`badge-project-status-${project.id}`}>
                        {statusLabel[project.status] || project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${priorityCfg.color}`} data-testid={`badge-project-priority-${project.id}`}>
                        <Flag className="w-3 h-3 mr-0.5" />
                        {priorityCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap" data-testid={`progress-${project.id}`}>
                          {completedChildTasks}/{totalChildTasks}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {propertyName ? (
                        <span className="text-xs text-muted-foreground truncate block max-w-[140px]" data-testid={`text-project-property-${project.id}`}>
                          {propertyName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-project-dates-${project.id}`}>
                        {project.startDate ? format(new Date(project.startDate), "MMM d") : "—"}
                        {project.startDate && project.targetEndDate ? " – " : ""}
                        {project.targetEndDate ? format(new Date(project.targetEndDate), "MMM d, yyyy") : project.startDate ? "" : "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
