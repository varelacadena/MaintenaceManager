import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Clock,
  Flag,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  ExternalLink,
  ClipboardCheck,
} from "lucide-react";
import { EditableDateCell } from "@/components/EditableDateCell";
import { taskTypeLabels, getAvatarHexColor as getAvatarColorForId } from "@/utils/taskUtils";
import type { TaskDetailPanelContext } from "./useTaskDetailPanel";
import { PanelResourcesSection } from "./PanelResourcesSection";
import { PanelSubtasksSection } from "./PanelSubtasksSection";
import { PanelSection } from "./PanelSection";

interface PanelCompactMainProps {
  ctx: TaskDetailPanelContext;
  taskId: string;
  onViewCompletionReport?: () => void;
}

function MetaCell({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-sm font-medium text-foreground min-w-0">{children}</div>
    </div>
  );
}

export function PanelCompactMain({ ctx, taskId, onViewCompletionReport }: PanelCompactMainProps) {
  const {
    task,
    subtasks,
    uploads,
    totalMinutes,
    docCount,
    imgCount,
    vidCount,
    resourcesExpanded,
    setResourcesExpanded,
    expandedSubtasks,
    completedSubtasks,
    totalSubtasks,
    allSubtasksComplete,
    isStarted,
    isCompleted,
    urg,
    isOverdue,
    property,
    assignee,
    assigneeInitials,
    assigneeName,
    toggleSubtaskExpanded,
    isAdmin,
    handleInlineEdit,
  } = ctx;

  const [subtasksOpen, setSubtasksOpen] = useState(() => (subtasks?.length ?? 0) > 0);

  if (!task) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0" data-testid="panel-main-content">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3 pb-3 border-b border-border bg-card">
          <h2
            className="text-lg font-semibold leading-snug text-foreground pr-1"
            data-testid="text-panel-task-title"
          >
            {task.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {taskTypeLabels[task.taskType] || task.taskType}
            {" \u00b7 "}
            {task.executorType === "student" ? "Student pool" : "Technician pool"}
          </p>
          {task.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mt-3 line-clamp-4">
              {task.description}
            </p>
          )}
          {isCompleted && (
            <div
              className="mt-3 flex items-center gap-2 text-xs py-2 px-3 rounded-md bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
              data-testid="banner-task-completed"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Completed &middot; evidence on file
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-b border-border">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Overview
          </p>
          <div className="grid grid-cols-2 gap-2">
            <MetaCell label="Assigned" icon={<UserIcon className="w-3 h-3" />}>
              {assignee ? (
                <span className="flex items-center gap-1.5 min-w-0">
                  <Avatar className="w-5 h-5 shrink-0">
                    <AvatarFallback
                      className="text-[9px] text-white"
                      style={{ backgroundColor: getAvatarColorForId(assignee.id) }}
                    >
                      {assigneeInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{assigneeName}</span>
                </span>
              ) : (
                <span className="text-muted-foreground font-normal">Unassigned</span>
              )}
            </MetaCell>
            <MetaCell label="Location" icon={<MapPin className="w-3 h-3" />}>
              {property?.name || "\u2014"}
            </MetaCell>
            <MetaCell label="Start" icon={<Calendar className="w-3 h-3" />}>
              {isAdmin ? (
                <EditableDateCell
                  value={task.initialDate}
                  taskId={taskId}
                  field="initialDate"
                  onSave={handleInlineEdit}
                />
              ) : (
                task.initialDate
                  ? new Date(task.initialDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Not set"
              )}
            </MetaCell>
            <MetaCell label="Due" icon={<Calendar className="w-3 h-3" />}>
              {isAdmin ? (
                <span className={isOverdue ? "text-destructive" : undefined}>
                  <EditableDateCell
                    value={task.estimatedCompletionDate}
                    taskId={taskId}
                    field="estimatedCompletionDate"
                    onSave={handleInlineEdit}
                  />
                </span>
              ) : (
                <span className={isOverdue ? "text-destructive" : undefined}>
                  {task.estimatedCompletionDate
                    ? new Date(task.estimatedCompletionDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Not set"}
                </span>
              )}
            </MetaCell>
            <MetaCell label="Priority" icon={<Flag className="w-3 h-3" style={{ color: urg.color }} />}>
              <span style={{ color: urg.color }}>{urg.label}</span>
            </MetaCell>
            <MetaCell label="Logged" icon={<Clock className="w-3 h-3" />}>
              {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
            </MetaCell>
          </div>
        </div>

        <PanelResourcesSection
          variant="compact"
          uploads={uploads}
          resourcesExpanded={resourcesExpanded}
          setResourcesExpanded={setResourcesExpanded}
          docCount={docCount}
          imgCount={imgCount}
          vidCount={vidCount}
        />

        <PanelSection
          title="Subtasks"
          badge={
            <Badge variant="secondary" className="text-xs font-normal tabular-nums">
              {completedSubtasks}/{totalSubtasks}
            </Badge>
          }
          expanded={subtasksOpen}
          onToggle={() => setSubtasksOpen((o) => !o)}
          testId="button-toggle-subtasks"
        >
          <PanelSubtasksSection
            variant="compact"
            subtasks={subtasks}
            expandedSubtasks={expandedSubtasks}
            completedSubtasks={completedSubtasks}
            totalSubtasks={totalSubtasks}
            allSubtasksComplete={allSubtasksComplete}
            isStarted={isStarted}
            isCompleted={isCompleted}
            isFullscreen={false}
            toggleSubtaskExpanded={toggleSubtaskExpanded}
          />
        </PanelSection>

      </div>

      <div className="shrink-0 border-t border-border bg-card px-4 py-3 space-y-2">
        {isCompleted && onViewCompletionReport && (
          <Button className="w-full" onClick={onViewCompletionReport} data-testid="button-panel-completion-report">
            <ClipboardCheck className="w-4 h-4 mr-2" />
            View completion report
          </Button>
        )}
        <Link href={`/tasks/${taskId}`}>
          <Button variant="outline" className="w-full" data-testid="button-panel-open-full-task">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open full task page
          </Button>
        </Link>
        <p className="text-[11px] text-center text-muted-foreground leading-snug">
          Click start or due dates to edit. Open the full page to log time or add parts.
        </p>
      </div>
    </div>
  );
}
