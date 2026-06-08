import {
  mobileEquipment,
  mobileEquipmentMaintenanceLogs,
  mobileEquipmentMaintenanceParts,
  type MobileEquipment,
  type InsertMobileEquipment,
  type MobileEquipmentMaintenanceLog,
  type InsertMobileEquipmentMaintenanceLog,
  type InsertMobileEquipmentMaintenancePart,
  type MobileEquipmentMaintenanceLogWithParts,
  type MobileEquipmentMaintenancePart,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, or, ilike, inArray, and } from "drizzle-orm";

export type MobileEquipmentFilters = {
  search?: string;
  category?: string;
  status?: string;
  partNumber?: string;
  limit?: number;
  offset?: number;
};

export async function getMobileEquipmentList(
  filters?: MobileEquipmentFilters,
): Promise<MobileEquipment[]> {
  const conditions = [];

  if (filters?.category) {
    conditions.push(eq(mobileEquipment.category, filters.category));
  }
  if (filters?.status) {
    conditions.push(eq(mobileEquipment.status, filters.status as MobileEquipment["status"]));
  }
  if (filters?.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(mobileEquipment.name, term),
        ilike(mobileEquipment.make, term),
        ilike(mobileEquipment.model, term),
        ilike(mobileEquipment.serialNumber, term),
        ilike(mobileEquipment.assetTag, term),
      )!,
    );
  }

  let equipmentIdsFromPart: string[] | undefined;
  if (filters?.partNumber?.trim()) {
    const partTerm = `%${filters.partNumber.trim()}%`;
    const rows = await db
      .selectDistinct({ equipmentId: mobileEquipmentMaintenanceLogs.mobileEquipmentId })
      .from(mobileEquipmentMaintenanceParts)
      .innerJoin(
        mobileEquipmentMaintenanceLogs,
        eq(mobileEquipmentMaintenanceParts.maintenanceLogId, mobileEquipmentMaintenanceLogs.id),
      )
      .where(ilike(mobileEquipmentMaintenanceParts.partNumber, partTerm));
    equipmentIdsFromPart = rows.map((r) => r.equipmentId);
    if (equipmentIdsFromPart.length === 0) {
      return [];
    }
    conditions.push(inArray(mobileEquipment.id, equipmentIdsFromPart));
  }

  let query = db.select().from(mobileEquipment).orderBy(mobileEquipment.name);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as typeof query;
  }
  return query;
}

export async function getMobileEquipment(id: string): Promise<MobileEquipment | undefined> {
  const [row] = await db.select().from(mobileEquipment).where(eq(mobileEquipment.id, id));
  return row;
}

export async function createMobileEquipment(
  data: InsertMobileEquipment,
): Promise<MobileEquipment> {
  const [row] = await db.insert(mobileEquipment).values(data).returning();
  return row;
}

export async function updateMobileEquipment(
  id: string,
  data: Partial<InsertMobileEquipment>,
): Promise<MobileEquipment | undefined> {
  const [row] = await db
    .update(mobileEquipment)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(mobileEquipment.id, id))
    .returning();
  return row;
}

export async function deleteMobileEquipment(id: string): Promise<void> {
  await db.delete(mobileEquipment).where(eq(mobileEquipment.id, id));
}

export async function getMaintenancePartsForLogs(
  logIds: string[],
): Promise<Map<string, MobileEquipmentMaintenancePart[]>> {
  if (logIds.length === 0) return new Map();
  const parts = await db
    .select()
    .from(mobileEquipmentMaintenanceParts)
    .where(inArray(mobileEquipmentMaintenanceParts.maintenanceLogId, logIds));
  const map = new Map<string, MobileEquipmentMaintenancePart[]>();
  for (const part of parts) {
    const list = map.get(part.maintenanceLogId) ?? [];
    list.push(part);
    map.set(part.maintenanceLogId, list);
  }
  return map;
}

export async function getMobileEquipmentMaintenanceLogs(
  equipmentId: string,
): Promise<MobileEquipmentMaintenanceLogWithParts[]> {
  const logs = await db
    .select()
    .from(mobileEquipmentMaintenanceLogs)
    .where(eq(mobileEquipmentMaintenanceLogs.mobileEquipmentId, equipmentId))
    .orderBy(desc(mobileEquipmentMaintenanceLogs.maintenanceDate));

  const partsMap = await getMaintenancePartsForLogs(logs.map((l) => l.id));
  return logs.map((log) => ({
    ...log,
    parts: partsMap.get(log.id) ?? [],
  }));
}

export async function createMobileEquipmentMaintenanceLog(
  logData: InsertMobileEquipmentMaintenanceLog,
  parts: Omit<InsertMobileEquipmentMaintenancePart, "maintenanceLogId">[] = [],
): Promise<MobileEquipmentMaintenanceLogWithParts> {
  const [log] = await db.insert(mobileEquipmentMaintenanceLogs).values(logData).returning();

  let insertedParts: typeof mobileEquipmentMaintenanceParts.$inferSelect[] = [];
  if (parts.length > 0) {
    insertedParts = await db
      .insert(mobileEquipmentMaintenanceParts)
      .values(parts.map((p) => ({ ...p, maintenanceLogId: log.id })))
      .returning();
  }

  return { ...log, parts: insertedParts };
}

export async function deleteMobileEquipmentMaintenanceLog(id: string): Promise<void> {
  await db
    .delete(mobileEquipmentMaintenanceLogs)
    .where(eq(mobileEquipmentMaintenanceLogs.id, id));
}
