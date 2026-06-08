import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Flag,
  Calendar,
  Clock,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Video,
  Package,
  StickyNote,
  CheckCircle2,
  Plus,
  MoreVertical,
  Building2,
  User as UserIcon,
  Play,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import type { User, TimeEntry } from "@shared/schema";
import { toDisplayUrl } from "@/lib/imageUtils";
import { taskTypeLabels, getAvatarHexColor as getAvatarColorForId } from "@/utils/taskUtils";
import { TaskDetailPanelDialogs } from "./TaskDetailPanelDialogs";
import type { TaskDetailPanelContext } from "./useTaskDetailPanel";

interface PanelAdminFullscreenProps {
  ctx: TaskDetailPanelContext;
  onClose: () => void;
  allUsers?: User[];
  taskId: string;
}

export function PanelAdminFullscreen({ ctx, onClose, allUsers, taskId }: PanelAdminFullscreenProps) {
  const {
    isMobile, task, subtasks, uploads, taskParts, taskNotes,
    timeEntries, totalMinutes, statusPill, statusDot, statusLabel,
    urg, isOverdue, property, assignee, assigneeInitials, assigneeName,
    completedSubtasks, totalSubtasks, allSubtasksComplete,
    editingNoteId, setEditingNoteId, editNoteContent, setEditNoteContent,
    updateNoteMutation, setDeleteNoteId, setIsAddNoteDialogOpen,
    setIsEditMode, setDeleteDialogOpen,
    setEditingTimeEntryId, setEditTimeDuration, setDeleteTimeEntryId,
    setIsLogTimeDialogOpen,
    isNotStarted, isStarted, handleStartTask, handleMarkComplete, updateStatusMutation,
  } = ctx;

  if (!task) return null;

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#F8FAFC" }} data-testid="task-detail-panel">
      <div
        className={`flex items-center shrink-0 ${isMobile ? "gap-2 px-4 py-3" : "gap-3 px-8 py-4"}`}
        style={{ borderBottom: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}
      >
        <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-panel-close">
          <ArrowLeft className={isMobile ? "w-4 h-4" : "w-5 h-5"} style={{ color: "#1A1A1A" }} />
        </Button>
        <span className={`${isMobile ? "w-2 h-2" : "w-2.5 h-2.5"} rounded-full shrink-0`} style={{ backgroundColor: statusDot }} />
        <span
          className={`${isMobile ? "text-xs" : "text-xs"} font-semibold uppercase tracking-wider px-2.5 py-1 rounded`}
          style={{ backgroundColor: statusPill.bg, color: statusPill.text }}
        >
          {statusLabel}
        </span>
        <div className="flex items-center gap-1.5">
          <Flag className={isMobile ? "w-3 h-3" : "w-4 h-4"} style={{ color: urg.color }} />
          <span className={`${isMobile ? "text-xs" : "text-sm"} font-medium`} style={{ color: urg.color }}>{urg.label}</span>
        </div>
        {task.estimatedCompletionDate && (
          <span className={`${isMobile ? "text-xs" : "text-sm"} font-medium`} style={{ color: isOverdue ? "#D94F4F" : "#6B7280" }}>
            Due {new Date(task.estimatedCompletionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
        <div className="flex-1" />
        {!isMobile && isNotStarted && (
          <Button
            className="gap-2"
            style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
            onClick={handleStartTask}
            disabled={updateStatusMutation.isPending}
            data-testid="button-admin-start-task"
          >
            {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Start Task
          </Button>
        )}
        {!isMobile && isStarted && (
          <Button
            className="gap-2"
            style={{ backgroundColor: "#15803D", color: "#FFFFFF" }}
            onClick={handleMarkComplete}
            disabled={updateStatusMutation.isPending || (totalSubtasks > 0 && !allSubtasksComplete)}
            data-testid="button-admin-mark-complete"
          >
            {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Complete Task
          </Button>
        )}
        {!isMobile && (
          <Button variant="outline" className="gap-2" style={{ borderColor: "#E5E7EB" }} onClick={() => setIsEditMode(true)} data-testid="button-admin-edit">
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" data-testid="button-admin-more-menu">
              <MoreVertical className={isMobile ? "w-4 h-4" : "w-5 h-5"} style={{ color: "#6B7280" }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isMobile && (
              <DropdownMenuItem className="gap-2" onClick={() => setIsEditMode(true)} data-testid="button-admin-edit-mobile">
                <Pencil className="w-4 h-4" />
                Edit Task
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-red-600 gap-2" onClick={() => setDeleteDialogOpen(true)} data-testid="button-admin-delete">
              <Trash2 className="w-4 h-4" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={isMobile ? "flex flex-col flex-1 overflow-y-auto" : "flex flex-1 overflow-hidden"}>
        <div className={isMobile ? "flex-1" : "flex-1 overflow-y-auto"}>
          <div className={isMobile ? "p-4 space-y-4" : "p-8 space-y-6"}>
            <div
              className={isMobile ? "rounded-2xl p-5" : "rounded-2xl p-7"}
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", boxShadow: "0 10px 25px rgba(15, 23, 42, 0.05)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#6366F1" }}>
                Work order
              </p>
              <h1
                className={`${isMobile ? "text-2xl" : "text-3xl"} font-semibold leading-tight`}
                style={{ color: "#111827" }}
                data-testid="text-panel-task-title"
              >
                {task.name}
              </h1>
              <p className="text-sm mt-3" style={{ color: "#6B7280" }}>
                {taskTypeLabels[task.taskType] || task.taskType} - {task.executorType === "student" ? "Student Pool" : "Technician Pool"}
              </p>
              {task.description && (
                <p className={`${isMobile ? "text-sm" : "text-base"} leading-relaxed mt-5`} style={{ color: "#374151" }}>
                  {task.description}
                </p>
              )}
            </div>

            <div className={`grid ${isMobile ? "grid-cols-1 gap-3" : "grid-cols-2 gap-4"}`}>
              <div className="flex items-center gap-3 rounded-xl p-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
                <UserIcon className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                <div className="min-w-0">
                  <p className="text-xs" style={{ color: "#6B7280" }}>Assigned to</p>
                  <div className="flex items-center gap-2 mt-1">
                  {assignee && (
                    <Avatar className="w-6 h-6">
                      <AvatarFallback style={{ backgroundColor: getAvatarColorForId(assignee.id), color: "#FFFFFF", fontSize: "10px" }}>
                        {assigneeInitials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                    <span className="text-sm font-medium truncate" style={{ color: "#1A1A1A" }}>{assigneeName}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl p-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
                <Building2 className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                <div className="min-w-0">
                  <p className="text-xs" style={{ color: "#6B7280" }}>Location</p>
                  <p className="text-sm font-medium truncate mt-1" style={{ color: "#1A1A1A" }}>
                    {property?.name || "No location"}
                    {property?.address ? ` - ${property.address}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl p-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
                <Calendar className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                <div>
                  <p className="text-xs" style={{ color: "#6B7280" }}>Due date</p>
                  <p className="text-sm font-medium mt-1" style={{ color: isOverdue ? "#D94F4F" : "#1A1A1A" }}>
                    {task.estimatedCompletionDate
                      ? new Date(task.estimatedCompletionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "Not set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl p-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
                <Clock className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                <div>
                  <p className="text-xs" style={{ color: "#6B7280" }}>Time logged</p>
                  <p className="text-sm font-medium mt-1" style={{ color: "#1A1A1A" }}>
                    {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                  </p>
                </div>
              </div>
            </div>

          <div className="rounded-2xl p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Subtasks</p>
              <span className="text-sm font-medium" style={{ color: "#4338CA" }}>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </div>
            {totalSubtasks > 0 && (
              <div className="w-full rounded-full overflow-hidden mb-4" style={{ height: 6, backgroundColor: "#EEEEEE" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(completedSubtasks / totalSubtasks) * 100}%`,
                    backgroundColor: "#4338CA",
                  }}
                />
              </div>
            )}
            {totalSubtasks === 0 ? (
              <div className="rounded-xl border border-dashed py-8 px-4 text-center" style={{ borderColor: "#D1D5DB", backgroundColor: "#F9FAFB" }}>
                <CheckCircle2 className="w-5 h-5 mx-auto mb-2" style={{ color: "#9CA3AF" }} />
                <p className="text-sm font-medium" style={{ color: "#374151" }}>No subtasks yet</p>
                <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Break this work into steps when it needs tracking.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {subtasks?.map((subtask) => {
                  const isSubCompleted = subtask.status === "completed";
                  return (
                    <div key={subtask.id} className="flex items-center gap-3 py-2 px-2" data-testid={`panel-subtask-${subtask.id}`}>
                      <span
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{
                          borderColor: isSubCompleted ? "#4338CA" : "#D1D5DB",
                          backgroundColor: isSubCompleted ? "#4338CA" : "transparent",
                        }}
                      >
                        {isSubCompleted && <CheckCircle2 className="w-3 h-3" style={{ color: "#FFFFFF" }} />}
                      </span>
                      <span
                        className={`text-sm flex-1 ${isSubCompleted ? "line-through" : ""}`}
                        style={{ color: isSubCompleted ? "#9CA3AF" : "#1A1A1A" }}
                      >
                        {subtask.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
              Notes ({taskNotes.length})
            </p>
            {taskNotes.length === 0 ? (
              <div className="rounded-xl border border-dashed py-8 px-4 text-center mb-3" style={{ borderColor: "#D1D5DB", backgroundColor: "#F9FAFB" }}>
                <StickyNote className="w-5 h-5 mx-auto mb-2" style={{ color: "#F59E0B" }} />
                <p className="text-sm font-medium" style={{ color: "#374151" }}>No notes yet</p>
                <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Add context, updates, or instructions for the team.</p>
              </div>
            ) : (
              <div className="space-y-4 mb-3">
                {taskNotes.map((note) => {
                  const noteAuthor = allUsers?.find(u => u.id === note.userId);
                  const isEditing = editingNoteId === note.id;
                  return (
                    <div key={note.id} data-testid={`panel-note-${note.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <StickyNote className="w-4 h-4" style={{ color: "#F59E0B" }} />
                            <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                              {noteAuthor ? `${noteAuthor.firstName || ""} ${noteAuthor.lastName || ""}`.trim() || noteAuthor.username : "Unknown"}
                            </span>
                            <span className="text-xs" style={{ color: "#9CA3AF" }}>
                              {note.createdAt ? format(new Date(note.createdAt), "MMM d, h:mm a") : ""}
                            </span>
                          </div>
                          {isEditing ? (
                            <div className="space-y-2 ml-6">
                              <Textarea
                                value={editNoteContent}
                                onChange={(e) => setEditNoteContent(e.target.value)}
                                rows={3}
                                data-testid="input-edit-note-content"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => { setEditingNoteId(null); setEditNoteContent(""); }} data-testid="button-cancel-edit-note">
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                                  disabled={!editNoteContent.trim() || updateNoteMutation.isPending}
                                  onClick={() => updateNoteMutation.mutate({ noteId: note.id, content: editNoteContent })}
                                  data-testid="button-save-edit-note"
                                >
                                  {updateNoteMutation.isPending ? "Saving..." : "Save"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed ml-6" style={{ color: "#374151" }}>{note.content}</p>
                          )}
                        </div>
                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingNoteId(note.id); setEditNoteContent(note.content); }} data-testid={`button-edit-note-${note.id}`}>
                              <Pencil className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteNoteId(note.id)} data-testid={`button-delete-note-${note.id}`}>
                              <Trash2 className="w-3.5 h-3.5" style={{ color: "#D94F4F" }} />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs font-medium transition-colors"
              style={{ border: "1px dashed #D1D5DB", color: "#6B7280" }}
              onClick={() => setIsAddNoteDialogOpen(true)}
              data-testid="button-panel-add-note-inline"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Note
            </button>
          </div>
          </div>
        </div>

        <div
          className={isMobile ? "w-full shrink-0" : "w-80 shrink-0 overflow-y-auto"}
          style={{
            borderLeft: isMobile ? "none" : "1px solid #EEEEEE",
            borderTop: isMobile ? "1px solid #EEEEEE" : "none",
            backgroundColor: "#F8FAFC",
          }}
          data-testid="panel-right-sidebar"
        >
          <div className={`${isMobile ? "p-4" : "p-6"}`} style={{ borderBottom: "1px solid #F3F4F6" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
              Parts ({taskParts.length})
            </p>
            {taskParts.length === 0 ? (
              <div className="rounded-xl border border-dashed py-6 px-3 text-center" style={{ borderColor: "#D1D5DB", backgroundColor: "#FFFFFF" }}>
                <Package className="w-5 h-5 mx-auto mb-2" style={{ color: "#9CA3AF" }} />
                <p className="text-xs font-medium" style={{ color: "#6B7280" }}>No parts used</p>
              </div>
            ) : (
              <div className="space-y-3">
                {taskParts.map((part) => (
                  <div key={part.id} data-testid={`panel-part-${part.id}`}>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                      <span className="text-sm" style={{ color: "#1A1A1A" }}>{part.partName}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-6 mt-1">
                      <span className="text-xs" style={{ color: "#9CA3AF" }}>Qty: {part.quantity}</span>
                      {part.cost !== null && part.cost !== undefined && Number(part.cost) > 0 && (
                        <span className="text-xs font-medium" style={{ color: "#15803D" }}>${Number(part.cost).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${isMobile ? "p-4" : "p-6"}`} style={{ borderBottom: "1px solid #F3F4F6" }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Time Log</p>
              <span className="text-sm font-medium" style={{ color: "#6B7280" }}>
                {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
              </span>
            </div>
            {timeEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed py-6 px-3 text-center" style={{ borderColor: "#D1D5DB", backgroundColor: "#FFFFFF" }}>
                <Clock className="w-5 h-5 mx-auto mb-2" style={{ color: "#9CA3AF" }} />
                <p className="text-xs font-medium" style={{ color: "#6B7280" }}>No time logged yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {timeEntries.map((entry: TimeEntry) => {
                  const entryUser = allUsers?.find(u => u.id === entry.userId);
                  const isRunning = entry.startTime && !entry.endTime;
                  const duration = entry.durationMinutes
                    ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m`
                    : isRunning ? "Running" : "—";
                  return (
                    <div key={entry.id} className="flex items-center justify-between gap-2 py-1.5" data-testid={`panel-history-${entry.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                          {entryUser ? `${entryUser.firstName || ""} ${entryUser.lastName || ""}`.trim() || entryUser.username : "Unknown"}
                        </p>
                        <p className="text-xs" style={{ color: "#9CA3AF" }}>
                          {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="text-xs font-medium px-2 py-1 rounded"
                          style={{
                            backgroundColor: isRunning ? "#EEF2FF" : "#FFFFFF",
                            color: isRunning ? "#4338CA" : "#374151",
                            border: isRunning ? "none" : "1px solid #E5E7EB",
                          }}
                        >
                          {duration}
                        </span>
                        {!isRunning && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingTimeEntryId(entry.id);
                                setEditTimeDuration(String(entry.durationMinutes || 0));
                              }}
                              data-testid={`button-edit-time-${entry.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteTimeEntryId(entry.id)}
                              data-testid={`button-delete-time-${entry.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" style={{ color: "#D94F4F" }} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button
              className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-3 rounded-md text-xs font-medium transition-colors"
              style={{ border: "1px dashed #D1D5DB", color: "#6B7280" }}
              onClick={() => setIsLogTimeDialogOpen(true)}
              data-testid="button-panel-log-time-inline"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Time
            </button>
          </div>

          <div className={`${isMobile ? "p-4" : "p-6"}`}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
              Resources ({(uploads?.length || 0)})
            </p>
            {(!uploads || uploads.length === 0) ? (
              <div className="rounded-xl border border-dashed py-6 px-3 text-center" style={{ borderColor: "#D1D5DB", backgroundColor: "#FFFFFF" }}>
                <FileText className="w-5 h-5 mx-auto mb-2" style={{ color: "#9CA3AF" }} />
                <p className="text-xs font-medium" style={{ color: "#6B7280" }}>No resources attached</p>
              </div>
            ) : (
              <div className="space-y-2">
                {uploads.map((upload) => {
                  const isImage = upload.fileType.startsWith("image/");
                  const isVideo = upload.fileType.startsWith("video/");
                  const TypeIcon = isImage ? ImageIcon : isVideo ? Video : FileText;
                  const badgeBg = isImage ? "#F3F4F6" : isVideo ? "#FFF1F2" : "#EDE9FE";
                  const badgeColor = isImage ? "#6B7280" : isVideo ? "#F43F5E" : "#7C3AED";
                  const ext = upload.fileName.split(".").pop()?.toLowerCase() || "";
                  const typeLabel = isImage ? "IMG" : isVideo ? "VID"
                    : ext === "pdf" ? "PDF" : ext === "xls" || ext === "xlsx" ? "XLS"
                    : ext === "doc" || ext === "docx" ? "DOC" : "FILE";
                  return (
                    <a
                      key={upload.id}
                      href={toDisplayUrl(upload.objectUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 py-2 px-2 rounded hover-elevate"
                      data-testid={`resource-item-${upload.id}`}
                    >
                      <TypeIcon className="w-4 h-4 shrink-0" style={{ color: badgeColor }} />
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                        style={{ backgroundColor: badgeBg, color: badgeColor }}
                      >
                        {typeLabel}
                      </span>
                      <span className="text-sm truncate flex-1" style={{ color: "#374151" }}>{upload.fileName}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <TaskDetailPanelDialogs ctx={ctx} />
    </div>
  );
}
