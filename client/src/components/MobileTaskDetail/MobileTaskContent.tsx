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
  Play,
  Square,
} from "lucide-react";
import { toDisplayUrl } from "@/lib/imageUtils";
import type { MobileTaskDetailProps } from "./types";

interface MobileTaskContentProps {
  ctx: MobileTaskDetailProps;
}

export function MobileTaskContent({ ctx }: MobileTaskContentProps) {
  const {
    task, isAdmin, property, uploads,
    resourcesExpanded, setResourcesExpanded,
    setIsEditMode, setDeleteDialogOpen,
    setPreviewUpload,
    activeTimerEntry, startTimerMutation, stopTimerMutation,
    totalTime, docCount, imgCount, vidCount,
    isCompleted,
  } = ctx;

  if (!task) return null;

  const taskTypeLabel = task.taskType === "one_time" ? "One Time" : task.taskType === "recurring" ? "Recurring" : task.taskType;
  const poolLabel = task.assignedPool === "student_pool" ? "Student Pool" : task.assignedPool === "technician_pool" ? "Technician Pool" : "";

  return (
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
  );
}
