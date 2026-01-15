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
  vehicles,
  vehicleReservations,
  vehicleMaintenanceLogs,
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

    // Fetch all users (technicians) for mapping
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username]));

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

      // Build service history for each task
      const serviceHistory: ServiceRecord[] = equipmentTasks.map(task => {
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
      });

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
        failureFrequency: equipmentTasks.length,
        serviceHistory,
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

  async getFleetOverview(filters: AnalyticsFilters): Promise<FleetOverview> {
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

    // Apply date filters to reservations
    let filteredReservations = allReservations;
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filteredReservations = filteredReservations.filter(r => new Date(r.startDate) >= startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filteredReservations = filteredReservations.filter(r => new Date(r.endDate) <= endDate);
    }

    const totalVehicles = allVehicles.length;
    const availableVehicles = allVehicles.filter(v => v.status === "available").length;
    const inUseVehicles = allVehicles.filter(v => v.status === "in_use").length;
    const outOfServiceVehicles = allVehicles.filter(v => v.status === "needs_maintenance" || v.status === "needs_cleaning").length;

    const totalReservations = filteredReservations.length;
    const activeReservations = filteredReservations.filter(r => r.status === "active" || r.status === "pending").length;
    const completedReservations = filteredReservations.filter(r => r.status === "completed").length;
    const cancelledReservations = filteredReservations.filter(r => r.status === "cancelled").length;

    // Calculate maintenance cost from logs
    const totalMaintenanceCost = allMaintenanceLogs.reduce((sum, log) => sum + (Number(log.cost) || 0), 0);

    // Calculate utilization rate (active days vs total possible days)
    const avgUtilizationRate = totalVehicles > 0 
      ? Math.round((inUseVehicles / totalVehicles) * 100) 
      : 0;

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
    allMaintenanceLogs.forEach(log => {
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
    };
  }

  async getServiceRequestOverview(filters: AnalyticsFilters): Promise<ServiceRequestOverview> {
    const allRequests = await db.select().from(serviceRequests);
    const propertiesList = await db.select().from(properties);
    const areasList = await db.select().from(areas);
    const usersList = await db.select().from(users);

    const propertyMap = new Map(propertiesList.map(p => [p.id, p.name]));
    const areaMap = new Map(areasList.map(a => [a.id, a.name]));
    const userMap = new Map(usersList.map(u => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username]));

    // Apply date filters
    let filteredRequests = allRequests;
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filteredRequests = filteredRequests.filter(r => r.createdAt && new Date(r.createdAt) >= startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filteredRequests = filteredRequests.filter(r => r.createdAt && new Date(r.createdAt) <= endDate);
    }
    if (filters.propertyId) {
      filteredRequests = filteredRequests.filter(r => r.propertyId === filters.propertyId);
    }
    if (filters.areaId) {
      filteredRequests = filteredRequests.filter(r => r.areaId === filters.areaId);
    }
    if (filters.urgency) {
      filteredRequests = filteredRequests.filter(r => r.urgency === filters.urgency);
    }

    const totalRequests = filteredRequests.length;
    const pendingRequests = filteredRequests.filter(r => r.status === "pending").length;
    const underReviewRequests = filteredRequests.filter(r => r.status === "under_review").length;
    const convertedRequests = filteredRequests.filter(r => r.status === "converted_to_task").length;
    const rejectedRequests = filteredRequests.filter(r => r.status === "rejected").length;

    const conversionRate = totalRequests > 0 ? Math.round((convertedRequests / totalRequests) * 100) : 0;

    // Calculate average response time (time from creation to status change)
    const processedRequests = filteredRequests.filter(r => 
      r.status !== "pending" && r.updatedAt && r.createdAt
    );
    let avgResponseTimeHours = 0;
    if (processedRequests.length > 0) {
      const totalMs = processedRequests.reduce((sum, r) => {
        const created = new Date(r.createdAt!).getTime();
        const updated = new Date(r.updatedAt!).getTime();
        return sum + (updated - created);
      }, 0);
      avgResponseTimeHours = Math.round((totalMs / processedRequests.length) / (1000 * 60 * 60));
    }

    // Group by urgency
    const byUrgency = ["high", "medium", "low"].map(urgency => ({
      urgency,
      count: filteredRequests.filter(r => r.urgency === urgency).length,
    }));

    // Group by status
    const byStatus = ["pending", "under_review", "converted_to_task", "rejected"].map(status => ({
      status,
      count: filteredRequests.filter(r => r.status === status).length,
    }));

    // Group by property
    const propertyGroups: Record<string, number> = {};
    filteredRequests.forEach(r => {
      if (r.propertyId) {
        propertyGroups[r.propertyId] = (propertyGroups[r.propertyId] || 0) + 1;
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

    // Group by area
    const areaGroups: Record<string, number> = {};
    filteredRequests.forEach(r => {
      if (r.areaId) {
        areaGroups[r.areaId] = (areaGroups[r.areaId] || 0) + 1;
      }
    });
    const byArea = Object.entries(areaGroups)
      .map(([areaId, count]) => ({
        areaId,
        areaName: areaMap.get(areaId) || "Unknown",
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Monthly trend
    const monthlyGroups: Record<string, { submitted: number; converted: number }> = {};
    filteredRequests.forEach(r => {
      if (r.createdAt) {
        const date = new Date(r.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyGroups[monthKey]) {
          monthlyGroups[monthKey] = { submitted: 0, converted: 0 };
        }
        monthlyGroups[monthKey].submitted++;
        if (r.status === "converted_to_task") {
          monthlyGroups[monthKey].converted++;
        }
      }
    });
    const monthlyTrend = Object.entries(monthlyGroups)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    // Top requesters
    const requesterGroups: Record<string, number> = {};
    filteredRequests.forEach(r => {
      requesterGroups[r.requesterId] = (requesterGroups[r.requesterId] || 0) + 1;
    });
    const topRequesters = Object.entries(requesterGroups)
      .map(([requesterId, count]) => ({
        requesterId,
        requesterName: userMap.get(requesterId) || "Unknown",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

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
    };
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
