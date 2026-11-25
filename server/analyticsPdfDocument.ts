import type { jsPDF } from "jspdf";
import type { AnalyticsFilters } from "./analyticsService";
import { analyticsService } from "./analyticsService";
import { applyColumnOptions } from "./analyticsExportShape";
import { resolveFilterMetadata } from "./analyticsExportMetadata";
import {
  REPORT_TITLES,
  fmtDate,
  formatChange,
  formatCurrency,
  formatDateRange,
  pct,
  statusLabel,
  truncate,
} from "./analyticsExportText";
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
import { prepareFinishedJobPhotos, type PhotoJobSeed, type PreparedPhotoJob } from "./analyticsPdfPhotos";

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
  | { kind: "table"; heading: string; rows: (string | number)[][] }
  | { kind: "photos"; heading: string; note: string | null; jobs: PreparedPhotoJob[] };

async function finishedPhotosBlock(seeds: PhotoJobSeed[]): Promise<PdfBlock> {
  const prepared = await prepareFinishedJobPhotos(seeds);
  if (prepared.jobs.length === 0) {
    return {
      kind: "text",
      heading: "Photos from finished jobs",
      paragraphs: ["None of the finished jobs in this report have a photo."],
    };
  }
  return {
    kind: "photos",
    heading: "Photos from finished jobs",
    note: prepared.note,
    jobs: prepared.jobs,
  };
}

function drawPhoto(doc: jsPDF, image: PreparedPhotoJob["images"][number], x: number, y: number, maxW: number, maxH: number) {
  const ratio = image.width / image.height;
  let drawW = maxW;
  let drawH = drawW / ratio;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * ratio;
  }
  doc.addImage(image.jpeg, "JPEG", x, y, drawW, drawH, undefined, "FAST");
}

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
  const blocks = selectPdfBlocks(await buildPdfBlocks(dataType, filters), filters);

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
    ensureSpace(block.kind === "photos" ? 78 : 14);
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
      ensureSpace(block.kind === "grouped-bar" ? 78 : 72);
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

    if (block.kind === "photos") {
      for (const job of block.jobs) {
        const imageH = 52;
        ensureSpace(18 + imageH + 12);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        const titleLines = wrapPdfText(doc, job.title, contentWidth);
        doc.text(titleLines.slice(0, 2), margin, y);
        y += Math.min(titleLines.length, 2) * 4.5 + 1;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        doc.text(wrapPdfText(doc, job.meta, contentWidth).slice(0, 2), margin, y);
        y += 5;
        const gap = 4;
        const boxW = job.images.length === 1 ? contentWidth * 0.62 : (contentWidth - gap) / 2;
        job.images.forEach((image, index) => {
          const x = margin + index * (boxW + gap);
          try {
            drawPhoto(doc, image, x, y, boxW, imageH);
          } catch (error) {
            console.error("Could not draw a task photo:", error);
          }
          doc.setFontSize(7);
          doc.setTextColor(90);
          const caption = wrapPdfText(doc, image.caption, boxW)[0] ?? "";
          doc.text(caption, x, y + imageH + 4);
        });
        y += imageH + 8;
        doc.setFontSize(8);
        doc.setTextColor(80);
        doc.text(job.countLine, margin, y);
        y += 7;
      }
      if (block.note) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(80);
        const lines = wrapPdfText(doc, block.note, contentWidth);
        ensureSpace(lines.length * 4 + 2);
        doc.text(lines, margin, y);
        y += lines.length * 4 + 2;
      }
      doc.setTextColor(0);
      y += 4;
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
            "Blue is the month the work order was opened. Green is the month it was finished. A job can appear in two different months.",
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
        ...(filters.includeCost === false
          ? []
          : [{
              kind: "table" as const,
              heading: "Cost",
              rows: [
                ["Amount", "Dollars", "What it includes"],
                ["Labor", wo.laborCost, "Logged time at $15 an hour"],
                ["Parts", wo.partsCost, "Inventory parts used on these jobs"],
                ["Store purchases", wo.storeCost, "Purchases recorded on these jobs"],
                ["Total", wo.totalCost, "Labor, parts, and store purchases. Receipts are not in this report."],
              ],
            }]),
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
              r.name,
              statusLabel(r.status),
              r.urgency,
              r.assignedToName || "—",
              r.propertyName,
              r.areaName,
              fmtDate(r.estimatedCompletionDate),
              fmtDate(r.actualCompletionDate),
            ]),
          ],
        },
        ...(filters.includePhotos
          ? [
              await finishedPhotosBlock(
                wo.detailedRecords
                  .filter((record) => record.status === "completed")
                  .map((record) => ({
                    taskId: record.id,
                    title: record.name,
                    meta: `${record.propertyName} · ${record.assignedToName || "Unassigned"} · Completed ${fmtDate(record.actualCompletionDate) || "—"}`,
                    completedAt: record.actualCompletionDate,
                  })),
              ),
            ]
          : []),
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
            ["Name", "Role", "Done", "Assigned", "Hours", "Clock hrs", "Recaps", "Rate", "Avg hrs"],
            ...techs.map((t) => [
              t.technicianName,
              t.memberType,
              t.tasksCompleted,
              t.tasksAssigned,
              t.totalHoursLogged,
              t.clockHoursLogged,
              t.recapsSubmitted,
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
        ...(filters.includePhotos
          ? [
              await finishedPhotosBlock(
                techs.flatMap((member) =>
                  member.taskDetails
                    .filter((task) => task.status === "completed")
                    .map((task) => ({
                      taskId: task.taskId,
                      title: task.taskName,
                      meta: `${member.technicianName} · ${task.propertyName} · Completed ${fmtDate(task.completionDate) || "—"}`,
                      completedAt: task.completionDate,
                    })),
                ),
              ),
            ]
          : []),
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
        ...(filters.includePhotos
          ? [
              await finishedPhotosBlock(
                facilities.flatMap((facility) =>
                  facility.workOrderDetails
                    .filter((job) => job.status === "completed")
                    .map((job) => ({
                      taskId: job.taskId,
                      title: job.taskName,
                      meta: `${facility.propertyName} · ${job.assignedToName || "Unassigned"} · Completed ${fmtDate(job.completionDate) || "—"}`,
                      completedAt: job.completionDate,
                    })),
                ),
              ),
            ]
          : []),
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
    case "inventory-detailed": {
      const inv = await analyticsService.getInventoryOverview({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      return [
        {
          kind: "text",
          heading: "Inventory overview",
          paragraphs: [
            `${inv.totalItems} items tracked; ${inv.lowStockCount} below threshold. Estimated value ${formatCurrency(inv.estimatedValue)}.`,
            inv.partsUsageCount > 0
              ? `${inv.partsUsageCount} part usage record(s) in the selected period.`
              : "No part usage recorded in the selected period.",
          ],
        },
        {
          kind: "bar",
          heading: "Chart: items by category",
          explanation: "Current catalog distribution by category.",
          bars: inv.byCategory.map((c, i) => ({
            label: truncate(c.category, 12),
            value: c.count,
            color: CHART_PALETTE[i % CHART_PALETTE.length],
          })),
        },
        {
          kind: "table",
          heading: "Low stock items",
          rows: [
            ["Name", "Category", "Qty / status"],
            ...inv.lowStockItems.map((item) => [
              truncate(item.name, 28),
              item.category || "general",
              item.trackingMode === "status" ? item.stockStatus || "" : `${item.quantity} ${item.unit || ""}`,
            ]),
          ],
        },
        {
          kind: "table",
          heading: "Most used in period",
          rows: [
            ["Item", "Qty used"],
            ...inv.topUsedInPeriod.map((row) => [truncate(row.name, 32), row.totalQuantity]),
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

export function selectPdfBlocks(blocks: PdfBlock[], filters: AnalyticsFilters): PdfBlock[] {
  return blocks.flatMap((block) => {
    if (filters.includeCharts === false && (block.kind === "pie" || block.kind === "bar" || block.kind === "grouped-bar")) {
      return [];
    }
    if (filters.includeCost === false && /cost|budget|labor/i.test(block.heading)) {
      return [];
    }
    if (filters.includeCost === false && block.kind === "table") {
      return [{ ...block, rows: applyColumnOptions(block.rows, filters) }];
    }
    if (block.kind === "table" && filters.includeStudents !== true) {
      return [{ ...block, rows: applyColumnOptions(block.rows, filters) }];
    }
    return [block];
  });
}
