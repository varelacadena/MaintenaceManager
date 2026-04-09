import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MapPin,
  Clock,
  ChevronRight,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Video,
  MessageSquare,
  Flag,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import type { User } from "@shared/schema";
import { SubtaskNote } from "../SubtaskNote";
import { SubtaskPhotos } from "../SubtaskPhotos";
import { toDisplayUrl } from "@/lib/imageUtils";
import { taskTypeLabels } from "@/utils/taskUtils";
import { getAvatarHexColor as getAvatarColorForId } from "@/utils/taskUtils";
import type { TaskDetailPanelContext } from "./useTaskDetailPanel";
import { PanelPartsSection } from "./PanelPartsSection";
import { PanelNotesSection } from "./PanelNotesSection";
import { PanelHistorySection } from "./PanelHistorySection";

interface PanelMainContentProps {
  ctx: TaskDetailPanelContext;
  isFullscreen: boolean;
  allUsers?: User[];
  taskId: string;
}

export function PanelMainContent({ ctx, isFullscreen, allUsers, taskId }: PanelMainContentProps) {
  const {
    isMobile, task, subtasks, uploads, taskMessages, taskParts, inventoryItems,
    timeEntries, taskNotes, totalMinutes, docCount, imgCount, vidCount,
    expandedSubtasks, resourcesExpanded, setResourcesExpanded,
    isMessagesOpen, setIsMessagesOpen, isPartsOpen, setIsPartsOpen,
    isHistoryOpen, setIsHistoryOpen, newMessageText, setNewMessageText,
    messagesEndRef, isAddPartFormOpen, setIsAddPartFormOpen,
    newPartQuantity, setNewPartQuantity, newPartNotes, setNewPartNotes,
    inventorySearchQuery, setInventorySearchQuery, selectedInventoryItemId,
    setSelectedInventoryItemId, isNotesOpen, setIsNotesOpen,
    setIsAddNoteDialogOpen, editingNoteId, setEditingNoteId,
    editNoteContent, setEditNoteContent, setDeleteNoteId,
    setEditingTimeEntryId, setEditTimeDuration, setDeleteTimeEntryId,
    sendMessageMutation, addPartMutation, updateNoteMutation,
    property, assignee, assigneeInitials, assigneeName,
    completedSubtasks, totalSubtasks, allSubtasksComplete,
    isStarted, isCompleted, isNotStarted, urg, isOverdue,
    toggleSubtaskExpanded, user, isAdmin,
  } = ctx;

  if (!task) return null;

  return (
    <div className={isMobile && isFullscreen ? "flex-1" : "flex-1 overflow-y-auto"} data-testid="panel-main-content">
      <div className="px-5 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
        <h2
          className="text-base font-semibold leading-snug"
          style={{ color: "#1A1A1A" }}
          data-testid="text-panel-task-title"
        >
          {task.name}
        </h2>
        <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
          {taskTypeLabels[task.taskType] || task.taskType} · {task.executorType === "student" ? "Student Pool" : "Technician Pool"}
        </p>
        {task.description && (
          <p className="text-sm leading-relaxed mt-3" style={{ color: "#374151", lineHeight: "1.55" }}>
            {task.description}
          </p>
        )}
      </div>

      <div
        className={`grid px-5 py-4 ${isFullscreen ? (isMobile ? "grid-cols-2 gap-4" : "grid-cols-4 gap-4") : "grid-cols-1 gap-3"}`}
        style={{ borderBottom: "1px solid #EEEEEE" }}
      >
        <div className="flex items-center gap-3">
          <UserIcon className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
          <span className="text-xs" style={{ color: "#6B7280" }}>Assigned</span>
          <div className="flex items-center gap-1.5 ml-auto">
            {assignee ? (
              <>
                <Avatar className="w-5 h-5">
                  <AvatarFallback
                    style={{ backgroundColor: getAvatarColorForId(assignee.id), color: "#FFFFFF", fontSize: "9px" }}
                  >
                    {assigneeInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>{assigneeName}</span>
              </>
            ) : (
              <span className="text-sm" style={{ color: "#6B7280" }}>Unassigned</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
          <span className="text-xs" style={{ color: "#6B7280" }}>Location</span>
          <span className="text-sm font-medium ml-auto truncate max-w-[55%] text-right" style={{ color: "#1A1A1A" }}>
            {property?.name || "No location"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
          <span className="text-xs" style={{ color: "#6B7280" }}>Due date</span>
          <span className="text-sm font-medium ml-auto" style={{ color: isOverdue ? "#D94F4F" : "#1A1A1A" }}>
            {task.estimatedCompletionDate
              ? new Date(task.estimatedCompletionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "Not set"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Flag className="w-4 h-4 shrink-0" style={{ color: urg.color }} />
          <span className="text-xs" style={{ color: "#6B7280" }}>Priority</span>
          <span className="text-sm font-medium ml-auto" style={{ color: urg.color }}>
            {urg.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
          <span className="text-xs" style={{ color: "#6B7280" }}>Time logged</span>
          <span className="text-sm font-medium ml-auto" style={{ color: "#1A1A1A" }}>
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
          <span className="text-xs" style={{ color: "#6B7280" }}>Estimated</span>
          <span className="text-sm font-medium ml-auto" style={{ color: task.estimatedHours ? "#1A1A1A" : "#9CA3AF" }}>
            {task.estimatedHours ? `${task.estimatedHours}h` : "Not set"}
          </span>
        </div>
      </div>

      <div
        className="px-5 py-3 cursor-pointer"
        style={{ borderBottom: "1px solid #EEEEEE" }}
        onClick={() => setResourcesExpanded(!resourcesExpanded)}
        data-testid="button-toggle-resources"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: "#6B7280" }} />
          <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>Resources</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: "#EDE9FE", color: "#7C3AED" }}
            >
              {docCount} docs
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
            >
              {imgCount} img
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: "#FFF1F2", color: "#F43F5E" }}
            >
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
                    className="flex items-center gap-2 py-1.5 px-1 rounded hover-elevate"
                    data-testid={`resource-item-${upload.id}`}
                  >
                    <TypeIcon className="w-4 h-4 shrink-0" style={{ color: badgeColor }} />
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                      style={{ backgroundColor: badgeBg, color: badgeColor }}
                    >
                      {typeLabel}
                    </span>
                    <span className="text-xs truncate flex-1" style={{ color: "#374151" }}>
                      {upload.fileName}
                    </span>
                    <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "#9CA3AF" }} />
                  </a>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium tracking-wider uppercase" style={{ color: "#9CA3AF" }}>
            SUBTASKS
          </p>
          <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
            {completedSubtasks} / {totalSubtasks}
          </span>
        </div>

        {isStarted && totalSubtasks > 0 && (
          <div className="w-full rounded-full overflow-hidden mb-3" style={{ height: "4px", backgroundColor: "#EEEEEE" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0}%`,
                backgroundColor: "#4338CA",
              }}
            />
          </div>
        )}

        {isStarted && totalSubtasks > 0 && !allSubtasksComplete && (
          <div
            className="flex items-center gap-2 text-xs py-2 px-3 rounded mb-3"
            style={{ borderLeft: "3px solid #D94F4F", backgroundColor: "#FEF2F2", color: "#D94F4F" }}
            data-testid="warning-subtasks-incomplete"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            All subtasks must be completed before marking this task as done
          </div>
        )}

        {totalSubtasks === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>
            No subtasks
          </p>
        ) : (
          <div className="space-y-1">
            {subtasks?.map((subtask) => {
              const isSubCompleted = subtask.status === "completed";
              const isExpanded = expandedSubtasks.has(subtask.id);
              const isLocked = !isStarted && !isCompleted;
              const isReadOnly = !isFullscreen;

              return (
                <div key={subtask.id} data-testid={`panel-subtask-${subtask.id}`}>
                  <div
                    className={`flex items-center gap-3 py-2.5 px-2 rounded transition-opacity ${isReadOnly ? "" : "cursor-pointer"}`}
                    style={isLocked && !isReadOnly ? { opacity: 0.45 } : undefined}
                    onClick={() => !isLocked && !isReadOnly && toggleSubtaskExpanded(subtask.id)}
                  >
                    <span
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: isSubCompleted ? "#4338CA" : "#D1D5DB",
                        backgroundColor: isSubCompleted ? "#4338CA" : "transparent",
                      }}
                      data-testid={`checkbox-subtask-${subtask.id}`}
                    >
                      {isSubCompleted && (
                        <CheckCircle2 className="w-3 h-3" style={{ color: "#FFFFFF" }} />
                      )}
                    </span>
                    <span
                      className={`text-sm flex-1 ${isSubCompleted ? "line-through" : ""}`}
                      style={{ color: isSubCompleted ? "#9CA3AF" : "#1A1A1A" }}
                    >
                      {subtask.name}
                    </span>
                    {!isLocked && !isReadOnly && (
                      isExpanded ? (
                        <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                      )
                    )}
                  </div>

                  {isExpanded && !isLocked && !isReadOnly && (
                    <div className="ml-8 pb-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SubtaskPhotos subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="panel-subtask" />
                      </div>
                      <SubtaskNote subtaskId={subtask.id} disabled={isCompleted} testIdPrefix="panel-subtask" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isCompleted && (
        <div
          className="mx-5 my-4 flex items-center gap-2 text-sm py-3 px-4 rounded-lg"
          style={{ backgroundColor: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0" }}
          data-testid="banner-task-completed"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Task completed · All subtasks done · evidence captured
        </div>
      )}

      <div style={{ borderBottom: "1px solid #EEEEEE" }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
          style={{ color: "#1A1A1A" }}
          onClick={() => setIsMessagesOpen(!isMessagesOpen)}
          data-testid="link-panel-messages"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" style={{ color: "#6B7280" }} />
            Messages
            {taskMessages.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}>
                {taskMessages.length}
              </span>
            )}
          </div>
          {isMessagesOpen ? (
            <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          )}
        </button>
        {isMessagesOpen && (
          <div className="px-5 pb-4">
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #EEEEEE" }}>
              <div className="overflow-y-auto space-y-3 p-3" style={{ maxHeight: "250px" }}>
                {taskMessages.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>No messages yet</p>
                ) : (
                  taskMessages.map((msg) => {
                    const sender = allUsers?.find(u => u.id === msg.senderId);
                    const isOwnMessage = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
                        data-testid={`panel-message-${msg.id}`}
                      >
                        <p className="text-xs font-medium mb-0.5" style={{ color: "#6B7280" }}>
                          {sender ? `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || sender.username : "Unknown"}
                        </p>
                        <div
                          className="rounded-xl px-3 py-2 max-w-[80%]"
                          style={{
                            backgroundColor: isOwnMessage ? "#4338CA" : "#F3F4F6",
                            color: isOwnMessage ? "#FFFFFF" : "#1A1A1A",
                          }}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                          {msg.createdAt ? format(new Date(msg.createdAt), "MMM d, h:mm a") : ""}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2 p-2" style={{ borderTop: "1px solid #EEEEEE" }}>
                <Input
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && newMessageText.trim()) {
                      e.preventDefault();
                      sendMessageMutation.mutate(newMessageText.trim());
                    }
                  }}
                  data-testid="input-panel-message"
                />
                <Button
                  size="icon"
                  style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                  onClick={() => newMessageText.trim() && sendMessageMutation.mutate(newMessageText.trim())}
                  disabled={!newMessageText.trim() || sendMessageMutation.isPending}
                  data-testid="button-panel-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <PanelPartsSection
        isPartsOpen={isPartsOpen}
        setIsPartsOpen={setIsPartsOpen}
        taskParts={taskParts}
        isAddPartFormOpen={isAddPartFormOpen}
        setIsAddPartFormOpen={setIsAddPartFormOpen}
        inventorySearchQuery={inventorySearchQuery}
        setInventorySearchQuery={setInventorySearchQuery}
        selectedInventoryItemId={selectedInventoryItemId}
        setSelectedInventoryItemId={setSelectedInventoryItemId}
        inventoryItems={inventoryItems}
        newPartQuantity={newPartQuantity}
        setNewPartQuantity={setNewPartQuantity}
        newPartNotes={newPartNotes}
        setNewPartNotes={setNewPartNotes}
        addPartMutation={addPartMutation}
        isAdmin={isAdmin}
        taskId={taskId}
      />

      <PanelNotesSection
        isNotesOpen={isNotesOpen}
        setIsNotesOpen={setIsNotesOpen}
        taskNotes={taskNotes}
        allUsers={allUsers}
        editingNoteId={editingNoteId}
        setEditingNoteId={setEditingNoteId}
        editNoteContent={editNoteContent}
        setEditNoteContent={setEditNoteContent}
        setDeleteNoteId={setDeleteNoteId}
        setIsAddNoteDialogOpen={setIsAddNoteDialogOpen}
        updateNoteMutation={updateNoteMutation}
        isAdmin={isAdmin}
      />

      <PanelHistorySection
        isHistoryOpen={isHistoryOpen}
        setIsHistoryOpen={setIsHistoryOpen}
        timeEntries={timeEntries}
        allUsers={allUsers}
        setEditingTimeEntryId={setEditingTimeEntryId}
        setEditTimeDuration={setEditTimeDuration}
        setDeleteTimeEntryId={setDeleteTimeEntryId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
