import type { AnalyticsFilters } from "./analyticsService";

export const REPORT_TITLES: Record<string, string> = {
  overview: "Executive Overview",
  "work-orders-complete": "Work Orders",
  "technicians-detailed": "Team Performance",
  assets: "Asset Health",
  "facilities-detailed": "Facilities",
  "fleet-detailed": "Fleet",
  "inventory-detailed": "Inventory",
  "service-requests-detailed": "Service Requests",
  alerts: "Alerts & Exceptions",
  projects: "Projects",
};

export function formatDateRange(filters: AnalyticsFilters): string {
  if (filters.startDate && filters.endDate) {
    return `${filters.startDate} – ${filters.endDate}`;
  }
  if (filters.startDate) return `From ${filters.startDate}`;
  if (filters.endDate) return `Until ${filters.endDate}`;
  return "All time (no date filter)";
}

export function pct(count: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function truncate(text: string, max = 500): string {
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

export function formatChange(change: number | null): string {
  if (change === null) return "—";
  return `${change > 0 ? "+" : ""}${change}%`;
}
