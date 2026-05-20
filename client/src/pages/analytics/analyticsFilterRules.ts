import type { FilterState } from "@/components/analytics/AnalyticsFilters";
import type { ReportTab } from "./AnalyticsFilterProvider";

export const WORK_ORDER_STATUS_VALUES = [
  "not_started",
  "needs_estimate",
  "waiting_approval",
  "ready",
  "in_progress",
  "on_hold",
  "completed",
] as const;

export const REQUEST_STATUS_VALUES = [
  "pending",
  "under_review",
  "converted_to_task",
  "rejected",
] as const;

export const PROJECT_STATUS_VALUES = [
  "planning",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export const TASK_URGENCY_VALUES = ["high", "medium", "low"] as const;

export const PROJECT_PRIORITY_VALUES = ["critical", "high", "medium", "low"] as const;

type TabFilterRules = {
  allowedStatuses: readonly string[] | null;
  allowedUrgencies: readonly string[] | null;
  allowTechnician: boolean;
};

export const TAB_FILTER_RULES: Record<ReportTab, TabFilterRules> = {
  "key-metrics": {
    allowedStatuses: WORK_ORDER_STATUS_VALUES,
    allowedUrgencies: TASK_URGENCY_VALUES,
    allowTechnician: false,
  },
  "work-orders": {
    allowedStatuses: WORK_ORDER_STATUS_VALUES,
    allowedUrgencies: TASK_URGENCY_VALUES,
    allowTechnician: true,
  },
  technicians: {
    allowedStatuses: WORK_ORDER_STATUS_VALUES,
    allowedUrgencies: TASK_URGENCY_VALUES,
    allowTechnician: false,
  },
  assets: {
    allowedStatuses: WORK_ORDER_STATUS_VALUES,
    allowedUrgencies: TASK_URGENCY_VALUES,
    allowTechnician: false,
  },
  facilities: {
    allowedStatuses: WORK_ORDER_STATUS_VALUES,
    allowedUrgencies: TASK_URGENCY_VALUES,
    allowTechnician: false,
  },
  fleet: {
    allowedStatuses: null,
    allowedUrgencies: null,
    allowTechnician: false,
  },
  inventory: {
    allowedStatuses: null,
    allowedUrgencies: null,
    allowTechnician: false,
  },
  requests: {
    allowedStatuses: REQUEST_STATUS_VALUES,
    allowedUrgencies: TASK_URGENCY_VALUES,
    allowTechnician: false,
  },
  alerts: {
    allowedStatuses: WORK_ORDER_STATUS_VALUES,
    allowedUrgencies: TASK_URGENCY_VALUES,
    allowTechnician: false,
  },
  projects: {
    allowedStatuses: PROJECT_STATUS_VALUES,
    allowedUrgencies: PROJECT_PRIORITY_VALUES,
    allowTechnician: false,
  },
};

function isAllowed(value: string, allowed: readonly string[] | null): boolean {
  if (allowed === null) return false;
  return allowed.includes(value);
}

/** Drop status, priority, or technician values that do not apply to the active tab. */
export function sanitizeFiltersForTab(tab: ReportTab, filters: FilterState): FilterState {
  const rules = TAB_FILTER_RULES[tab];
  return {
    ...filters,
    status:
      filters.status && isAllowed(filters.status, rules.allowedStatuses) ? filters.status : "",
    urgency:
      filters.urgency && isAllowed(filters.urgency, rules.allowedUrgencies) ? filters.urgency : "",
    technicianId: rules.allowTechnician ? filters.technicianId : "",
  };
}

export function filtersDifferForTab(tab: ReportTab, filters: FilterState): boolean {
  const sanitized = sanitizeFiltersForTab(tab, filters);
  return (
    sanitized.status !== filters.status ||
    sanitized.urgency !== filters.urgency ||
    sanitized.technicianId !== filters.technicianId
  );
}
