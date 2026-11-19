import { useLayoutEffect, useRef, useState, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const MIN_HEIGHT = 72;
const MAX_HEIGHT = 256;

function noteBoxHeight(full: number): number {
  return Math.min(Math.max(full, MIN_HEIGHT), Math.min(MAX_HEIGHT, Math.round(window.innerHeight * 0.4)));
}

export function GrowingNoteField({
  className,
  style,
  value,
  onChange,
  onScroll,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [atEnd, setAtEnd] = useState(true);

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const full = el.scrollHeight;
    const height = noteBoxHeight(full);
    el.style.height = `${height}px`;
    const canScroll = full > height + 2;
    setOverflowing(canScroll);
    setAtEnd(!canScroll || el.scrollTop + el.clientHeight >= full - 2);
  };

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value]);

  return (
    <div>
      <textarea
        {...props}
        ref={ref}
        value={value}
        rows={3}
        onChange={(event) => {
          onChange?.(event);
        }}
        onScroll={(event) => {
          const el = event.currentTarget;
          setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
          onScroll?.(event);
        }}
        className={cn("w-full resize-none overflow-y-auto overscroll-contain", className)}
        style={{ ...style, touchAction: "pan-y" }}
      />
      {overflowing && !atEnd && (
        <p className="text-xs text-muted-foreground mt-1" data-testid="note-overflow-hint">
          Scroll to read the rest of this note
        </p>
      )}
    </div>
  );
}
