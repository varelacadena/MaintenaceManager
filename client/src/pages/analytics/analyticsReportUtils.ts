import type { FilterState } from "@/components/analytics/AnalyticsFilters";

export function hasActiveAnalyticsFilters(filters: FilterState): boolean {
  return Boolean(
    filters.startDate ||
      filters.endDate ||
      filters.propertyId ||
      filters.spaceId ||
      filters.areaId ||
      filters.technicianId ||
      filters.status ||
      filters.urgency,
  );
}

export function formatTaskTypeLabel(taskType: string): string {
  return taskType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
