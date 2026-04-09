import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { useLocation } from "wouter";

export function EditableTextCell({
  value,
  taskId,
  field,
  onSave,
  linkTo,
}: {
  value: string;
  taskId: string;
  field: string;
  onSave: (taskId: string, field: string, value: string) => void;
  linkTo?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useLocation()[1];
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue.trim() && editValue !== value) {
      onSave(taskId, field, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          onBlur={handleSave}
          className="text-sm"
          data-testid={`input-edit-${field}-${taskId}`}
        />
      </div>
    );
  }

  return (
    <span
      className={`group/editable cursor-pointer inline-flex items-center gap-1.5 ${linkTo ? "font-medium hover:underline underline-offset-2" : "hover:underline decoration-dashed underline-offset-2"}`}
      onClick={(e) => {
        e.stopPropagation();
        if (linkTo) {
          if (clickTimerRef.current) return;
          clickTimerRef.current = setTimeout(() => {
            clickTimerRef.current = null;
            navigate(linkTo);
          }, 250);
        } else {
          setIsEditing(true);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        setIsEditing(true);
      }}
      data-testid={`text-${field}-${taskId}`}
    >
      {value || "-"}
      {!linkTo && <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover/editable:text-muted-foreground/60 transition-colors shrink-0" />}
    </span>
  );
}
