export const statusColors: Record<string, string> = {
  planning: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export const serviceRequestStatusLabels: Record<string, string> = {
  pending: "Pending Review",
  under_review: "Under Review",
  converted_to_task: "Approved",
  rejected: "Rejected",
};

export const taskStatusLabels: Record<string, string> = {
  not_started: "Not Started",
  needs_estimate: "Needs Estimate",
  waiting_approval: "Waiting Approval",
  ready: "Ready to Start",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
};

export const taskStatusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  needs_estimate: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  waiting_approval: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
};
