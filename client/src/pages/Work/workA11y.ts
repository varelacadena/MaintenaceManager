import type { KeyboardEvent } from "react";

/** Activate on Enter or Space (buttons, cards, table rows). */
export function handleKeyboardActivate(
  event: KeyboardEvent,
  onActivate: () => void
): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
  }
}

export function buildTaskRowAriaLabel(task: { name: string; status: string }): string {
  const statusLabel = task.status.replace(/_/g, " ");
  return `${task.name}, status ${statusLabel}. Press Enter to open details.`;
}

export function buildStatusGroupAriaLabel(
  label: string,
  count: number,
  isExpanded: boolean
): string {
  return `${label}, ${count} item${count === 1 ? "" : "s"}, ${isExpanded ? "expanded" : "collapsed"}`;
}
