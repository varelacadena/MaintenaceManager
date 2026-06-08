import { useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, AlertTriangle, Clock, PauseCircle, Settings2, UserX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Task, Area } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  buildDepartmentHealthList,
  healthLevelStyles,
  UNASSIGNED_DEPARTMENT_ID,
  type DepartmentHealth,
} from "@/lib/departmentHealth";

interface DepartmentOverviewProps {
  tasks: Task[];
  areas: Area[];
}

type WorkloadStatus =
  | "in_progress"
  | "ready"
  | "not_started"
  | "needs_estimate"
  | "waiting_approval"
  | "on_hold";

type DepartmentWorkload = DepartmentHealth & {
  statusCounts: Record<WorkloadStatus, number>;
};

const workloadSegments: { key: WorkloadStatus; label: string; className: string }[] = [
  { key: "in_progress", label: "In progress", className: "bg-blue-500" },
  { key: "ready", label: "Ready", className: "bg-sky-500" },
  { key: "not_started", label: "Not started", className: "bg-amber-500" },
  { key: "needs_estimate", label: "Needs estimate", className: "bg-orange-400" },
  { key: "waiting_approval", label: "Approval", className: "bg-purple-500" },
  { key: "on_hold", label: "Blocked", className: "bg-red-500" },
];

const healthDotClass: Record<DepartmentHealth["level"], string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  orange: "bg-orange-500",
  red: "bg-red-500",
};

function buildDepartmentWorkloads(
  departments: DepartmentHealth[],
  tasks: Task[],
): DepartmentWorkload[] {
  const openTasks = tasks.filter((task) => task.status !== "completed");

  return departments.map((dept) => {
    const departmentTasks = openTasks.filter((task) => {
      if (dept.departmentId === UNASSIGNED_DEPARTMENT_ID) return !task.areaId;
      return task.areaId === dept.departmentId;
    });

    const statusCounts = workloadSegments.reduce(
      (acc, segment) => {
        acc[segment.key] = departmentTasks.filter((task) => task.status === segment.key).length;
        return acc;
      },
      {} as Record<WorkloadStatus, number>,
    );

    return { ...dept, statusCounts };
  });
}

function DepartmentRow({ dept }: { dept: DepartmentWorkload }) {
  const styles = healthLevelStyles[dept.level];
  const href = `/work?departmentId=${encodeURIComponent(dept.departmentId)}`;
  const riskCount = dept.stats.overdue + dept.stats.urgent + dept.stats.blocked + dept.stats.unassigned;
  const hasWorkload = dept.stats.open > 0;

  return (
    <Link href={href}>
      <div
        className={cn(
          "group rounded-lg border bg-card p-3 shadow-sm transition-colors hover-elevate",
          dept.level !== "green" && styles.bg,
        )}
        data-testid={`department-card-${dept.departmentId}`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,42%)_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", healthDotClass[dept.level])} />
              <p className="truncate text-sm font-medium leading-tight">{dept.departmentName}</p>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-4 text-[11px] text-muted-foreground">
              {dept.stats.overdue > 0 && (
                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                  <Clock className="h-3 w-3" />
                  {dept.stats.overdue} overdue
                </span>
              )}
              {dept.stats.urgent > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  {dept.stats.urgent} urgent
                </span>
              )}
              {dept.stats.blocked > 0 && (
                <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <PauseCircle className="h-3 w-3" />
                  {dept.stats.blocked} blocked
                </span>
              )}
              {dept.stats.unassigned > 0 && (
                <span className="inline-flex items-center gap-1">
                  <UserX className="h-3 w-3" />
                  {dept.stats.unassigned} unassigned
                </span>
              )}
              {riskCount === 0 && <span>No risk signals</span>}
            </div>
          </div>

          <div>
            <div className="flex h-5 overflow-hidden rounded-sm bg-muted" aria-label={`${dept.departmentName} workload by status`}>
              {hasWorkload ? (
                workloadSegments.map((segment) => {
                  const count = dept.statusCounts[segment.key];
                  if (count === 0) return null;
                  return (
                    <div
                      key={segment.key}
                      className={cn("h-full min-w-[3px]", segment.className)}
                      style={{ width: `${(count / dept.stats.open) * 100}%` }}
                      title={`${segment.label}: ${count}`}
                    />
                  );
                })
              ) : (
                <div className="h-full w-full bg-muted-foreground/20" />
              )}
            </div>
            {hasWorkload && (
              <div className="mt-1 flex justify-between gap-2 text-[10px] text-muted-foreground">
                <span>{dept.statusCounts.in_progress} active</span>
                <span>{dept.statusCounts.not_started + dept.statusCounts.ready} queued</span>
                <span>{dept.statusCounts.on_hold} blocked</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 justify-self-end">
            <Badge className={cn("hidden sm:inline-flex text-[10px]", styles.badge)}>{styles.label}</Badge>
            <span className="w-6 text-right text-lg font-semibold tabular-nums">{dept.stats.open}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function DepartmentOverview({ tasks, areas }: DepartmentOverviewProps) {
  const { user } = useAuth();
  const departments = useMemo(
    () => buildDepartmentWorkloads(buildDepartmentHealthList(tasks, areas), tasks),
    [tasks, areas],
  );
  const totalOpenTasks = departments.reduce((sum, dept) => sum + dept.stats.open, 0);
  const needsHelpCount = departments.filter((dept) => dept.level === "red" || dept.level === "orange").length;

  return (
    <Card className="flex-1 flex flex-col border-2 border-primary/5 shadow-md">
      <CardHeader className="pb-2 bg-muted/20 border-b">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl flex items-center gap-2" data-testid="text-department-overview-title">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              Department Overview
            </CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{totalOpenTasks} open tasks</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span>{needsHelpCount} need help</span>
            </div>
          </div>
          {user?.role === "admin" && (
            <Link href="/settings?tab=departments">
              <Button variant="ghost" size="sm" className="shrink-0 h-8 text-xs" data-testid="button-manage-departments">
                <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                Manage
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        {departments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No departments configured</p>
        ) : (
          <div className="space-y-2">
            {departments.map((dept) => (
              <DepartmentRow key={dept.departmentId} dept={dept} />
            ))}
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2 text-[10px] text-muted-foreground">
              {workloadSegments.map((segment) => (
                <span key={segment.key} className="inline-flex items-center gap-1">
                  <span className={cn("h-2 w-2 rounded-full", segment.className)} />
                  {segment.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
