import type { ReactNode } from "react";
import { useScrollAwareClick } from "@/hooks/useScrollAwareClick";
import { handleKeyboardActivate } from "./workA11y";

interface FieldWorkTaskCardProps {
  taskId: string;
  taskName: string;
  ariaLabel: string;
  onOpen: () => void;
  testIdPrefix: "student" | "tech";
  className: string;
  children: ReactNode;
}

export function FieldWorkTaskCard({
  taskId,
  ariaLabel,
  onOpen,
  testIdPrefix,
  className,
  children,
}: FieldWorkTaskCardProps) {
  const { onPointerDown, handleClick } = useScrollAwareClick(onOpen);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={`${className} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation`}
      data-testid={`${testIdPrefix}-task-card-${taskId}`}
      onPointerDown={onPointerDown}
      onClick={(e) => handleClick(e)}
      onKeyDown={(e) => handleKeyboardActivate(e, onOpen)}
    >
      {children}
    </div>
  );
}
