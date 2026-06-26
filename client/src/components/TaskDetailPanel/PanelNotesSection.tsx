import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronRight,
  ChevronDown,
  StickyNote,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import type { User, TaskNote } from "@shared/schema";
import type { UseMutationResult } from "@tanstack/react-query";
import { PanelSection } from "./PanelSection";
import { Badge } from "@/components/ui/badge";

interface PanelNotesSectionProps {
  isNotesOpen: boolean;
  setIsNotesOpen: (v: boolean) => void;
  taskNotes: TaskNote[];
  allUsers?: User[];
  editingNoteId: string | null;
  setEditingNoteId: (v: string | null) => void;
  editNoteContent: string;
  setEditNoteContent: (v: string) => void;
  setDeleteNoteId: (v: string | null) => void;
  setIsAddNoteDialogOpen: (v: boolean) => void;
  updateNoteMutation: UseMutationResult<any, any, any, any>;
  isAdmin: boolean;
  variant?: "compact" | "full";
}

function NoteList({
  taskNotes,
  allUsers,
  editingNoteId,
  setEditingNoteId,
  editNoteContent,
  setEditNoteContent,
  setDeleteNoteId,
  setIsAddNoteDialogOpen,
  updateNoteMutation,
  isAdmin,
  compact = false,
  embedded = false,
}: Omit<PanelNotesSectionProps, "isNotesOpen" | "setIsNotesOpen" | "variant"> & {
  compact?: boolean;
  embedded?: boolean;
}) {
  return (
    <div className={embedded ? "space-y-4" : compact ? "space-y-3" : "px-5 pb-4 space-y-4"}>
      {taskNotes.length === 0 ? (
        embedded ? (
          <div
            className="rounded-xl border border-dashed py-8 px-4 text-center"
            style={{ borderColor: "#D1D5DB", backgroundColor: "#F9FAFB" }}
          >
            <StickyNote className="w-5 h-5 mx-auto mb-2" style={{ color: "#F59E0B" }} />
            <p className="text-sm font-medium" style={{ color: "#374151" }}>No notes yet</p>
            <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>
              Add context, updates, or instructions for the team.
            </p>
          </div>
        ) : (
          <p className={`text-xs text-center ${compact ? "py-3" : "py-4"}`} style={{ color: "#9CA3AF" }}>
            No notes yet
          </p>
        )
      ) : (
        taskNotes.map((note) => {
          const noteAuthor = allUsers?.find((u) => u.id === note.userId);
          const isEditing = editingNoteId === note.id;
          return (
            <div
              key={note.id}
              className="p-4 rounded-xl"
              style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}
              data-testid={`panel-note-${note.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                      {noteAuthor
                        ? `${noteAuthor.firstName || ""} ${noteAuthor.lastName || ""}`.trim() || noteAuthor.username
                        : "Unknown"}
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
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>
                      {note.createdAt ? format(new Date(note.createdAt), "MMM d, h:mm a") : ""}
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editNoteContent}
                        onChange={(e) => setEditNoteContent(e.target.value)}
                        rows={4}
                        className="text-sm leading-relaxed"
                        data-testid="input-edit-note-content"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingNoteId(null);
                            setEditNoteContent("");
                          }}
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
                    <p
                      className="text-sm leading-[1.65] whitespace-pre-wrap break-words"
                      style={{ color: "#374151" }}
                    >
                      {note.content}
                    </p>
                  )}
                </div>
                {isAdmin && !isEditing && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingNoteId(note.id);
                        setEditNoteContent(note.content);
                      }}
                      data-testid={`button-edit-note-${note.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteNoteId(note.id)}
                      data-testid={`button-delete-note-${note.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "#D94F4F" }} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
      <button
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-colors"
        style={{ border: "1px dashed #D1D5DB", color: "#6B7280" }}
        onClick={() => setIsAddNoteDialogOpen(true)}
        data-testid="button-panel-add-note-inline"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Note
      </button>
    </div>
  );
}

export { NoteList as PanelNoteList };

export function PanelNotesSection({
  isNotesOpen,
  setIsNotesOpen,
  taskNotes,
  allUsers,
  editingNoteId,
  setEditingNoteId,
  editNoteContent,
  setEditNoteContent,
  setDeleteNoteId,
  setIsAddNoteDialogOpen,
  updateNoteMutation,
  isAdmin,
  variant = "full",
}: PanelNotesSectionProps) {
  const noteListProps = {
    taskNotes,
    allUsers,
    editingNoteId,
    setEditingNoteId,
    editNoteContent,
    setEditNoteContent,
    setDeleteNoteId,
    setIsAddNoteDialogOpen,
    updateNoteMutation,
    isAdmin,
  };

  if (variant === "compact") {
    return (
      <PanelSection
        title="Notes"
        icon={<StickyNote className="w-4 h-4" />}
        badge={
          taskNotes.length > 0 ? (
            <Badge variant="secondary" className="text-xs font-normal tabular-nums">
              {taskNotes.length}
            </Badge>
          ) : undefined
        }
        expanded={isNotesOpen}
        onToggle={() => setIsNotesOpen(!isNotesOpen)}
        testId="link-panel-notes"
      >
        <NoteList {...noteListProps} compact />
      </PanelSection>
    );
  }

  return (
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
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
            >
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
      {isNotesOpen && <NoteList {...noteListProps} />}
    </div>
  );
}
