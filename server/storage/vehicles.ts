import {
  vehicles,
  vehicleReservations,
  vehicleCheckOutLogs,
  vehicleCheckInLogs,
  vehicleMaintenanceSchedules,
  vehicleMaintenanceLogs,
  vehicleDocuments,
  type Vehicle,
  type InsertVehicle,
  type VehicleReservation,
  type InsertVehicleReservation,
  type VehicleCheckOutLog,
  type InsertVehicleCheckOutLog,
  type VehicleCheckInLog,
  type InsertVehicleCheckInLog,
  type VehicleMaintenanceSchedule,
  type InsertVehicleMaintenanceSchedule,
  type VehicleMaintenanceLog,
  type InsertVehicleMaintenanceLog,
  type VehicleDocument,
  type InsertVehicleDocument,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, ne, desc, lte, gte, sql } from "drizzle-orm";

export async function getVehicles(filters?: { status?: string }): Promise<Vehicle[]> {
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(vehicles.status, filters.status as any));
  }

  const query = db.select().from(vehicles);
  if (conditions.length > 0) {
    return await query.where(and(...conditions)).orderBy(vehicles.vehicleId);
  }
  return await query.orderBy(vehicles.vehicleId);
}

export async function getVehicle(id: string): Promise<Vehicle | undefined> {
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
  return vehicle;
}

export async function getVehicleByVehicleId(vehicleId: string): Promise<Vehicle | undefined> {
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.vehicleId, vehicleId));
  return vehicle;
}

export async function createVehicle(vehicleData: InsertVehicle): Promise<Vehicle> {
  const [vehicle] = await db.insert(vehicles).values(vehicleData).returning();
  return vehicle;
}

export async function updateVehicle(id: string, data: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
  const [vehicle] = await db
    .update(vehicles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(vehicles.id, id))
    .returning();
  return vehicle;
}

export async function updateVehicleStatus(id: string, status: string): Promise<Vehicle | undefined> {
  const [vehicle] = await db
    .update(vehicles)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(vehicles.id, id))
    .returning();
  return vehicle;
}

export async function updateVehicleMileage(id: string, mileage: number): Promise<Vehicle | undefined> {
  const [vehicle] = await db
    .update(vehicles)
    .set({ currentMileage: mileage, updatedAt: new Date() })
    .where(eq(vehicles.id, id))
    .returning();
  return vehicle;
}

export async function deleteVehicle(id: string): Promise<void> {
  await db.delete(vehicles).where(eq(vehicles.id, id));
}

export async function getVehicleReservations(filters?: {
  vehicleId?: string;
  userId?: string;
  status?: string;
}): Promise<VehicleReservation[]> {
  const conditions = [];
  if (filters?.vehicleId) {
    conditions.push(eq(vehicleReservations.vehicleId, filters.vehicleId));
  }
  if (filters?.userId) {
    conditions.push(eq(vehicleReservations.userId, filters.userId));
  }
  if (filters?.status) {
    conditions.push(eq(vehicleReservations.status, filters.status as any));
  }

  const query = db.select().from(vehicleReservations);
  if (conditions.length > 0) {
    return await query.where(and(...conditions)).orderBy(desc(vehicleReservations.startDate));
  }
  return await query.orderBy(desc(vehicleReservations.startDate));
}

export async function getVehicleReservation(id: string): Promise<VehicleReservation | undefined> {
  const [reservation] = await db.select().from(vehicleReservations).where(eq(vehicleReservations.id, id));
  return reservation;
}

export async function createVehicleReservation(reservationData: InsertVehicleReservation): Promise<VehicleReservation> {
  const [reservation] = await db.insert(vehicleReservations).values(reservationData).returning();
  return reservation;
}

export async function updateVehicleReservation(
  id: string,
  updates: Partial<InsertVehicleReservation>
): Promise<VehicleReservation | undefined> {
  const cleanUpdates: any = { ...updates, updatedAt: new Date() };
  
  if (updates.startDate && typeof updates.startDate === 'string') {
    cleanUpdates.startDate = new Date(updates.startDate);
  }
  if (updates.endDate && typeof updates.endDate === 'string') {
    cleanUpdates.endDate = new Date(updates.endDate);
  }

  const [updated] = await db
    .update(vehicleReservations)
    .set(cleanUpdates)
    .where(eq(vehicleReservations.id, id))
    .returning();
  return updated;
}

export async function deleteVehicleReservation(id: string): Promise<void> {
  await db
    .delete(vehicleReservations)
    .where(eq(vehicleReservations.id, id));
}

export async function updateReservationStatus(id: string, status: string): Promise<VehicleReservation | undefined> {
  const [reservation] = await db
    .update(vehicleReservations)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(vehicleReservations.id, id))
    .returning();
  return reservation;
}

export async function checkVehicleAvailability(
  vehicleId: string,
  startDate: Date,
  endDate: Date,
  excludeReservationId?: string
): Promise<boolean> {
  const conditions = [
    eq(vehicleReservations.vehicleId, vehicleId),
    ne(vehicleReservations.status, "cancelled" as any),
    sql`${vehicleReservations.startDate} <= ${endDate} AND ${vehicleReservations.endDate} >= ${startDate}`
  ];

  if (excludeReservationId) {
    conditions.push(ne(vehicleReservations.id, excludeReservationId));
  }

  const conflictingReservations = await db
    .select()
    .from(vehicleReservations)
    .where(and(...conditions));

  return conflictingReservations.length === 0;
}

export async function getVehicleCheckOutLogs(filters?: { vehicleId?: string; userId?: string }): Promise<VehicleCheckOutLog[]> {
  const conditions = [];
  if (filters?.vehicleId) {
    conditions.push(eq(vehicleCheckOutLogs.vehicleId, filters.vehicleId));
  }
  if (filters?.userId) {
    conditions.push(eq(vehicleCheckOutLogs.userId, filters.userId));
  }

  const query = db.select().from(vehicleCheckOutLogs);
  if (conditions.length > 0) {
    return await query.where(and(...conditions)).orderBy(desc(vehicleCheckOutLogs.checkOutTime));
  }
  return await query.orderBy(desc(vehicleCheckOutLogs.checkOutTime));
}

export async function getVehicleCheckOutLog(id: string): Promise<VehicleCheckOutLog | undefined> {
  const [log] = await db.select().from(vehicleCheckOutLogs).where(eq(vehicleCheckOutLogs.id, id));
  return log;
}

export async function getCheckOutLogByReservation(reservationId: string): Promise<VehicleCheckOutLog | undefined> {
  const [log] = await db
    .select()
    .from(vehicleCheckOutLogs)
    .where(eq(vehicleCheckOutLogs.reservationId, reservationId));
  return log;
}

export async function createVehicleCheckOutLog(logData: InsertVehicleCheckOutLog): Promise<VehicleCheckOutLog> {
  try {
    const cleanData: any = {
      reservationId: logData.reservationId,
      vehicleId: logData.vehicleId,
      userId: logData.userId,
      startMileage: Number(logData.startMileage),
      fuelLevel: String(logData.fuelLevel),
      cleanlinessConfirmed: Boolean(logData.cleanlinessConfirmed),
    };
    
    if (logData.damageNotes !== undefined && logData.damageNotes !== null) {
      cleanData.damageNotes = String(logData.damageNotes);
    }
    if (logData.digitalSignature !== undefined && logData.digitalSignature !== null) {
      cleanData.digitalSignature = String(logData.digitalSignature);
    }
    if (logData.adminOverride !== undefined) {
      cleanData.adminOverride = Boolean(logData.adminOverride);
    }
    if (logData.assignedCodeId !== undefined && logData.assignedCodeId !== null) {
      cleanData.assignedCodeId = String(logData.assignedCodeId);
    }
    
    console.log("Inserting clean data:", JSON.stringify(cleanData, null, 2));
    
    const [log] = await db.insert(vehicleCheckOutLogs).values(cleanData).returning();
    if (!log) {
      throw new Error("Failed to create checkout log: No record returned from database");
    }
    return log;
  } catch (error: any) {
    console.error("Database error in createVehicleCheckOutLog:", error);
    console.error("Error code:", error?.code);
    console.error("Error detail:", error?.detail);
    console.error("Error hint:", error?.hint);
    console.error("Log data attempted:", JSON.stringify(logData, null, 2));
    throw error;
  }
}

export async function deleteVehicleCheckOutLog(id: string): Promise<void> {
  await db.delete(vehicleCheckOutLogs).where(eq(vehicleCheckOutLogs.id, id));
}

export async function getVehicleCheckInLogs(filters?: { vehicleId?: string; userId?: string }): Promise<VehicleCheckInLog[]> {
  const conditions = [];
  if (filters?.vehicleId) {
    conditions.push(eq(vehicleCheckInLogs.vehicleId, filters.vehicleId));
  }
  if (filters?.userId) {
    conditions.push(eq(vehicleCheckInLogs.userId, filters.userId));
  }

  const query = db.select().from(vehicleCheckInLogs);
  if (conditions.length > 0) {
    return await query.where(and(...conditions)).orderBy(desc(vehicleCheckInLogs.checkInTime));
  }
  return await query.orderBy(desc(vehicleCheckInLogs.checkInTime));
}

export async function getVehicleCheckInLog(id: string): Promise<VehicleCheckInLog | undefined> {
  const [log] = await db.select().from(vehicleCheckInLogs).where(eq(vehicleCheckInLogs.id, id));
  return log;
}

export async function getCheckInLogByCheckOut(checkOutLogId: string): Promise<VehicleCheckInLog | undefined> {
  const [log] = await db
    .select()
    .from(vehicleCheckInLogs)
    .where(eq(vehicleCheckInLogs.checkOutLogId, checkOutLogId));
  return log;
}

export async function createVehicleCheckInLog(logData: InsertVehicleCheckInLog): Promise<VehicleCheckInLog> {
  const [log] = await db.insert(vehicleCheckInLogs).values(logData).returning();
  return log;
}

export async function updateVehicleCheckInLog(id: string, data: Partial<InsertVehicleCheckInLog>): Promise<VehicleCheckInLog | undefined> {
  const [log] = await db
    .update(vehicleCheckInLogs)
    .set(data)
    .where(eq(vehicleCheckInLogs.id, id))
    .returning();
  return log;
}

export async function deleteVehicleCheckInLog(id: string): Promise<void> {
  await db.delete(vehicleCheckInLogs).where(eq(vehicleCheckInLogs.id, id));
}

export async function getVehicleMaintenanceSchedules(vehicleId?: string): Promise<VehicleMaintenanceSchedule[]> {
  if (vehicleId) {
    return await db
      .select()
      .from(vehicleMaintenanceSchedules)
      .where(eq(vehicleMaintenanceSchedules.vehicleId, vehicleId))
      .orderBy(vehicleMaintenanceSchedules.maintenanceType);
  }
  return await db.select().from(vehicleMaintenanceSchedules).orderBy(vehicleMaintenanceSchedules.maintenanceType);
}

export async function getVehicleMaintenanceSchedule(id: string): Promise<VehicleMaintenanceSchedule | undefined> {
  const [schedule] = await db
    .select()
    .from(vehicleMaintenanceSchedules)
    .where(eq(vehicleMaintenanceSchedules.id, id));
  return schedule;
}

export async function createVehicleMaintenanceSchedule(scheduleData: InsertVehicleMaintenanceSchedule): Promise<VehicleMaintenanceSchedule> {
  const [schedule] = await db.insert(vehicleMaintenanceSchedules).values(scheduleData).returning();
  return schedule;
}

export async function updateVehicleMaintenanceSchedule(
  id: string,
  data: Partial<InsertVehicleMaintenanceSchedule>
): Promise<VehicleMaintenanceSchedule | undefined> {
  const [schedule] = await db
    .update(vehicleMaintenanceSchedules)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(vehicleMaintenanceSchedules.id, id))
    .returning();
  return schedule;
}

export async function deleteVehicleMaintenanceSchedule(id: string): Promise<void> {
  await db.delete(vehicleMaintenanceSchedules).where(eq(vehicleMaintenanceSchedules.id, id));
}

export async function getVehicleMaintenanceLogs(vehicleId: string): Promise<VehicleMaintenanceLog[]> {
  return await db
    .select()
    .from(vehicleMaintenanceLogs)
    .where(eq(vehicleMaintenanceLogs.vehicleId, vehicleId))
    .orderBy(desc(vehicleMaintenanceLogs.maintenanceDate));
}

export async function getVehicleMaintenanceLogByTaskId(taskId: string): Promise<VehicleMaintenanceLog | undefined> {
  const [log] = await db
    .select()
    .from(vehicleMaintenanceLogs)
    .where(eq(vehicleMaintenanceLogs.taskId, taskId));
  return log;
}

export async function createVehicleMaintenanceLog(logData: InsertVehicleMaintenanceLog): Promise<VehicleMaintenanceLog> {
  const [log] = await db
    .insert(vehicleMaintenanceLogs)
    .values(logData)
    .returning();
  return log;
}

export async function deleteVehicleMaintenanceLog(id: string): Promise<void> {
  await db.delete(vehicleMaintenanceLogs).where(eq(vehicleMaintenanceLogs.id, id));
}

export async function getVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
  return await db
    .select()
    .from(vehicleDocuments)
    .where(eq(vehicleDocuments.vehicleId, vehicleId))
    .orderBy(vehicleDocuments.expirationDate);
}

export async function getVehicleDocument(id: string): Promise<VehicleDocument | undefined> {
  const [document] = await db
    .select()
    .from(vehicleDocuments)
    .where(eq(vehicleDocuments.id, id));
  return document;
}

export async function createVehicleDocument(documentData: InsertVehicleDocument): Promise<VehicleDocument> {
  const [document] = await db
    .insert(vehicleDocuments)
    .values(documentData)
    .returning();
  return document;
}

export async function updateVehicleDocument(id: string, data: Partial<InsertVehicleDocument>): Promise<VehicleDocument | undefined> {
  const [document] = await db
    .update(vehicleDocuments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(vehicleDocuments.id, id))
    .returning();
  return document;
}

export async function deleteVehicleDocument(id: string): Promise<void> {
  await db.delete(vehicleDocuments).where(eq(vehicleDocuments.id, id));
}

export async function getExpiringDocuments(daysAhead: number): Promise<(VehicleDocument & { vehicle: { id: string; vehicleId: string; make: string; model: string } })[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const now = new Date();
  
  const results = await db
    .select({
      id: vehicleDocuments.id,
      vehicleId: vehicleDocuments.vehicleId,
      documentType: vehicleDocuments.documentType,
      documentName: vehicleDocuments.documentName,
      expirationDate: vehicleDocuments.expirationDate,
      notes: vehicleDocuments.notes,
      reminderSent: vehicleDocuments.reminderSent,
      reminderSentAt: vehicleDocuments.reminderSentAt,
      createdAt: vehicleDocuments.createdAt,
      updatedAt: vehicleDocuments.updatedAt,
      vehicle: {
        id: vehicles.id,
        vehicleId: vehicles.vehicleId,
        make: vehicles.make,
        model: vehicles.model,
      }
    })
    .from(vehicleDocuments)
    .innerJoin(vehicles, eq(vehicleDocuments.vehicleId, vehicles.id))
    .where(
      and(
        lte(vehicleDocuments.expirationDate, futureDate),
        gte(vehicleDocuments.expirationDate, now),
        eq(vehicleDocuments.reminderSent, false)
      )
    )
    .orderBy(vehicleDocuments.expirationDate);
  
  return results;
}

export async function markDocumentReminderSent(id: string): Promise<VehicleDocument | undefined> {
  const [document] = await db
    .update(vehicleDocuments)
    .set({ reminderSent: true, reminderSentAt: new Date(), updatedAt: new Date() })
    .where(eq(vehicleDocuments.id, id))
    .returning();
  return document;
}
