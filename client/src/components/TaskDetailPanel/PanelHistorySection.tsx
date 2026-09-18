import {
  ChevronRight,
  ChevronDown,
  History,
} from "lucide-react";
import { TimeLogEntryRow } from "@/components/TimeLogEntryRow";
import type { User, TimeEntry } from "@shared/schema";

interface PanelHistorySectionProps {
  isHistoryOpen: boolean;
  setIsHistoryOpen: (v: boolean) => void;
  timeEntries: TimeEntry[];
  allUsers?: User[];
  editingTimeEntryId: string | null;
  editTimeHours: string;
  editTimeMinutes: string;
  setEditTimeHours: (v: string) => void;
  setEditTimeMinutes: (v: string) => void;
  startEditTimeEntry: (entry: TimeEntry) => void;
  cancelEditTimeEntry: () => void;
  saveEditTimeEntry: (entryId?: string | null) => void;
  setDeleteTimeEntryId: (v: string | null) => void;
  isSaving: boolean;
  isAdmin: boolean;
}

export function PanelHistorySection({
  isHistoryOpen,
  setIsHistoryOpen,
  timeEntries,
  allUsers,
  editingTimeEntryId,
  editTimeHours,
  editTimeMinutes,
  setEditTimeHours,
  setEditTimeMinutes,
  startEditTimeEntry,
  cancelEditTimeEntry,
  saveEditTimeEntry,
  setDeleteTimeEntryId,
  isSaving,
  isAdmin,
}: PanelHistorySectionProps) {
  return (
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
              const entryUser = allUsers?.find((u) => u.id === entry.userId);
              const userName = entryUser
                ? `${entryUser.firstName || ""} ${entryUser.lastName || ""}`.trim() || entryUser.username
                : "Unknown";
              return (
                <TimeLogEntryRow
                  key={entry.id}
                  entry={entry}
                  userName={userName}
                  canModify={isAdmin}
                  isEditing={editingTimeEntryId === entry.id}
                  hours={editTimeHours}
                  minutes={editTimeMinutes}
                  onHoursChange={setEditTimeHours}
                  onMinutesChange={setEditTimeMinutes}
                  onStartEdit={() => startEditTimeEntry(entry)}
                  onCancelEdit={cancelEditTimeEntry}
                  onSave={() => saveEditTimeEntry(entry.id)}
                  onDelete={() => setDeleteTimeEntryId(entry.id)}
                  isSaving={isSaving && editingTimeEntryId === entry.id}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
