import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { dateInputValueToTaskTimestamp, getTaskDateInputValue } from "@/lib/taskCalendarDates";

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
  const [isEditing, setIsEditing] = useState(false);
  const dateStr = getTaskDateInputValue(value);
  const [editValue, setEditValue] = useState(dateStr);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.showPicker?.();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(dateStr);
  }, [dateStr]);

  const handleSave = () => {
    if (editValue && editValue !== dateStr) {
      onSave(taskId, field, dateInputValueToTaskTimestamp(editValue));
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="date"
        value={editValue}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setEditValue(dateStr);
            setIsEditing(false);
          }
        }}
        className="text-sm"
        data-testid={`input-edit-${field}-${taskId}`}
      />
    );
  }

  return (
    <span
      className="group/editable cursor-pointer hover:underline decoration-dashed underline-offset-2 text-sm inline-flex items-center gap-1.5"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      data-testid={`text-${field}-${taskId}`}
    >
      {dateStr ? new Date(`${dateStr}T12:00:00`).toLocaleDateString() : "-"}
      <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover/editable:text-muted-foreground/60 transition-colors shrink-0" />
    </span>
  );
}
