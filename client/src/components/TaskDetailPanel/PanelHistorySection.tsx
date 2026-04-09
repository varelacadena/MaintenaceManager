import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  History,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import type { User, TimeEntry } from "@shared/schema";

interface PanelHistorySectionProps {
  isHistoryOpen: boolean;
  setIsHistoryOpen: (v: boolean) => void;
  timeEntries: TimeEntry[];
  allUsers?: User[];
  setEditingTimeEntryId: (v: string | null) => void;
  setEditTimeDuration: (v: string) => void;
  setDeleteTimeEntryId: (v: string | null) => void;
  isAdmin: boolean;
}

export function PanelHistorySection({
  isHistoryOpen,
  setIsHistoryOpen,
  timeEntries,
  allUsers,
  setEditingTimeEntryId,
  setEditTimeDuration,
  setDeleteTimeEntryId,
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
  );
}
