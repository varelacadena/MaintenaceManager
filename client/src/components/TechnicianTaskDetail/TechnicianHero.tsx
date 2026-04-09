import {
  Clock,
  MapPin,
  ArrowLeft,
  Globe,
} from "lucide-react";
import { format } from "date-fns";
import { getGradient, getStatusLabel, formatElapsed } from "./types";
import type { Task, Property } from "@shared/schema";

interface TechnicianHeroProps {
  task: Task;
  isPaused: boolean;
  isSubTask: boolean;
  locationText: string;
  locationExpanded: boolean;
  setLocationExpanded: (v: boolean) => void;
  hasMoreBuildings: boolean;
  multiProperties: Property[];
  safeNavigate: (path: string) => void;
  taskStarted: boolean;
  elapsedSeconds: number;
}

export function TechnicianHero({
  task,
  isPaused,
  isSubTask,
  locationText,
  locationExpanded,
  setLocationExpanded,
  hasMoreBuildings,
  multiProperties,
  safeNavigate,
  taskStarted,
  elapsedSeconds,
}: TechnicianHeroProps) {
  return (
    <div
      className="px-4 pt-4 pb-5 shrink-0"
      style={{
        background: getGradient(task.status, isPaused),
        transition: "background 0.4s",
      }}
      data-testid="tech-hero"
    >
      <div className="flex items-center justify-between flex-wrap gap-1 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="flex items-center justify-center shrink-0 rounded-full"
            style={{
              width: 28,
              height: 28,
              backgroundColor: "rgba(255,255,255,0.18)",
            }}
            onClick={() => {
              if (isSubTask && task.parentTaskId) {
                safeNavigate(`/tasks/${task.parentTaskId}`);
              } else {
                safeNavigate("/work");
              }
            }}
            data-testid="button-back"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-white" />
          </button>
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
            data-testid="badge-status"
          >
            {getStatusLabel(task.status, isPaused)}
          </span>
          {task.urgency === "high" && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-500 border border-red-500/35 dark:bg-red-950/50 dark:text-red-400 dark:border-red-400/35"
              data-testid="badge-priority"
            >
              High
            </span>
          )}
          {task.urgency === "medium" && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-600/35 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-400/35"
              data-testid="badge-priority"
            >
              Medium
            </span>
          )}
        </div>
        {taskStarted && (
          <span
            className="text-sm font-medium"
            style={{
              color: "rgba(255,255,255,0.85)",
              fontVariantNumeric: "tabular-nums",
            }}
            data-testid="text-elapsed-timer"
          >
            {formatElapsed(elapsedSeconds)}
          </span>
        )}
      </div>
      <h1
        className="text-lg font-bold text-white leading-snug mb-1.5"
        data-testid="text-task-name"
      >
        {task.name}
      </h1>
      {locationText && (
        <div
          className={`flex items-center gap-1.5 ${multiProperties.length > 2 ? "cursor-pointer" : ""}`}
          onClick={() => multiProperties.length > 2 && setLocationExpanded(!locationExpanded)}
          data-testid="tech-location-display"
        >
          {task.isCampusWide ? (
            <Globe className="w-3.5 h-3.5 shrink-0 text-white/70" />
          ) : (
            <MapPin className="w-3.5 h-3.5 shrink-0 text-white/70" />
          )}
          <span className="text-sm text-white/70">
            {locationText}
          </span>
          {hasMoreBuildings && (
            <span className="text-sm text-white/90 underline whitespace-nowrap" data-testid="button-expand-buildings">
              +{multiProperties.length - 2} more
            </span>
          )}
          {locationExpanded && multiProperties.length > 2 && (
            <span className="text-sm text-white/90 underline whitespace-nowrap" data-testid="button-collapse-buildings">
              (less)
            </span>
          )}
        </div>
      )}
      {task.estimatedCompletionDate && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Clock className="w-3.5 h-3.5 shrink-0 text-white/70" />
          <span className="text-sm text-white/70">
            Due {format(new Date(task.estimatedCompletionDate), "MMM d, yyyy")}
          </span>
        </div>
      )}
    </div>
  );
}
