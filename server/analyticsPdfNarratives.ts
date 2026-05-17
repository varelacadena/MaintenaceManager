import type { WorkOrderOverview } from "./analyticsService";
import type { ExecutiveOverview } from "./analyticsService";
import type { TechnicianPerformance } from "./analyticsService";
import type { AssetHealth } from "./analyticsService";
import type { FacilityInsights } from "./analyticsService";
import type { FleetOverview } from "./analyticsService";
import type { ServiceRequestOverview } from "./analyticsService";
import type { Alert } from "./analyticsService";
import type { ProjectsOverview } from "./analyticsService";

export interface AnalysisSection {
  title: string;
  paragraphs: string[];
}

function dominantLabel(
  items: { label: string; value: number }[],
): { label: string; value: number; share: number } | null {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return null;
  const top = [...items].sort((a, b) => b.value - a.value)[0];
  return { label: top.label, value: top.value, share: Math.round((top.value / total) * 100) };
}

export function overviewAnalysis(
  o: ExecutiveOverview,
  wo: WorkOrderOverview,
  sr: ServiceRequestOverview,
  range: string,
): AnalysisSection[] {
  return [
    {
      title: "What this report covers",
      paragraphs: [
        `This executive overview combines maintenance tasks, incoming service requests, and fleet availability for ${range}. Numbers respect every filter you applied (dates, property, technician, etc.).`,
        `The period shown is ${o.periodLabel}. Trends compare against ${o.previousPeriodLabel.toLowerCase()} so you can see whether performance is improving or slipping.`,
      ],
    },
    {
      title: "Workload & backlog",
      paragraphs: [
        `There are currently ${o.openTasks.current} open tasks (${o.openTasks.previous} in the prior period). ${o.overdueWorkOrders.current} work orders are overdue — these are past their due date and not yet completed.`,
        `Under the same filters, ${wo.totalWorkOrders} work orders exist in total: ${wo.completedWorkOrders} finished (${wo.completionRate}% completion rate), ${wo.inProgressWorkOrders} active, and ${wo.onHoldWorkOrders} on hold.`,
      ],
    },
    {
      title: "Requests & throughput",
      paragraphs: [
        `${sr.totalRequests} service requests match your filters. ${sr.pendingRequests} are still pending, ${sr.convertedRequests} became work orders (${sr.conversionRate}% conversion), and ${sr.rejectedRequests} were rejected.`,
        `During ${o.periodLabel}, ${o.completedInPeriod.current} tasks were completed and ${o.convertedInPeriod.current} requests were converted — use the charts below to see how volume is distributed.`,
      ],
    },
  ];
}

export function workOrdersAnalysis(wo: WorkOrderOverview, range: string): AnalysisSection[] {
  const statusTop = dominantLabel(
    wo.byStatus.map((s) => ({ label: s.status.replace(/_/g, " "), value: s.count })),
  );
  const urgencyTop = dominantLabel(wo.byUrgency.map((u) => ({ label: u.urgency, value: u.count })));
  const buildingTop = dominantLabel(wo.byProperty.map((p) => ({ label: p.propertyName, value: p.count })));

  return [
    {
      title: "What this report covers",
      paragraphs: [
        `This work order report lists every maintenance task matching ${range} and your other filters. It is meant for operational reviews, leadership updates, and vendor or stakeholder emails.`,
        `Resolution time averages ${wo.avgResolutionTimeHours} hours from creation to completion. Response time averages ${wo.avgResponseTimeHours} hours from creation to when work started.`,
      ],
    },
    {
      title: "Volume & completion",
      paragraphs: [
        `${wo.totalWorkOrders} work orders are in scope. ${wo.completedWorkOrders} (${wo.completionRate}%) are done, ${wo.inProgressWorkOrders} are in progress, ${wo.notStartedWorkOrders} have not started, and ${wo.onHoldWorkOrders} are on hold.`,
        wo.overdueWorkOrders > 0
          ? `${wo.overdueWorkOrders} orders are overdue and need attention — prioritize these when assigning technicians.`
          : "No overdue work orders in this filtered set.",
      ],
    },
    {
      title: "How to read the charts",
      paragraphs: [
        statusTop
          ? `The status pie chart shows ${statusTop.label} is the largest segment (${statusTop.share}% of orders). Use it to see whether work is backing up in one state.`
          : "The status chart shows how work is distributed across workflow states.",
        urgencyTop
          ? `Priority breakdown: ${urgencyTop.label} urgency represents ${urgencyTop.share}% of volume.`
          : "The priority chart shows urgent vs routine mix.",
        buildingTop
          ? `Most activity is at ${buildingTop.label} (${buildingTop.share}% of orders). The bar chart ranks buildings by volume.`
          : "The building bar chart shows where maintenance effort is concentrated.",
        "The monthly trend chart compares new work created each month with work completed — widening gaps mean backlog may be growing.",
      ],
    },
  ];
}

export function techniciansAnalysis(techs: TechnicianPerformance[], range: string): AnalysisSection[] {
  const completed = techs.reduce((s, t) => s + t.tasksCompleted, 0);
  const hours = techs.reduce((s, t) => s + t.totalHoursLogged, 0);
  const top = [...techs].sort((a, b) => b.tasksCompleted - a.tasksCompleted)[0];

  return [
    {
      title: "What this report covers",
      paragraphs: [
        `Team performance for ${range}, including technicians and students who executed filtered tasks. Hours come from time entries on those tasks only.`,
      ],
    },
    {
      title: "Productivity snapshot",
      paragraphs: [
        `${techs.length} team member(s) appear in this report. Together they completed ${completed} tasks and logged ${Math.round(hours * 10) / 10} hours.`,
        top
          ? `${top.technicianName} led in completions (${top.tasksCompleted} tasks, ${top.completionRate}% personal completion rate).`
          : "No completed tasks in this filter set.",
      ],
    },
    {
      title: "How to read the charts",
      paragraphs: [
        "The bar chart ranks members by tasks completed — use it for staffing and recognition conversations.",
        "The pie chart shows how total logged hours are split across the team. If one slice dominates, workload may be uneven.",
        "The detail table lists every task with location and hours for audit or follow-up.",
      ],
    },
  ];
}

export function assetsAnalysis(assets: AssetHealth[], range: string): AnalysisSection[] {
  const cost = assets.reduce((s, a) => s + a.totalMaintenanceCost, 0);
  const highFailure = assets.filter((a) => a.failureFrequency >= 3);

  return [
    {
      title: "What this report covers",
      paragraphs: [
        `Asset health for ${range}: equipment linked to filtered maintenance work, with costs from parts and labor on related tasks.`,
      ],
    },
    {
      title: "Reliability & cost",
      paragraphs: [
        `${assets.length} assets tracked. Combined maintenance spend is $${cost}.`,
        highFailure.length > 0
          ? `${highFailure.length} asset(s) show high failure frequency (3+ high-priority jobs in 90 days) — review for replacement or preventive maintenance.`
          : "No assets flagged with high failure frequency in the last 90 days.",
      ],
    },
    {
      title: "How to read the charts",
      paragraphs: [
        "The bar chart highlights assets with the highest maintenance cost — candidates for capital planning.",
        "The pie chart shows cost distribution across top assets. A few large slices often drive most of the spend.",
      ],
    },
  ];
}

export function facilitiesAnalysis(facilities: FacilityInsights[], range: string): AnalysisSection[] {
  const total = facilities.reduce((s, f) => s + f.totalWorkOrders, 0);
  const open = facilities.reduce((s, f) => s + f.openWorkOrders, 0);

  return [
    {
      title: "What this report covers",
      paragraphs: [
        `Facilities view for ${range}: work rolled up by property and space, including emergency vs recurring task counts.`,
      ],
    },
    {
      title: "Building operations",
      paragraphs: [
        `${facilities.length} building(s), ${total} work orders total, ${open} still open.`,
        "Emergency work orders are urgent breakdowns; recurring orders are scheduled upkeep. A high emergency ratio may signal aging systems or missed PM.",
      ],
    },
    {
      title: "How to read the charts",
      paragraphs: [
        "The bar chart compares total work volume by building.",
        "The pie chart shows each building's share of open work — useful for directing crews.",
      ],
    },
  ];
}

export function fleetAnalysis(fleet: FleetOverview, range: string): AnalysisSection[] {
  return [
    {
      title: "What this report covers",
      paragraphs: [
        `Fleet utilization for ${range}. Vehicle counts reflect the whole fleet; reservation metrics use your date filter when set.`,
      ],
    },
    {
      title: "Availability & usage",
      paragraphs: [
        `${fleet.totalVehicles} vehicles: ${fleet.availableVehicles} available, ${fleet.inUseVehicles} in use, ${fleet.outOfServiceVehicles} out of service.`,
        `${fleet.totalReservations} reservations in period (${fleet.activeReservations} active). Reservation utilization is ${fleet.avgUtilizationRate}% of available vehicle-days. Maintenance spend: $${fleet.totalMaintenanceCost}.`,
      ],
    },
    {
      title: "How to read the charts",
      paragraphs: [
        "The pie chart shows current vehicle status mix.",
        "The bar chart shows reservations per month — spot seasonal demand peaks.",
      ],
    },
  ];
}

export function serviceRequestsAnalysis(sr: ServiceRequestOverview, range: string): AnalysisSection[] {
  return [
    {
      title: "What this report covers",
      paragraphs: [
        `Service request intake for ${range}: submissions from occupants or staff before they become work orders.`,
      ],
    },
    {
      title: "Intake & conversion",
      paragraphs: [
        `${sr.totalRequests} requests: ${sr.pendingRequests} pending, ${sr.underReviewRequests} under review, ${sr.convertedRequests} converted (${sr.conversionRate}%), ${sr.rejectedRequests} rejected.`,
        `Average response time for converted requests is ${sr.avgResponseTimeHours} hours (submission to work starting).`,
      ],
    },
    {
      title: "How to read the charts",
      paragraphs: [
        "Status pie chart — see if requests are stalling in pending vs moving to conversion.",
        "Building bar chart — which sites generate the most tickets.",
        "Monthly grouped bars — submitted vs converted each month; persistent gaps mean backlog in triage.",
      ],
    },
  ];
}

export function projectsAnalysis(data: ProjectsOverview, range: string): AnalysisSection[] {
  return [
    {
      title: "What this report covers",
      paragraphs: [
        `Capital and operational projects for ${range}, filtered by created date and location where set.`,
        `Total planned budget in scope is $${data.totalBudget.toLocaleString()}.`,
      ],
    },
    {
      title: "Portfolio health",
      paragraphs: [
        `${data.totalProjects} project(s): ${data.completedProjects} completed (${data.completionRate}%), ${data.inProgressProjects} in progress, ${data.onHoldProjects} on hold.`,
        `${data.criticalOpen + data.highOpen} open project(s) are critical or high priority and need leadership attention.`,
      ],
    },
    {
      title: "How to read the charts",
      paragraphs: [
        "Status pie — mix of planning, active, completed, and cancelled work.",
        "Priority pie — risk concentration across critical/high/medium/low.",
        "Budget bar — dollars tied up by project status.",
      ],
    },
  ];
}

export function alertsAnalysis(alerts: Alert[], range: string): AnalysisSection[] {
  const high = alerts.filter((a) => a.severity === "high").length;
  return [
    {
      title: "What this report covers",
      paragraphs: [
        `Active exceptions for ${range}: overdue tasks, SLA risks, failing equipment, and repeat issues. These are system-detected and should be triaged promptly.`,
      ],
    },
    {
      title: "Risk summary",
      paragraphs: [
        `${alerts.length} alert(s): ${high} high severity. Address high items first; medium/low items may be monitored.`,
      ],
    },
    {
      title: "How to read the charts",
      paragraphs: [
        "Severity pie — proportion of critical vs lower-priority flags.",
        "Type bar chart — which exception categories dominate (overdue, equipment failure, etc.).",
      ],
    },
  ];
}
