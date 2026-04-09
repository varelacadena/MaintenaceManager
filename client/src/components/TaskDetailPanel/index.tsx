import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Pencil,
  Trash2,
  Flag,
  CheckCircle2,
  Play,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User, Property } from "@shared/schema";
import { TaskEditMode } from "../TaskEditMode";
import { useTaskDetailPanel } from "./useTaskDetailPanel";
import { TaskDetailPanelDialogs } from "./TaskDetailPanelDialogs";
import { PanelMainContent } from "./PanelMainContent";
import { PanelRightSidebar } from "./PanelRightSidebar";
import { PanelAdminFullscreen } from "./PanelAdminFullscreen";

interface TaskDetailPanelProps {
  taskId: string;
  isFullscreen: boolean;
  onClose: () => void;
  onToggleFullscreen: () => void;
  allUsers?: User[];
  properties?: Property[];
  hideFullscreenToggle?: boolean;
}

export function TaskDetailPanel({
  taskId,
  isFullscreen,
  onClose,
  onToggleFullscreen,
  allUsers,
  properties,
  hideFullscreenToggle,
}: TaskDetailPanelProps) {
  const ctx = useTaskDetailPanel({ taskId, isFullscreen, onClose, allUsers, properties });

  const {
    isMobile, task, isLoading, isAdmin,
    isNotStarted, isStarted, isCompleted,
    statusPill, statusDot, statusLabel,
    urg, isOverdue,
    totalSubtasks, allSubtasksComplete,
    handleStartTask, handleMarkComplete, updateStatusMutation,
    setIsEditMode, setDeleteDialogOpen, isEditMode,
  } = ctx;

  if (isLoading || !task) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse space-y-4 w-full p-6">
          <div className="h-4 rounded w-3/4" style={{ backgroundColor: "#EEEEEE" }} />
          <div className="h-4 rounded w-1/2" style={{ backgroundColor: "#EEEEEE" }} />
          <div className="h-20 rounded w-full" style={{ backgroundColor: "#EEEEEE" }} />
        </div>
      </div>
    );
  }

  if (isEditMode && task) {
    return (
      <div
        className="h-full flex flex-col"
        style={{ backgroundColor: "#FFFFFF" }}
        data-testid="task-detail-panel"
      >
        <TaskEditMode
          taskId={taskId}
          task={task}
          subtasks={ctx.subtasks || []}
          onCancel={() => setIsEditMode(false)}
          onSaved={() => setIsEditMode(false)}
          onDeleted={onClose}
          variant={isMobile ? "mobile" : "desktop"}
        />
      </div>
    );
  }

  if (isFullscreen && isAdmin) {
    return (
      <PanelAdminFullscreen
        ctx={ctx}
        onClose={onClose}
        allUsers={allUsers}
        taskId={taskId}
      />
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: "#FFFFFF" }}
      data-testid="task-detail-panel"
    >
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid #EEEEEE" }}
      >
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          data-testid="button-panel-close"
        >
          <ArrowLeft className="w-4 h-4" style={{ color: "#1A1A1A" }} />
        </Button>

        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusDot }} />
        <span
          className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ backgroundColor: statusPill.bg, color: statusPill.text }}
        >
          {statusLabel}
        </span>

        <div className="flex-1" />

        {!isFullscreen && isAdmin && (
          <div className="flex items-center gap-1">
            {isNotStarted && (
              <Button
                size="sm"
                onClick={handleStartTask}
                disabled={updateStatusMutation.isPending}
                data-testid="button-panel-start-task"
                style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                Start
              </Button>
            )}
            {isStarted && (
              <Button
                size="sm"
                onClick={handleMarkComplete}
                disabled={updateStatusMutation.isPending || (totalSubtasks > 0 && !allSubtasksComplete)}
                data-testid="button-panel-mark-complete"
                style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Complete
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" data-testid="button-panel-actions-menu">
                  <MoreVertical className="w-4 h-4" style={{ color: "#6B7280" }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2" onClick={() => setIsEditMode(true)} data-testid="button-panel-edit">
                  <Pencil className="w-4 h-4" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600 gap-2" onClick={() => setDeleteDialogOpen(true)} data-testid="button-panel-delete">
                  <Trash2 className="w-4 h-4" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Flag className="w-3 h-3" style={{ color: urg.color }} />
          <span className="text-xs font-medium" style={{ color: urg.color }}>{urg.label}</span>
        </div>

        {task.estimatedCompletionDate && (
          <span className="text-xs font-medium ml-2" style={{ color: isOverdue ? "#D94F4F" : "#6B7280" }}>
            {new Date(task.estimatedCompletionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}

        {!hideFullscreenToggle && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleFullscreen}
            data-testid="button-panel-fullscreen-toggle"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" style={{ color: "#1A1A1A" }} />
            ) : (
              <Maximize2 className="w-4 h-4" style={{ color: "#1A1A1A" }} />
            )}
          </Button>
        )}
      </div>

      <div className={isMobile && isFullscreen ? "flex flex-col flex-1 overflow-y-auto" : "flex flex-1 overflow-hidden"}>
        <PanelMainContent ctx={ctx} isFullscreen={isFullscreen} allUsers={allUsers} taskId={taskId} />
        {isFullscreen && <PanelRightSidebar ctx={ctx} />}
      </div>
      <TaskDetailPanelDialogs ctx={ctx} />
    </div>
  );
}
