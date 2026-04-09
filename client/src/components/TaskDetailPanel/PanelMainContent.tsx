import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Package,
  History,
  Flag,
  Calendar,
  User as UserIcon,
  StickyNote,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import type { User, TimeEntry } from "@shared/schema";
import { SubtaskNote } from "../SubtaskNote";
import { SubtaskPhotos } from "../SubtaskPhotos";
import { toDisplayUrl } from "@/lib/imageUtils";
import { taskTypeLabels } from "@/utils/taskUtils";
import { getAvatarHexColor as getAvatarColorForId } from "@/utils/taskUtils";
import type { TaskDetailPanelContext } from "./useTaskDetailPanel";

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

      <div style={{ borderBottom: "1px solid #EEEEEE" }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
          style={{ color: "#1A1A1A" }}
          onClick={() => setIsPartsOpen(!isPartsOpen)}
          data-testid="link-panel-parts"
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: "#6B7280" }} />
            Parts Used
            {taskParts.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}>
                {taskParts.length}
              </span>
            )}
          </div>
          {isPartsOpen ? (
            <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          )}
        </button>
        {isPartsOpen && (
          <div className="px-5 pb-4 space-y-2">
            {taskParts.length === 0 && !isAddPartFormOpen ? (
              <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>No parts used yet</p>
            ) : (
              taskParts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}
                  data-testid={`panel-part-${part.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#1A1A1A" }}>{part.partName}</p>
                    {part.notes && <p className="text-xs mt-0.5 truncate" style={{ color: "#6B7280" }}>{part.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs font-medium" style={{ color: "#6B7280" }}>x{part.quantity}</span>
                    {part.cost !== null && part.cost !== undefined && Number(part.cost) > 0 && (
                      <span className="text-xs font-medium" style={{ color: "#15803D" }}>${Number(part.cost).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              ))
            )}
            {isAddPartFormOpen ? (
              <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search inventory..."
                    value={inventorySearchQuery}
                    onChange={(e) => {
                      setInventorySearchQuery(e.target.value);
                      setSelectedInventoryItemId("");
                    }}
                    className="pl-9"
                    data-testid="input-panel-search-part"
                  />
                </div>
                {inventorySearchQuery && !selectedInventoryItemId && (() => {
                  const filtered = inventoryItems.filter((item) =>
                    item.name.toLowerCase().includes(inventorySearchQuery.toLowerCase())
                  );
                  return (
                    <div className="border border-border rounded-md max-h-40 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground" data-testid="text-panel-no-inventory-match">
                          No matching inventory items
                        </div>
                      ) : (
                        filtered.map((item) => {
                          const qty = Number(item.quantity) || 0;
                          const isOut = item.stockStatus === "out" || (item.trackingMode === "counted" && qty <= 0);
                          const isLow = item.stockStatus === "low" || (item.trackingMode === "counted" && item.minQuantity && qty <= Number(item.minQuantity) && qty > 0);
                          return (
                            <div
                              key={item.id}
                              className={`px-3 py-2 cursor-pointer text-sm border-b border-border/50 hover-elevate ${isOut ? "opacity-50" : "text-foreground"}`}
                              onClick={() => {
                                setSelectedInventoryItemId(item.id);
                                setInventorySearchQuery(item.name);
                              }}
                              data-testid={`panel-inventory-item-${item.id}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium truncate">{item.name}</span>
                                <Badge variant={isOut ? "destructive" : isLow ? "outline" : "secondary"} className="text-[10px] shrink-0">
                                  {isOut ? "Out" : isLow ? "Low" : "Stocked"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {item.location || "No location set"}
                                </span>
                                {item.trackingMode === "counted" && (
                                  <span className="flex items-center gap-1">
                                    <Package className="w-3 h-3" />
                                    {qty} {item.unit || "pcs"}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })()}
                {selectedInventoryItemId && (() => {
                  const selectedItem = inventoryItems.find((i) => i.id === selectedInventoryItemId);
                  const qty = Number(selectedItem?.quantity) || 0;
                  const isOut = selectedItem?.stockStatus === "out" || (selectedItem?.trackingMode === "counted" && qty <= 0);
                  const isLow = selectedItem?.stockStatus === "low" || (selectedItem?.trackingMode === "counted" && selectedItem?.minQuantity && qty <= Number(selectedItem.minQuantity) && qty > 0);
                  return (
                    <div className="p-2 rounded-md text-sm bg-muted text-foreground" data-testid="text-panel-selected-item">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{selectedItem?.name}</span>
                        <Badge variant={isOut ? "destructive" : isLow ? "outline" : "secondary"} className="text-[10px] shrink-0">
                          {isOut ? "Out" : isLow ? "Low" : "Stocked"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {selectedItem?.location || "No location set"}
                        </span>
                        {selectedItem?.trackingMode === "counted" && (
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {qty} {selectedItem?.unit || "pcs"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
                <div className="flex gap-2">
                  <Input
                    value={newPartQuantity}
                    onChange={(e) => setNewPartQuantity(e.target.value)}
                    placeholder="Qty"
                    type="number"
                    min="1"
                    className="w-20"
                    data-testid="input-panel-part-quantity"
                  />
                  <Input
                    value={
                      selectedInventoryItemId
                        ? (
                            (parseFloat(
                              inventoryItems.find((i) => i.id === selectedInventoryItemId)?.cost || "0"
                            ) || 0) * (parseFloat(newPartQuantity) || 1)
                          ).toFixed(2)
                        : ""
                    }
                    readOnly
                    placeholder="Cost ($)"
                    type="number"
                    className="w-24"
                    data-testid="input-panel-part-cost"
                  />
                </div>
                <Input
                  value={newPartNotes}
                  onChange={(e) => setNewPartNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  data-testid="input-panel-part-notes"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddPartFormOpen(false);
                      setNewPartQuantity("1");
                      setInventorySearchQuery("");
                      setSelectedInventoryItemId("");
                      setNewPartNotes("");
                    }}
                    data-testid="button-panel-cancel-part"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                    disabled={!selectedInventoryItemId || addPartMutation.isPending}
                    onClick={() => {
                      const selectedItem = inventoryItems.find((i) => i.id === selectedInventoryItemId);
                      if (!selectedItem) return;
                      const cost = (parseFloat(selectedItem.cost || "0") || 0) * (parseFloat(newPartQuantity) || 1);
                      addPartMutation.mutate({
                        taskId,
                        partName: selectedItem.name,
                        quantity: newPartQuantity || "1",
                        cost,
                        notes: newPartNotes.trim() || undefined,
                        inventoryItemId: selectedInventoryItemId,
                      });
                    }}
                    data-testid="button-panel-save-part"
                  >
                    {addPartMutation.isPending ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
            ) : (
              isAdmin && (
                <button
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ border: "1px dashed #D1D5DB", color: "#6B7280" }}
                  onClick={() => setIsAddPartFormOpen(true)}
                  data-testid="button-panel-add-part"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Part
                </button>
              )
            )}
          </div>
        )}
      </div>

      <div style={{ borderBottom: "1px solid #EEEEEE" }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
          style={{ color: "#1A1A1A" }}
          onClick={() => setIsNotesOpen(!isNotesOpen)}
          data-testid="link-panel-notes"
        >
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4" style={{ color: "#6B7280" }} />
            Notes
            {taskNotes.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                {taskNotes.length}
              </span>
            )}
          </div>
          {isNotesOpen ? (
            <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          )}
        </button>
        {isNotesOpen && (
          <div className="px-5 pb-4 space-y-2">
            {taskNotes.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>No notes yet</p>
            ) : (
              taskNotes.map((note) => {
                const noteAuthor = allUsers?.find(u => u.id === note.userId);
                const isEditing = editingNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}
                    data-testid={`panel-note-${note.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                            {noteAuthor ? `${noteAuthor.firstName || ""} ${noteAuthor.lastName || ""}`.trim() || noteAuthor.username : "Unknown"}
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{
                              backgroundColor: note.noteType === "recommendation" ? "#EDE9FE" : "#F3F4F6",
                              color: note.noteType === "recommendation" ? "#7C3AED" : "#6B7280",
                            }}
                          >
                            {note.noteType === "recommendation" ? "Recommendation" : "Job Note"}
                          </span>
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editNoteContent}
                              onChange={(e) => setEditNoteContent(e.target.value)}
                              rows={3}
                              data-testid="input-edit-note-content"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setEditingNoteId(null); setEditNoteContent(""); }}
                                data-testid="button-cancel-edit-note"
                              >
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
                          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#374151" }}>
                            {note.content}
                          </p>
                        )}
                        <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
                          {note.createdAt ? format(new Date(note.createdAt), "MMM d, h:mm a") : ""}
                        </p>
                      </div>
                      {isAdmin && !isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { setEditingNoteId(note.id); setEditNoteContent(note.content); }}
                            data-testid={`button-edit-note-${note.id}`}
                          >
                            <Pencil className="w-3 h-3" style={{ color: "#6B7280" }} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteNoteId(note.id)}
                            data-testid={`button-delete-note-${note.id}`}
                          >
                            <Trash2 className="w-3 h-3" style={{ color: "#D94F4F" }} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <button
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ border: "1px dashed #D1D5DB", color: "#6B7280" }}
              onClick={() => setIsAddNoteDialogOpen(true)}
              data-testid="button-panel-add-note-inline"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Note
            </button>
          </div>
        )}
      </div>

      <div>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
          style={{ color: "#1A1A1A" }}
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          data-testid="link-panel-history"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" style={{ color: "#6B7280" }} />
            History
            {timeEntries.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                {timeEntries.length}
              </span>
            )}
          </div>
          {isHistoryOpen ? (
            <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          )}
        </button>
        {isHistoryOpen && (
          <div className="px-5 pb-4 space-y-2">
            {timeEntries.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>No time entries yet</p>
            ) : (
              timeEntries.map((entry: TimeEntry) => {
                const entryUser = allUsers?.find(u => u.id === entry.userId);
                const isRunning = entry.startTime && !entry.endTime;
                const duration = entry.durationMinutes
                  ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m`
                  : isRunning ? "Running" : "—";
                return (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}
                    data-testid={`panel-history-${entry.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                          {entryUser ? `${entryUser.firstName || ""} ${entryUser.lastName || ""}`.trim() || entryUser.username : "Unknown"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                          {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : "No start time"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span
                          className="text-xs font-medium px-2 py-1 rounded"
                          style={{
                            backgroundColor: isRunning ? "#EEF2FF" : "#F3F4F6",
                            color: isRunning ? "#4338CA" : "#6B7280",
                          }}
                        >
                          {duration}
                        </span>
                        {isAdmin && !isRunning && (
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
                              <Pencil className="w-3 h-3" style={{ color: "#6B7280" }} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteTimeEntryId(entry.id)}
                              data-testid={`button-delete-time-${entry.id}`}
                            >
                              <Trash2 className="w-3 h-3" style={{ color: "#D94F4F" }} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
