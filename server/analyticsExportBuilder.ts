import type { AnalyticsFilters } from "./analyticsService";
import { analyticsService } from "./analyticsService";
import { sanitizeSheetName, selectSheets, type ExportSheet } from "./analyticsExportShape";
import {
  REPORT_TITLES,
  fmtDate,
  fmtDateTime,
  formatChange,
  formatCurrency,
  pct,
  statusLabel,
  truncate,
} from "./analyticsExportText";
import { resolveFilterMetadata } from "./analyticsExportMetadata";

export type { ExportSheet } from "./analyticsExportShape";
export { buildExportFilename, sanitizeSheetName, selectSheets } from "./analyticsExportShape";
export { buildPdfBuffer, selectPdfBlocks } from "./analyticsPdfDocument";

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
    case "inventory-detailed":
      return { title, sheets: await buildInventorySheets(filters, title) };
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
      ...(filters.includeCost === false
        ? []
        : [
            ["Labor cost", wo.laborCost, "Logged time at $15 an hour"],
            ["Parts cost", wo.partsCost, "Inventory parts used on these jobs"],
            ["Store cost", wo.storeCost, "Store purchases on these jobs"],
            ["Total cost", wo.totalCost, "Labor, parts, and store purchases"],
          ]),
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
        "Clock hours",
        "Recaps",
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
        t.clockHoursLogged,
        t.recapsSubmitted,
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

async function buildInventorySheets(filters: AnalyticsFilters, title: string): Promise<ExportSheet[]> {
  const inv = await analyticsService.getInventoryOverview({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  const info = await buildReportInfoSheet(title, filters, [
    `${inv.totalItems} item(s) in catalog; parts usage counts respect the date filter when set.`,
    "Estimated value uses quantity × unit cost for counted and container items.",
  ]);

  const summary: ExportSheet = {
    name: "Summary",
    rows: [
      ["Metric", "Value"],
      ["Total items", inv.totalItems],
      ["Low stock items", inv.lowStockCount],
      ["Estimated inventory value", formatCurrency(inv.estimatedValue)],
      ["Parts used on tasks (period)", inv.partsUsageCount],
    ],
  };

  const categorySheet: ExportSheet = {
    name: "By Category",
    rows: [["Category", "Item count"], ...inv.byCategory.map((c) => [c.category, c.count])],
  };

  const lowStockSheet: ExportSheet = {
    name: "Low Stock",
    rows: [
      ["Name", "Category", "Quantity", "Unit", "Status"],
      ...inv.lowStockItems.map((item) => [
        item.name,
        item.category || "general",
        item.quantity,
        item.unit || "",
        item.trackingMode === "status" ? item.stockStatus || "" : "",
      ]),
    ],
  };

  const topUsedSheet: ExportSheet = {
    name: "Top Used",
    rows: [
      ["Item", "Quantity used"],
      ...inv.topUsedInPeriod.map((row) => [row.name, row.totalQuantity]),
    ],
  };

  return [info, summary, categorySheet, lowStockSheet, topUsedSheet];
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

  for (const sheet of selectSheets(sheets, filters)) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheet.name));
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** Same rows the spreadsheet file contains, for the on-page preview. */
export async function buildSpreadsheetPreview(
  dataType: string,
  filters: AnalyticsFilters,
): Promise<{ title: string; sheets: ExportSheet[] }> {
  const { title, sheets } = await buildExportSheets(dataType, filters);
  return { title, sheets: selectSheets(sheets, filters) };
}
