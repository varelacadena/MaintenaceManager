import { ChevronDown, ChevronRight } from "lucide-react";
import { statusDotColors } from "@/utils/taskUtils";
import { buildStatusGroupAriaLabel } from "./workA11y";

interface WorkStatusGroupHeaderProps {
  statusKey: string;
  label: string;
  count: number;
  isCollapsed: boolean;
  isEmpty: boolean;
  onToggle: () => void;
}

export function WorkStatusGroupHeader({
  statusKey,
  label,
  count,
  isCollapsed,
  isEmpty,
  onToggle,
}: WorkStatusGroupHeaderProps) {
  const isExpanded = !isCollapsed;
  const panelId = `work-group-panel-${statusKey}`;

  return (
    <button
      type="button"
      id={`work-group-header-${statusKey}`}
      aria-expanded={isExpanded}
      aria-controls={panelId}
      disabled={isEmpty}
      onClick={onToggle}
      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left cursor-pointer select-none disabled:cursor-default ${
        isEmpty ? "opacity-40" : ""
      }`}
      data-testid={`toggle-group-${statusKey}`}
      aria-label={buildStatusGroupAriaLabel(label, count, isExpanded)}
    >
      {isCollapsed ? (
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
      )}
      <span
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotColors[statusKey]}`}
        aria-hidden
      />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground tabular-nums" aria-hidden>
        {count}
      </span>
    </button>
  );
}

export function workStatusGroupPanelId(statusKey: string): string {
  return `work-group-panel-${statusKey}`;
}
