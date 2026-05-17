/** Shared labels and badge styles for service requests (ops + dashboard). */
export const serviceRequestStatusLabels: Record<string, string> = {
  pending: "Pending Review",
  under_review: "Under Review",
  converted_to_task: "Approved",
  rejected: "Rejected",
};

export const serviceRequestUrgencyLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const serviceRequestStatusBadgeColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  under_review: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  converted_to_task: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

export const serviceRequestUrgencyBadgeColors: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  high: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

export function getServiceRequestStatusLabel(status: string): string {
  return serviceRequestStatusLabels[status] ?? status.replace(/_/g, " ");
}

export function getServiceRequestUrgencyLabel(urgency: string): string {
  return serviceRequestUrgencyLabels[urgency] ?? urgency;
}

/** Stable order for filters and charts */
export const serviceRequestStatusOrder = [
  "pending",
  "under_review",
  "converted_to_task",
  "rejected",
] as const;

export const serviceRequestStatusFilterOptions = serviceRequestStatusOrder.map((value) => ({
  value,
  label: serviceRequestStatusLabels[value],
}));

export const serviceRequestUrgencyFilterOptions = (
  Object.entries(serviceRequestUrgencyLabels) as [keyof typeof serviceRequestUrgencyLabels, string][]
).map(([value, label]) => ({ value, label }));
