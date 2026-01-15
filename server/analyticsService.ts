import { db } from "./db";
import {
  tasks,
  users,
  properties,
  equipment,
  areas,
  timeEntries,
  partsUsed,
  serviceRequests,
} from "@shared/schema";
import { eq, and, gte, lte, sql, count, avg, desc, asc } from "drizzle-orm";

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  propertyId?: string;
  areaId?: string;
  technicianId?: string;
  equipmentId?: string;
  status?: string;
  urgency?: string;
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
  byArea: { areaId: string; areaName: string; count: number }[];
  monthlyTrend: { month: string; count: number; completed: number }[];
  overdueWorkOrders: number;
}

export interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  tasksCompleted: number;
  tasksAssigned: number;
  totalHoursLogged: number;
  avgCompletionTimeHours: number;
  completionRate: number;
}

export interface AssetHealth {
  equipmentId: string;
  equipmentName: string;
  propertyName: string;
  category: string;
  condition: string | null;
  workOrderCount: number;
  totalMaintenanceCost: number;
  lastMaintenanceDate: Date | null;
  failureFrequency: number;
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

export class AnalyticsService {
  async getWorkOrderOverview(filters: AnalyticsFilters): Promise<WorkOrderOverview> {
    const conditions = this.buildTaskConditions(filters);

    const allTasks = await db
      .select()
      .from(tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const propertiesList = await db.select().from(properties);
    const areasList = await db.select().from(areas);

    const propertyMap = new Map(propertiesList.map(p => [p.id, p.name]));
    const areaMap = new Map(areasList.map(a => [a.id, a.name]));

    const now = new Date();
    const totalWorkOrders = allTasks.length;
    const completedWorkOrders = allTasks.filter(t => t.status === "completed").length;
    const inProgressWorkOrders = allTasks.filter(t => t.status === "in_progress").length;
    const onHoldWorkOrders = allTasks.filter(t => t.status === "on_hold").length;
    const notStartedWorkOrders = allTasks.filter(t => t.status === "not_started").length;

    const overdueWorkOrders = allTasks.filter(t => 
      t.status !== "completed" && 
      t.estimatedCompletionDate && 
      new Date(t.estimatedCompletionDate) < now
    ).length;

    const completedTasksWithDates = allTasks.filter(
      t => t.status === "completed" && t.actualCompletionDate && t.initialDate
    );

    let avgResolutionTimeHours = 0;
    if (completedTasksWithDates.length > 0) {
      const totalResolutionMs = completedTasksWithDates.reduce((sum, t) => {
        const start = new Date(t.initialDate).getTime();
        const end = new Date(t.actualCompletionDate!).getTime();
        return sum + (end - start);
      }, 0);
      avgResolutionTimeHours = Math.round((totalResolutionMs / completedTasksWithDates.length) / (1000 * 60 * 60));
    }

    const avgResponseTimeHours = avgResolutionTimeHours * 0.2;

    const byStatus = [
      { status: "completed", count: completedWorkOrders },
      { status: "in_progress", count: inProgressWorkOrders },
      { status: "on_hold", count: onHoldWorkOrders },
      { status: "not_started", count: notStartedWorkOrders },
    ];

    const byUrgency = ["high", "medium", "low"].map(urgency => ({
      urgency,
      count: allTasks.filter(t => t.urgency === urgency).length,
    }));

    const propertyGroups: Record<string, number> = {};
    allTasks.forEach(t => {
      if (t.propertyId) {
        propertyGroups[t.propertyId] = (propertyGroups[t.propertyId] || 0) + 1;
      }
    });
    const byProperty = Object.entries(propertyGroups)
      .map(([propertyId, count]) => ({
        propertyId,
        propertyName: propertyMap.get(propertyId) || "Unknown",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const areaGroups: Record<string, number> = {};
    allTasks.forEach(t => {
      if (t.areaId) {
        areaGroups[t.areaId] = (areaGroups[t.areaId] || 0) + 1;
      }
    });
    const byArea = Object.entries(areaGroups)
      .map(([areaId, count]) => ({
        areaId,
        areaName: areaMap.get(areaId) || "Unknown",
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const monthlyGroups: Record<string, { count: number; completed: number }> = {};
    allTasks.forEach(t => {
      const date = new Date(t.createdAt!);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = { count: 0, completed: 0 };
      }
      monthlyGroups[monthKey].count++;
      if (t.status === "completed") {
        monthlyGroups[monthKey].completed++;
      }
    });
    const monthlyTrend = Object.entries(monthlyGroups)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    return {
      totalWorkOrders,
      completedWorkOrders,
      inProgressWorkOrders,
      onHoldWorkOrders,
      notStartedWorkOrders,
      completionRate: totalWorkOrders > 0 ? Math.round((completedWorkOrders / totalWorkOrders) * 100) : 0,
      avgResolutionTimeHours,
      avgResponseTimeHours: Math.round(avgResponseTimeHours),
      byStatus,
      byUrgency,
      byProperty,
      byArea,
      monthlyTrend,
      overdueWorkOrders,
    };
  }

  async getTechnicianPerformance(filters: AnalyticsFilters): Promise<TechnicianPerformance[]> {
    const technicians = await db
      .select()
      .from(users)
      .where(eq(users.role, "maintenance"));

    const conditions = this.buildTaskConditions(filters);
    const allTasks = await db
      .select()
      .from(tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const allTimeEntries = await db.select().from(timeEntries);

    const results: TechnicianPerformance[] = [];

    for (const tech of technicians) {
      const techTasks = allTasks.filter(t => t.assignedToId === tech.id);
      const completedTasks = techTasks.filter(t => t.status === "completed");

      const techTimeEntries = allTimeEntries.filter(te => te.userId === tech.id);
      const totalMinutes = techTimeEntries.reduce((sum, te) => sum + (te.durationMinutes || 0), 0);

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

      results.push({
        technicianId: tech.id,
        technicianName: `${tech.firstName || ""} ${tech.lastName || ""}`.trim() || tech.username,
        tasksCompleted: completedTasks.length,
        tasksAssigned: techTasks.length,
        totalHoursLogged: Math.round(totalMinutes / 60),
        avgCompletionTimeHours,
        completionRate: techTasks.length > 0 ? Math.round((completedTasks.length / techTasks.length) * 100) : 0,
      });
    }

    return results.sort((a, b) => b.tasksCompleted - a.tasksCompleted);
  }

  async getAssetHealth(filters: AnalyticsFilters): Promise<AssetHealth[]> {
    const allEquipment = await db.select().from(equipment);
    const propertiesList = await db.select().from(properties);
    const propertyMap = new Map(propertiesList.map(p => [p.id, p.name]));

    const conditions = this.buildTaskConditions(filters);
    const allTasks = await db
      .select()
      .from(tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const allParts = await db.select().from(partsUsed);
    const allTimeEntries = await db.select().from(timeEntries);

    const results: AssetHealth[] = [];

    for (const eq of allEquipment) {
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

      results.push({
        equipmentId: eq.id,
        equipmentName: eq.name,
        propertyName: propertyMap.get(eq.propertyId) || "Unknown",
        category: eq.category,
        condition: eq.condition,
        workOrderCount: equipmentTasks.length,
        totalMaintenanceCost: Math.round(partsCost + laborCost),
        lastMaintenanceDate: lastTask?.actualCompletionDate || null,
        failureFrequency: equipmentTasks.length,
      });
    }

    return results.sort((a, b) => b.workOrderCount - a.workOrderCount);
  }

  async getFacilityInsights(filters: AnalyticsFilters): Promise<FacilityInsights[]> {
    const propertiesList = await db.select().from(properties);

    const conditions = this.buildTaskConditions(filters);
    const allTasks = await db
      .select()
      .from(tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const allParts = await db.select().from(partsUsed);
    const allTimeEntries = await db.select().from(timeEntries);

    const results: FacilityInsights[] = [];

    for (const prop of propertiesList) {
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
      });
    }

    return results.sort((a, b) => b.totalWorkOrders - a.totalWorkOrders);
  }

  async getAlerts(filters: AnalyticsFilters): Promise<Alert[]> {
    const now = new Date();
    const alerts: Alert[] = [];

    const conditions = this.buildTaskConditions(filters);
    const allTasks = await db
      .select()
      .from(tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

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

    const allEquipment = await db.select().from(equipment);
    for (const eq of allEquipment) {
      const equipmentTasks = allTasks.filter(t => t.equipmentId === eq.id);
      if (equipmentTasks.length >= 5) {
        alerts.push({
          id: `failure-${eq.id}`,
          type: "high_failure",
          severity: equipmentTasks.length >= 10 ? "high" : "medium",
          title: "High Failure Rate",
          description: `Equipment "${eq.name}" has ${equipmentTasks.length} work orders`,
          relatedId: eq.id,
          relatedType: "equipment",
          createdAt: now,
        });
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  async getWorkOrderTrends(filters: AnalyticsFilters) {
    const conditions = this.buildTaskConditions(filters);
    const allTasks = await db
      .select()
      .from(tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

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

      case "assets":
        const assetData = await this.getAssetHealth(filters);
        headers = ["Equipment", "Property", "Category", "Condition", "Work Orders", "Maintenance Cost"];
        data = assetData.map(a => [
          a.equipmentName,
          a.propertyName,
          a.category,
          a.condition || "Unknown",
          a.workOrderCount,
          `$${a.totalMaintenanceCost}`,
        ]);
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

      case "alerts":
        const alertData = await this.getAlerts(filters);
        headers = ["Type", "Severity", "Title", "Description"];
        data = alertData.map(a => [a.type, a.severity, a.title, a.description]);
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

  private buildTaskConditions(filters: AnalyticsFilters) {
    const conditions: any[] = [];

    if (filters.startDate) {
      conditions.push(gte(tasks.createdAt, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      conditions.push(lte(tasks.createdAt, new Date(filters.endDate)));
    }
    if (filters.propertyId) {
      conditions.push(eq(tasks.propertyId, filters.propertyId));
    }
    if (filters.areaId) {
      conditions.push(eq(tasks.areaId, filters.areaId));
    }
    if (filters.technicianId) {
      conditions.push(eq(tasks.assignedToId, filters.technicianId));
    }
    if (filters.equipmentId) {
      conditions.push(eq(tasks.equipmentId, filters.equipmentId));
    }
    if (filters.status) {
      conditions.push(eq(tasks.status, filters.status as any));
    }
    if (filters.urgency) {
      conditions.push(eq(tasks.urgency, filters.urgency as any));
    }

    return conditions;
  }
}

export const analyticsService = new AnalyticsService();
