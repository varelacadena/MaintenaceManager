
export const panelStatusDotStyle: Record<string, string> = {
  not_started: "#9CA3AF",
  needs_estimate: "#E6A817",
  waiting_approval: "#7C3AED",
  in_progress: "#4338CA",
  on_hold: "#E6A817",
  completed: "#15803D",
  cancelled: "#D94F4F",
};

export const panelStatusPillStyle: Record<string, { bg: string; text: string }> = {
  not_started: { bg: "#4A4A4A", text: "#FFFFFF" },
  needs_estimate: { bg: "#FEF3C7", text: "#92400E" },
  waiting_approval: { bg: "#EDE9FE", text: "#7C3AED" },
  in_progress: { bg: "#EEF2FF", text: "#4338CA" },
  on_hold: { bg: "#FEF3C7", text: "#92400E" },
  completed: { bg: "#F0FDF4", text: "#15803D" },
  cancelled: { bg: "#FEF2F2", text: "#D94F4F" },
};

export const panelStatusLabels: Record<string, string> = {
  not_started: "NOT STARTED",
  needs_estimate: "NEEDS ESTIMATE",
  waiting_approval: "ESTIMATE REVIEW",
  in_progress: "IN PROGRESS",
  on_hold: "ON HOLD",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

export const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: "#9CA3AF", label: "Low" },
  medium: { color: "#E6A817", label: "Medium" },
  high: { color: "#D94F4F", label: "High" },
};

export const taskTypeLabels: Record<string, string> = {
  one_time: "One Time",
  recurring: "Recurring",
  preventive: "Preventive",
};

export const urgencyBadgeStyles: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  high: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

export const statusBadgeStyles: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  needs_estimate: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  waiting_approval: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  ready: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

export const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  needs_estimate: "Needs Estimate",
  waiting_approval: "Waiting Approval",
  ready: "Ready",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const urgencyConfig: Record<string, { color: string; label: string }> = {
  low: { color: "text-muted-foreground", label: "Low" },
  medium: { color: "text-amber-500 dark:text-amber-400", label: "Medium" },
  high: { color: "text-red-500 dark:text-red-400", label: "High" },
};

export const taskStatusBadgeColors: Record<string, string> = {
  not_started: "bg-gray-500 dark:bg-gray-600 text-white border-transparent",
  needs_estimate: "bg-amber-500 dark:bg-amber-600 text-white border-transparent",
  waiting_approval: "bg-purple-500 dark:bg-purple-600 text-white border-transparent",
  ready: "bg-cyan-500 dark:bg-cyan-600 text-white border-transparent",
  in_progress: "bg-rose-500 dark:bg-rose-600 text-white border-transparent",
  on_hold: "bg-yellow-500 dark:bg-yellow-600 text-white border-transparent",
  completed: "bg-emerald-500 dark:bg-emerald-600 text-white border-transparent",
  cancelled: "bg-red-500 dark:bg-red-600 text-white border-transparent",
};

export const statusDotColors: Record<string, string> = {
  not_started: "bg-gray-400 dark:bg-gray-500",
  needs_estimate: "bg-amber-500 dark:bg-amber-400",
  waiting_approval: "bg-purple-500 dark:bg-purple-400",
  ready: "bg-cyan-500 dark:bg-cyan-400",
  in_progress: "bg-rose-500 dark:bg-rose-400",
  on_hold: "bg-yellow-500 dark:bg-yellow-400",
  completed: "bg-emerald-500 dark:bg-emerald-400",
  cancelled: "bg-red-400 dark:bg-red-500",
};

export const taskStatusConfig = [
  { key: "not_started", label: "Not Started" },
  { key: "needs_estimate", label: "Needs Estimate" },
  { key: "waiting_approval", label: "Estimate Review" },
  { key: "ready", label: "Ready" },
  { key: "in_progress", label: "In Progress" },
  { key: "on_hold", label: "On Hold" },
  { key: "completed", label: "Completed" },
];

export const drawerUrgencyConfig: Record<string, { badge: string; label: string }> = {
  high: {
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    label: "High Priority",
  },
  medium: {
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    label: "Medium Priority",
  },
  low: {
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    label: "Low Priority",
  },
};

export const drawerStatusConfig: Record<string, { label: string; color: string }> = {
  not_started: {
    label: "Not Started",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  needs_estimate: {
    label: "Needs Estimate",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  },
  waiting_approval: {
    label: "Waiting Approval",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  ready: {
    label: "Ready",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
  on_hold: {
    label: "On Hold",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
};

export const avatarColors = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
];

export const avatarHexColors = [
  "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
  "#F43F5E", "#06B6D4", "#6366F1", "#14B8A6",
];

export function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function getAvatarHexColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarHexColors[Math.abs(hash) % avatarHexColors.length];
}

export function getInitials(user: { firstName?: string | null; lastName?: string | null; username: string }): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  return (user.username?.[0] || "?").toUpperCase();
}

export function getUserDisplayName(user: { firstName?: string | null; lastName?: string | null; username: string }): string {
  if (user.firstName) {
    return `${user.firstName} ${user.lastName || ""}`.trim();
  }
  return user.username;
}

export function formatTaskDate(date: string | Date | null | undefined, fallback: string = ""): string {
  if (!date) return fallback;
  let d: Date;
  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, day] = date.split("-").map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }
  if (isNaN(d.getTime())) return fallback;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
