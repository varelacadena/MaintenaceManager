import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { durationFromHoursAndMinutes } from "@/lib/timeEntryUtils";
import { ManualTimeLogFields } from "@/components/ManualTimeLogFields";
import type { TimeEntry } from "@shared/schema";

interface TimeLogEntryRowProps {
  entry: TimeEntry;
  userName: string;
  canModify: boolean;
  isEditing: boolean;
  hours: string;
  minutes: string;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  isSaving?: boolean;
}

export function TimeLogEntryRow({
  entry,
  userName,
  canModify,
  isEditing,
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  isSaving = false,
}: TimeLogEntryRowProps) {
  const isRunning = Boolean(entry.startTime && !entry.endTime);
  const duration = entry.durationMinutes
    ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m`
    : isRunning
      ? "Running"
      : "—";
  const saveDisabled = durationFromHoursAndMinutes(hours, minutes) <= 0 || isSaving;

  if (isEditing) {
    return (
      <div
        className="rounded-lg border border-border bg-muted/20 p-3 space-y-3"
        data-testid={`panel-history-${entry.id}`}
      >
        <div>
          <p className="text-sm font-medium truncate">{userName}</p>
          <p className="text-xs text-muted-foreground">
            {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : "No start time"}
          </p>
        </div>
        <ManualTimeLogFields
          hours={hours}
          minutes={minutes}
          date=""
          onHoursChange={onHoursChange}
          onMinutesChange={onMinutesChange}
          onDateChange={() => {}}
          idPrefix={`edit-time-${entry.id}`}
          showDate={false}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onSave}
            disabled={saveDisabled}
            data-testid={`button-save-time-${entry.id}`}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancelEdit}
            disabled={isSaving}
            data-testid={`button-cancel-time-${entry.id}`}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between gap-3"
      data-testid={`panel-history-${entry.id}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{userName}</p>
        <p className="text-xs text-muted-foreground">
          {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : "No start time"}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Badge variant={isRunning ? "default" : "outline"} className="text-xs font-medium">
          {duration}
        </Badge>
        {canModify && !isRunning && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={onStartEdit}
              data-testid={`button-edit-time-${entry.id}`}
            >
              <Pencil className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              Edit
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onDelete}
              data-testid={`button-delete-time-${entry.id}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
