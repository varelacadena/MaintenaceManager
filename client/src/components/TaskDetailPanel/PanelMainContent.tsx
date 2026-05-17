import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Clock, ChevronRight, ChevronDown, Flag, Calendar, User as UserIcon, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { User } from "@shared/schema";
import { taskTypeLabels, getAvatarHexColor as getAvatarColorForId } from "@/utils/taskUtils";
import type { TaskDetailPanelContext } from "./useTaskDetailPanel";
import { PanelPartsSection } from "./PanelPartsSection";
import { PanelNotesSection } from "./PanelNotesSection";
import { PanelHistorySection } from "./PanelHistorySection";
import { PanelResourcesSection } from "./PanelResourcesSection";
import { PanelSubtasksSection } from "./PanelSubtasksSection";

interface PanelMainContentProps {
  ctx: TaskDetailPanelContext;
  isFullscreen: boolean;
  allUsers?: User[];
  taskId: string;
}

export function PanelMainContent({ ctx, isFullscreen, allUsers, taskId }: PanelMainContentProps) {
  const {
    isMobile, task, subtasks, uploads, taskParts, inventoryItems,
    timeEntries, taskNotes, totalMinutes, docCount, imgCount, vidCount,
    expandedSubtasks, resourcesExpanded, setResourcesExpanded,
    isPartsOpen, setIsPartsOpen, isHistoryOpen, setIsHistoryOpen,
    isAddPartFormOpen, setIsAddPartFormOpen,
    newPartQuantity, setNewPartQuantity, newPartNotes, setNewPartNotes,
    inventorySearchQuery, setInventorySearchQuery, selectedInventoryItemId,
    setSelectedInventoryItemId, isNotesOpen, setIsNotesOpen,
    setIsAddNoteDialogOpen, editingNoteId, setEditingNoteId,
    editNoteContent, setEditNoteContent, setDeleteNoteId,
    setEditingTimeEntryId, setEditTimeDuration, setDeleteTimeEntryId,
    addPartMutation, updateNoteMutation,
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

      <PanelResourcesSection
        uploads={uploads}
        resourcesExpanded={resourcesExpanded}
        setResourcesExpanded={setResourcesExpanded}
        docCount={docCount}
        imgCount={imgCount}
        vidCount={vidCount}
      />

      <PanelSubtasksSection
        subtasks={subtasks}
        expandedSubtasks={expandedSubtasks}
        completedSubtasks={completedSubtasks}
        totalSubtasks={totalSubtasks}
        allSubtasksComplete={allSubtasksComplete}
        isStarted={isStarted}
        isCompleted={isCompleted}
        isFullscreen={isFullscreen}
        toggleSubtaskExpanded={toggleSubtaskExpanded}
      />

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
