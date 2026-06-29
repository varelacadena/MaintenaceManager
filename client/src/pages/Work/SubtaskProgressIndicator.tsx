import { memo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type SubtaskProgressIndicatorProps = {
  completed: number;
  total: number;
  taskId: string;
  isExpanded: boolean;
  onToggle: () => void;
};

export const SubtaskProgressIndicator = memo(function SubtaskProgressIndicator({
  completed,
  total,
  taskId,
  isExpanded,
  onToggle,
}: SubtaskProgressIndicatorProps) {
  const allDone = completed === total && total > 0;

  return (
    <button
      type="button"
      data-no-row-open
      data-testid={`badge-subtask-count-${taskId}`}
      aria-expanded={isExpanded}
      aria-label={
        isExpanded
          ? `Collapse ${total} subtasks, ${completed} complete`
          : `Expand ${total} subtasks, ${completed} complete`
      }
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors shrink-0 ${
        allDone
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
          : "border-border/60 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      {isExpanded ? (
        <ChevronDown className="w-3 h-3 shrink-0" aria-hidden />
      ) : (
        <ChevronRight className="w-3 h-3 shrink-0" aria-hidden />
      )}
      <span className="whitespace-nowrap">
        {total} subtask{total !== 1 ? "s" : ""}
      </span>
      <span className="opacity-40" aria-hidden>
        ·
      </span>
      <span className={`whitespace-nowrap tabular-nums ${allDone ? "" : "text-muted-foreground"}`}>
        {completed} done
      </span>
    </button>
  );
});
