import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PanelSectionProps {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children?: ReactNode;
  testId?: string;
  className?: string;
}

export function PanelSection({
  title,
  icon,
  badge,
  expanded,
  onToggle,
  children,
  testId,
  className,
}: PanelSectionProps) {
  return (
    <div className={cn("border-b border-border", className)}>
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={onToggle}
        aria-expanded={expanded}
        data-testid={testId}
      >
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
        <span className="text-sm font-medium text-foreground">{title}</span>
        {badge && <span className="ml-1">{badge}</span>}
        <span className="ml-auto flex items-center gap-1.5">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden />
          )}
        </span>
      </button>
      {expanded && children != null && <div className="px-4 pb-3 pt-0">{children}</div>}
    </div>
  );
}
