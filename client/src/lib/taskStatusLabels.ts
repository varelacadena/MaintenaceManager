export const taskStatusLabels: Record<string, string> = {
  not_started: "Not Started",
  needs_estimate: "Needs Estimate",
  waiting_approval: "Waiting Approval",
  ready: "Ready",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function taskStatusLabel(status: string | null | undefined): string {
  if (!status) return taskStatusLabels.not_started;
  return taskStatusLabels[status] ?? status.replace(/_/g, " ");
}
