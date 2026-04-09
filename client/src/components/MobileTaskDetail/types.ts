import type { MobileTaskDetailHookReturn } from "./useMobileTaskDetail";

export type MobileTaskDetailProps = MobileTaskDetailHookReturn;

export const statusDotColors: Record<string, string> = {
  not_started: "#9CA3AF",
  needs_estimate: "#E6A817",
  waiting_approval: "#7C3AED",
  in_progress: "#4338CA",
  on_hold: "#E6A817",
  completed: "#15803D",
  cancelled: "#D94F4F",
};

export const statusPillStyles: Record<string, { bg: string; text: string }> = {
  not_started: { bg: "#4A4A4A", text: "#FFFFFF" },
  needs_estimate: { bg: "#FEF3C7", text: "#92400E" },
  waiting_approval: { bg: "#EDE9FE", text: "#7C3AED" },
  in_progress: { bg: "#EEF2FF", text: "#4338CA" },
  on_hold: { bg: "#FEF3C7", text: "#92400E" },
  completed: { bg: "#F0FDF4", text: "#15803D" },
  cancelled: { bg: "#FEF2F2", text: "#D94F4F" },
};

export const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  needs_estimate: "Needs Estimate",
  waiting_approval: "Waiting Approval",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const priorityColors: Record<string, string> = {
  high: "#D94F4F",
  medium: "#E6A817",
  low: "#9CA3AF",
};
