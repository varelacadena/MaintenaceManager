import type { ReactNode } from "react";
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
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={`${className} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
      data-testid={`${testIdPrefix}-task-card-${taskId}`}
      onClick={onOpen}
      onKeyDown={(e) => handleKeyboardActivate(e, onOpen)}
    >
      {children}
    </div>
  );
}
