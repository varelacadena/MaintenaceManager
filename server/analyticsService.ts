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
  byArea: { areaId: string; areaName: string; count: number }[];
  monthlyTrend: { month: string; count: number; completed: number }[];
  overdueWorkOrders: number;
  detailedRecords: DetailedWorkOrder[];
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
  taskType: string;
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
  detailedRequests: DetailedServiceRequest[];
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
    const usersList = await db.select().from(users);
    const equipmentList = await db.select().from(equipment);

    const propertyMap = new Map(propertiesList.map(p => [p.id, p.name]));
    const areaMap = new Map(areasList.map(a => [a.id, a.name]));
    const userMap = new Map(usersList.map(u => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username]));
    const equipmentMap = new Map(equipmentList.map(e => [e.id, e.name]));

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

    const detailedRecords: DetailedWorkOrder[] = allTasks
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        status: t.status,
        urgency: t.urgency,
        initialDate: t.initialDate ? new Date(t.initialDate).toISOString() : null,
        estimatedCompletionDate: t.estimatedCompletionDate ? new Date(t.estimatedCompletionDate).toISOString() : null,
        actualCompletionDate: t.actualCompletionDate ? new Date(t.actualCompletionDate).toISOString() : null,
        assignedToId: t.assignedToId,
        assignedToName: t.assignedToId ? userMap.get(t.assignedToId) || "Unknown" : "Unassigned",
        propertyId: t.propertyId,
        propertyName: t.propertyId ? propertyMap.get(t.propertyId) || "Unknown" : "N/A",
        areaId: t.areaId,
        areaName: t.areaId ? areaMap.get(t.areaId) || "Unknown" : "N/A",
        equipmentId: t.equipmentId,
        equipmentName: t.equipmentId ? equipmentMap.get(t.equipmentId) || "Unknown" : "N/A",
        taskType: t.taskType,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
      }));

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
      detailedRecords,
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
    const propertiesList = await db.select().from(properties);
    const areasList = await db.select().from(areas);
    
    const propertyMap = new Map(propertiesList.map(p => [p.id, p.name]));
    const areaMap = new Map(areasList.map(a => [a.id, a.name]));

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

      const taskDetails: TechnicianTaskDetail[] = techTasks
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .map(task => {
          const taskTimeEntries = allTimeEntries.filter(te => te.taskId === task.id && te.userId === tech.id);
          const taskMinutes = taskTimeEntries.reduce((sum, te) => sum + (te.durationMinutes || 0), 0);
          return {
            taskId: task.id,
            taskName: task.name,
            description: task.description,
            status: task.status,
            urgency: task.urgency,
            initialDate: task.initialDate ? new Date(task.initialDate).toISOString() : null,
            completionDate: task.actualCompletionDate ? new Date(task.actualCompletionDate).toISOString() : null,
            propertyName: task.propertyId ? propertyMap.get(task.propertyId) || "Unknown" : "N/A",
            areaName: task.areaId ? areaMap.get(task.areaId) || "Unknown" : "N/A",
            hoursLogged: Math.round(taskMinutes / 60 * 10) / 10,
          };
        });

      results.push({
        technicianId: tech.id,
        technicianName: `${tech.firstName || ""} ${tech.lastName || ""}`.trim() || tech.username,
        tasksCompleted: completedTasks.length,
        tasksAssigned: techTasks.length,
        totalHoursLogged: Math.round(totalMinutes / 60),
        avgCompletionTimeHours,
        completionRate: techTasks.length > 0 ? Math.round((completedTasks.length / techTasks.length) * 100) : 0,
        taskDetails,
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
    const usersList = await db.select().from(users);
    const areasList = await db.select().from(areas);
    const equipmentList = await db.select().from(equipment);

    const userMap = new Map(usersList.map(u => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username]));
    const areaMap = new Map(areasList.map(a => [a.id, a.name]));
    const equipmentMap = new Map(equipmentList.map(e => [e.id, e.name]));

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

      const workOrderDetails: FacilityWorkOrder[] = propertyTasks
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .map(task => ({
          taskId: task.id,
          taskName: task.name,
          description: task.description,
          status: task.status,
          urgency: task.urgency,
          initialDate: task.initialDate ? new Date(task.initialDate).toISOString() : null,
          completionDate: task.actualCompletionDate ? new Date(task.actualCompletionDate).toISOString() : null,
          assignedToName: task.assignedToId ? userMap.get(task.assignedToId) || "Unknown" : "Unassigned",
          areaName: task.areaId ? areaMap.get(task.areaId) || "Unknown" : "N/A",
          equipmentName: task.equipmentId ? equipmentMap.get(task.equipmentId) || "Unknown" : "N/A",
          taskType: task.taskType,
        }));

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
          ["Pending Requests", srData.pendingRequests],
          ["Under Review", srData.underReviewRequests],
          ["Converted to Task", srData.convertedRequests],
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

    // Build detailed reservations list
    const usersList = await db.select().from(users);
    const userMap = new Map(usersList.map(u => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username]));
    const vehicleMap = new Map(allVehicles.map(v => [v.id, `${v.year} ${v.make} ${v.model}`]));

    const detailedReservations: DetailedReservation[] = filteredReservations
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .map(r => ({
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

    const detailedVehicles: DetailedVehicle[] = allVehicles
      .sort((a, b) => a.vehicleId.localeCompare(b.vehicleId))
      .map(v => ({
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

    // Build detailed requests list
    const detailedRequests: DetailedServiceRequest[] = filteredRequests
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .map(r => ({
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
      detailedRequests,
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
