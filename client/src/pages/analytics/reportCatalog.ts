import type { ReportTab } from "./useAnalyticsFilters";

export const EXPORT_TYPES: Record<ReportTab, string> = {
  "key-metrics": "overview",
  "work-orders": "work-orders-complete",
  technicians: "technicians-detailed",
  assets: "assets",
  facilities: "facilities-detailed",
  fleet: "fleet-detailed",
  inventory: "inventory-detailed",
  requests: "service-requests-detailed",
  alerts: "alerts",
  projects: "projects",
};

export const SHEETS_BY_TAB: Record<ReportTab, string[]> = {
  "key-metrics": ["Report Info", "KPIs", "Work Orders Snapshot", "Requests Snapshot", "Fleet Snapshot"],
  "work-orders": [
    "Report Info",
    "Summary",
    "By Status",
    "By Priority",
    "By Task Type",
    "By Category",
    "By Source",
    "By Property",
    "By Space",
    "By Area",
    "Monthly Trend",
    "All Work Orders",
  ],
  technicians: ["Report Info", "Summary", "Team Roster", "All Task Details"],
  assets: ["Report Info", "Summary", "All Equipment", "Service History"],
  facilities: ["Report Info", "By Building", "By Space", "All Work Orders"],
  fleet: [
    "Report Info",
    "Summary",
    "By Category",
    "By Status",
    "Reservations by Month",
    "Maintenance by Vehicle",
    "All Vehicles",
    "All Reservations",
  ],
  inventory: ["Report Info", "Summary", "By Category", "Low Stock", "Top Used"],
  requests: [
    "Report Info",
    "Summary",
    "By Status",
    "By Priority",
    "By Category",
    "Pipeline Funnel",
    "By Property",
    "By Area",
    "Top Requesters",
    "Monthly Trend",
    "All Requests",
  ],
  alerts: ["Report Info", "By Severity", "By Type", "All Alerts"],
  projects: ["Report Info", "Summary", "By Status", "By Priority", "Budget by Status", "All Projects"],
};

export const TASK_DATE_TABS: ReportTab[] = [
  "key-metrics",
  "work-orders",
  "technicians",
  "assets",
  "facilities",
  "alerts",
];

export const PROPERTY_TABS: ReportTab[] = [
  "key-metrics",
  "work-orders",
  "technicians",
  "assets",
  "facilities",
  "requests",
  "alerts",
  "projects",
];

export const DATE_NOTE: Partial<Record<ReportTab, string>> = {
  requests: "Requests use the date they were submitted.",
  projects: "Projects use the date they were created.",
  fleet: "Fleet counts reservations that overlap the period. Vehicles are not assigned to a property.",
  inventory: "Inventory counts parts logged in the period. Stock is not assigned to a property.",
};
