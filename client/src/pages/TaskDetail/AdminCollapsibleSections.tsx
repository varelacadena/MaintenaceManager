import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  User,
  Calendar,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  StickyNote,
  History,
  ListChecks,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format, formatDistanceToNow } from "date-fns";
import type { TaskDetailContext } from "./useTaskDetail";
import { AdminCollapsibleSectionsExtra } from "./AdminCollapsibleSectionsExtra";

export function AdminCollapsibleSections({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, user, navigate,
    timeEntries, notes, users,
    previousWork,
    activeTimer,
    previousWorkExpanded, setPreviousWorkExpanded,
    notesExpanded, setNotesExpanded,
    checklistExpanded, setChecklistExpanded,
    checklistGroups,
    deleteNoteMutation,
    toggleChecklistItemMutation,
    isTechnicianOrAdmin,
    totalChecklistItems, completedChecklistItems,
  } = ctx;

  if (!task) return null;

  return (
    <>
      {isTechnicianOrAdmin && previousWork.length > 0 && (
        <Collapsible open={previousWorkExpanded} onOpenChange={setPreviousWorkExpanded}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-md text-left" data-testid="toggle-previous-work">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm">Previous Work Here</span>
                <Badge variant="secondary" className="text-xs">{previousWork.length}</Badge>
              </div>
              {previousWorkExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {previousWork.map((prevTask) => {
              const completedBy = users.find(u => u.id === prevTask.assignedToId);
              const isEquipmentMatch = task.equipmentId && prevTask.equipmentId === task.equipmentId;
              return (
                <div
                  key={prevTask.id}
                  className="p-3 rounded-md border border-border/50 cursor-pointer hover-elevate"
                  onClick={() => navigate(`/tasks/${prevTask.id}`)}
                  data-testid={`previous-work-item-${prevTask.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{prevTask.name}</p>
                      {prevTask.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{prevTask.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {completedBy && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {completedBy.firstName} {completedBy.lastName}
                          </span>
                        )}
                        {prevTask.updatedAt && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(prevTask.updatedAt), "MMM d, yyyy")}
                          </span>
                        )}
                        {isEquipmentMatch && (
                          <Badge variant="outline" className="text-xs">Same Equipment</Badge>
                        )}
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}

      {checklistGroups.length > 0 && (
        <Collapsible open={checklistExpanded} onOpenChange={setChecklistExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-checklist">
              <div className="flex items-center gap-3">
                <ListChecks className="w-5 h-5 text-primary" />
                <span className="font-medium">Checklists</span>
                <Badge variant="secondary">{completedChecklistItems}/{totalChecklistItems}</Badge>
              </div>
              {checklistExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-4">
            {checklistGroups.map((group) => (
              <div key={group.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
                <p className="font-medium text-sm">{group.name}</p>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-background rounded-lg cursor-pointer hover-elevate active-elevate-2 min-h-[56px]"
                    onClick={() => toggleChecklistItemMutation.mutate({ itemId: item.id, isCompleted: !item.isCompleted })}
                    data-testid={`checklist-item-${item.id}`}
                  >
                    <Checkbox checked={item.isCompleted} className="w-6 h-6" />
                    <span className={`text-base flex-1 ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-notes">
            <div className="flex items-center gap-3">
              <StickyNote className="w-5 h-5 text-primary" />
              <span className="font-medium">Notes</span>
              {notes.length > 0 && <Badge variant="secondary">{notes.length}</Badge>}
            </div>
            {notesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {notes.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">No notes yet</p>
          ) : (
            notes.map((note) => {
              const noteUser = users.find(u => u.id === note.userId);
              const canDelete = user?.role === "admin" || note.userId === user?.id;
              return (
                <div key={note.id} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{noteUser?.firstName} {noteUser?.lastName}</span>
                      <Badge variant="outline" className="text-xs py-0">
                        {note.noteType === "job_note" ? "Note" : "Recommendation"}
                      </Badge>
                    </div>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteNoteMutation.mutate(note.id)}
                        data-testid={`button-delete-note-${note.id}`}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {note.createdAt && formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                  </p>
                </div>
              );
            })
          )}
        </CollapsibleContent>
      </Collapsible>

      {(() => {
        const myEntries = timeEntries.filter(e => e.userId === user?.id);
        const entriesToShow = isTechnicianOrAdmin ? timeEntries : myEntries;
        
        if (entriesToShow.length === 0) return null;
        
        return (
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <History className="w-5 h-5 text-primary" />
              <span className="font-medium">{isTechnicianOrAdmin ? "Time Log" : "My Time Log"}</span>
            </div>
            <div className="space-y-2">
              {entriesToShow.slice(0, 5).map((entry) => {
                const entryUser = users.find(u => u.id === entry.userId);
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-background rounded-md" data-testid={`time-entry-${entry.id}`}>
                    <div className="flex-1">
                      <p className="text-sm">
                        {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : "No start time"}
                      </p>
                      {isTechnicianOrAdmin && entryUser && (
                        <p className="text-xs text-muted-foreground">
                          {entryUser.firstName} {entryUser.lastName}
                        </p>
                      )}
                    </div>
                    {entry.durationMinutes ? (
                      <Badge variant="secondary">{Math.floor(entry.durationMinutes / 60)}h {entry.durationMinutes % 60}m</Badge>
                    ) : (
                      <Badge variant="default" className="animate-pulse">Running</Badge>
                    )}
                  </div>
                );
              })}
              {entriesToShow.length > 5 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  +{entriesToShow.length - 5} more entries
                </p>
              )}
            </div>
          </div>
        );
      })()}

      <AdminCollapsibleSectionsExtra ctx={ctx} />
    </>
  );
}
