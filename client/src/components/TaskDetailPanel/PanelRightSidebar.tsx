import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Pencil,
  Trash2,
  Flag,
  Calendar,
  Clock,
  Camera,
  ScanLine,
  StickyNote,
  Sparkles,
  CheckCircle2,
  Play,
  Loader2,
} from "lucide-react";
import { panelStatusLabels, taskTypeLabels, getAvatarHexColor as getAvatarColorForId } from "@/utils/taskUtils";
import type { TaskDetailPanelContext } from "./useTaskDetailPanel";

interface PanelRightSidebarProps {
  ctx: TaskDetailPanelContext;
}

export function PanelRightSidebar({ ctx }: PanelRightSidebarProps) {
  const {
    isMobile, task, isAdmin, isNotStarted, isStarted,
    handleStartTask, handleMarkComplete, updateStatusMutation,
    totalSubtasks, allSubtasksComplete,
    statusDot, urg, isOverdue, assignee, assigneeInitials,
    isFileUploading, fileInputRef, handleFileUpload,
    setIsScanDialogOpen, setIsAddNoteDialogOpen, setIsLogTimeDialogOpen,
    setIsEditMode, setDeleteDialogOpen, property,
  } = ctx;

  if (!task) return null;

  return (
    <div
      className={isMobile ? "w-full shrink-0" : "w-60 shrink-0 overflow-y-auto"}
      style={{ borderLeft: isMobile ? "none" : "1px solid #EEEEEE", borderTop: isMobile ? "1px solid #EEEEEE" : "none", backgroundColor: "#FFFFFF" }}
      data-testid="panel-right-sidebar"
    >
      <div className="p-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusDot }} />
          <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
            {panelStatusLabels[task.status]}
          </span>
        </div>
        {isNotStarted && (
          <Button
            className="w-full"
            size="sm"
            onClick={handleStartTask}
            disabled={updateStatusMutation.isPending}
            data-testid="button-sidebar-start-task"
            style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Start Task
          </Button>
        )}
        {isStarted && (
          <Button
            className="w-full"
            size="sm"
            onClick={handleMarkComplete}
            disabled={updateStatusMutation.isPending || (totalSubtasks > 0 && !allSubtasksComplete)}
            data-testid="button-sidebar-mark-complete"
            style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Mark Complete
          </Button>
        )}
      </div>

      <div className="p-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
        <p className="text-xs font-medium tracking-wider uppercase mb-3" style={{ color: "#9CA3AF" }}>
          ACTIONS
        </p>
        <div className={isMobile ? "grid grid-cols-2 gap-1" : "space-y-1"}>
          {[
            { icon: Camera, label: "Photos / Docs", onClick: () => fileInputRef.current?.click() },
            { icon: ScanLine, label: "Scan", onClick: () => setIsScanDialogOpen(true) },
            { icon: StickyNote, label: "Add Note", onClick: () => setIsAddNoteDialogOpen(true) },
            { icon: Clock, label: "Log Time", onClick: () => setIsLogTimeDialogOpen(true) },
          ].map(({ icon: Icon, label, onClick }) => (
            <button
              key={label}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors hover-elevate"
              style={{ color: "#1A1A1A" }}
              onClick={onClick}
              data-testid={`button-action-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="w-4 h-4" style={{ color: "#6B7280" }} />
              {label}
              {label === "Photos / Docs" && isFileUploading && (
                <Loader2 className="w-3 h-3 ml-auto animate-spin" style={{ color: "#6B7280" }} />
              )}
            </button>
          ))}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            data-testid="input-file-upload"
          />
        </div>
      </div>

      <div className="p-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
        <p className="text-xs font-medium tracking-wider uppercase mb-3" style={{ color: "#9CA3AF" }}>
          DETAILS
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#6B7280" }}>Priority</span>
            <div className="flex items-center gap-1">
              <Flag className="w-3 h-3" style={{ color: urg.color }} />
              <span className="text-xs font-medium" style={{ color: urg.color }}>{urg.label}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#6B7280" }}>Due Date</span>
            <span className="text-xs font-medium" style={{ color: isOverdue ? "#D94F4F" : "#1A1A1A" }}>
              {task.estimatedCompletionDate
                ? new Date(task.estimatedCompletionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#6B7280" }}>Type</span>
            <span className="text-xs font-medium" style={{ color: "#1A1A1A" }}>
              {taskTypeLabels[task.taskType] || task.taskType}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#6B7280" }}>Assigned</span>
            <div className="flex items-center gap-1.5">
              {assignee ? (
                <>
                  <Avatar className="w-5 h-5">
                    <AvatarFallback
                      style={{ backgroundColor: getAvatarColorForId(assignee.id), color: "#FFFFFF", fontSize: "8px" }}
                    >
                      {assigneeInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium" style={{ color: "#1A1A1A" }}>
                    {assignee.firstName || assignee.username}
                  </span>
                </>
              ) : (
                <span className="text-xs" style={{ color: "#6B7280" }}>Unassigned</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs font-medium tracking-wider uppercase mb-3" style={{ color: "#9CA3AF" }}>
          AI SCHEDULING
        </p>
        <button
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium border transition-colors"
          style={{ color: "#4338CA", borderColor: "#EEEEEE" }}
          data-testid="button-ai-schedule"
        >
          <Sparkles className="w-4 h-4" />
          Suggest Schedule
        </button>
      </div>

      {isAdmin && (
        <div className="p-4" style={{ borderTop: "1px solid #EEEEEE" }}>
          <div className={isMobile ? "flex gap-2" : "space-y-2"}>
            <Button
              variant="outline"
              size="sm"
              className={isMobile ? "flex-1" : "w-full"}
              data-testid="button-sidebar-edit"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#EEEEEE", color: "#1A1A1A" }}
              onClick={() => setIsEditMode(true)}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={isMobile ? "flex-1" : "w-full"}
              onClick={() => setDeleteDialogOpen(true)}
              data-testid="button-sidebar-delete"
              style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA", color: "#D94F4F" }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
