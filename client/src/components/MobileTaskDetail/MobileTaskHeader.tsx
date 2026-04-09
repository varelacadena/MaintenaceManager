import { ArrowLeft, Flag, Calendar } from "lucide-react";
import type { Task } from "@shared/schema";
import { statusDotColors, statusPillStyles, statusLabels, priorityColors } from "./types";

interface MobileTaskHeaderProps {
  task: Task;
  navigate: (path: string) => void;
}

export function MobileTaskHeader({ task, navigate }: MobileTaskHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #EEEEEE" }}>
      <button
        onClick={() => navigate("/work")}
        className="p-1"
        data-testid="button-back"
        aria-label="Back to work"
      >
        <ArrowLeft className="w-5 h-5" style={{ color: "#1A1A1A" }} />
      </button>
      <span className="text-sm font-medium truncate" style={{ color: "#1A1A1A" }}>Task Details</span>
    </div>
  );
}

export function MobileStatusBar({ task }: { task: Task }) {
  const statusStyle = statusPillStyles[task.status] || statusPillStyles.not_started;

  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center justify-between gap-2 flex-wrap"
      style={{ backgroundColor: "#F8F8F8", border: "1px solid #EEEEEE" }}
      data-testid="mobile-status-bar"
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: statusDotColors[task.status] || "#9CA3AF" }}
        />
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
        >
          {statusLabels[task.status] || task.status}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {task.urgency && (
          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: priorityColors[task.urgency] || "#9CA3AF" }}>
            <Flag className="w-3 h-3" />
            {task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1)}
          </span>
        )}
        {task.estimatedCompletionDate && (
          <span className="flex items-center gap-1 text-xs" style={{ color: "#6B7280" }}>
            <Calendar className="w-3 h-3" />
            {new Date(task.estimatedCompletionDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
