import { Button } from "@/components/ui/button";
import {
  Pencil,
  Trash2,
  MapPin,
  Clock,
  ChevronRight,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Video,
  MessageSquare,
  Package,
  History,
  CheckCircle2,
  Play,
  Square,
} from "lucide-react";
import { SubtaskNote } from "../SubtaskNote";
import { SubtaskPhotos } from "../SubtaskPhotos";
import { toDisplayUrl } from "@/lib/imageUtils";
import type { MobileTaskDetailProps } from "./types";

interface MobileTaskContentProps {
  ctx: MobileTaskDetailProps;
}

export function MobileTaskContent({ ctx }: MobileTaskContentProps) {
  const {
    task, isAdmin, property, uploads, subtasks, timeEntries,
    taskMessages, taskParts,
    resourcesExpanded, setResourcesExpanded,
    expandedSubtasks, toggleSubtaskExpanded,
    setIsEditMode, setDeleteDialogOpen,
    setPreviewUpload,
    setIsMessagesSheetOpen, setIsPartsSheetOpen, setIsHistorySheetOpen,
    activeTimerEntry, startTimerMutation, stopTimerMutation,
    updateSubtaskStatusMutation,
    totalTime, docCount, imgCount, vidCount,
    taskStarted, isCompleted,
    completedSubtasks, totalSubtasks, allSubtasksDone, subtaskProgress,
  } = ctx;

  if (!task) return null;

  const taskTypeLabel = task.taskType === "one_time" ? "One Time" : task.taskType === "recurring" ? "Recurring" : task.taskType;
  const poolLabel = task.assignedPool === "student_pool" ? "Student Pool" : task.assignedPool === "technician_pool" ? "Technician Pool" : "";

  return (
    <>
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #EEEEEE" }}>
        {isAdmin && (
          <div className="flex items-center justify-end gap-2 px-4 py-2.5" style={{ backgroundColor: "#F8F8F8", borderBottom: "1px solid #EEEEEE" }}>
            <Button
              variant="outline"
              size="sm"
              data-testid="button-mobile-edit"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#EEEEEE", color: "#1A1A1A" }}
              onClick={() => setIsEditMode(true)}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="button-mobile-delete"
              style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA", color: "#D94F4F" }}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        )}

        <div className="px-4 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
          <p className="text-xs font-medium tracking-wider uppercase mb-1.5" style={{ color: "#9CA3AF" }}>
            TASK
          </p>
          <h1 className="text-base font-medium leading-tight mb-1" style={{ color: "#1A1A1A" }} data-testid="text-mobile-task-title">
            {task.name}
          </h1>
          <p className="text-xs" style={{ color: "#6B7280" }}>
            {taskTypeLabel}{poolLabel ? ` · ${poolLabel}` : ""}
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-[#EEEEEE]" style={{ borderBottom: "1px solid #EEEEEE" }}>
          <div className="px-4 py-3">
            <p className="text-xs font-medium tracking-wider uppercase mb-1" style={{ color: "#9CA3AF" }}>
              LOCATION
            </p>
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#6B7280" }} />
              <div>
                <p className="text-xs font-medium" style={{ color: "#1A1A1A" }}>
                  {property?.name || "—"}
                </p>
                {property?.address && (
                  <p className="text-xs" style={{ color: "#6B7280" }}>{property.address}</p>
                )}
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-medium tracking-wider uppercase mb-1" style={{ color: "#9CA3AF" }}>
              TIME LOGGED
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
                <p className="text-xs font-medium" style={{ color: "#1A1A1A" }}>{totalTime}</p>
                {activeTimerEntry && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium animate-pulse" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                    Running
                  </span>
                )}
              </div>
              {!isCompleted && (
                activeTimerEntry ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => stopTimerMutation.mutate(activeTimerEntry.id)}
                    disabled={stopTimerMutation.isPending}
                    style={{ borderColor: "#FECACA", color: "#DC2626" }}
                    data-testid="button-mobile-stop-timer"
                  >
                    <Square className="w-3.5 h-3.5 mr-1" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startTimerMutation.mutate()}
                    disabled={startTimerMutation.isPending}
                    style={{ borderColor: "#D1D5DB", color: "#4338CA" }}
                    data-testid="button-mobile-start-timer"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    Start
                  </Button>
                )
              )}
            </div>
          </div>
        </div>

        {task.description && (
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #EEEEEE" }}>
            <p className="text-xs font-medium tracking-wider uppercase mb-1.5" style={{ color: "#9CA3AF" }}>
              DESCRIPTION
            </p>
            <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#374151", lineHeight: 1.55 }} data-testid="text-mobile-description">
              {task.description}
            </p>
          </div>
        )}

        <div
          className="px-4 py-3 cursor-pointer"
          onClick={() => setResourcesExpanded(!resourcesExpanded)}
          data-testid="button-mobile-toggle-resources"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: "#6B7280" }} />
            <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>Resources</span>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "#EDE9FE", color: "#7C3AED" }}>
                {docCount} docs
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                {imgCount} img
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "#FFF1F2", color: "#F43F5E" }}>
                {vidCount} vid
              </span>
              {resourcesExpanded ? (
                <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
              ) : (
                <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
              )}
            </div>
          </div>
          {resourcesExpanded && (
            <div className="mt-3 space-y-1" onClick={(e) => e.stopPropagation()}>
              {(!uploads || uploads.length === 0) ? (
                <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>
                  No resources attached
                </p>
              ) : (
                uploads.map((upload) => {
                  const isImage = upload.fileType.startsWith("image/");
                  const isVideo = upload.fileType.startsWith("video/");
                  const ext = upload.fileName.split(".").pop()?.toLowerCase() || "";
                  const TypeIcon = isImage ? ImageIcon : isVideo ? Video : FileText;
                  const getDocColors = () => {
                    if (ext === "pdf") return { bg: "#FEF2F2", color: "#DC2626" };
                    if (ext === "xls" || ext === "xlsx") return { bg: "#F0FDF4", color: "#16A34A" };
                    if (ext === "doc" || ext === "docx") return { bg: "#EFF6FF", color: "#2563EB" };
                    return { bg: "#EDE9FE", color: "#7C3AED" };
                  };
                  const docColors = !isImage && !isVideo ? getDocColors() : null;
                  const badgeBg = isImage ? "#F3F4F6" : isVideo ? "#FFF1F2" : docColors!.bg;
                  const badgeColor = isImage ? "#6B7280" : isVideo ? "#F43F5E" : docColors!.color;
                  const typeLabel = isImage ? "IMG" : isVideo ? "VID"
                    : ext === "pdf" ? "PDF" : ext === "xls" || ext === "xlsx" ? "XLS"
                    : ext === "doc" || ext === "docx" ? "DOC" : "FILE";
                  return (
                    <button
                      key={upload.id}
                      onClick={() => {
                        if (isImage) {
                          setPreviewUpload(upload);
                        } else {
                          window.open(toDisplayUrl(upload.objectUrl), "_blank");
                        }
                      }}
                      className="flex items-center gap-2 py-1.5 px-1 rounded hover-elevate w-full text-left"
                      data-testid={`mobile-resource-item-${upload.id}`}
                    >
                      <TypeIcon className="w-4 h-4 shrink-0" style={{ color: badgeColor }} />
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0" style={{ backgroundColor: badgeBg, color: badgeColor }}>
                        {typeLabel}
                      </span>
                      <span className="text-xs truncate flex-1" style={{ color: "#374151" }}>
                        {upload.fileName}
                      </span>
                      <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "#9CA3AF" }} />
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #EEEEEE" }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: taskStarted && totalSubtasks > 0 ? undefined : "1px solid #EEEEEE" }}>
          <p className="text-xs font-medium tracking-wider uppercase" style={{ color: "#9CA3AF" }}>
            SUBTASKS
          </p>
          <span className="text-sm font-medium" style={{ color: "#1A1A1A" }} data-testid="text-mobile-subtask-count">
            {completedSubtasks} / {totalSubtasks}
          </span>
        </div>

        {taskStarted && totalSubtasks > 0 && (
          <div className="px-4 py-2" style={{ borderBottom: "1px solid #EEEEEE" }}>
            <div className="w-full rounded-full overflow-hidden" style={{ height: "4px", backgroundColor: "#E5E7EB" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${subtaskProgress}%`,
                  backgroundColor: "#4338CA",
                  transition: "width 300ms ease",
                }}
                data-testid="mobile-subtask-progress"
              />
            </div>
          </div>
        )}

        {taskStarted && !isCompleted && !allSubtasksDone && (
          <div
            className="mx-4 mt-3 mb-1 px-3 py-2 rounded text-xs"
            style={{ backgroundColor: "#FEF2F2", borderLeft: "3px solid #D94F4F", color: "#D94F4F" }}
            data-testid="mobile-subtask-warning"
          >
            Complete all subtasks before marking task as done
          </div>
        )}

        <div className="divide-y divide-[#EEEEEE]">
          {(!subtasks || subtasks.length === 0) ? (
            <p className="text-xs text-center py-6" style={{ color: "#9CA3AF" }}>
              No subtasks
            </p>
          ) : (
            subtasks.map((subtask) => {
              const isLocked = !taskStarted;
              const isSubCompleted = subtask.status === "completed";
              const isSubExpanded = expandedSubtasks.has(subtask.id);

              return (
                <div key={subtask.id} data-testid={`mobile-subtask-${subtask.id}`}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    style={isLocked ? { opacity: 0.45 } : undefined}
                    onClick={() => !isLocked && toggleSubtaskExpanded(subtask.id)}
                  >
                    <button
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: isSubCompleted ? "#4338CA" : "#D1D5DB",
                        backgroundColor: isSubCompleted ? "#4338CA" : "transparent",
                      }}
                      disabled={isLocked || isCompleted}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isLocked && !isCompleted) {
                          updateSubtaskStatusMutation.mutate({
                            subtaskId: subtask.id,
                            status: isSubCompleted ? "in_progress" : "completed",
                          });
                        }
                      }}
                      data-testid={`mobile-subtask-checkbox-${subtask.id}`}
                      aria-label={`Mark subtask ${subtask.name} as ${isSubCompleted ? "incomplete" : "complete"}`}
                    >
                      {isSubCompleted && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </button>

                    <span
                      className={`text-sm flex-1 ${isSubCompleted ? "line-through" : ""}`}
                      style={{ color: isSubCompleted ? "#9CA3AF" : "#1A1A1A" }}
                    >
                      {subtask.name}
                    </span>

                    {isLocked ? (
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#D1D5DB" }} />
                    ) : isSubExpanded ? (
                      <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                    )}
                  </div>

                  {isSubExpanded && !isLocked && (
                    <div className="px-4 pb-3 pl-12 space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <SubtaskPhotos subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="mobile-subtask" />
                      </div>
                      <SubtaskNote subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="mobile-subtask" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #EEEEEE" }}>
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
          style={{ borderBottom: "1px solid #EEEEEE" }}
          onClick={() => setIsMessagesSheetOpen(true)}
          data-testid="link-mobile-messages"
        >
          <MessageSquare className="w-4 h-4" style={{ color: "#6B7280" }} />
          <span className="text-sm font-medium flex-1" style={{ color: "#1A1A1A" }}>Messages</span>
          {taskMessages.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}>
              {taskMessages.length}
            </span>
          )}
          <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        </button>
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
          style={{ borderBottom: "1px solid #EEEEEE" }}
          onClick={() => setIsPartsSheetOpen(true)}
          data-testid="link-mobile-parts"
        >
          <Package className="w-4 h-4" style={{ color: "#6B7280" }} />
          <span className="text-sm font-medium flex-1" style={{ color: "#1A1A1A" }}>Parts Used</span>
          {taskParts.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}>
              {taskParts.length}
            </span>
          )}
          <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        </button>
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
          onClick={() => setIsHistorySheetOpen(true)}
          data-testid="link-mobile-history"
        >
          <History className="w-4 h-4" style={{ color: "#6B7280" }} />
          <span className="text-sm font-medium flex-1" style={{ color: "#1A1A1A" }}>History</span>
          {(timeEntries?.length || 0) > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
              {timeEntries?.length}
            </span>
          )}
          <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        </button>
      </div>

      {isCompleted && (
        <div
          className="rounded-xl px-4 py-4 flex items-center gap-3"
          style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
          data-testid="mobile-completed-banner"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#15803D" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "#15803D" }}>Task completed</p>
            <p className="text-xs mt-0.5" style={{ color: "#16A34A" }}>
              All subtasks done{totalSubtasks > 0 ? ` (${totalSubtasks}/${totalSubtasks})` : ""} — evidence captured
            </p>
          </div>
        </div>
      )}
    </>
  );
}
