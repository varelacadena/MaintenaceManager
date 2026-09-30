import { and, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import {
  approvedDrivers,
  driverPenalties,
  vehicleReservations,
  type ApprovedDriver,
  type DriverPenalty,
  type InsertApprovedDriver,
  type InsertDriverPenalty,
} from "@shared/schema";

export async function getApprovedDrivers(search?: string): Promise<ApprovedDriver[]> {
  const term = search?.trim();
  if (!term) {
    return db.select().from(approvedDrivers).orderBy(approvedDrivers.lastName, approvedDrivers.firstName);
  }
  const like = `%${term}%`;
  return db.select().from(approvedDrivers).where(
    sql`(
      ${ilike(approvedDrivers.lastName, like)}
      OR ${ilike(approvedDrivers.firstName, like)}
      OR ${ilike(approvedDrivers.department, like)}
      OR ${ilike(approvedDrivers.email, like)}
    )`,
  ).orderBy(approvedDrivers.lastName, approvedDrivers.firstName);
}

export async function getApprovedDriver(id: string): Promise<ApprovedDriver | undefined> {
  const [driver] = await db.select().from(approvedDrivers).where(eq(approvedDrivers.id, id));
  return driver;
}

export async function findActiveDriversByLastName(lastName: string): Promise<ApprovedDriver[]> {
  return db.select().from(approvedDrivers).where(and(
    eq(approvedDrivers.status, "active"),
    sql`lower(${approvedDrivers.lastName}) = lower(${lastName})`,
  )).orderBy(approvedDrivers.firstName);
}

export async function createApprovedDriver(data: InsertApprovedDriver): Promise<ApprovedDriver> {
  const [driver] = await db.insert(approvedDrivers).values({
    ...data,
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    department: data.department?.trim() || null,
    updatedAt: new Date(),
  }).returning();
  return driver;
}

export async function updateApprovedDriver(
  id: string,
  data: Partial<InsertApprovedDriver>,
): Promise<ApprovedDriver | undefined> {
  const [driver] = await db.update(approvedDrivers).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(approvedDrivers.id, id)).returning();
  return driver;
}

export async function getDriverPenalties(driverId: string): Promise<DriverPenalty[]> {
  return db.select().from(driverPenalties)
    .where(eq(driverPenalties.driverId, driverId))
    .orderBy(desc(driverPenalties.appliedAt));
}

export async function driverHasActivePenalty(driverId: string): Promise<boolean> {
  const [row] = await db.select({ id: driverPenalties.id }).from(driverPenalties).where(and(
    eq(driverPenalties.driverId, driverId),
    isNull(driverPenalties.clearedAt),
  )).limit(1);
  return Boolean(row);
}

export async function getActivePenaltyDriverIds(): Promise<Set<string>> {
  const rows = await db.select({ driverId: driverPenalties.driverId }).from(driverPenalties)
    .where(isNull(driverPenalties.clearedAt));
  return new Set(rows.map((row) => row.driverId));
}

export async function createDriverPenalty(data: InsertDriverPenalty): Promise<DriverPenalty> {
  const [penalty] = await db.insert(driverPenalties).values(data).returning();
  return penalty;
}

export async function clearDriverPenalty(
  id: string,
  clearedBy: string,
): Promise<DriverPenalty | undefined> {
  const [penalty] = await db.update(driverPenalties).set({
    clearedAt: new Date(),
    clearedBy,
  }).where(and(eq(driverPenalties.id, id), isNull(driverPenalties.clearedAt))).returning();
  return penalty;
}

export async function findDriverByEmail(email: string): Promise<ApprovedDriver | undefined> {
  const [driver] = await db.select().from(approvedDrivers)
    .where(sql`lower(${approvedDrivers.email}) = lower(${email})`);
  return driver;
}

export async function tripCodeInUse(code: string): Promise<boolean> {
  const [row] = await db.select({ id: vehicleReservations.id }).from(vehicleReservations).where(and(
    eq(vehicleReservations.tripCode, code),
    sql`${vehicleReservations.status} in ('pending', 'approved', 'active')`,
    isNull(vehicleReservations.linkRevokedAt),
  )).limit(1);
  return Boolean(row);
}

export async function getReservationByAccessToken(token: string) {
  const [reservation] = await db.select().from(vehicleReservations)
    .where(eq(vehicleReservations.accessToken, token));
  return reservation;
}

export async function getReservationByTripCode(code: string, vehicleId: string) {
  const [reservation] = await db.select().from(vehicleReservations).where(and(
    eq(vehicleReservations.tripCode, code),
    eq(vehicleReservations.vehicleId, vehicleId),
    isNull(vehicleReservations.linkRevokedAt),
    sql`${vehicleReservations.status} in ('approved', 'active')`,
  ));
  return reservation;
}
