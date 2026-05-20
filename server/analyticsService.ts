import { db } from "./db";
import {
  tasks,
  users,
  properties,
  equipment,
  areas,
  timeEntries,
  partsUsed,
  inventoryItems,
  serviceRequests,
  vehicles,
  vehicleReservations,
  vehicleMaintenanceLogs,
  spaces,
  projects,
} from "@shared/schema";
import { eq, and, gte, lte, sql, count, desc } from "drizzle-orm";
import {
  buildTaskWhere,
  buildServiceRequestWhere,
  countTasks,
  countTasksByStatus,
  countOverdueTasks,
  groupTasksByProperty,
  groupTasksByTaskType,
  groupTasksByRequestCategory,
  groupTasksByRequesterRole,
  monthlyTaskTrend,
  countServiceRequests,
  countServiceRequestsByStatus,
  groupServiceRequestsByCategory,
  avgHoursInCurrentStatus,
  fetchFilteredTasks,
  fetchPartsForTasks,
  fetchTimeEntriesForTasks,
} from "./analyticsQuery";

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  propertyId?: string;
  spaceId?: string;
  areaId?: string;
  technicianId?: string;
  equipmentId?: string;
  status?: string;
  urgency?: string;
  roleType?: "all" | "technician" | "student";
}

export interface DetailedWorkOrder {
  id: string;
  name: string;
  description: string;
  status: string;
  urgency: string;
  initialDate: string | null;
  estimatedCompletionDate: string | null;
  actualCompletionDate: string | null;
  assignedToId: string | null;
  assignedToName: string;
  propertyId: string | null;
  propertyName: string;
  spaceId: string | null;
  spaceName: string;
  areaId: string | null;
  areaName: string;
  equipmentId: string | null;
  equipmentName: string;
  taskType: string;
  createdAt: string | null;
}

export interface WorkOrderOverview {
  totalWorkOrders: number;
  completedWorkOrders: number;
  inProgressWorkOrders: number;
  onHoldWorkOrders: number;
  notStartedWorkOrders: number;
  completionRate: number;
  avgResolutionTimeHours: number;
  avgResponseTimeHours: number;
  byStatus: { status: string; count: number }[];
  byUrgency: { urgency: string; count: number }[];
  byProperty: { propertyId: string; propertyName: string; count: number }[];
  bySpace: { spaceId: string; spaceName: string; propertyName: string; count: number }[];
  byArea: { areaId: string; areaName: string; count: number }[];
  monthlyTrend: { month: string; count: number; completed: number }[];
  overdueWorkOrders: number;
  byTaskType: { taskType: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byRequesterRole: { role: string; count: number }[];
  detailedRecords: DetailedWorkOrder[];
}

export interface RequestFunnelStage {
  stage: string;
  label: string;
  count: number;
  avgHoursInStage: number | null;
}

export interface TechnicianTaskDetail {
  taskId: string;
  taskName: string;
  description: string;
  status: string;
  urgency: string;
  initialDate: string | null;
  completionDate: string | null;
  propertyName: string;
  areaName: string;
  hoursLogged: number;
}

export interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  memberType: "technician" | "student";
  tasksCompleted: number;
  tasksAssigned: number;
  totalHoursLogged: number;
  avgCompletionTimeHours: number;
  completionRate: number;
  taskDetails: TechnicianTaskDetail[];
}

export interface ServiceRecord {
  taskId: string;
  taskName: string;
  taskDescription: string;
  serviceDate: string | null; // ISO date string after JSON serialization
  technicianId: string | null;
  technicianName: string;
  status: string;
  urgency: string;
  hoursLogged: number;
  partsCost: number;
  laborCost: number;
}

export interface AssetHealth {
  equipmentId: string;
  equipmentName: string;
  propertyName: string;
  category: string;
  condition: string | null;
  workOrderCount: number;
  totalMaintenanceCost: number;
  lastMaintenanceDate: string | null; // ISO date string after JSON serialization
  lastServicedBy: string | null;
  failureFrequency: number;
  serviceHistory: ServiceRecord[];
}

export interface FacilityWorkOrder {
  taskId: string;
  taskName: string;
  description: string;
  status: string;
  urgency: string;
  initialDate: string | null;
  completionDate: string | null;
  assignedToName: string;
  areaName: string;
  equipmentName: string;
  spaceName: string;
  taskType: string;
}

export interface SpaceAnalytics {
  spaceId: string;
  spaceName: string;
  floor: string | null;
  workOrderCount: number;
  completedWorkOrders: number;
  openWorkOrders: number;
}

export interface FacilityInsights {
  propertyId: string;
  propertyName: string;
  propertyType: string;
  totalWorkOrders: number;
  completedWorkOrders: number;
  openWorkOrders: number;
  totalMaintenanceCost: number;
  emergencyWorkOrders: number;
  preventiveWorkOrders: number;
  workOrderDetails: FacilityWorkOrder[];
  spaceAnalytics: SpaceAnalytics[];
}

export interface Alert {
  id: string;
  type: "overdue" | "sla_breach" | "high_failure" | "recurring_issue";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  relatedId: string;
  relatedType: "task" | "equipment" | "property";
  createdAt: Date;
}

export interface DetailedReservation {
  id: string;
  vehicleId: string | null;
  vehicleName: string;
  userId: string;
  userName: string;
  purpose: string;
  passengerCount: number;
  startDate: string;
  endDate: string;
  status: string;
  notes: string | null;
  createdAt: string | null;
}

export interface DetailedVehicle {
  id: string;
  vehicleId: string;
  make: string;
  model: string;
  year: number;
  category: string;
  status: string;
  currentMileage: number | null;
  fuelType: string;
  licensePlate: string | null;
}

export interface FleetOverview {
  totalVehicles: number;
  availableVehicles: number;
  inUseVehicles: number;
  outOfServiceVehicles: number;
  totalReservations: number;
  activeReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  totalMaintenanceCost: number;
  avgUtilizationRate: number;
  byCategory: { category: string; count: number }[];
  byStatus: { status: string; count: number }[];
  reservationsByMonth: { month: string; count: number }[];
  maintenanceByVehicle: { vehicleId: string; vehicleName: string; cost: number; count: number }[];
  detailedReservations: DetailedReservation[];
  detailedVehicles: DetailedVehicle[];
}

export interface DetailedServiceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
  requesterId: string;
  requesterName: string;
  propertyId: string | null;
  propertyName: string;
  areaId: string | null;
  areaName: string;
  createdAt: string | null;
  updatedAt: string | null;
  rejectionReason: string | null;
}

export interface ProjectAnalyticsDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  propertyName: string;
  spaceName: string;
  areaName: string;
  startDate: string | null;
  targetEndDate: string | null;
  actualEndDate: string | null;
  budgetAmount: number;
  createdAt: string | null;
}

export interface ProjectsOverview {
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  onHoldProjects: number;
  planningProjects: number;
  cancelledProjects: number;
  completionRate: number;
  totalBudget: number;
  criticalOpen: number;
  highOpen: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  budgetByStatus: { status: string; budget: number }[];
  projects: ProjectAnalyticsDetail[];
}

const REQUESTER_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  technician: "Technician",
  student: "Student",
  staff: "Staff",
  unknown: "Unknown",
};

function formatTaskTypeLabel(taskType: string): string {
  return taskType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export interface ServiceRequestOverview {
  totalRequests: number;
  pendingRequests: number;
  underReviewRequests: number;
  convertedRequests: number;
  rejectedRequests: number;
  conversionRate: number;
  avgResponseTimeHours: number;
  byUrgency: { urgency: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byProperty: { propertyId: string; propertyName: string; count: number }[];
  byArea: { areaId: string; areaName: string; count: number }[];
  monthlyTrend: { month: string; submitted: number; converted: number }[];
  topRequesters: { requesterId: string; requesterName: string; count: number }[];
  byCategory: { category: string; count: number }[];
  funnel: RequestFunnelStage[];
  detailedRequests: DetailedServiceRequest[];
}

export interface AnalyticsDetailOptions {
  includeDetails?: boolean;
}

export interface MetricComparison {
  current: number;
  previous: number;
  changePercent: number | null;
  isPositive: boolean;
}

export interface ExecutiveOverview {
  periodLabel: string;
  previousPeriodLabel: string;
  openTasks: MetricComparison;
  pendingRequests: MetricComparison;
  overdueWorkOrders: MetricComparison;
  fleetAvailable: MetricComparison;
  inventoryLowStock: MetricComparison;
  completionRate: MetricComparison;
  completedInPeriod: MetricComparison;
  convertedInPeriod: MetricComparison;
}

function formatDateLabel(date: Date): string {
  return date.toISOString().split("T")[0];
}

function buildMetricComparison(
  current: number,
  previous: number,
  lowerIsBetter = false,
): MetricComparison {
  let changePercent: number | null = null;
  if (previous > 0) {
    changePercent = Math.round(((current - previous) / previous) * 100);
  } else if (current > 0) {
    changePercent = 100;
  } else {
    changePercent = 0;
  }

  const delta = current - previous;
  const isPositive = lowerIsBetter ? delta < 0 : delta > 0;

  return { current, previous, changePercent, isPositive };
}

export class AnalyticsService {
  resolveComparisonPeriods(filters: AnalyticsFilters): {
    current: AnalyticsFilters;
    previous: AnalyticsFilters;
    periodLabel: string;
    previousPeriodLabel: string;
  } {
    const scope = { ...filters };

    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      const durationMs = Math.max(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000);
      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - durationMs + 1);

      return {
        current: scope,
        previous: {
          ...scope,
          startDate: formatDateLabel(prevStart),
          endDate: formatDateLabel(prevEnd),
        },
        periodLabel: `${formatDateLabel(start)} – ${formatDateLabel(end)}`,
        previousPeriodLabel: `${formatDateLabel(prevStart)} – ${formatDateLabel(prevEnd)}`,
      };
    }

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 30);
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 30);

    const trendCurrent: AnalyticsFilters = {
      ...scope,
      startDate: formatDateLabel(start),
      endDate: formatDateLabel(end),
    };
    const trendPrevious: AnalyticsFilters = {
      ...scope,
      startDate: formatDateLabel(prevStart),
      endDate: formatDateLabel(prevEnd),
    };

    const hasDateScope = Boolean(filters.startDate || filters.endDate);
    return {
      current: hasDateScope ? scope : trendCurrent,
      previous: trendPrevious,
      periodLabel: hasDateScope
        ? filters.startDate
          ? `From ${filters.startDate}`
          : `Until ${filters.endDate}`
        : "Last 30 days",
      previousPeriodLabel: "Prior 30 days",
    };
  }

  async getExecutiveOverview(filters: AnalyticsFilters): Promise<ExecutiveOverview> {
    const { current, previous, periodLabel, previousPeriodLabel } =
      this.resolveComparisonPeriods(filters);

    const fleetDateFilters = {
      startDate: current.startDate,
      endDate: current.endDate,
    };
    const fleetPreviousFilters = {
      startDate: previous.startDate,
      endDate: previous.endDate,
    };

    const [
      woCurrent,
      woPrevious,
      srCurrent,
      srPrevious,
      fleetCurrent,
      fleetPrevious,
      inventorySnapshot,
    ] = await Promise.all([
      this.getWorkOrderOverview(current, { includeDetails: false }),
      this.getWorkOrderOverview(previous, { includeDetails: false }),
      this.getServiceRequestOverview(current, { includeDetails: false }),
      this.getServiceRequestOverview(previous, { includeDetails: false }),
      this.getFleetOverview(fleetDateFilters, { includeDetails: false }),
      this.getFleetOverview(fleetPreviousFilters, { includeDetails: false }),
      this.getInventoryOverview({}),
    ]);

    const openCurrent = woCurrent.totalWorkOrders - woCurrent.completedWorkOrders;
    const openPrevious = woPrevious.totalWorkOrders - woPrevious.completedWorkOrders;

    return {
      periodLabel,
      previousPeriodLabel,
      openTasks: buildMetricComparison(openCurrent, openPrevious, true),
      pendingRequests: buildMetricComparison(
        srCurrent.pendingRequests,
        srPrevious.pendingRequests,
        true,
      ),
      overdueWorkOrders: buildMetricComparison(
        woCurrent.overdueWorkOrders,
        woPrevious.overdueWorkOrders,
        true,
      ),
      fleetAvailable: buildMetricComparison(
        fleetCurrent.availableVehicles,
        fleetPrevious.availableVehicles,
      ),
      inventoryLowStock: {
        current: inventorySnapshot.lowStockCount,
        previous: inventorySnapshot.lowStockCount,
        changePercent: null,
        isPositive: inventorySnapshot.lowStockCount === 0,
      },
      completionRate: buildMetricComparison(
        woCurrent.completionRate,
        woPrevious.completionRate,
      ),
      completedInPeriod: buildMetricComparison(
        woCurrent.completedWorkOrders,
        woPrevious.completedWorkOrders,
      ),
      convertedInPeriod: buildMetricComparison(
        srCurrent.convertedRequests,
        srPrevious.convertedRequests,
      ),
    };
  }

  async getWorkOrderOverview(
    filters: AnalyticsFilters,
    options: AnalyticsDetailOptions = { includeDetails: true },
  ): Promise<WorkOrderOverview> {
    const where = buildTaskWhere(filters);
    const includeDetails = options.includeDetails !== false;

    const [
      totalWorkOrders,
      statusCounts,
      overdueWorkOrders,
      byProperty,
      byTaskType,
      byCategory,
      byRequesterRole,
      monthlyTrendData,
      urgencyRows,
    ] = await Promise.all([
      countTasks(where),
      countTasksByStatus(where),
      countOverdueTasks(where),
      groupTasksByProperty(where, 10),
      groupTasksByTaskType(where),
      groupTasksByRequestCategory(where),
      groupTasksByRequesterRole(where),
      monthlyTaskTrend(where),
      db
        .select({ urgency: tasks.urgency, value: count() })
        .from(tasks)
        .where(where)
        .groupBy(tasks.urgency),
    ]);

    const statusMap = new Map(statusCounts.map((s) => [s.status, s.count]));
    const completedWorkOrders = statusMap.get("completed") ?? 0;
    const inProgressWorkOrders = statusMap.get("in_progress") ?? 0;
    const onHoldWorkOrders = statusMap.get("on_hold") ?? 0;
    const notStartedWorkOrders = statusMap.get("not_started") ?? 0;

    const byStatus = statusCounts
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);

    const byUrgency = ["high", "medium", "low"].map((urgency) => ({
      urgency,
      count: Number(urgencyRows.find((r) => r.urgency === urgency)?.value ?? 0),
    }));

    const completedWhere = where
      ? and(where, eq(tasks.status, "completed"), sql`${tasks.actualCompletionDate} IS NOT NULL`, sql`${tasks.initialDate} IS NOT NULL`)
      : and(eq(tasks.status, "completed"), sql`${tasks.actualCompletionDate} IS NOT NULL`, sql`${tasks.initialDate} IS NOT NULL`);

    const [resolutionRow] = await db
      .select({
        avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionDate} - ${tasks.initialDate})) / 3600)`,
      })
      .from(tasks)
      .where(completedWhere);

    const responseWhere = where
      ? and(where, sql`${tasks.createdAt} IS NOT NULL`, sql`${tasks.initialDate} >= ${tasks.createdAt}`)
      : and(sql`${tasks.createdAt} IS NOT NULL`, sql`${tasks.initialDate} >= ${tasks.createdAt}`);

    const [responseRow] = await db
      .select({
        avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.initialDate} - ${tasks.createdAt})) / 3600)`,
      })
      .from(tasks)
      .where(responseWhere);

    const avgResolutionTimeHours = resolutionRow?.avgHours
      ? Math.round(Number(resolutionRow.avgHours))
      : 0;
    const avgResponseTimeHours = responseRow?.avgHours
      ? Math.round(Number(responseRow.avgHours))
      : 0;

    const areasList = await db.select({ id: areas.id, name: areas.name }).from(areas);
    const spacesList = await db
      .select({ id: spaces.id, name: spaces.name, propertyId: spaces.propertyId })
      .from(spaces);
    const propertiesList = await db.select({ id: properties.id, name: properties.name }).from(properties);
    const areaMap = new Map(areasList.map((a) => [a.id, a.name]));
    const propertyMap = new Map(propertiesList.map((p) => [p.id, p.name]));
    const spaceMap = new Map(spacesList.map((s) => [s.id, { name: s.name, propertyId: s.propertyId }]));

    const spaceRows = await db
      .select({ spaceId: tasks.spaceId, value: count() })
      .from(tasks)
      .where(where ? and(where, sql`${tasks.spaceId} IS NOT NULL`) : sql`${tasks.spaceId} IS NOT NULL`)
      .groupBy(tasks.spaceId)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    const bySpace = spaceRows.map((r) => {
      const spaceInfo = spaceMap.get(r.spaceId!);
      return {
        spaceId: r.spaceId!,
        spaceName: spaceInfo?.name || "Unknown",
        propertyName: spaceInfo?.propertyId ? propertyMap.get(spaceInfo.propertyId) || "Unknown" : "Unknown",
        count: Number(r.value),
      };
    });

    const areaRows = await db
      .select({ areaId: tasks.areaId, value: count() })
      .from(tasks)
      .where(where ? and(where, sql`${tasks.areaId} IS NOT NULL`) : sql`${tasks.areaId} IS NOT NULL`)
      .groupBy(tasks.areaId)
      .orderBy(sql`count(*) desc`);

    const byArea = areaRows.map((r) => ({
      areaId: r.areaId!,
      areaName: areaMap.get(r.areaId!) || "Unknown",
      count: Number(r.value),
    }));

    let detailedRecords: DetailedWorkOrder[] = [];
    if (includeDetails) {
      const usersList = await db.select().from(users);
      const equipmentList = await db.select({ id: equipment.id, name: equipment.name }).from(equipment);
      const userMap = new Map(
        usersList.map((u) => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username]),
      );
      const equipmentMap = new Map(equipmentList.map((e) => [e.id, e.name]));

      const detailTasks = await db
        .select()
        .from(tasks)
        .where(where)
        .orderBy(desc(tasks.createdAt))
        .limit(500);

      detailedRecords = detailTasks.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        status: t.status,
        urgency: t.urgency,
        initialDate: t.initialDate ? new Date(t.initialDate).toISOString() : null,
        estimatedCompletionDate: t.estimatedCompletionDate
          ? new Date(t.estimatedCompletionDate).toISOString()
          : null,
        actualCompletionDate: t.actualCompletionDate
          ? new Date(t.actualCompletionDate).toISOString()
          : null,
        assignedToId: t.assignedToId,
        assignedToName: t.assignedToId ? userMap.get(t.assignedToId) || "Unknown" : "Unassigned",
        propertyId: t.propertyId,
        propertyName: t.propertyId ? propertyMap.get(t.propertyId) || "Unknown" : "N/A",
        spaceId: t.spaceId,
        spaceName: t.spaceId ? spaceMap.get(t.spaceId)?.name || "Unknown" : "N/A",
        areaId: t.areaId,
        areaName: t.areaId ? areaMap.get(t.areaId) || "Unknown" : "N/A",
        equipmentId: t.equipmentId,
        equipmentName: t.equipmentId ? equipmentMap.get(t.equipmentId) || "Unknown" : "N/A",
        taskType: t.taskType,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
      }));
    }

    return {
      totalWorkOrders,
      completedWorkOrders,
      inProgressWorkOrders,
      onHoldWorkOrders,
      notStartedWorkOrders,
      completionRate: totalWorkOrders > 0 ? Math.round((completedWorkOrders / totalWorkOrders) * 100) : 0,
      avgResolutionTimeHours,
      avgResponseTimeHours,
      byStatus,
      byUrgency,
      byProperty,
      bySpace,
      byArea,
      monthlyTrend: monthlyTrendData,
      overdueWorkOrders,
      byTaskType,
      byCategory,
      byRequesterRole: byRequesterRole.map((r) => ({
        role: REQUESTER_ROLE_LABELS[r.role] ?? formatTaskTypeLabel(r.role),
        count: r.count,
      })),
      detailedRecords,
    };
  }

  async getTechnicianPerformance(
    filters: AnalyticsFilters,
    options: AnalyticsDetailOptions = { includeDetails: true },
  ): Promise<TechnicianPerformance[]> {
    const includeDetails = options.includeDetails !== false;
    const roleType = filters.roleType || "all";
    
    let teamMembers;
    if (roleType === "technician") {
      teamMembers = await db
        .select()
        .from(users)
        .where(eq(users.role, "technician"));
    } else if (roleType === "student") {
      teamMembers = await db
        .select()
        .from(users)
        .where(eq(users.role, "student"));
    } else {
      const technicians = await db
        .select()
        .from(users)
        .where(eq(users.role, "technician"));
      const students = await db
        .select()
        .from(users)
        .where(eq(users.role, "student"));
      teamMembers = [...technicians, ...students];
    }
    
    if (filters.technicianId) {
      teamMembers = teamMembers.filter(m => m.id === filters.technicianId);
    }

    const allTasks = await fetchFilteredTasks(filters);
    const taskIds = allTasks.map((t) => t.id);
    const allTimeEntries = await fetchTimeEntriesForTasks(taskIds);
    const propertiesList = await db.select().from(properties);
    const areasList = await db.select().from(areas);
    
    const propertyMap = new Map(propertiesList.map(p => [p.id, p.name]));
    const areaMap = new Map(areasList.map(a => [a.id, a.name]));

    const results: TechnicianPerformance[] = [];

    for (const member of teamMembers) {
      const memberTasks = allTasks.filter(t => t.assignedToId === member.id);
      const completedTasks = memberTasks.filter(t => t.status === "completed");

      const memberTaskIds = new Set(memberTasks.map((t) => t.id));
      const memberTimeEntries = allTimeEntries.filter(
        (te) => te.userId === member.id && memberTaskIds.has(te.taskId),
      );
      const totalMinutes = memberTimeEntries.reduce((sum, te) => sum + (te.durationMinutes || 0), 0);

      const completedTasksWithDates = completedTasks.filter(t => t.actualCompletionDate && t.initialDate);
      let avgCompletionTimeHours = 0;
      if (completedTasksWithDates.length > 0) {
        const totalMs = completedTasksWithDates.reduce((sum, t) => {
          const start = new Date(t.initialDate).getTime();
          const end = new Date(t.actualCompletionDate!).getTime();
          return sum + (end - start);
        }, 0);
        avgCompletionTimeHours = Math.round((totalMs / completedTasksWithDates.length) / (1000 * 60 * 60));
      }

      const taskDetails: TechnicianTaskDetail[] = includeDetails
        ? memberTasks
            .sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA;
            })
            .map((task) => {
              const taskTimeEntries = allTimeEntries.filter(
                (te) => te.taskId === task.id && te.userId === member.id,
              );
              const taskMinutes = taskTimeEntries.reduce(
                (sum, te) => sum + (te.durationMinutes || 0),
                0,
              );
              return {
                taskId: task.id,
                taskName: task.name,
                description: task.description,
                status: task.status,
                urgency: task.urgency,
                initialDate: task.initialDate ? new Date(task.initialDate).toISOString() : null,
                completionDate: task.actualCompletionDate
                  ? new Date(task.actualCompletionDate).toISOString()
                  : null,
                propertyName: task.propertyId ? propertyMap.get(task.propertyId) || "Unknown" : "N/A",
                areaName: task.areaId ? areaMap.get(task.areaId) || "Unknown" : "N/A",
                hoursLogged: Math.round((taskMinutes / 60) * 10) / 10,
              };
            })
        : [];

      results.push({
        technicianId: member.id,
        technicianName: `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.username,
        memberType: member.role === "student" ? "student" : "technician",
        tasksCompleted: completedTasks.length,
        tasksAssigned: memberTasks.length,
        totalHoursLogged: Math.round(totalMinutes / 60),
        avgCompletionTimeHours,
        completionRate: memberTasks.length > 0 ? Math.round((completedTasks.length / memberTasks.length) * 100) : 0,
        taskDetails,
      });
    }

    return results.sort((a, b) => b.tasksCompleted - a.tasksCompleted);
  }

  async getAssetHealth(
    filters: AnalyticsFilters,
    options: AnalyticsDetailOptions = { includeDetails: true },
  ): Promise<AssetHealth[]> {
    const includeDetails = options.includeDetails !== false;
    const allEquipment = await db.select().from(equipment);
    const propertiesList = await db.select().from(properties);
    const propertyMap = new Map(propertiesList.map(p => [p.id, p.name]));

    // Fetch all users (technicians) for mapping
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username]));

    const allTasks = await fetchFilteredTasks(filters);
    const taskIds = allTasks.map((t) => t.id);
    const allParts = await fetchPartsForTasks(taskIds);
    const allTimeEntries = await fetchTimeEntriesForTasks(taskIds);

    const results: AssetHealth[] = [];
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const equipmentList = filters.propertyId
      ? allEquipment.filter((eq) => eq.propertyId === filters.propertyId)
      : allEquipment;

    for (const eq of equipmentList) {
      const equipmentTasks = allTasks.filter(t => t.equipmentId === eq.id);
      const equipmentParts = allParts.filter(p => 
        equipmentTasks.some(t => t.id === p.taskId)
      );
      const equipmentTime = allTimeEntries.filter(te => 
        equipmentTasks.some(t => t.id === te.taskId)
      );

      const partsCost = equipmentParts.reduce((sum, p) => sum + (p.cost || 0), 0);
      const laborHours = equipmentTime.reduce((sum, te) => sum + (te.durationMinutes || 0), 0) / 60;
      const laborCost = laborHours * 50;

      const lastTask = equipmentTasks
        .filter(t => t.status === "completed" && t.actualCompletionDate)
        .sort((a, b) => new Date(b.actualCompletionDate!).getTime() - new Date(a.actualCompletionDate!).getTime())[0];

      const serviceHistory: ServiceRecord[] = includeDetails
        ? equipmentTasks.map(task => {
        const taskParts = allParts.filter(p => p.taskId === task.id);
        const taskTime = allTimeEntries.filter(te => te.taskId === task.id);
        
        const taskPartsCost = taskParts.reduce((sum, p) => sum + (p.cost || 0), 0);
        const taskLaborMinutes = taskTime.reduce((sum, te) => sum + (te.durationMinutes || 0), 0);
        const taskLaborHours = taskLaborMinutes / 60;
        const taskLaborCost = taskLaborHours * 50;

        const rawServiceDate = task.actualCompletionDate || task.initialDate;

        return {
          taskId: task.id,
          taskName: task.name,
          taskDescription: task.description,
          serviceDate: rawServiceDate ? new Date(rawServiceDate).toISOString() : null,
          technicianId: task.assignedToId,
          technicianName: task.assignedToId ? userMap.get(task.assignedToId) || "Unknown" : "Unassigned",
          status: task.status,
          urgency: task.urgency,
          hoursLogged: Math.round(taskLaborHours * 10) / 10,
          partsCost: Math.round(taskPartsCost),
          laborCost: Math.round(taskLaborCost),
        };
      }).sort((a, b) => {
        if (!a.serviceDate || !b.serviceDate) return 0;
        return new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime();
      })
        : [];

      const lastMaintenanceDateRaw = lastTask?.actualCompletionDate;

      results.push({
        equipmentId: eq.id,
        equipmentName: eq.name,
        propertyName: propertyMap.get(eq.propertyId) || "Unknown",
        category: eq.category,
        condition: eq.condition,
        workOrderCount: equipmentTasks.length,
        totalMaintenanceCost: Math.round(partsCost + laborCost),
        lastMaintenanceDate: lastMaintenanceDateRaw ? new Date(lastMaintenanceDateRaw).toISOString() : null,
        lastServicedBy: lastTask?.assignedToId ? userMap.get(lastTask.assignedToId) || null : null,
        failureFrequency: equipmentTasks.filter(
          (t) => t.createdAt && new Date(t.createdAt) >= ninetyDaysAgo,
        ).length,
        serviceHistory,
      });
    }

    return results.sort((a, b) => b.workOrderCount - a.workOrderCount);
  }

  async getFacilityInsights(
    filters: AnalyticsFilters,
    options: AnalyticsDetailOptions = { includeDetails: true },
  ): Promise<FacilityInsights[]> {
    const includeDetails = options.includeDetails !== false;
    const propertiesList = await db.select().from(properties);
    const usersList = await db.select().from(users);
    const areasList = await db.select().from(areas);
    const equipmentList = await db.select().from(equipment);
    const spacesList = await db.select().from(spaces);

    const userMap = new Map(usersList.map(u => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username]));
    const areaMap = new Map(areasList.map(a => [a.id, a.name]));
    const equipmentMap = new Map(equipmentList.map(e => [e.id, e.name]));
    const spaceMap = new Map(spacesList.map(s => [s.id, s]));

    const allTasks = await fetchFilteredTasks(filters);
    const taskIds = allTasks.map((t) => t.id);
    const allParts = await fetchPartsForTasks(taskIds);
    const allTimeEntries = await fetchTimeEntriesForTasks(taskIds);

    const results: FacilityInsights[] = [];
    const propertiesToProcess = filters.propertyId
      ? propertiesList.filter((p) => p.id === filters.propertyId)
      : propertiesList;

    for (const prop of propertiesToProcess) {
      const propertyTasks = allTasks.filter(t => t.propertyId === prop.id);
      const completedTasks = propertyTasks.filter(t => t.status === "completed");
      const openTasks = propertyTasks.filter(t => t.status !== "completed");
      const emergencyTasks = propertyTasks.filter(t => t.urgency === "high");
      const recurringTasks = propertyTasks.filter(t => t.taskType === "recurring");

      const propertyParts = allParts.filter(p => 
        propertyTasks.some(t => t.id === p.taskId)
      );
      const propertyTime = allTimeEntries.filter(te => 
        propertyTasks.some(t => t.id === te.taskId)
      );

      const partsCost = propertyParts.reduce((sum, p) => sum + (p.cost || 0), 0);
      const laborHours = propertyTime.reduce((sum, te) => sum + (te.durationMinutes || 0), 0) / 60;
      const laborCost = laborHours * 50;

      const workOrderDetails: FacilityWorkOrder[] = includeDetails
        ? propertyTasks
            .sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA;
            })
            .map((task) => ({
              taskId: task.id,
              taskName: task.name,
              description: task.description,
              status: task.status,
              urgency: task.urgency,
              initialDate: task.initialDate ? new Date(task.initialDate).toISOString() : null,
              completionDate: task.actualCompletionDate
                ? new Date(task.actualCompletionDate).toISOString()
                : null,
              assignedToName: task.assignedToId ? userMap.get(task.assignedToId) || "Unknown" : "Unassigned",
              areaName: task.areaId ? areaMap.get(task.areaId) || "Unknown" : "N/A",
              equipmentName: task.equipmentId ? equipmentMap.get(task.equipmentId) || "Unknown" : "N/A",
              spaceName: task.spaceId ? spaceMap.get(task.spaceId)?.name || "Unknown" : "N/A",
              taskType: task.taskType,
            }))
        : [];

      // Calculate space analytics for building properties
      const propertySpaces = spacesList.filter(s => s.propertyId === prop.id);
      const spaceAnalytics: SpaceAnalytics[] = propertySpaces.map(space => {
        const spaceTasks = propertyTasks.filter(t => t.spaceId === space.id);
        const completedSpaceTasks = spaceTasks.filter(t => t.status === "completed");
        const openSpaceTasks = spaceTasks.filter(t => t.status !== "completed");
        return {
          spaceId: space.id,
          spaceName: space.name,
          floor: space.floor,
          workOrderCount: spaceTasks.length,
          completedWorkOrders: completedSpaceTasks.length,
          openWorkOrders: openSpaceTasks.length,
        };
      }).sort((a, b) => b.workOrderCount - a.workOrderCount);

      results.push({
        propertyId: prop.id,
        propertyName: prop.name,
        propertyType: prop.type,
        totalWorkOrders: propertyTasks.length,
        completedWorkOrders: completedTasks.length,
        openWorkOrders: openTasks.length,
        totalMaintenanceCost: Math.round(partsCost + laborCost),
        emergencyWorkOrders: emergencyTasks.length,
        preventiveWorkOrders: recurringTasks.length,
        workOrderDetails,
        spaceAnalytics,
      });
    }

    return results.sort((a, b) => b.totalWorkOrders - a.totalWorkOrders);
  }

  async getAlerts(filters: AnalyticsFilters): Promise<Alert[]> {
    const now = new Date();
    const alerts: Alert[] = [];

    const allTasks = await fetchFilteredTasks(filters);

    const overdueTasks = allTasks.filter(t => 
      t.status !== "completed" && 
      t.estimatedCompletionDate && 
      new Date(t.estimatedCompletionDate) < now
    );

    overdueTasks.forEach(task => {
      const daysOverdue = Math.floor((now.getTime() - new Date(task.estimatedCompletionDate!).getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `overdue-${task.id}`,
        type: "overdue",
        severity: daysOverdue > 7 ? "high" : daysOverdue > 3 ? "medium" : "low",
        title: "Overdue Work Order",
        description: `"${task.name}" is ${daysOverdue} day(s) overdue`,
        relatedId: task.id,
        relatedType: "task",
        createdAt: now,
      });
    });

    const highUrgencyNotStarted = allTasks.filter(t => 
      t.urgency === "high" && 
      t.status === "not_started" &&
      t.createdAt &&
      (now.getTime() - new Date(t.createdAt).getTime()) > (24 * 60 * 60 * 1000)
    );

    highUrgencyNotStarted.forEach(task => {
      alerts.push({
        id: `sla-${task.id}`,
        type: "sla_breach",
        severity: "high",
        title: "SLA Breach Risk",
        description: `High urgency task "${task.name}" has not been started`,
        relatedId: task.id,
        relatedType: "task",
        createdAt: now,
      });
    });

    const alertWindowStart = new Date();
    alertWindowStart.setDate(alertWindowStart.getDate() - 90);

    const allEquipment = await db.select().from(equipment);
    for (const eq of allEquipment) {
      const recentEquipmentTasks = allTasks.filter(
        (t) =>
          t.equipmentId === eq.id &&
          t.createdAt &&
          new Date(t.createdAt) >= alertWindowStart,
      );
      if (recentEquipmentTasks.length >= 5) {
        alerts.push({
          id: `failure-${eq.id}`,
          type: "high_failure",
          severity: recentEquipmentTasks.length >= 10 ? "high" : "medium",
          title: "High Failure Rate",
          description: `Equipment "${eq.name}" has ${recentEquipmentTasks.length} work orders in the last 90 days`,
          relatedId: eq.id,
          relatedType: "equipment",
          createdAt: now,
        });
      }
    }

    const recurringWindowStart = new Date();
    recurringWindowStart.setDate(recurringWindowStart.getDate() - 30);
    const recurringGroups = new Map<string, typeof allTasks>();
    for (const task of allTasks) {
      if (!task.createdAt || new Date(task.createdAt) < recurringWindowStart) continue;
      const key = task.equipmentId
        ? `eq-${task.equipmentId}`
        : `loc-${task.propertyId ?? "none"}-${task.areaId ?? "none"}`;
      const group = recurringGroups.get(key) ?? [];
      group.push(task);
      recurringGroups.set(key, group);
    }

    const propertiesList = await db.select().from(properties);
    const propertyNameMap = new Map(propertiesList.map((p) => [p.id, p.name]));

    for (const [key, groupTasks] of Array.from(recurringGroups.entries())) {
      if (groupTasks.length < 3) continue;
      const sample = groupTasks[0];
      const isEquipment = key.startsWith("eq-");
      const relatedId = isEquipment ? sample.equipmentId! : sample.propertyId ?? key;
      const relatedType = isEquipment ? "equipment" as const : "property" as const;
      const label = isEquipment
        ? allEquipment.find((e) => e.id === sample.equipmentId)?.name ?? "Equipment"
        : propertyNameMap.get(sample.propertyId ?? "") ?? "Location";
      alerts.push({
        id: `recurring-${key}`,
        type: "recurring_issue",
        severity: groupTasks.length >= 5 ? "high" : "medium",
        title: "Recurring Issue",
        description: `${groupTasks.length} work orders in 30 days at ${label}`,
        relatedId,
        relatedType,
        createdAt: now,
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  async getWorkOrderTrends(filters: AnalyticsFilters) {
    const allTasks = await fetchFilteredTasks(filters);

    const weeklyTrend: Record<string, { created: number; completed: number; high: number }> = {};

    allTasks.forEach(task => {
      if (task.createdAt) {
        const date = new Date(task.createdAt);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split("T")[0];

        if (!weeklyTrend[weekKey]) {
          weeklyTrend[weekKey] = { created: 0, completed: 0, high: 0 };
        }
        weeklyTrend[weekKey].created++;
        if (task.urgency === "high") {
          weeklyTrend[weekKey].high++;
        }
      }

      if (task.status === "completed" && task.actualCompletionDate) {
        const date = new Date(task.actualCompletionDate);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split("T")[0];

        if (!weeklyTrend[weekKey]) {
          weeklyTrend[weekKey] = { created: 0, completed: 0, high: 0 };
        }
        weeklyTrend[weekKey].completed++;
      }
    });

    return Object.entries(weeklyTrend)
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12);
  }

  async getExportData(dataType: string, filters: AnalyticsFilters): Promise<{ headers: string[], data: any[][] }> {
    let data: any[][] = [];
    let headers: string[] = [];

    switch (dataType) {
      case "work-orders":
        const overview = await this.getWorkOrderOverview(filters);
        headers = ["Metric", "Value"];
        data = [
          ["Total Work Orders", overview.totalWorkOrders],
          ["Completed", overview.completedWorkOrders],
          ["In Progress", overview.inProgressWorkOrders],
          ["On Hold", overview.onHoldWorkOrders],
          ["Not Started", overview.notStartedWorkOrders],
          ["Completion Rate", `${overview.completionRate}%`],
          ["Avg Resolution Time (hrs)", overview.avgResolutionTimeHours],
          ["Overdue Work Orders", overview.overdueWorkOrders],
        ];
        break;

      case "work-orders-detailed":
        const woDetailData = await this.getWorkOrderOverview(filters);
        headers = ["Name", "Description", "Status", "Urgency", "Assigned To", "Property", "Area", "Equipment", "Task Type", "Start Date", "Due Date", "Completed Date", "Created At"];
        data = woDetailData.detailedRecords.map(wo => [
          wo.name,
          wo.description,
          wo.status.replace(/_/g, " "),
          wo.urgency,
          wo.assignedToName,
          wo.propertyName,
          wo.areaName,
          wo.equipmentName,
          wo.taskType,
          wo.initialDate ? new Date(wo.initialDate).toLocaleDateString() : "N/A",
          wo.estimatedCompletionDate ? new Date(wo.estimatedCompletionDate).toLocaleDateString() : "N/A",
          wo.actualCompletionDate ? new Date(wo.actualCompletionDate).toLocaleDateString() : "N/A",
          wo.createdAt ? new Date(wo.createdAt).toLocaleDateString() : "N/A",
        ]);
        break;

      case "work-orders-complete":
        const completeData = await this.getWorkOrderOverview(filters);
        
        const reportDate = new Date().toLocaleDateString();
        const dateRange = filters.startDate && filters.endDate 
          ? `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`
          : filters.startDate 
            ? `From ${new Date(filters.startDate).toLocaleDateString()}`
            : filters.endDate
              ? `Until ${new Date(filters.endDate).toLocaleDateString()}`
              : "All Time";
        
        headers = ["Work Order Name", "Description", "Status", "Priority", "Assigned To", "Building", "Area", "Equipment", "Task Type", "Start Date", "Due Date", "Completed Date"];
        
        data.push(["=== WORK ORDERS REPORT ===", "", "", "", "", "", "", "", "", "", "", ""]);
        data.push(["Report Generated:", reportDate, "", "", "", "", "", "", "", "", "", ""]);
        data.push(["Date Range:", dateRange, "", "", "", "", "", "", "", "", "", ""]);
        data.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
        
        data.push(["=== SUMMARY ===", "", "", "", "", "", "", "", "", "", "", ""]);
        data.push(["Total Work Orders:", String(completeData.totalWorkOrders), "", "", "", "", "", "", "", "", "", ""]);
        data.push(["Completed:", String(completeData.completedWorkOrders), `(${completeData.completionRate}%)`, "", "", "", "", "", "", "", "", ""]);
        data.push(["In Progress:", String(completeData.inProgressWorkOrders), "", "", "", "", "", "", "", "", "", ""]);
        data.push(["On Hold:", String(completeData.onHoldWorkOrders), "", "", "", "", "", "", "", "", "", ""]);
        data.push(["Not Started:", String(completeData.notStartedWorkOrders), "", "", "", "", "", "", "", "", "", ""]);
        data.push(["Overdue:", String(completeData.overdueWorkOrders), "", "", "", "", "", "", "", "", "", ""]);
        data.push(["Avg Resolution Time:", `${completeData.avgResolutionTimeHours} hours`, "", "", "", "", "", "", "", "", "", ""]);
        data.push(["Avg Response Time:", `${completeData.avgResponseTimeHours} hours`, "", "", "", "", "", "", "", "", "", ""]);
        data.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
        
        data.push(["=== STATUS BREAKDOWN ===", "Count", "Percentage", "", "", "", "", "", "", "", "", ""]);
        for (const status of completeData.byStatus) {
          const pct = completeData.totalWorkOrders > 0 ? Math.round((status.count / completeData.totalWorkOrders) * 100) : 0;
          data.push([status.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), String(status.count), `${pct}%`, "", "", "", "", "", "", "", "", ""]);
        }
        data.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
        
        data.push(["=== PRIORITY BREAKDOWN ===", "Count", "Percentage", "", "", "", "", "", "", "", "", ""]);
        for (const urgency of completeData.byUrgency) {
          const pct = completeData.totalWorkOrders > 0 ? Math.round((urgency.count / completeData.totalWorkOrders) * 100) : 0;
          data.push([urgency.urgency.charAt(0).toUpperCase() + urgency.urgency.slice(1), String(urgency.count), `${pct}%`, "", "", "", "", "", "", "", "", ""]);
        }
        data.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
        
        data.push(["=== BY BUILDING ===", "Count", "Percentage", "", "", "", "", "", "", "", "", ""]);
        for (const prop of completeData.byProperty) {
          const pct = completeData.totalWorkOrders > 0 ? Math.round((prop.count / completeData.totalWorkOrders) * 100) : 0;
          data.push([prop.propertyName, String(prop.count), `${pct}%`, "", "", "", "", "", "", "", "", ""]);
        }
        data.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
        
        data.push(["=== BY AREA ===", "Count", "Percentage", "", "", "", "", "", "", "", "", ""]);
        for (const area of completeData.byArea) {
          const pct = completeData.totalWorkOrders > 0 ? Math.round((area.count / completeData.totalWorkOrders) * 100) : 0;
          data.push([area.areaName, String(area.count), `${pct}%`, "", "", "", "", "", "", "", "", ""]);
        }
        data.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
        
        data.push(["=== MONTHLY TREND ===", "Created", "Completed", "", "", "", "", "", "", "", "", ""]);
        for (const month of completeData.monthlyTrend) {
          data.push([month.month, String(month.count), String(month.completed), "", "", "", "", "", "", "", "", ""]);
        }
        data.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
        
        data.push(["=== WORK ORDER DETAILS ===", "", "", "", "", "", "", "", "", "", "", ""]);
        data.push(["Work Order Name", "Description", "Status", "Priority", "Assigned To", "Building", "Area", "Equipment", "Task Type", "Start Date", "Due Date", "Completed Date"]);
        for (const wo of completeData.detailedRecords) {
          data.push([
            wo.name,
            wo.description,
            wo.status.replace(/_/g, " "),
            wo.urgency,
            wo.assignedToName,
            wo.propertyName,
            wo.areaName,
            wo.equipmentName,
            wo.taskType,
            wo.initialDate ? new Date(wo.initialDate).toLocaleDateString() : "N/A",
            wo.estimatedCompletionDate ? new Date(wo.estimatedCompletionDate).toLocaleDateString() : "N/A",
            wo.actualCompletionDate ? new Date(wo.actualCompletionDate).toLocaleDateString() : "N/A",
          ]);
        }
        break;

      case "technicians":
        const techData = await this.getTechnicianPerformance(filters);
        headers = ["Technician", "Tasks Completed", "Tasks Assigned", "Hours Logged", "Avg Completion Time (hrs)", "Completion Rate"];
        data = techData.map(t => [
          t.technicianName,
          t.tasksCompleted,
          t.tasksAssigned,
          t.totalHoursLogged,
          t.avgCompletionTimeHours,
          `${t.completionRate}%`,
        ]);
        break;

      case "technicians-detailed":
        const techDetailData = await this.getTechnicianPerformance(filters);
        headers = ["Technician", "Task Name", "Description", "Status", "Urgency", "Property", "Area", "Hours Logged", "Start Date", "Completion Date"];
        for (const tech of techDetailData) {
          for (const task of tech.taskDetails) {
            data.push([
              tech.technicianName,
              task.taskName,
              task.description,
              task.status.replace(/_/g, " "),
              task.urgency,
              task.propertyName,
              task.areaName,
              task.hoursLogged,
              task.initialDate ? new Date(task.initialDate).toLocaleDateString() : "N/A",
              task.completionDate ? new Date(task.completionDate).toLocaleDateString() : "N/A",
            ]);
          }
        }
        break;

      case "assets":
        const assetData = await this.getAssetHealth(filters);
        headers = ["Equipment", "Property", "Category", "Condition", "Work Orders", "Maintenance Cost", "Last Service Date", "Serviced By"];
        data = assetData.map(a => [
          a.equipmentName,
          a.propertyName,
          a.category,
          a.condition || "Unknown",
          a.workOrderCount,
          `$${a.totalMaintenanceCost}`,
          a.lastMaintenanceDate ? new Date(a.lastMaintenanceDate).toLocaleDateString() : "Never",
          a.lastServicedBy || "N/A",
        ]);
        break;

      case "assets-detailed":
        const assetDetailData = await this.getAssetHealth(filters);
        headers = ["Equipment", "Property", "Task Name", "Task Description", "Service Date", "Technician", "Status", "Urgency", "Hours Logged", "Parts Cost", "Labor Cost", "Total Cost"];
        for (const asset of assetDetailData) {
          for (const record of asset.serviceHistory) {
            data.push([
              asset.equipmentName,
              asset.propertyName,
              record.taskName,
              record.taskDescription,
              record.serviceDate ? new Date(record.serviceDate).toLocaleDateString() : "Not scheduled",
              record.technicianName,
              record.status.replace(/_/g, " "),
              record.urgency,
              record.hoursLogged,
              `$${record.partsCost}`,
              `$${record.laborCost}`,
              `$${record.partsCost + record.laborCost}`,
            ]);
          }
        }
        break;

      case "facilities":
        const facilityData = await this.getFacilityInsights(filters);
        headers = ["Property", "Type", "Total WOs", "Completed", "Open", "Maintenance Cost", "Emergency WOs"];
        data = facilityData.map(f => [
          f.propertyName,
          f.propertyType,
          f.totalWorkOrders,
          f.completedWorkOrders,
          f.openWorkOrders,
          `$${f.totalMaintenanceCost}`,
          f.emergencyWorkOrders,
        ]);
        break;

      case "facilities-detailed":
        const facilityDetailData = await this.getFacilityInsights(filters);
        headers = ["Facility", "Task Name", "Description", "Status", "Urgency", "Assigned To", "Area", "Equipment", "Task Type", "Start Date", "Completion Date"];
        for (const facility of facilityDetailData) {
          for (const wo of facility.workOrderDetails) {
            data.push([
              facility.propertyName,
              wo.taskName,
              wo.description,
              wo.status.replace(/_/g, " "),
              wo.urgency,
              wo.assignedToName,
              wo.areaName,
              wo.equipmentName,
              wo.taskType,
              wo.initialDate ? new Date(wo.initialDate).toLocaleDateString() : "N/A",
              wo.completionDate ? new Date(wo.completionDate).toLocaleDateString() : "N/A",
            ]);
          }
        }
        break;

      case "alerts":
        const alertData = await this.getAlerts(filters);
        headers = ["Type", "Severity", "Title", "Description"];
        data = alertData.map(a => [a.type, a.severity, a.title, a.description]);
        break;

      case "fleet":
        const fleetData = await this.getFleetOverview(filters);
        headers = ["Metric", "Value"];
        data = [
          ["Total Vehicles", fleetData.totalVehicles],
          ["Available Vehicles", fleetData.availableVehicles],
          ["In Use Vehicles", fleetData.inUseVehicles],
          ["Out of Service Vehicles", fleetData.outOfServiceVehicles],
          ["Total Reservations", fleetData.totalReservations],
          ["Active Reservations", fleetData.activeReservations],
          ["Completed Reservations", fleetData.completedReservations],
          ["Cancelled Reservations", fleetData.cancelledReservations],
          ["Total Maintenance Cost", `$${fleetData.totalMaintenanceCost}`],
          ["Avg Utilization Rate", `${fleetData.avgUtilizationRate}%`],
        ];
        break;

      case "fleet-reservations":
        const fleetResData = await this.getFleetOverview(filters);
        headers = ["Vehicle", "User", "Purpose", "Status", "Passengers", "Start Date", "End Date", "Notes", "Created At"];
        data = fleetResData.detailedReservations.map(r => [
          r.vehicleName,
          r.userName,
          r.purpose,
          r.status,
          r.passengerCount,
          r.startDate ? new Date(r.startDate).toLocaleDateString() : "N/A",
          r.endDate ? new Date(r.endDate).toLocaleDateString() : "N/A",
          r.notes || "N/A",
          r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A",
        ]);
        break;

      case "fleet-vehicles":
        const fleetVehData = await this.getFleetOverview(filters);
        headers = ["Vehicle ID", "Make", "Model", "Year", "Category", "Status", "Current Mileage", "Fuel Type", "License Plate"];
        data = fleetVehData.detailedVehicles.map(v => [
          v.vehicleId,
          v.make,
          v.model,
          v.year,
          v.category,
          v.status.replace(/_/g, " "),
          v.currentMileage || "N/A",
          v.fuelType,
          v.licensePlate || "N/A",
        ]);
        break;

      case "fleet-detailed":
        const fleetFullData = await this.getFleetOverview(filters);
        headers = ["Type", "Vehicle", "Make/Model", "Year", "Status", "User/Purpose", "Start Date", "End Date", "Mileage/Passengers", "Notes"];
        // First add summary metrics
        data = [
          ["SUMMARY", "Total Vehicles", String(fleetFullData.totalVehicles), "", "", "", "", "", "", ""],
          ["SUMMARY", "Available", String(fleetFullData.availableVehicles), "", "", "", "", "", "", ""],
          ["SUMMARY", "In Use", String(fleetFullData.inUseVehicles), "", "", "", "", "", "", ""],
          ["SUMMARY", "Out of Service", String(fleetFullData.outOfServiceVehicles), "", "", "", "", "", "", ""],
          ["SUMMARY", "Total Reservations", String(fleetFullData.totalReservations), "", "", "", "", "", "", ""],
          ["SUMMARY", "Utilization Rate", `${fleetFullData.avgUtilizationRate}%`, "", "", "", "", "", "", ""],
          ["", "", "", "", "", "", "", "", "", ""],
        ];
        // Add all vehicles
        fleetFullData.detailedVehicles.forEach(v => {
          data.push([
            "VEHICLE",
            v.vehicleId,
            `${v.make} ${v.model}`,
            String(v.year),
            v.status.replace(/_/g, " "),
            v.category,
            "",
            "",
            String(v.currentMileage || "N/A"),
            v.licensePlate || "",
          ]);
        });
        // Add separator
        data.push(["", "", "", "", "", "", "", "", "", ""]);
        // Add all reservations
        fleetFullData.detailedReservations.forEach(r => {
          data.push([
            "RESERVATION",
            r.vehicleName,
            "",
            "",
            r.status,
            `${r.userName} - ${r.purpose}`,
            r.startDate ? new Date(r.startDate).toLocaleDateString() : "N/A",
            r.endDate ? new Date(r.endDate).toLocaleDateString() : "N/A",
            String(r.passengerCount || "N/A"),
            r.notes || "",
          ]);
        });
        break;

      case "service-requests":
        const srData = await this.getServiceRequestOverview(filters);
        headers = ["Metric", "Value"];
        data = [
          ["Total Requests", srData.totalRequests],
          ["Pending Review", srData.pendingRequests],
          ["Under Review", srData.underReviewRequests],
          ["Approved", srData.convertedRequests],
          ["Rejected Requests", srData.rejectedRequests],
          ["Conversion Rate", `${srData.conversionRate}%`],
          ["Avg Response Time (hrs)", srData.avgResponseTimeHours],
        ];
        break;

      case "service-requests-detailed":
        const srDetailData = await this.getServiceRequestOverview(filters);
        headers = ["Title", "Description", "Status", "Urgency", "Requester", "Property", "Area", "Created At", "Updated At", "Rejection Reason"];
        data = srDetailData.detailedRequests.map(r => [
          r.title,
          r.description,
          r.status.replace(/_/g, " "),
          r.urgency,
          r.requesterName,
          r.propertyName,
          r.areaName,
          r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A",
          r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "N/A",
          r.rejectionReason || "N/A",
        ]);
        break;

      default:
        throw new Error("Invalid data type for export");
    }

    return { headers, data };
  }

  async exportData(dataType: string, filters: AnalyticsFilters): Promise<string> {
    const { headers, data } = await this.getExportData(dataType, filters);
    const csvRows = [headers.join(",")];
    data.forEach(row => {
      csvRows.push(row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","));
    });

    return csvRows.join("\n");
  }

  async getFleetOverview(
    filters: AnalyticsFilters,
    options: AnalyticsDetailOptions = { includeDetails: true },
  ): Promise<FleetOverview> {
    const includeDetails = options.includeDetails !== false;
    const allVehicles = await db.select().from(vehicles);
    const allReservations = await db.select().from(vehicleReservations);
    
    // Try to get maintenance logs, but handle if table doesn't exist
    let allMaintenanceLogs: any[] = [];
    try {
      allMaintenanceLogs = await db.select().from(vehicleMaintenanceLogs);
    } catch (error) {
      console.warn("Vehicle maintenance logs table not available, skipping maintenance data");
    }

    const now = new Date();

    const periodEnd = filters.endDate ? new Date(filters.endDate) : now;
    periodEnd.setHours(23, 59, 59, 999);
    const periodStart = filters.startDate
      ? new Date(filters.startDate)
      : new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    periodStart.setHours(0, 0, 0, 0);

    const reservationOverlapsPeriod = (start: Date, end: Date) =>
      end.getTime() >= periodStart.getTime() && start.getTime() <= periodEnd.getTime();

    let filteredReservations = allReservations;
    if (filters.startDate || filters.endDate) {
      filteredReservations = filteredReservations.filter((r) =>
        reservationOverlapsPeriod(new Date(r.startDate), new Date(r.endDate)),
      );
    }

    const totalVehicles = allVehicles.length;
    const availableVehicles = allVehicles.filter(v => v.status === "available").length;
    const inUseVehicles = allVehicles.filter(v => v.status === "in_use").length;
    const outOfServiceVehicles = allVehicles.filter(
      (v) =>
        v.status === "needs_maintenance" ||
        v.status === "needs_cleaning" ||
        v.status === "out_of_service",
    ).length;

    const totalReservations = filteredReservations.length;
    const activeReservations = filteredReservations.filter(
      (r) =>
        r.status === "active" ||
        r.status === "pending" ||
        r.status === "approved" ||
        r.status === "pending_review",
    ).length;
    const completedReservations = filteredReservations.filter(r => r.status === "completed").length;
    const cancelledReservations = filteredReservations.filter(r => r.status === "cancelled").length;

    let filteredMaintenanceLogs = allMaintenanceLogs;
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filteredMaintenanceLogs = filteredMaintenanceLogs.filter(
        (log) => log.maintenanceDate && new Date(log.maintenanceDate) >= startDate,
      );
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filteredMaintenanceLogs = filteredMaintenanceLogs.filter(
        (log) => log.maintenanceDate && new Date(log.maintenanceDate) <= endDate,
      );
    }

    const totalMaintenanceCost = filteredMaintenanceLogs.reduce(
      (sum, log) => sum + (Number(log.cost) || 0),
      0,
    );

    const periodMs = Math.max(periodEnd.getTime() - periodStart.getTime(), 24 * 60 * 60 * 1000);
    const periodDays = Math.max(1, Math.ceil(periodMs / (24 * 60 * 60 * 1000)));

    const overlapReservationDays = (start: Date, end: Date) => {
      const overlapStart = Math.max(start.getTime(), periodStart.getTime());
      const overlapEnd = Math.min(end.getTime(), periodEnd.getTime());
      if (overlapEnd <= overlapStart) return 0;
      return Math.max(1, Math.ceil((overlapEnd - overlapStart) / (24 * 60 * 60 * 1000)));
    };

    const reservedVehicleDays = filteredReservations
      .filter((r) =>
        r.status === "completed" ||
        r.status === "active" ||
        r.status === "approved" ||
        r.status === "pending_review",
      )
      .reduce((sum, r) => {
        return sum + overlapReservationDays(new Date(r.startDate), new Date(r.endDate));
      }, 0);

    const capacityVehicleDays = totalVehicles * periodDays;
    const avgUtilizationRate =
      capacityVehicleDays > 0 ? Math.round((reservedVehicleDays / capacityVehicleDays) * 100) : 0;

    // Group by category
    const categoryGroups: Record<string, number> = {};
    allVehicles.forEach(v => {
      categoryGroups[v.category] = (categoryGroups[v.category] || 0) + 1;
    });
    const byCategory = Object.entries(categoryGroups)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Group by status
    const statusGroups: Record<string, number> = {};
    allVehicles.forEach(v => {
      statusGroups[v.status] = (statusGroups[v.status] || 0) + 1;
    });
    const byStatus = Object.entries(statusGroups)
      .map(([status, count]) => ({ status, count }));

    // Reservations by month
    const monthlyGroups: Record<string, number> = {};
    filteredReservations.forEach(r => {
      const date = new Date(r.createdAt!);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyGroups[monthKey] = (monthlyGroups[monthKey] || 0) + 1;
    });
    const reservationsByMonth = Object.entries(monthlyGroups)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    // Maintenance by vehicle
    const vehicleMaintenanceMap: Record<string, { cost: number; count: number }> = {};
    filteredMaintenanceLogs.forEach(log => {
      if (!vehicleMaintenanceMap[log.vehicleId]) {
        vehicleMaintenanceMap[log.vehicleId] = { cost: 0, count: 0 };
      }
      vehicleMaintenanceMap[log.vehicleId].cost += Number(log.cost) || 0;
      vehicleMaintenanceMap[log.vehicleId].count++;
    });
    const maintenanceByVehicle = Object.entries(vehicleMaintenanceMap)
      .map(([vehicleId, data]) => {
        const vehicle = allVehicles.find(v => v.id === vehicleId);
        return {
          vehicleId,
          vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown",
          cost: Math.round(data.cost),
          count: data.count,
        };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    let detailedReservations: DetailedReservation[] = [];
    let detailedVehicles: DetailedVehicle[] = [];

    if (includeDetails) {
      const usersList = await db.select().from(users);
      const userMap = new Map(
        usersList.map((u) => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username]),
      );
      const vehicleMap = new Map(allVehicles.map((v) => [v.id, `${v.year} ${v.make} ${v.model}`]));

      detailedReservations = filteredReservations
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
        .map((r) => ({
          id: r.id,
          vehicleId: r.vehicleId,
          vehicleName: r.vehicleId ? vehicleMap.get(r.vehicleId) || "Unknown" : "Not assigned",
          userId: r.userId,
          userName: userMap.get(r.userId) || "Unknown",
          purpose: r.purpose,
          passengerCount: r.passengerCount,
          startDate: new Date(r.startDate).toISOString(),
          endDate: new Date(r.endDate).toISOString(),
          status: r.status,
          notes: r.notes,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        }));

      detailedVehicles = allVehicles
        .sort((a, b) => a.vehicleId.localeCompare(b.vehicleId))
        .map((v) => ({
          id: v.id,
          vehicleId: v.vehicleId,
          make: v.make,
          model: v.model,
          year: v.year,
          category: v.category,
          status: v.status,
          currentMileage: v.currentMileage,
          fuelType: v.fuelType,
          licensePlate: v.licensePlate,
        }));
    }

    return {
      totalVehicles,
      availableVehicles,
      inUseVehicles,
      outOfServiceVehicles,
      totalReservations,
      activeReservations,
      completedReservations,
      cancelledReservations,
      totalMaintenanceCost: Math.round(totalMaintenanceCost),
      avgUtilizationRate,
      byCategory,
      byStatus,
      reservationsByMonth,
      maintenanceByVehicle,
      detailedReservations,
      detailedVehicles,
    };
  }

  async getServiceRequestOverview(
    filters: AnalyticsFilters,
    options: AnalyticsDetailOptions = { includeDetails: true },
  ): Promise<ServiceRequestOverview> {
    const includeDetails = options.includeDetails !== false;
    const where = buildServiceRequestWhere(filters);

    const [
      totalRequests,
      statusCounts,
      byCategory,
      funnelPendingHours,
      funnelReviewHours,
      funnelConvertedHours,
      funnelRejectedHours,
    ] = await Promise.all([
      countServiceRequests(where),
      countServiceRequestsByStatus(where),
      groupServiceRequestsByCategory(where),
      avgHoursInCurrentStatus("pending", where),
      avgHoursInCurrentStatus("under_review", where),
      avgHoursInCurrentStatus("converted_to_task", where),
      avgHoursInCurrentStatus("rejected", where),
    ]);

    const pendingRequests = statusCounts.pending ?? 0;
    const underReviewRequests = statusCounts.under_review ?? 0;
    const convertedRequests = statusCounts.converted_to_task ?? 0;
    const rejectedRequests = statusCounts.rejected ?? 0;
    const conversionRate = totalRequests > 0 ? Math.round((convertedRequests / totalRequests) * 100) : 0;

    const funnel: RequestFunnelStage[] = [
      { stage: "pending", label: "Pending Review", count: pendingRequests, avgHoursInStage: funnelPendingHours },
      { stage: "under_review", label: "Under Review", count: underReviewRequests, avgHoursInStage: funnelReviewHours },
      { stage: "converted_to_task", label: "Approved", count: convertedRequests, avgHoursInStage: funnelConvertedHours },
      { stage: "rejected", label: "Rejected", count: rejectedRequests, avgHoursInStage: funnelRejectedHours },
    ];

    const processedWhere = where
      ? and(where, sql`${serviceRequests.status} <> 'pending'`)
      : sql`${serviceRequests.status} <> 'pending'`;
    const [responseRow] = await db
      .select({
        avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${serviceRequests.updatedAt} - ${serviceRequests.createdAt})) / 3600)`,
      })
      .from(serviceRequests)
      .where(
        processedWhere
          ? and(processedWhere, sql`${serviceRequests.updatedAt} IS NOT NULL`, sql`${serviceRequests.createdAt} IS NOT NULL`)
          : and(sql`${serviceRequests.updatedAt} IS NOT NULL`, sql`${serviceRequests.createdAt} IS NOT NULL`),
      );
    const avgResponseTimeHours = responseRow?.avgHours ? Math.round(Number(responseRow.avgHours)) : 0;

    const urgencyRows = await db
      .select({ urgency: serviceRequests.urgency, value: count() })
      .from(serviceRequests)
      .where(where)
      .groupBy(serviceRequests.urgency);

    const byUrgency = ["high", "medium", "low"].map((urgency) => ({
      urgency,
      count: Number(urgencyRows.find((r) => r.urgency === urgency)?.value ?? 0),
    }));

    const byStatus = ["pending", "under_review", "converted_to_task", "rejected"].map((status) => ({
      status,
      count: statusCounts[status] ?? 0,
    }));

    const propertyRows = await db
      .select({
        propertyId: serviceRequests.propertyId,
        propertyName: properties.name,
        value: count(),
      })
      .from(serviceRequests)
      .leftJoin(properties, eq(serviceRequests.propertyId, properties.id))
      .where(where ? and(where, sql`${serviceRequests.propertyId} IS NOT NULL`) : sql`${serviceRequests.propertyId} IS NOT NULL`)
      .groupBy(serviceRequests.propertyId, properties.name)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    const byProperty = propertyRows.map((r) => ({
      propertyId: r.propertyId!,
      propertyName: r.propertyName || "Unknown",
      count: Number(r.value),
    }));

    const areaRows = await db
      .select({ areaId: serviceRequests.areaId, areaName: areas.name, value: count() })
      .from(serviceRequests)
      .leftJoin(areas, eq(serviceRequests.areaId, areas.id))
      .where(where ? and(where, sql`${serviceRequests.areaId} IS NOT NULL`) : sql`${serviceRequests.areaId} IS NOT NULL`)
      .groupBy(serviceRequests.areaId, areas.name)
      .orderBy(sql`count(*) desc`);

    const byArea = areaRows.map((r) => ({
      areaId: r.areaId!,
      areaName: r.areaName || "Unknown",
      count: Number(r.value),
    }));

    const monthKey = sql<string>`to_char(${serviceRequests.createdAt}, 'YYYY-MM')`;
    const monthRows = await db
      .select({ month: monthKey, value: count() })
      .from(serviceRequests)
      .where(where ? and(where, sql`${serviceRequests.createdAt} IS NOT NULL`) : sql`${serviceRequests.createdAt} IS NOT NULL`)
      .groupBy(monthKey);

    const convertedMonth = sql<string>`to_char(${serviceRequests.createdAt}, 'YYYY-MM')`;
    const convertedRows = await db
      .select({ month: convertedMonth, value: count() })
      .from(serviceRequests)
      .where(
        where
          ? and(where, eq(serviceRequests.status, "converted_to_task"))
          : eq(serviceRequests.status, "converted_to_task"),
      )
      .groupBy(convertedMonth);

    const monthlyMap = new Map<string, { submitted: number; converted: number }>();
    for (const r of monthRows) {
      monthlyMap.set(r.month, { submitted: Number(r.value), converted: 0 });
    }
    for (const r of convertedRows) {
      const entry = monthlyMap.get(r.month) ?? { submitted: 0, converted: 0 };
      entry.converted = Number(r.value);
      monthlyMap.set(r.month, entry);
    }
    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    const requesterRows = await db
      .select({
        requesterId: serviceRequests.requesterId,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        value: count(),
      })
      .from(serviceRequests)
      .innerJoin(users, eq(serviceRequests.requesterId, users.id))
      .where(where)
      .groupBy(serviceRequests.requesterId, users.firstName, users.lastName, users.username)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    const topRequesters = requesterRows.map((r) => ({
      requesterId: r.requesterId,
      requesterName: `${r.firstName || ""} ${r.lastName || ""}`.trim() || r.username,
      count: Number(r.value),
    }));

    let detailedRequests: DetailedServiceRequest[] = [];
    if (includeDetails) {
      const propertiesList = await db.select({ id: properties.id, name: properties.name }).from(properties);
      const areasList = await db.select({ id: areas.id, name: areas.name }).from(areas);
      const propertyMap = new Map(propertiesList.map((p) => [p.id, p.name]));
      const areaMap = new Map(areasList.map((a) => [a.id, a.name]));
      const usersList = await db.select().from(users);
      const userMap = new Map(
        usersList.map((u) => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username]),
      );

      const detailRows = await db
        .select()
        .from(serviceRequests)
        .where(where)
        .orderBy(desc(serviceRequests.createdAt))
        .limit(500);

      detailedRequests = detailRows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status,
        urgency: r.urgency,
        requesterId: r.requesterId,
        requesterName: userMap.get(r.requesterId) || "Unknown",
        propertyId: r.propertyId,
        propertyName: r.propertyId ? propertyMap.get(r.propertyId) || "Unknown" : "N/A",
        areaId: r.areaId,
        areaName: r.areaId ? areaMap.get(r.areaId) || "Unknown" : "N/A",
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
        rejectionReason: r.rejectionReason,
      }));
    }

    return {
      totalRequests,
      pendingRequests,
      underReviewRequests,
      convertedRequests,
      rejectedRequests,
      conversionRate,
      avgResponseTimeHours,
      byUrgency,
      byStatus,
      byProperty,
      byArea,
      monthlyTrend,
      topRequesters,
      byCategory,
      funnel,
      detailedRequests,
    };
  }

  async getProjectsOverview(
    filters: AnalyticsFilters,
    options: AnalyticsDetailOptions = { includeDetails: true },
  ): Promise<ProjectsOverview> {
    const includeDetails = options.includeDetails !== false;
    const [allProjects, allProperties, allSpaces, allAreas] = await Promise.all([
      db.select().from(projects),
      db.select().from(properties),
      db.select().from(spaces),
      db.select().from(areas),
    ]);

    const propertyMap = new Map(allProperties.map((p) => [p.id, p.name]));
    const spaceMap = new Map(allSpaces.map((s) => [s.id, s.name]));
    const areaMap = new Map(allAreas.map((a) => [a.id, a.name]));

    const projectStatuses = new Set(["planning", "in_progress", "on_hold", "completed", "cancelled"]);

    let filtered = allProjects;

    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filtered = filtered.filter((p) => p.createdAt && new Date(p.createdAt) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((p) => p.createdAt && new Date(p.createdAt) <= end);
    }
    if (filters.propertyId) {
      filtered = filtered.filter((p) => p.propertyId === filters.propertyId);
    }
    if (filters.spaceId) {
      filtered = filtered.filter((p) => p.spaceId === filters.spaceId);
    }
    if (filters.areaId) {
      filtered = filtered.filter((p) => p.areaId === filters.areaId);
    }
    if (filters.status && projectStatuses.has(filters.status)) {
      filtered = filtered.filter((p) => p.status === filters.status);
    }
    if (filters.urgency) {
      filtered = filtered.filter((p) => p.priority === filters.urgency);
    }

    const totalProjects = filtered.length;
    const completedProjects = filtered.filter((p) => p.status === "completed").length;
    const inProgressProjects = filtered.filter((p) => p.status === "in_progress").length;
    const onHoldProjects = filtered.filter((p) => p.status === "on_hold").length;
    const planningProjects = filtered.filter((p) => p.status === "planning").length;
    const cancelledProjects = filtered.filter((p) => p.status === "cancelled").length;
    const completionRate =
      totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
    const totalBudget = filtered.reduce((sum, p) => sum + (Number(p.budgetAmount) || 0), 0);
    const criticalOpen = filtered.filter(
      (p) => p.priority === "critical" && p.status !== "completed" && p.status !== "cancelled",
    ).length;
    const highOpen = filtered.filter(
      (p) => p.priority === "high" && p.status !== "completed" && p.status !== "cancelled",
    ).length;

    const statusKeys = ["completed", "in_progress", "on_hold", "planning", "cancelled"] as const;
    const byStatus = statusKeys
      .map((status) => ({
        status,
        count: filtered.filter((p) => p.status === status).length,
      }))
      .filter((s) => s.count > 0);

    const priorityKeys = ["critical", "high", "medium", "low"] as const;
    const byPriority = priorityKeys
      .map((priority) => ({
        priority,
        count: filtered.filter((p) => p.priority === priority).length,
      }))
      .filter((p) => p.count > 0);

    const budgetByStatus = statusKeys.map((status) => ({
      status,
      budget: filtered
        .filter((p) => p.status === status)
        .reduce((sum, p) => sum + (Number(p.budgetAmount) || 0), 0),
    }));

    const projectRows: ProjectAnalyticsDetail[] = includeDetails
      ? filtered
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        priority: p.priority,
        propertyName: p.propertyId ? propertyMap.get(p.propertyId) || "Unknown" : "—",
        spaceName: p.spaceId ? spaceMap.get(p.spaceId) || "—" : "—",
        areaName: p.areaId ? areaMap.get(p.areaId) || "—" : "—",
        startDate: p.startDate ? new Date(p.startDate).toISOString() : null,
        targetEndDate: p.targetEndDate ? new Date(p.targetEndDate).toISOString() : null,
        actualEndDate: p.actualEndDate ? new Date(p.actualEndDate).toISOString() : null,
        budgetAmount: Number(p.budgetAmount) || 0,
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      }))
      : [];

    return {
      totalProjects,
      completedProjects,
      inProgressProjects,
      onHoldProjects,
      planningProjects,
      cancelledProjects,
      completionRate,
      totalBudget,
      criticalOpen,
      highOpen,
      byStatus,
      byPriority,
      budgetByStatus,
      projects: projectRows,
    };
  }

  async getInventoryOverview(filters?: { startDate?: string; endDate?: string }) {
    const items = await db.select().from(inventoryItems);

    const isItemLowStock = (item: typeof items[number]) => {
      if (item.trackingMode === "status") {
        return item.stockStatus === "low" || item.stockStatus === "out";
      }
      const qty = parseFloat(String(item.quantity ?? 0)) || 0;
      const min = parseFloat(String(item.minQuantity ?? 0)) || 0;
      return min > 0 && qty <= min;
    };

    const lowStockItems = items.filter(isItemLowStock);
    let estimatedValue = 0;
    const byCategoryMap = new Map<string, number>();
    for (const item of items) {
      const cat = item.category || "general";
      byCategoryMap.set(cat, (byCategoryMap.get(cat) || 0) + 1);
      const qty = parseFloat(String(item.quantity ?? 0)) || 0;
      const cost = parseFloat(String(item.cost ?? 0)) || 0;
      estimatedValue += qty * cost;
    }

    const usageConditions = [sql`${partsUsed.inventoryItemId} IS NOT NULL`];
    if (filters?.startDate) {
      usageConditions.push(gte(partsUsed.createdAt, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      usageConditions.push(lte(partsUsed.createdAt, new Date(filters.endDate + "T23:59:59")));
    }

    const usageRows = await db
      .select({
        inventoryItemId: partsUsed.inventoryItemId,
        partName: partsUsed.partName,
        quantity: partsUsed.quantity,
      })
      .from(partsUsed)
      .where(and(...usageConditions));

    const usageByItem = new Map<string, { name: string; totalQty: number }>();
    for (const row of usageRows) {
      if (!row.inventoryItemId) continue;
      const qty = parseFloat(String(row.quantity ?? 0)) || 0;
      const existing = usageByItem.get(row.inventoryItemId);
      if (existing) {
        existing.totalQty += qty;
      } else {
        usageByItem.set(row.inventoryItemId, {
          name: row.partName,
          totalQty: qty,
        });
      }
    }

    const topUsed = Array.from(usageByItem.entries())
      .map(([inventoryItemId, data]) => ({
        inventoryItemId,
        name: items.find((i) => i.id === inventoryItemId)?.name || data.name,
        totalQuantity: data.totalQty,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    return {
      totalItems: items.length,
      lowStockCount: lowStockItems.length,
      estimatedValue: Math.round(estimatedValue * 100) / 100,
      byCategory: Array.from(byCategoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      lowStockItems: lowStockItems.slice(0, 20).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: String(item.quantity ?? 0),
        unit: item.unit,
        stockStatus: item.stockStatus,
        trackingMode: item.trackingMode,
      })),
      topUsedInPeriod: topUsed,
      partsUsageCount: usageRows.length,
    };
  }

}

export const analyticsService = new AnalyticsService();
