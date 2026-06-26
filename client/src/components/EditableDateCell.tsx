import { useState } from "react";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  dateInputValueToTaskTimestamp,
  getTaskDateInputValue,
  toCalendarDate,
} from "@/lib/taskCalendarDates";

const compactCalendarClassNames = {
  months: "flex flex-col",
  month: "space-y-2",
  caption: "flex justify-center pt-1 relative items-center mb-1",
  caption_label: "text-xs font-medium",
  nav: "space-x-1 flex items-center",
  nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
  nav_button_previous: "absolute left-0",
  nav_button_next: "absolute right-0",
  table: "w-full border-collapse",
  head_row: "flex",
  head_cell: "text-muted-foreground rounded-md w-7 font-medium text-xs",
  row: "flex w-full mt-1",
  cell: "h-7 w-7 text-center text-xs p-0 relative",
  day: "h-7 w-7 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground text-xs",
  day_range_end: "day-range-end",
  day_selected:
    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
  day_today: "bg-accent text-accent-foreground",
  day_outside: "text-muted-foreground/40",
  day_disabled: "text-muted-foreground/30",
  day_hidden: "invisible",
} as const;

export function EditableDateCell({
  value,
  taskId,
  field,
  onSave,
}: {
  value: string | Date | null;
  taskId: string;
  field: string;
  onSave: (taskId: string, field: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dateStr = getTaskDateInputValue(value);
  const selectedDate = dateStr ? toCalendarDate(dateStr) ?? undefined : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const key = format(date, "yyyy-MM-dd");
    if (key !== dateStr) {
      onSave(taskId, field, dateInputValueToTaskTimestamp(key));
    }
    setOpen(false);
  };

  const displayLabel = dateStr
    ? new Date(`${dateStr}T12:00:00`).toLocaleDateString()
    : "-";

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group/editable cursor-pointer hover:underline decoration-dashed underline-offset-2 text-sm inline-flex items-center gap-1.5 text-left"
          data-no-row-open
          data-testid={`text-${field}-${taskId}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {displayLabel}
          <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover/editable:text-muted-foreground/60 transition-colors shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
          className="p-2"
          classNames={compactCalendarClassNames}
        />
      </PopoverContent>
    </Popover>
  );
}
