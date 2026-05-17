import type { AnalyticsFilters } from "./analyticsService";
import { analyticsService } from "./analyticsService";
import { db } from "./db";
import { properties, areas, spaces, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  type BarSeries,
  type ChartSlice,
  type GroupedBarItem,
  CHART_PALETTE,
  drawBarChart,
  drawGroupedBarChart,
  drawPieChart,
  SEVERITY_RGB,
  URGENCY_RGB,
  WO_STATUS_RGB,
} from "./analyticsPdfCharts";
import {
  type AnalysisSection,
  alertsAnalysis,
  projectsAnalysis,
  assetsAnalysis,
  facilitiesAnalysis,
  fleetAnalysis,
  overviewAnalysis,
  serviceRequestsAnalysis,
  techniciansAnalysis,
  workOrdersAnalysis,
} from "./analyticsPdfNarratives";

export interface ExportSheet {
  name: string;
  rows: (string | number)[][];
}

const REPORT_TITLES: Record<string, string> = {
  overview: "Executive Overview",
  "work-orders-complete": "Work Orders",
  "technicians-detailed": "Team Performance",
  assets: "Asset Health",
  "facilities-detailed": "Facilities",
  "fleet-detailed": "Fleet",
  "service-requests-detailed": "Service Requests",
  alerts: "Alerts & Exceptions",
  projects: "Projects",
};

const FILE_SLUGS: Record<string, string> = {
  overview: "overview",
  "work-orders-complete": "work-orders",
  "technicians-detailed": "team",
  assets: "assets",
  "facilities-detailed": "facilities",
  "fleet-detailed": "fleet",
  "service-requests-detailed": "service-requests",
  alerts: "alerts",
  projects: "projects",
};

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]]/g, "").slice(0, 31);
}

function formatDateRange(filters: AnalyticsFilters): string {
  if (filters.startDate && filters.endDate) {
    return `${filters.startDate} – ${filters.endDate}`;
  }
  if (filters.startDate) return `From ${filters.startDate}`;
  if (filters.endDate) return `Until ${filters.endDate}`;
  return "All time (no date filter)";
}

function pct(count: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function truncate(text: string, max = 500): string {
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

async function buildReportInfoSheet(
  title: string,
  filters: AnalyticsFilters,
  notes: string[],
): Promise<ExportSheet> {
  const metaRows = await resolveFilterMetadata(filters);
  return {
    name: "Report Info",
    rows: [
      ["Maintenance Manager — Analytics Export"],
      [title],
      [],
      ["About this report"],
      ...notes.map((n) => [n]),
      [],
      ...metaRows,
    ],
  };
}

async function resolveFilterMetadata(filters: AnalyticsFilters): Promise<(string | number)[][]> {
  const rows: (string | number)[][] = [
    ["Field", "Value"],
    ["Generated", new Date().toLocaleString()],
    ["Date range", formatDateRange(filters)],
  ];

  if (filters.propertyId) {
    const [p] = await db.select().from(properties).where(eq(properties.id, filters.propertyId));
    rows.push(["Property", p?.name ?? filters.propertyId]);
  }
  if (filters.spaceId) {
    const [s] = await db.select().from(spaces).where(eq(spaces.id, filters.spaceId));
    rows.push(["Space", s?.name ?? filters.spaceId]);
  }
  if (filters.areaId) {
    const [a] = await db.select().from(areas).where(eq(areas.id, filters.areaId));
    rows.push(["Area", a?.name ?? filters.areaId]);
  }
  if (filters.technicianId) {
    const [u] = await db.select().from(users).where(eq(users.id, filters.technicianId));
    const name = u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username : filters.technicianId;
    rows.push(["Technician", name]);
  }
  if (filters.status) rows.push(["Status", statusLabel(filters.status)]);
  if (filters.urgency) rows.push(["Priority", filters.urgency]);
  if (filters.roleType && filters.roleType !== "all") {
    rows.push(["Team role", filters.roleType === "student" ? "Students" : "Technicians"]);
  }

  return rows;
}

export function buildExportFilename(dataType: string, format: "xlsx" | "pdf", filters: AnalyticsFilters): string {
  const slug = FILE_SLUGS[dataType] ?? dataType.replace(/[^a-z0-9]+/gi, "-");
  let datePart = "all-time";
  if (filters.startDate && filters.endDate) {
    datePart = `${filters.startDate}_to_${filters.endDate}`;
  } else if (filters.startDate) {
    datePart = `from_${filters.startDate}`;
  } else if (filters.endDate) {
    datePart = `until_${filters.endDate}`;
  }
  const ext = format === "xlsx" ? "xlsx" : "pdf";
  return `${slug}_${datePart}.${ext}`;
}

export async function buildExportSheets(
  dataType: string,
  filters: AnalyticsFilters,
): Promise<{ sheets: ExportSheet[]; title: string }> {
  const title = REPORT_TITLES[dataType] ?? "Analytics Report";

  switch (dataType) {
    case "overview":
      return { title, sheets: await buildOverviewSheets(filters, title) };
    case "work-orders-complete":
      return { title, sheets: await buildWorkOrdersSheets(filters, title) };
    case "technicians-detailed":
      return { title, sheets: await buildTechniciansSheets(filters, title) };
    case "assets":
      return { title, sheets: await buildAssetsSheets(filters, title) };
    case "facilities-detailed":
      return { title, sheets: await buildFacilitiesSheets(filters, title) };
    case "fleet-detailed":
      return { title, sheets: await buildFleetSheets(filters, title) };
    case "service-requests-detailed":
      return { title, sheets: await buildServiceRequestsSheets(filters, title) };
    case "alerts":
      return { title, sheets: await buildAlertsSheets(filters, title) };
    case "projects":
      return { title, sheets: await buildProjectsSheets(filters, title) };
    default: {
      const legacy = await analyticsService.getExportData(dataType, filters);
      const info = await buildReportInfoSheet(title, filters, [
        "Export reflects the filters listed below.",
      ]);
      return {
        title,
        sheets: [info, { name: "Data", rows: [legacy.headers, ...legacy.data] }],
      };
    }
  }
}

async function buildOverviewSheets(filters: AnalyticsFilters, title: string): Promise<ExportSheet[]> {
  const [overview, wo, sr, fleet] = await Promise.all([
    analyticsService.getExecutiveOverview(filters),
    analyticsService.getWorkOrderOverview(filters, { includeDetails: false }),
    analyticsService.getServiceRequestOverview(filters, { includeDetails: false }),
    analyticsService.getFleetOverview(
      { startDate: filters.startDate, endDate: filters.endDate },
      { includeDetails: false },
    ),
  ]);

  const info = await buildReportInfoSheet(title, filters, [
    "Cross-domain executive snapshot for the selected period and filters.",
    `Current period: ${overview.periodLabel}. Compared to: ${overview.previousPeriodLabel}.`,
  ]);

  const kpiSheet: ExportSheet = {
    name: "KPIs",
    rows: [
      ["Metric", "Current", "Previous period", "Change %", "Notes"],
      ["Open tasks", overview.openTasks.current, overview.openTasks.previous, formatChange(overview.openTasks.changePercent), "Lower is better"],
      ["Pending service requests", overview.pendingRequests.current, overview.pendingRequests.previous, formatChange(overview.pendingRequests.changePercent), "Lower is better"],
      ["Overdue work orders", overview.overdueWorkOrders.current, overview.overdueWorkOrders.previous, formatChange(overview.overdueWorkOrders.changePercent), "Lower is better"],
      ["Fleet vehicles available", overview.fleetAvailable.current, overview.fleetAvailable.previous, formatChange(overview.fleetAvailable.changePercent), ""],
      ["Task completion rate (%)", overview.completionRate.current, overview.completionRate.previous, formatChange(overview.completionRate.changePercent), ""],
      ["Tasks completed in period", overview.completedInPeriod.current, overview.completedInPeriod.previous, formatChange(overview.completedInPeriod.changePercent), ""],
      ["Requests converted in period", overview.convertedInPeriod.current, overview.convertedInPeriod.previous, formatChange(overview.convertedInPeriod.changePercent), ""],
    ],
  };

  const woSheet: ExportSheet = {
    name: "Work Orders Snapshot",
    rows: [
      ["Metric", "Value"],
      ["Total work orders (filtered)", wo.totalWorkOrders],
      ["Completed", wo.completedWorkOrders],
      ["In progress", wo.inProgressWorkOrders],
      ["On hold", wo.onHoldWorkOrders],
      ["Not started", wo.notStartedWorkOrders],
      ["Overdue", wo.overdueWorkOrders],
      ["Completion rate", `${wo.completionRate}%`],
      ["Avg resolution (hours)", wo.avgResolutionTimeHours],
      ["Avg response (hours)", wo.avgResponseTimeHours],
      [],
      ["Status", "Count"],
      ...wo.byStatus.map((s) => [statusLabel(s.status), s.count]),
    ],
  };

  const srSheet: ExportSheet = {
    name: "Requests Snapshot",
    rows: [
      ["Metric", "Value"],
      ["Total requests", sr.totalRequests],
      ["Pending", sr.pendingRequests],
      ["Under review", sr.underReviewRequests],
      ["Converted to work orders", sr.convertedRequests],
      ["Rejected", sr.rejectedRequests],
      ["Conversion rate", `${sr.conversionRate}%`],
      ["Avg response time (hours)", sr.avgResponseTimeHours],
      [],
      ["Top requesters", "Count"],
      ...sr.topRequesters.slice(0, 15).map((r) => [r.requesterName, r.count]),
    ],
  };

  const fleetSheet: ExportSheet = {
    name: "Fleet Snapshot",
    rows: [
      ["Metric", "Value"],
      ["Total vehicles", fleet.totalVehicles],
      ["Available", fleet.availableVehicles],
      ["In use", fleet.inUseVehicles],
      ["Out of service", fleet.outOfServiceVehicles],
      ["Reservations (filtered dates)", fleet.totalReservations],
      ["Active reservations", fleet.activeReservations],
      ["Reservation utilization", `${fleet.avgUtilizationRate}%`],
    ],
  };

  return [info, kpiSheet, woSheet, srSheet, fleetSheet];
}

function formatChange(change: number | null): string {
  if (change === null) return "—";
  return `${change > 0 ? "+" : ""}${change}%`;
}

async function buildWorkOrdersSheets(filters: AnalyticsFilters, title: string): Promise<ExportSheet[]> {
  const wo = await analyticsService.getWorkOrderOverview(filters);
  const info = await buildReportInfoSheet(title, filters, [
    `Includes ${wo.detailedRecords.length} work order line(s) matching your filters.`,
    "Detail sheet lists every filtered work order with location, assignment, and dates.",
  ]);

  const summary: ExportSheet = {
    name: "Summary",
    rows: [
      ["Metric", "Value", "Detail"],
      ["Total work orders", wo.totalWorkOrders, "All statuses in filter"],
      ["Completed", wo.completedWorkOrders, pct(wo.completedWorkOrders, wo.totalWorkOrders)],
      ["In progress", wo.inProgressWorkOrders, pct(wo.inProgressWorkOrders, wo.totalWorkOrders)],
      ["On hold", wo.onHoldWorkOrders, pct(wo.onHoldWorkOrders, wo.totalWorkOrders)],
      ["Not started", wo.notStartedWorkOrders, pct(wo.notStartedWorkOrders, wo.totalWorkOrders)],
      ["Completion rate", `${wo.completionRate}%`, ""],
      ["Overdue (past due date, not completed)", wo.overdueWorkOrders, ""],
      ["Avg resolution time (hours)", wo.avgResolutionTimeHours, "Created → completed"],
      ["Avg response time (hours)", wo.avgResponseTimeHours, "Created → start"],
    ],
  };

  const statusSheet: ExportSheet = {
    name: "By Status",
    rows: [
      ["Status", "Count", "% of total"],
      ...wo.byStatus.map((s) => [statusLabel(s.status), s.count, pct(s.count, wo.totalWorkOrders)]),
    ],
  };

  const prioritySheet: ExportSheet = {
    name: "By Priority",
    rows: [
      ["Priority", "Count", "% of total"],
      ...wo.byUrgency.map((u) => [u.urgency.charAt(0).toUpperCase() + u.urgency.slice(1), u.count, pct(u.count, wo.totalWorkOrders)]),
    ],
  };

  const propertySheet: ExportSheet = {
    name: "By Property",
    rows: [
      ["Property", "Property ID", "Count", "% of total"],
      ...wo.byProperty.map((p) => [p.propertyName, p.propertyId, p.count, pct(p.count, wo.totalWorkOrders)]),
    ],
  };

  const spaceSheet: ExportSheet = {
    name: "By Space",
    rows: [
      ["Space", "Building", "Count", "% of total"],
      ...wo.bySpace.map((s) => [s.spaceName, s.propertyName, s.count, pct(s.count, wo.totalWorkOrders)]),
    ],
  };

  const areaSheet: ExportSheet = {
    name: "By Area",
    rows: [
      ["Area", "Count", "% of total"],
      ...wo.byArea.map((a) => [a.areaName, a.count, pct(a.count, wo.totalWorkOrders)]),
    ],
  };

  const trendSheet: ExportSheet = {
    name: "Monthly Trend",
    rows: [
      ["Month", "Created", "Completed", "Completion rate"],
      ...wo.monthlyTrend.map((m) => [
        m.month,
        m.count,
        m.completed,
        m.count > 0 ? pct(m.completed, m.count) : "0%",
      ]),
    ],
  };

  const taskTypeSheet: ExportSheet = {
    name: "By Task Type",
    rows: [
      ["Task type", "Count", "% of total"],
      ...(wo.byTaskType ?? []).map((t) => [t.taskType, t.count, pct(t.count, wo.totalWorkOrders)]),
    ],
  };

  const categorySheet: ExportSheet = {
    name: "By Category",
    rows: [
      ["Category", "Count", "% of total"],
      ...(wo.byCategory ?? []).map((c) => [c.category, c.count, pct(c.count, wo.totalWorkOrders)]),
    ],
  };

  const sourceSheet: ExportSheet = {
    name: "By Source",
    rows: [
      ["Requester role", "Count", "% of total"],
      ...(wo.byRequesterRole ?? []).map((r) => [r.role, r.count, pct(r.count, wo.totalWorkOrders)]),
    ],
  };

  const detailSheet: ExportSheet = {
    name: "All Work Orders",
    rows: [
      [
        "Work Order ID",
        "Name",
        "Description",
        "Status",
        "Priority",
        "Assigned To",
        "Building",
        "Space",
        "Area",
        "Equipment",
        "Task Type",
        "Start Date",
        "Due Date",
        "Completed Date",
        "Created",
      ],
      ...wo.detailedRecords.map((r) => [
        r.id,
        r.name,
        truncate(r.description, 1000),
        statusLabel(r.status),
        r.urgency,
        r.assignedToName || "Unassigned",
        r.propertyName,
        r.spaceName,
        r.areaName,
        r.equipmentName,
        r.taskType,
        fmtDate(r.initialDate),
        fmtDate(r.estimatedCompletionDate),
        fmtDate(r.actualCompletionDate),
        fmtDateTime(r.createdAt),
      ]),
    ],
  };

  return [
    info,
    summary,
    statusSheet,
    prioritySheet,
    taskTypeSheet,
    categorySheet,
    sourceSheet,
    propertySheet,
    spaceSheet,
    areaSheet,
    trendSheet,
    detailSheet,
  ];
}

async function buildTechniciansSheets(filters: AnalyticsFilters, title: string): Promise<ExportSheet[]> {
  const techs = await analyticsService.getTechnicianPerformance(filters);
  const totalTasks = techs.reduce((s, t) => s + t.taskDetails.length, 0);
  const info = await buildReportInfoSheet(title, filters, [
    `${techs.length} team member(s); ${totalTasks} task line(s) in the detail sheet.`,
    "Hours and completion metrics are limited to tasks matching your filters.",
  ]);

  const summary: ExportSheet = {
    name: "Summary",
    rows: [
      ["Metric", "Value"],
      ["Team members", techs.length],
      ["Tasks completed (rollup)", techs.reduce((s, t) => s + t.tasksCompleted, 0)],
      ["Tasks assigned (rollup)", techs.reduce((s, t) => s + t.tasksAssigned, 0)],
      ["Total hours logged", Math.round(techs.reduce((s, t) => s + t.totalHoursLogged, 0) * 10) / 10],
      [
        "Team avg completion rate",
        techs.length > 0
          ? `${Math.round(techs.reduce((s, t) => s + t.completionRate, 0) / techs.length)}%`
          : "0%",
      ],
      [
        "Team avg completion time (hrs)",
        techs.length > 0
          ? Math.round((techs.reduce((s, t) => s + t.avgCompletionTimeHours, 0) / techs.length) * 10) / 10
          : 0,
      ],
    ],
  };

  const rosterSheet: ExportSheet = {
    name: "Team Roster",
    rows: [
      [
        "Member ID",
        "Name",
        "Role",
        "Tasks completed",
        "Tasks assigned",
        "Open (assigned - completed)",
        "Hours logged",
        "Avg completion (hrs)",
        "Completion rate",
      ],
      ...techs.map((t) => [
        t.technicianId,
        t.technicianName,
        t.memberType === "student" ? "Student" : "Technician",
        t.tasksCompleted,
        t.tasksAssigned,
        Math.max(0, t.tasksAssigned - t.tasksCompleted),
        t.totalHoursLogged,
        t.avgCompletionTimeHours,
        `${t.completionRate}%`,
      ]),
    ],
  };

  const taskSheet: ExportSheet = {
    name: "All Task Details",
    rows: [
      [
        "Member",
        "Task ID",
        "Task name",
        "Description",
        "Status",
        "Priority",
        "Building",
        "Area",
        "Hours logged",
        "Start date",
        "Completed date",
      ],
      ...techs.flatMap((t) =>
        t.taskDetails.map((task) => [
          t.technicianName,
          task.taskId,
          task.taskName,
          truncate(task.description, 1000),
          statusLabel(task.status),
          task.urgency,
          task.propertyName,
          task.areaName,
          task.hoursLogged,
          fmtDate(task.initialDate),
          fmtDate(task.completionDate),
        ]),
      ),
    ],
  };

  return [info, summary, rosterSheet, taskSheet];
}

async function buildAssetsSheets(filters: AnalyticsFilters, title: string): Promise<ExportSheet[]> {
  const assets = await analyticsService.getAssetHealth(filters);
  const serviceRows = assets.reduce((s, a) => s + a.serviceHistory.length, 0);
  const info = await buildReportInfoSheet(title, filters, [
    `${assets.length} asset(s); ${serviceRows} service record(s).`,
    "Failure frequency counts high-priority work orders in the last 90 days per asset.",
  ]);

  const summary: ExportSheet = {
    name: "Summary",
    rows: [
      ["Metric", "Value"],
      ["Assets tracked", assets.length],
      ["Total work orders on assets", assets.reduce((s, a) => s + a.workOrderCount, 0)],
      ["Total maintenance cost", assets.reduce((s, a) => s + a.totalMaintenanceCost, 0)],
      ["Assets with condition recorded", assets.filter((a) => a.condition).length],
      ["High failure frequency (90d)", assets.filter((a) => a.failureFrequency >= 3).length],
    ],
  };

  const equipmentSheet: ExportSheet = {
    name: "All Equipment",
    rows: [
      [
        "Equipment ID",
        "Equipment",
        "Building",
        "Category",
        "Condition",
        "Work orders",
        "Maintenance cost",
        "Failure freq (90d)",
        "Last service date",
        "Last serviced by",
      ],
      ...assets.map((a) => [
        a.equipmentId,
        a.equipmentName,
        a.propertyName,
        a.category,
        a.condition ?? "Not recorded",
        a.workOrderCount,
        a.totalMaintenanceCost,
        a.failureFrequency,
        a.lastMaintenanceDate ? fmtDate(a.lastMaintenanceDate) : "Never",
        a.lastServicedBy ?? "",
      ]),
    ],
  };

  const historySheet: ExportSheet = {
    name: "Service History",
    rows: [
      [
        "Equipment ID",
        "Equipment",
        "Building",
        "Task ID",
        "Task",
        "Description",
        "Service date",
        "Technician",
        "Status",
        "Priority",
        "Hours",
        "Parts cost",
        "Labor cost",
        "Total cost",
      ],
      ...assets.flatMap((a) =>
        a.serviceHistory.map((r) => [
          a.equipmentId,
          a.equipmentName,
          a.propertyName,
          r.taskId,
          r.taskName,
          truncate(r.taskDescription, 1000),
          fmtDate(r.serviceDate),
          r.technicianName,
          statusLabel(r.status),
          r.urgency,
          r.hoursLogged,
          r.partsCost,
          r.laborCost,
          r.partsCost + r.laborCost,
        ]),
      ),
    ],
  };

  return [info, summary, equipmentSheet, historySheet];
}

async function buildFacilitiesSheets(filters: AnalyticsFilters, title: string): Promise<ExportSheet[]> {
  const facilities = await analyticsService.getFacilityInsights(filters);
  const woCount = facilities.reduce((s, f) => s + f.workOrderDetails.length, 0);
  const info = await buildReportInfoSheet(title, filters, [
    `${facilities.length} building(s); ${woCount} work order line(s).`,
    "Includes space-level breakdown and recurring vs emergency counts per property.",
  ]);

  const summary: ExportSheet = {
    name: "By Building",
    rows: [
      [
        "Property ID",
        "Building",
        "Type",
        "Total WOs",
        "Completed",
        "Open",
        "Completion %",
        "Maintenance cost",
        "Emergency WOs",
        "Recurring WOs",
      ],
      ...facilities.map((f) => [
        f.propertyId,
        f.propertyName,
        f.propertyType,
        f.totalWorkOrders,
        f.completedWorkOrders,
        f.openWorkOrders,
        f.totalWorkOrders > 0 ? pct(f.completedWorkOrders, f.totalWorkOrders) : "0%",
        f.totalMaintenanceCost,
        f.emergencyWorkOrders,
        f.preventiveWorkOrders,
      ]),
    ],
  };

  const spacesSheet: ExportSheet = {
    name: "By Space",
    rows: [
      ["Building", "Space", "Floor", "Work orders", "Completed", "Open", "Open %"],
      ...facilities.flatMap((f) =>
        f.spaceAnalytics.map((s) => [
          f.propertyName,
          s.spaceName,
          s.floor ?? "",
          s.workOrderCount,
          s.completedWorkOrders,
          s.openWorkOrders,
          s.workOrderCount > 0 ? pct(s.openWorkOrders, s.workOrderCount) : "0%",
        ]),
      ),
    ],
  };

  const detailSheet: ExportSheet = {
    name: "All Work Orders",
    rows: [
      [
        "Building",
        "Task ID",
        "Task",
        "Description",
        "Status",
        "Priority",
        "Assigned to",
        "Space",
        "Area",
        "Equipment",
        "Type",
        "Start",
        "Completed",
      ],
      ...facilities.flatMap((f) =>
        f.workOrderDetails.map((wo) => [
          f.propertyName,
          wo.taskId,
          wo.taskName,
          truncate(wo.description, 1000),
          statusLabel(wo.status),
          wo.urgency,
          wo.assignedToName,
          wo.spaceName,
          wo.areaName,
          wo.equipmentName,
          wo.taskType,
          fmtDate(wo.initialDate),
          fmtDate(wo.completionDate),
        ]),
      ),
    ],
  };

  return [info, summary, spacesSheet, detailSheet];
}

async function buildFleetSheets(filters: AnalyticsFilters, title: string): Promise<ExportSheet[]> {
  const fleet = await analyticsService.getFleetOverview(filters);
  const info = await buildReportInfoSheet(title, filters, [
    `${fleet.detailedVehicles.length} vehicle(s); ${fleet.detailedReservations.length} reservation(s) in date range.`,
    "Reservation counts respect start/end date filters when set.",
  ]);

  const summary: ExportSheet = {
    name: "Summary",
    rows: [
      ["Metric", "Value", "Notes"],
      ["Total vehicles (fleet-wide)", fleet.totalVehicles, "Not date-filtered"],
      ["Available now", fleet.availableVehicles, ""],
      ["In use now", fleet.inUseVehicles, ""],
      ["Out of service", fleet.outOfServiceVehicles, "Needs maintenance or cleaning"],
      ["Reservations in period", fleet.totalReservations, "Date-filtered"],
      ["Active / pending reservations", fleet.activeReservations, ""],
      ["Completed reservations", fleet.completedReservations, ""],
      ["Cancelled reservations", fleet.cancelledReservations, ""],
      ["Total maintenance cost", fleet.totalMaintenanceCost, "From maintenance logs"],
      ["Reservation utilization", `${fleet.avgUtilizationRate}%`, "Reserved vehicle-days / capacity in period"],
    ],
  };

  const categorySheet: ExportSheet = {
    name: "By Category",
    rows: [["Category", "Vehicle count"], ...fleet.byCategory.map((c) => [c.category, c.count])],
  };

  const statusSheet: ExportSheet = {
    name: "By Status",
    rows: [["Status", "Vehicle count"], ...fleet.byStatus.map((s) => [statusLabel(s.status), s.count])],
  };

  const trendSheet: ExportSheet = {
    name: "Reservations by Month",
    rows: [
      ["Month", "Reservations"],
      ...fleet.reservationsByMonth.map((m) => [m.month, m.count]),
    ],
  };

  const maintenanceSheet: ExportSheet = {
    name: "Maintenance by Vehicle",
    rows: [
      ["Vehicle", "Maintenance events", "Total cost"],
      ...fleet.maintenanceByVehicle.map((m) => [m.vehicleName, m.count, m.cost]),
    ],
  };

  const vehiclesSheet: ExportSheet = {
    name: "All Vehicles",
    rows: [
      ["Internal ID", "Vehicle ID", "Make", "Model", "Year", "Category", "Status", "Mileage", "Fuel", "License plate"],
      ...fleet.detailedVehicles.map((v) => [
        v.id,
        v.vehicleId,
        v.make,
        v.model,
        v.year,
        v.category,
        statusLabel(v.status),
        v.currentMileage ?? "",
        v.fuelType,
        v.licensePlate ?? "",
      ]),
    ],
  };

  const reservationsSheet: ExportSheet = {
    name: "All Reservations",
    rows: [
      ["Reservation ID", "Vehicle", "Requested by", "Purpose", "Status", "Passengers", "Start", "End", "Notes", "Created"],
      ...fleet.detailedReservations.map((r) => [
        r.id,
        r.vehicleName,
        r.userName,
        r.purpose,
        statusLabel(r.status),
        r.passengerCount,
        fmtDateTime(r.startDate),
        fmtDateTime(r.endDate),
        truncate(r.notes ?? "", 500),
        fmtDateTime(r.createdAt),
      ]),
    ],
  };

  return [info, summary, categorySheet, statusSheet, trendSheet, maintenanceSheet, vehiclesSheet, reservationsSheet];
}

async function buildServiceRequestsSheets(filters: AnalyticsFilters, title: string): Promise<ExportSheet[]> {
  const sr = await analyticsService.getServiceRequestOverview(filters);
  const info = await buildReportInfoSheet(title, filters, [
    `${sr.detailedRequests.length} service request line(s) matching filters.`,
    "Response time is measured from submission to first work order start when converted.",
  ]);

  const summary: ExportSheet = {
    name: "Summary",
    rows: [
      ["Metric", "Value", "% of total"],
      ["Total requests", sr.totalRequests, "100%"],
      ["Pending", sr.pendingRequests, pct(sr.pendingRequests, sr.totalRequests)],
      ["Under review", sr.underReviewRequests, pct(sr.underReviewRequests, sr.totalRequests)],
      ["Converted to work orders", sr.convertedRequests, pct(sr.convertedRequests, sr.totalRequests)],
      ["Rejected", sr.rejectedRequests, pct(sr.rejectedRequests, sr.totalRequests)],
      ["Conversion rate", `${sr.conversionRate}%`, ""],
      ["Avg response time (hours)", sr.avgResponseTimeHours, "Non-pending requests"],
    ],
  };

  const statusSheet: ExportSheet = {
    name: "By Status",
    rows: [
      ["Status", "Count", "%"],
      ...sr.byStatus.map((s) => [statusLabel(s.status), s.count, pct(s.count, sr.totalRequests)]),
    ],
  };

  const urgencySheet: ExportSheet = {
    name: "By Priority",
    rows: [
      ["Priority", "Count", "%"],
      ...sr.byUrgency.map((u) => [u.urgency, u.count, pct(u.count, sr.totalRequests)]),
    ],
  };

  const propertySheet: ExportSheet = {
    name: "By Property",
    rows: [
      ["Property", "Count", "%"],
      ...sr.byProperty.map((p) => [p.propertyName, p.count, pct(p.count, sr.totalRequests)]),
    ],
  };

  const areaSheet: ExportSheet = {
    name: "By Area",
    rows: [
      ["Area", "Count", "%"],
      ...sr.byArea.map((a) => [a.areaName, a.count, pct(a.count, sr.totalRequests)]),
    ],
  };

  const requestersSheet: ExportSheet = {
    name: "Top Requesters",
    rows: [
      ["Requester", "Request count", "% of total"],
      ...sr.topRequesters.map((r) => [r.requesterName, r.count, pct(r.count, sr.totalRequests)]),
    ],
  };

  const trendSheet: ExportSheet = {
    name: "Monthly Trend",
    rows: [
      ["Month", "Submitted", "Converted", "Conversion rate"],
      ...sr.monthlyTrend.map((m) => [
        m.month,
        m.submitted,
        m.converted,
        m.submitted > 0 ? pct(m.converted, m.submitted) : "0%",
      ]),
    ],
  };

  const categorySheet: ExportSheet = {
    name: "By Category",
    rows: [
      ["Category", "Count", "%"],
      ...(sr.byCategory ?? []).map((c) => [c.category, c.count, pct(c.count, sr.totalRequests)]),
    ],
  };

  const funnelSheet: ExportSheet = {
    name: "Pipeline Funnel",
    rows: [
      ["Stage", "Count", "Avg hours in stage"],
      ...(sr.funnel ?? []).map((f) => [
        f.label,
        f.count,
        f.avgHoursInStage != null ? f.avgHoursInStage : "—",
      ]),
    ],
  };

  const detailSheet: ExportSheet = {
    name: "All Requests",
    rows: [
      [
        "Request ID",
        "Title",
        "Description",
        "Status",
        "Priority",
        "Requester",
        "Building",
        "Area",
        "Submitted",
        "Last updated",
        "Rejection reason",
      ],
      ...sr.detailedRequests.map((r) => [
        r.id,
        r.title,
        truncate(r.description, 1000),
        statusLabel(r.status),
        r.urgency,
        r.requesterName,
        r.propertyName,
        r.areaName,
        fmtDateTime(r.createdAt),
        fmtDateTime(r.updatedAt),
        r.rejectionReason ?? "",
      ]),
    ],
  };

  return [
    info,
    summary,
    statusSheet,
    urgencySheet,
    categorySheet,
    funnelSheet,
    propertySheet,
    areaSheet,
    requestersSheet,
    trendSheet,
    detailSheet,
  ];
}

async function buildAlertsSheets(filters: AnalyticsFilters, title: string): Promise<ExportSheet[]> {
  const alerts = await analyticsService.getAlerts(filters);
  const info = await buildReportInfoSheet(title, filters, [
    `${alerts.length} active alert(s) based on current data and filters.`,
    "Includes overdue tasks, SLA issues, high-failure equipment, and recurring problem patterns.",
  ]);

  const bySeverity: ExportSheet = {
    name: "By Severity",
    rows: [
      ["Severity", "Count"],
      ["High", alerts.filter((a) => a.severity === "high").length],
      ["Medium", alerts.filter((a) => a.severity === "medium").length],
      ["Low", alerts.filter((a) => a.severity === "low").length],
      ["Total", alerts.length],
    ],
  };

  const byType: ExportSheet = {
    name: "By Type",
    rows: [
      ["Alert type", "Count"],
      ...Object.entries(
        alerts.reduce<Record<string, number>>((acc, a) => {
          acc[a.type] = (acc[a.type] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([type, count]) => [type.replace(/_/g, " "), count]),
    ],
  };

  const detailSheet: ExportSheet = {
    name: "All Alerts",
    rows: [
      ["Alert ID", "Type", "Severity", "Title", "Full description", "Related type", "Related ID", "Detected"],
      ...alerts.map((a) => [
        a.id,
        a.type.replace(/_/g, " "),
        a.severity,
        a.title,
        a.description,
        a.relatedType,
        a.relatedId,
        fmtDateTime(a.createdAt),
      ]),
    ],
  };

  return [info, bySeverity, byType, detailSheet];
}

async function buildProjectsSheets(filters: AnalyticsFilters, title: string): Promise<ExportSheet[]> {
  const data = await analyticsService.getProjectsOverview(filters);
  const info = await buildReportInfoSheet(title, filters, [
    `${data.projects.length} project(s) in this report.`,
    "Date filter applies to project created date. Location filters use property, space, and area.",
  ]);

  const summary: ExportSheet = {
    name: "Summary",
    rows: [
      ["Metric", "Value"],
      ["Total projects", data.totalProjects],
      ["Completed", data.completedProjects],
      ["In progress", data.inProgressProjects],
      ["On hold", data.onHoldProjects],
      ["Planning", data.planningProjects],
      ["Cancelled", data.cancelledProjects],
      ["Completion rate", `${data.completionRate}%`],
      ["Total budget", data.totalBudget],
      ["Critical (open)", data.criticalOpen],
      ["High priority (open)", data.highOpen],
    ],
  };

  const statusSheet: ExportSheet = {
    name: "By Status",
    rows: [
      ["Status", "Count", "%"],
      ...data.byStatus.map((s) => [
        statusLabel(s.status),
        s.count,
        pct(s.count, data.totalProjects),
      ]),
    ],
  };

  const prioritySheet: ExportSheet = {
    name: "By Priority",
    rows: [
      ["Priority", "Count", "%"],
      ...data.byPriority.map((p) => [
        p.priority,
        p.count,
        pct(p.count, data.totalProjects),
      ]),
    ],
  };

  const budgetSheet: ExportSheet = {
    name: "Budget by Status",
    rows: [
      ["Status", "Budget"],
      ...data.budgetByStatus.map((b) => [statusLabel(b.status), b.budget]),
    ],
  };

  const detailSheet: ExportSheet = {
    name: "All Projects",
    rows: [
      [
        "ID",
        "Name",
        "Description",
        "Status",
        "Priority",
        "Building",
        "Space",
        "Area",
        "Start",
        "Target end",
        "Actual end",
        "Budget",
        "Created",
      ],
      ...data.projects.map((p) => [
        p.id,
        p.name,
        truncate(p.description ?? "", 1000),
        statusLabel(p.status),
        p.priority,
        p.propertyName,
        p.spaceName,
        p.areaName,
        fmtDate(p.startDate),
        fmtDate(p.targetEndDate),
        fmtDate(p.actualEndDate),
        p.budgetAmount,
        fmtDateTime(p.createdAt),
      ]),
    ],
  };

  return [info, summary, statusSheet, prioritySheet, budgetSheet, detailSheet];
}

export async function buildExcelBuffer(dataType: string, filters: AnalyticsFilters): Promise<Buffer> {
  const XLSX = await import("xlsx");
  const { sheets } = await buildExportSheets(dataType, filters);
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheet.name));
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

type PdfBlock =
  | { kind: "text"; heading: string; paragraphs: string[] }
  | { kind: "analysis"; heading: string; sections: AnalysisSection[] }
  | { kind: "pie"; heading: string; explanation: string; slices: ChartSlice[] }
  | { kind: "bar"; heading: string; explanation: string; bars: ChartSlice[] }
  | {
      kind: "grouped-bar";
      heading: string;
      explanation: string;
      items: GroupedBarItem[];
      series: BarSeries[];
    }
  | { kind: "table"; heading: string; rows: (string | number)[][] };

function wrapPdfText(doc: { splitTextToSize: (text: string, maxWidth: number) => string | string[] }, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

function analysisBlock(heading: string, sections: AnalysisSection[]): PdfBlock {
  return { kind: "analysis", heading, sections };
}

function woStatusSlices(byStatus: { status: string; count: number }[]): ChartSlice[] {
  return byStatus.map((s, i) => ({
    label: statusLabel(s.status),
    value: s.count,
    color: WO_STATUS_RGB[s.status] ?? CHART_PALETTE[i % CHART_PALETTE.length],
  }));
}

function woUrgencySlices(byUrgency: { urgency: string; count: number }[]): ChartSlice[] {
  return byUrgency.map((u, i) => ({
    label: u.urgency.charAt(0).toUpperCase() + u.urgency.slice(1),
    value: u.count,
    color: URGENCY_RGB[u.urgency] ?? CHART_PALETTE[i % CHART_PALETTE.length],
  }));
}

function propertyBarSlices(
  items: { propertyName?: string; areaName?: string; count: number }[],
  labelKey: "propertyName" | "areaName" = "propertyName",
): ChartSlice[] {
  return [...items]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((p, i) => ({
      label: (labelKey === "propertyName" ? p.propertyName : p.areaName) || "Unknown",
      value: p.count,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    }));
}

export async function buildPdfBuffer(dataType: string, filters: AnalyticsFilters): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const title = REPORT_TITLES[dataType] ?? "Analytics Report";
  const metaRows = await resolveFilterMetadata(filters);
  const blocks = await buildPdfBlocks(dataType, filters);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const ensureSpace = (needed: number) => {
    if (y + needed > 275) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("Detailed report with charts · Matches active filters", margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(50);
  for (const row of metaRows.slice(1)) {
    ensureSpace(6);
    doc.text(`${row[0]}: ${row[1]}`, margin, y);
    y += 5;
  }
  y += 4;
  doc.setTextColor(0);

  const renderExplanation = (text: string) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70);
    const lines = wrapPdfText(doc, text, contentWidth);
    ensureSpace(lines.length * 3.5 + 2);
    doc.text(lines, margin, y);
    y += lines.length * 3.5 + 4;
    doc.setTextColor(0);
  };

  for (const block of blocks) {
    ensureSpace(14);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(block.heading, margin, y);
    y += 6;

    if (block.kind === "text") {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      for (const paragraph of block.paragraphs) {
        const lines = wrapPdfText(doc, paragraph, contentWidth);
        ensureSpace(lines.length * 4 + 4);
        doc.text(lines, margin, y);
        y += lines.length * 4 + 3;
      }
      y += 4;
      continue;
    }

    if (block.kind === "analysis") {
      for (const section of block.sections) {
        ensureSpace(10);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(41, 65, 114);
        doc.text(section.title, margin, y);
        y += 5;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        for (const paragraph of section.paragraphs) {
          const lines = wrapPdfText(doc, paragraph, contentWidth);
          ensureSpace(lines.length * 4 + 2);
          doc.text(lines, margin, y);
          y += lines.length * 4 + 2;
        }
        y += 3;
      }
      y += 2;
      continue;
    }

    if (block.kind === "pie" || block.kind === "bar" || block.kind === "grouped-bar") {
      renderExplanation(block.explanation);
      ensureSpace(60);
      if (block.kind === "pie") {
        y += drawPieChart(doc, margin, y, contentWidth, block.slices);
      } else if (block.kind === "bar") {
        y += drawBarChart(doc, margin, y, contentWidth, block.bars);
      } else {
        y += drawGroupedBarChart(doc, margin, y, contentWidth, block.items, block.series);
      }
      y += 6;
      continue;
    }

    if (block.kind !== "table" || block.rows.length === 0) continue;

    autoTable(doc, {
      startY: y,
      head: [block.rows[0].map(String)],
      body: block.rows.slice(1).map((r) => r.map((c) => String(c ?? ""))),
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
      headStyles: { fillColor: [41, 65, 114], fontSize: 7 },
      columnStyles: { 0: { cellWidth: "auto" } },
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  return Buffer.from(doc.output("arraybuffer"));
}

async function buildPdfBlocks(dataType: string, filters: AnalyticsFilters): Promise<PdfBlock[]> {
  const range = formatDateRange(filters);

  switch (dataType) {
    case "overview": {
      const [o, wo, sr] = await Promise.all([
        analyticsService.getExecutiveOverview(filters),
        analyticsService.getWorkOrderOverview(filters, { includeDetails: false }),
        analyticsService.getServiceRequestOverview(filters, { includeDetails: false }),
      ]);
      return [
        analysisBlock("Report walkthrough", overviewAnalysis(o, wo, sr, range)),
        {
          kind: "text",
          heading: "Quick copy for email",
          paragraphs: [
            `Maintenance analytics for ${o.periodLabel} (${range}). Compared to ${o.previousPeriodLabel.toLowerCase()}.`,
            `Open tasks: ${o.openTasks.current} (was ${o.openTasks.previous}, ${formatChange(o.openTasks.changePercent)}). Pending requests: ${o.pendingRequests.current}. Overdue work orders: ${o.overdueWorkOrders.current}.`,
            `In this period we completed ${o.completedInPeriod.current} tasks (${formatChange(o.completedInPeriod.changePercent)} vs prior) and converted ${o.convertedInPeriod.current} service requests. Task completion rate is ${o.completionRate.current}%.`,
          ],
        },
        {
          kind: "pie",
          heading: "Chart: work orders by status",
          explanation:
            "Shows how filtered work is distributed across workflow states. Large “in progress” or “not started” slices may indicate backlog.",
          slices: woStatusSlices(wo.byStatus),
        },
        {
          kind: "bar",
          heading: "Chart: work volume by building",
          explanation: "Ranks buildings by number of work orders in this report. Taller bars need more staffing or preventive planning.",
          bars: propertyBarSlices(wo.byProperty),
        },
        {
          kind: "pie",
          heading: "Chart: service requests by status",
          explanation: "Shows where requests sit in the intake pipeline. A large pending slice may mean triage delays.",
          slices: woStatusSlices(sr.byStatus),
        },
        {
          kind: "table",
          heading: "Key performance indicators",
          rows: [
            ["Metric", "Current", "Previous", "Change"],
            ["Open tasks", o.openTasks.current, o.openTasks.previous, formatChange(o.openTasks.changePercent)],
            ["Pending requests", o.pendingRequests.current, o.pendingRequests.previous, formatChange(o.pendingRequests.changePercent)],
            ["Overdue work orders", o.overdueWorkOrders.current, o.overdueWorkOrders.previous, formatChange(o.overdueWorkOrders.changePercent)],
            ["Fleet available", o.fleetAvailable.current, o.fleetAvailable.previous, formatChange(o.fleetAvailable.changePercent)],
            ["Completion rate (%)", o.completionRate.current, o.completionRate.previous, formatChange(o.completionRate.changePercent)],
            ["Tasks completed", o.completedInPeriod.current, o.completedInPeriod.previous, formatChange(o.completedInPeriod.changePercent)],
            ["Requests converted", o.convertedInPeriod.current, o.convertedInPeriod.previous, formatChange(o.convertedInPeriod.changePercent)],
          ],
        },
        {
          kind: "table",
          heading: "Supporting detail — work orders",
          rows: [
            ["Metric", "Value"],
            ["Total", wo.totalWorkOrders],
            ["Completed", wo.completedWorkOrders],
            ["In progress", wo.inProgressWorkOrders],
            ["Overdue", wo.overdueWorkOrders],
            ["Avg resolution (hrs)", wo.avgResolutionTimeHours],
          ],
        },
        {
          kind: "table",
          heading: "Supporting detail — service requests",
          rows: [
            ["Metric", "Value"],
            ["Total", sr.totalRequests],
            ["Pending", sr.pendingRequests],
            ["Converted", sr.convertedRequests],
            ["Rejected", sr.rejectedRequests],
            ["Conversion rate", `${sr.conversionRate}%`],
            ...sr.topRequesters.slice(0, 8).map((r) => [`Top requester: ${r.requesterName}`, r.count]),
          ],
        },
      ];
    }
    case "work-orders-complete": {
      const wo = await analyticsService.getWorkOrderOverview(filters);
      const openList = wo.detailedRecords.filter((r) => r.status !== "completed");
      return [
        analysisBlock("Report walkthrough", workOrdersAnalysis(wo, range)),
        {
          kind: "text",
          heading: "Quick copy for email",
          paragraphs: [
            `Work order report for ${range}. Total: ${wo.totalWorkOrders}. Completed: ${wo.completedWorkOrders} (${wo.completionRate}%). In progress: ${wo.inProgressWorkOrders}. Overdue: ${wo.overdueWorkOrders}.`,
            `Average resolution time: ${wo.avgResolutionTimeHours} hours. Average response time: ${wo.avgResponseTimeHours} hours.`,
            openList.length > 0
              ? `Open items include: ${openList.slice(0, 4).map((r) => `${r.name} (${statusLabel(r.status)}, ${r.propertyName})`).join("; ")}.`
              : "No open work orders in this filtered set.",
          ],
        },
        {
          kind: "pie",
          heading: "Chart: distribution by status",
          explanation:
            "Each slice is the share of work orders in that status. Use this to explain backlog shape to leadership.",
          slices: woStatusSlices(wo.byStatus),
        },
        {
          kind: "pie",
          heading: "Chart: distribution by priority",
          explanation: "Shows urgent vs routine mix. A large high-priority slice may require overtime or contractor support.",
          slices: woUrgencySlices(wo.byUrgency),
        },
        {
          kind: "bar",
          heading: "Chart: volume by building",
          explanation: "Compares maintenance load across buildings in this filter set.",
          bars: propertyBarSlices(wo.byProperty),
        },
        {
          kind: "grouped-bar",
          heading: "Chart: monthly created vs completed",
          explanation:
            "Blue bars are new work created each month; green bars are completions. When blue exceeds green for several months, backlog is likely growing.",
          items: wo.monthlyTrend.map((m) => ({
            label: m.month,
            values: [m.count, m.completed],
          })),
          series: [
            { name: "Created", color: [59, 130, 246] },
            { name: "Completed", color: [34, 197, 94] },
          ],
        },
        {
          kind: "table",
          heading: "Metrics",
          rows: [
            ["Metric", "Count", "Notes"],
            ["Total", wo.totalWorkOrders, ""],
            ["Completed", wo.completedWorkOrders, pct(wo.completedWorkOrders, wo.totalWorkOrders)],
            ["In progress", wo.inProgressWorkOrders, ""],
            ["On hold", wo.onHoldWorkOrders, ""],
            ["Not started", wo.notStartedWorkOrders, ""],
            ["Overdue", wo.overdueWorkOrders, "Past due, not done"],
            ["Avg resolution (hrs)", wo.avgResolutionTimeHours, ""],
            ["Avg response (hrs)", wo.avgResponseTimeHours, ""],
          ],
        },
        {
          kind: "table",
          heading: "By status",
          rows: [["Status", "Count", "%"], ...wo.byStatus.map((s) => [statusLabel(s.status), s.count, pct(s.count, wo.totalWorkOrders)])],
        },
        {
          kind: "table",
          heading: "By priority",
          rows: [["Priority", "Count", "%"], ...wo.byUrgency.map((u) => [u.urgency, u.count, pct(u.count, wo.totalWorkOrders)])],
        },
        {
          kind: "table",
          heading: "By building",
          rows: [["Building", "Count", "%"], ...wo.byProperty.map((p) => [p.propertyName, p.count, pct(p.count, wo.totalWorkOrders)])],
        },
        {
          kind: "table",
          heading: "By area",
          rows: [["Area", "Count", "%"], ...wo.byArea.map((a) => [a.areaName, a.count, pct(a.count, wo.totalWorkOrders)])],
        },
        ...(wo.byTaskType?.length
          ? [
              {
                kind: "table" as const,
                heading: "By task type",
                rows: [
                  ["Task type", "Count", "%"],
                  ...wo.byTaskType.map((t) => [t.taskType, t.count, pct(t.count, wo.totalWorkOrders)]),
                ],
              },
            ]
          : []),
        ...(wo.byCategory?.length
          ? [
              {
                kind: "table" as const,
                heading: "By category",
                rows: [
                  ["Category", "Count", "%"],
                  ...wo.byCategory.map((c) => [c.category, c.count, pct(c.count, wo.totalWorkOrders)]),
                ],
              },
            ]
          : []),
        ...(wo.byRequesterRole?.length
          ? [
              {
                kind: "table" as const,
                heading: "By source (requester role)",
                rows: [
                  ["Role", "Count", "%"],
                  ...wo.byRequesterRole.map((r) => [r.role, r.count, pct(r.count, wo.totalWorkOrders)]),
                ],
              },
            ]
          : []),
        {
          kind: "table",
          heading: "Monthly trend",
          rows: [["Month", "Created", "Completed"], ...wo.monthlyTrend.map((m) => [m.month, m.count, m.completed])],
        },
        {
          kind: "table",
          heading: "All work orders (detail)",
          rows: [
            ["Name", "Status", "Priority", "Assigned", "Building", "Area", "Due", "Completed"],
            ...wo.detailedRecords.map((r) => [
              truncate(r.name, 40),
              statusLabel(r.status),
              r.urgency,
              truncate(r.assignedToName || "—", 20),
              truncate(r.propertyName, 18),
              truncate(r.areaName, 15),
              fmtDate(r.estimatedCompletionDate),
              fmtDate(r.actualCompletionDate),
            ]),
          ],
        },
      ];
    }
    case "technicians-detailed": {
      const techs = await analyticsService.getTechnicianPerformance(filters);
      const totalHours = techs.reduce((s, t) => s + t.totalHoursLogged, 0);
      const sorted = [...techs].sort((a, b) => b.tasksCompleted - a.tasksCompleted);
      return [
        analysisBlock("Report walkthrough", techniciansAnalysis(techs, range)),
        {
          kind: "text",
          heading: "Quick copy for email",
          paragraphs: [
            `Team performance for ${range}. ${techs.length} member(s) with ${techs.reduce((s, t) => s + t.tasksCompleted, 0)} tasks completed and ${Math.round(totalHours * 10) / 10} hours logged.`,
            sorted[0]
              ? `Top performer: ${sorted[0].technicianName} (${sorted[0].tasksCompleted} completed, ${sorted[0].completionRate}% rate).`
              : "",
          ],
        },
        {
          kind: "bar",
          heading: "Chart: tasks completed by team member",
          explanation: "Compares output across the filtered team. Use for standups and workload balancing.",
          bars: sorted.map((t, i) => ({
            label: truncate(t.technicianName, 14),
            value: t.tasksCompleted,
            color: CHART_PALETTE[i % CHART_PALETTE.length],
          })),
        },
        {
          kind: "pie",
          heading: "Chart: hours logged by team member",
          explanation: "Shows how total labor hours are divided. Uneven slices may mean uneven assignments.",
          slices: sorted
            .filter((t) => t.totalHoursLogged > 0)
            .map((t, i) => ({
              label: truncate(t.technicianName, 16),
              value: Math.round(t.totalHoursLogged * 10) / 10,
              color: CHART_PALETTE[i % CHART_PALETTE.length],
            })),
        },
        {
          kind: "table",
          heading: "Team roster",
          rows: [
            ["Name", "Role", "Done", "Assigned", "Hours", "Rate", "Avg hrs"],
            ...techs.map((t) => [
              t.technicianName,
              t.memberType,
              t.tasksCompleted,
              t.tasksAssigned,
              t.totalHoursLogged,
              `${t.completionRate}%`,
              t.avgCompletionTimeHours,
            ]),
          ],
        },
        {
          kind: "table",
          heading: "Task detail",
          rows: [
            ["Member", "Task", "Status", "Building", "Area", "Hours", "Completed"],
            ...techs.flatMap((t) =>
              t.taskDetails.map((task) => [
                truncate(t.technicianName, 16),
                truncate(task.taskName, 28),
                statusLabel(task.status),
                truncate(task.propertyName, 14),
                truncate(task.areaName, 12),
                task.hoursLogged,
                fmtDate(task.completionDate),
              ]),
            ),
          ],
        },
      ];
    }
    case "assets": {
      const assets = await analyticsService.getAssetHealth(filters);
      const totalCost = assets.reduce((s, a) => s + a.totalMaintenanceCost, 0);
      const byCost = [...assets].sort((a, b) => b.totalMaintenanceCost - a.totalMaintenanceCost);
      return [
        analysisBlock("Report walkthrough", assetsAnalysis(assets, range)),
        {
          kind: "text",
          heading: "Quick copy for email",
          paragraphs: [
            `Asset health for ${range}. ${assets.length} asset(s), ${assets.reduce((s, a) => s + a.workOrderCount, 0)} related work orders, $${totalCost} total maintenance cost.`,
            assets.filter((a) => a.failureFrequency >= 3).length > 0
              ? `${assets.filter((a) => a.failureFrequency >= 3).length} asset(s) flagged with high failure frequency (90 days).`
              : "No assets with high failure frequency in this period.",
          ],
        },
        {
          kind: "bar",
          heading: "Chart: maintenance cost by asset (top 10)",
          explanation: "Identifies the most expensive assets to maintain in this filter set.",
          bars: byCost.slice(0, 10).map((a, i) => ({
            label: truncate(a.equipmentName, 12),
            value: a.totalMaintenanceCost,
            color: CHART_PALETTE[i % CHART_PALETTE.length],
          })),
        },
        {
          kind: "pie",
          heading: "Chart: share of maintenance cost (top assets)",
          explanation: "Shows which assets consume the largest portion of spend.",
          slices: byCost
            .slice(0, 7)
            .map((a, i) => ({
              label: truncate(a.equipmentName, 14),
              value: a.totalMaintenanceCost,
              color: CHART_PALETTE[i % CHART_PALETTE.length],
            })),
        },
        {
          kind: "table",
          heading: "Equipment list",
          rows: [
            ["Equipment", "Building", "WOs", "Cost", "Condition", "Failures 90d", "Last service"],
            ...assets.map((a) => [
              truncate(a.equipmentName, 24),
              truncate(a.propertyName, 16),
              a.workOrderCount,
              `$${a.totalMaintenanceCost}`,
              a.condition ?? "—",
              a.failureFrequency,
              fmtDate(a.lastMaintenanceDate),
            ]),
          ],
        },
        {
          kind: "table",
          heading: "Service history",
          rows: [
            ["Equipment", "Task", "Technician", "Date", "Status", "Total cost"],
            ...assets.flatMap((a) =>
              a.serviceHistory.map((r) => [
                truncate(a.equipmentName, 20),
                truncate(r.taskName, 24),
                truncate(r.technicianName, 16),
                fmtDate(r.serviceDate),
                statusLabel(r.status),
                `$${r.partsCost + r.laborCost}`,
              ]),
            ),
          ],
        },
      ];
    }
    case "facilities-detailed": {
      const facilities = await analyticsService.getFacilityInsights(filters);
      return [
        analysisBlock("Report walkthrough", facilitiesAnalysis(facilities, range)),
        {
          kind: "text",
          heading: "Quick copy for email",
          paragraphs: [
            `Facilities report for ${range}. ${facilities.length} building(s), ${facilities.reduce((s, f) => s + f.totalWorkOrders, 0)} work orders, ${facilities.reduce((s, f) => s + f.openWorkOrders, 0)} still open.`,
          ],
        },
        {
          kind: "bar",
          heading: "Chart: work orders by building",
          explanation: "Total maintenance volume per building in this report.",
          bars: [...facilities]
            .sort((a, b) => b.totalWorkOrders - a.totalWorkOrders)
            .map((f, i) => ({
              label: truncate(f.propertyName, 14),
              value: f.totalWorkOrders,
              color: CHART_PALETTE[i % CHART_PALETTE.length],
            })),
        },
        {
          kind: "pie",
          heading: "Chart: open work by building",
          explanation: "Where outstanding (not completed) work is concentrated right now.",
          slices: facilities
            .filter((f) => f.openWorkOrders > 0)
            .map((f, i) => ({
              label: truncate(f.propertyName, 14),
              value: f.openWorkOrders,
              color: CHART_PALETTE[i % CHART_PALETTE.length],
            })),
        },
        {
          kind: "table",
          heading: "By building",
          rows: [
            ["Property", "Total", "Done", "Open", "Emergency", "Recurring", "Cost"],
            ...facilities.map((f) => [
              f.propertyName,
              f.totalWorkOrders,
              f.completedWorkOrders,
              f.openWorkOrders,
              f.emergencyWorkOrders,
              f.preventiveWorkOrders,
              `$${f.totalMaintenanceCost}`,
            ]),
          ],
        },
        {
          kind: "table",
          heading: "By space",
          rows: [
            ["Building", "Space", "Floor", "Total", "Open"],
            ...facilities.flatMap((f) =>
              f.spaceAnalytics.map((s) => [f.propertyName, s.spaceName, s.floor ?? "", s.workOrderCount, s.openWorkOrders]),
            ),
          ],
        },
        {
          kind: "table",
          heading: "Work order detail",
          rows: [
            ["Building", "Task", "Status", "Priority", "Assigned", "Space", "Area"],
            ...facilities.flatMap((f) =>
              f.workOrderDetails.map((wo) => [
                truncate(f.propertyName, 14),
                truncate(wo.taskName, 26),
                statusLabel(wo.status),
                wo.urgency,
                truncate(wo.assignedToName, 14),
                truncate(wo.spaceName, 12),
                truncate(wo.areaName, 12),
              ]),
            ),
          ],
        },
      ];
    }
    case "fleet-detailed": {
      const fleet = await analyticsService.getFleetOverview({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      return [
        analysisBlock("Report walkthrough", fleetAnalysis(fleet, range)),
        {
          kind: "text",
          heading: "Quick copy for email",
          paragraphs: [
            `Fleet report for ${range}. ${fleet.totalVehicles} vehicles (${fleet.availableVehicles} available, ${fleet.inUseVehicles} in use). ${fleet.totalReservations} reservations in period; utilization ${fleet.avgUtilizationRate}%.`,
          ],
        },
        {
          kind: "pie",
          heading: "Chart: vehicles by status",
          explanation: "Current fleet availability snapshot (not limited by reservation dates).",
          slices: fleet.byStatus.map((s, i) => ({
            label: statusLabel(s.status),
            value: s.count,
            color: CHART_PALETTE[i % CHART_PALETTE.length],
          })),
        },
        {
          kind: "bar",
          heading: "Chart: reservations per month",
          explanation: "Booking volume over time for the filtered date range.",
          bars: fleet.reservationsByMonth.map((m, i) => ({
            label: m.month.length > 7 ? m.month.slice(2) : m.month,
            value: m.count,
            color: CHART_PALETTE[i % CHART_PALETTE.length],
          })),
        },
        {
          kind: "table",
          heading: "Fleet metrics",
          rows: [
            ["Metric", "Value"],
            ["Total vehicles", fleet.totalVehicles],
            ["Available", fleet.availableVehicles],
            ["In use", fleet.inUseVehicles],
            ["Out of service", fleet.outOfServiceVehicles],
            ["Reservations", fleet.totalReservations],
            ["Active reservations", fleet.activeReservations],
            ["Maintenance cost", `$${fleet.totalMaintenanceCost}`],
          ],
        },
        {
          kind: "table",
          heading: "Vehicles",
          rows: [
            ["ID", "Make/Model", "Year", "Status", "Mileage"],
            ...fleet.detailedVehicles.map((v) => [
              v.vehicleId,
              `${v.make} ${v.model}`,
              v.year,
              statusLabel(v.status),
              v.currentMileage ?? "—",
            ]),
          ],
        },
        {
          kind: "table",
          heading: "Reservations",
          rows: [
            ["Vehicle", "User", "Purpose", "Status", "Start", "End"],
            ...fleet.detailedReservations.map((r) => [
              truncate(r.vehicleName, 16),
              truncate(r.userName, 18),
              truncate(r.purpose, 22),
              r.status,
              fmtDate(r.startDate),
              fmtDate(r.endDate),
            ]),
          ],
        },
      ];
    }
    case "service-requests-detailed": {
      const sr = await analyticsService.getServiceRequestOverview(filters);
      return [
        analysisBlock("Report walkthrough", serviceRequestsAnalysis(sr, range)),
        {
          kind: "text",
          heading: "Quick copy for email",
          paragraphs: [
            `Service requests for ${range}. ${sr.totalRequests} total: ${sr.pendingRequests} pending, ${sr.convertedRequests} converted (${sr.conversionRate}%), ${sr.rejectedRequests} rejected. Avg response: ${sr.avgResponseTimeHours} hrs.`,
          ],
        },
        {
          kind: "pie",
          heading: "Chart: requests by status",
          explanation: "Intake pipeline at a glance — large pending or under-review slices mean triage backlog.",
          slices: woStatusSlices(sr.byStatus),
        },
        {
          kind: "bar",
          heading: "Chart: requests by building",
          explanation: "Which sites generate the most tickets in this filter set.",
          bars: propertyBarSlices(sr.byProperty),
        },
        {
          kind: "grouped-bar",
          heading: "Chart: monthly submitted vs converted",
          explanation: "Compares incoming requests with those turned into work orders each month.",
          items: sr.monthlyTrend.map((m) => ({
            label: m.month,
            values: [m.submitted, m.converted],
          })),
          series: [
            { name: "Submitted", color: [59, 130, 246] },
            { name: "Converted", color: [34, 197, 94] },
          ],
        },
        {
          kind: "table",
          heading: "Metrics",
          rows: [
            ["Metric", "Value"],
            ["Total", sr.totalRequests],
            ["Pending", sr.pendingRequests],
            ["Under review", sr.underReviewRequests],
            ["Converted", sr.convertedRequests],
            ["Rejected", sr.rejectedRequests],
            ["Conversion rate", `${sr.conversionRate}%`],
          ],
        },
        {
          kind: "table",
          heading: "By status",
          rows: [["Status", "Count"], ...sr.byStatus.map((s) => [statusLabel(s.status), s.count])],
        },
        {
          kind: "table",
          heading: "By property",
          rows: [["Property", "Count"], ...sr.byProperty.map((p) => [p.propertyName, p.count])],
        },
        ...(sr.byCategory?.length
          ? [
              {
                kind: "table" as const,
                heading: "By category",
                rows: [["Category", "Count"], ...sr.byCategory.map((c) => [c.category, c.count])],
              },
            ]
          : []),
        ...(sr.funnel?.length
          ? [
              {
                kind: "table" as const,
                heading: "Request pipeline",
                rows: [
                  ["Stage", "Count", "Avg hours in stage"],
                  ...sr.funnel.map((f) => [
                    f.label,
                    f.count,
                    f.avgHoursInStage != null ? String(f.avgHoursInStage) : "—",
                  ]),
                ],
              },
            ]
          : []),
        {
          kind: "table",
          heading: "Top requesters",
          rows: [["Requester", "Count"], ...sr.topRequesters.map((r) => [r.requesterName, r.count])],
        },
        {
          kind: "table",
          heading: "All requests",
          rows: [
            ["Title", "Status", "Priority", "Requester", "Building", "Submitted"],
            ...sr.detailedRequests.map((r) => [
              truncate(r.title, 30),
              statusLabel(r.status),
              r.urgency,
              truncate(r.requesterName, 18),
              truncate(r.propertyName, 16),
              fmtDate(r.createdAt),
            ]),
          ],
        },
      ];
    }
    case "projects": {
      const data = await analyticsService.getProjectsOverview(filters);
      return [
        analysisBlock("Report walkthrough", projectsAnalysis(data, range)),
        {
          kind: "text",
          heading: "Quick copy for email",
          paragraphs: [
            `Projects report for ${range}. ${data.totalProjects} project(s), ${data.completionRate}% complete, ${formatCurrency(data.totalBudget)} total budget.`,
            `${data.inProgressProjects} in progress, ${data.onHoldProjects} on hold, ${data.criticalOpen + data.highOpen} critical/high priority still open.`,
          ],
        },
        {
          kind: "pie",
          heading: "Chart: projects by status",
          explanation: "Portfolio composition by workflow status.",
          slices: data.byStatus.map((s, i) => ({
            label: statusLabel(s.status),
            value: s.count,
            color: WO_STATUS_RGB[s.status] ?? CHART_PALETTE[i % CHART_PALETTE.length],
          })),
        },
        {
          kind: "pie",
          heading: "Chart: projects by priority",
          explanation: "Shows how priority is distributed across the filtered portfolio.",
          slices: data.byPriority.map((p, i) => ({
            label: p.priority.charAt(0).toUpperCase() + p.priority.slice(1),
            value: p.count,
            color: URGENCY_RGB[p.priority] ?? CHART_PALETTE[i % CHART_PALETTE.length],
          })),
        },
        {
          kind: "bar",
          heading: "Chart: budget by status",
          explanation: "Dollar amount allocated per status — useful for forecasting cash needs.",
          bars: data.budgetByStatus.map((b, i) => ({
            label: statusLabel(b.status),
            value: Math.round(b.budget),
            color: CHART_PALETTE[i % CHART_PALETTE.length],
          })),
        },
        {
          kind: "table",
          heading: "All projects",
          rows: [
            ["Name", "Status", "Priority", "Building", "Budget", "Target end"],
            ...data.projects.map((p) => [
              truncate(p.name, 28),
              statusLabel(p.status),
              p.priority,
              truncate(p.propertyName, 16),
              `$${p.budgetAmount}`,
              fmtDate(p.targetEndDate),
            ]),
          ],
        },
      ];
    }
    case "alerts": {
      const alerts = await analyticsService.getAlerts(filters);
      const high = alerts.filter((a) => a.severity === "high");
      const byType = Object.entries(
        alerts.reduce<Record<string, number>>((acc, a) => {
          const key = a.type.replace(/_/g, " ");
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {}),
      );
      return [
        analysisBlock("Report walkthrough", alertsAnalysis(alerts, range)),
        {
          kind: "text",
          heading: "Quick copy for email",
          paragraphs: [
            `Alerts report for ${range}. ${alerts.length} active alert(s): ${high.length} high, ${alerts.filter((a) => a.severity === "medium").length} medium, ${alerts.filter((a) => a.severity === "low").length} low.`,
            high.length > 0 ? `High priority: ${high.map((a) => a.title).join("; ")}.` : "No high-severity alerts.",
          ],
        },
        {
          kind: "pie",
          heading: "Chart: alerts by severity",
          explanation: "Proportion of critical vs lower-priority exceptions requiring attention.",
          slices: (["high", "medium", "low"] as const)
            .map((sev) => ({
              label: sev.charAt(0).toUpperCase() + sev.slice(1),
              value: alerts.filter((a) => a.severity === sev).length,
              color: SEVERITY_RGB[sev],
            }))
            .filter((s) => s.value > 0),
        },
        {
          kind: "bar",
          heading: "Chart: alerts by type",
          explanation: "Which exception categories dominate — overdue tasks, equipment failures, etc.",
          bars: byType.map(([label, value], i) => ({
            label: truncate(label, 12),
            value,
            color: CHART_PALETTE[i % CHART_PALETTE.length],
          })),
        },
        {
          kind: "table",
          heading: "All alerts",
          rows: [
            ["Severity", "Type", "Title", "Description"],
            ...alerts.map((a) => [
              a.severity,
              a.type.replace(/_/g, " "),
              truncate(a.title, 36),
              truncate(a.description, 80),
            ]),
          ],
        },
      ];
    }
    default: {
      const legacy = await analyticsService.getExportData(dataType, filters);
      return [{ kind: "table", heading: "Data", rows: [legacy.headers, ...legacy.data] }];
    }
  }
}
