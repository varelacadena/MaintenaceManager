import {
  areas,
  subdivisions,
  properties,
  spaces,
  equipment,
  lockboxes,
  lockboxCodes,
  tasks,
  type Area,
  type InsertArea,
  type Subdivision,
  type InsertSubdivision,
  type Property,
  type InsertProperty,
  type Space,
  type InsertSpace,
  type Equipment,
  type InsertEquipment,
  type Lockbox,
  type InsertLockbox,
  type LockboxCode,
  type InsertLockboxCode,
  type Task,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, or, desc, isNull, sql } from "drizzle-orm";

export async function getAreas(): Promise<Area[]> {
  return await db.select().from(areas);
}

export async function createArea(areaData: InsertArea): Promise<Area> {
  const [area] = await db.insert(areas).values(areaData).returning();
  return area;
}

export async function deleteArea(id: string): Promise<void> {
  await db.delete(areas).where(eq(areas.id, id));
}

export async function getSubdivisionsByArea(areaId: string): Promise<Subdivision[]> {
  return await db
    .select()
    .from(subdivisions)
    .where(eq(subdivisions.areaId, areaId));
}

export async function createSubdivision(subdivisionData: InsertSubdivision): Promise<Subdivision> {
  const [subdivision] = await db
    .insert(subdivisions)
    .values(subdivisionData)
    .returning();
  return subdivision;
}

export async function deleteSubdivision(id: string): Promise<void> {
  await db.delete(subdivisions).where(eq(subdivisions.id, id));
}

export async function getProperties(): Promise<Property[]> {
  return await db.select().from(properties);
}

export async function getProperty(id: string): Promise<Property | undefined> {
  const [property] = await db.select().from(properties).where(eq(properties.id, id));
  return property;
}

export async function createProperty(propertyData: InsertProperty): Promise<Property> {
  const [property] = await db.insert(properties).values(propertyData).returning();
  return property;
}

export async function updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined> {
  const [property] = await db
    .update(properties)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(properties.id, id))
    .returning();
  return property;
}

export async function deleteProperty(id: string): Promise<void> {
  await db.delete(properties).where(eq(properties.id, id));
}

export async function getTasksByProperty(propertyId: string): Promise<Task[]> {
  return await db
    .select()
    .from(tasks)
    .where(
      or(
        eq(tasks.propertyId, propertyId),
        eq(tasks.isCampusWide, true),
        sql`${propertyId} = ANY(${tasks.propertyIds})`
      )
    )
    .orderBy(desc(tasks.initialDate));
}

export async function getSpaces(): Promise<Space[]> {
  return await db.select().from(spaces).orderBy(spaces.name);
}

export async function getSpace(id: string): Promise<Space | undefined> {
  const [space] = await db.select().from(spaces).where(eq(spaces.id, id));
  return space;
}

export async function getSpacesByProperty(propertyId: string): Promise<Space[]> {
  return await db
    .select()
    .from(spaces)
    .where(eq(spaces.propertyId, propertyId))
    .orderBy(spaces.floor, spaces.name);
}

export async function createSpace(spaceData: InsertSpace): Promise<Space> {
  const [space] = await db.insert(spaces).values(spaceData).returning();
  return space;
}

export async function updateSpace(id: string, data: Partial<InsertSpace>): Promise<Space | undefined> {
  const [space] = await db
    .update(spaces)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(spaces.id, id))
    .returning();
  return space;
}

export async function deleteSpace(id: string): Promise<void> {
  await db.delete(spaces).where(eq(spaces.id, id));
}

export async function getEquipment(): Promise<Equipment[]> {
  return await db.select().from(equipment).orderBy(equipment.name);
}

export async function getEquipmentItem(id: string): Promise<Equipment | undefined> {
  const [item] = await db.select().from(equipment).where(eq(equipment.id, id));
  return item;
}

export async function getEquipmentByProperty(propertyId: string): Promise<Equipment[]> {
  return await db
    .select()
    .from(equipment)
    .where(eq(equipment.propertyId, propertyId))
    .orderBy(equipment.category, equipment.name);
}

export async function getEquipmentBySpace(spaceId: string): Promise<Equipment[]> {
  return await db
    .select()
    .from(equipment)
    .where(eq(equipment.spaceId, spaceId))
    .orderBy(equipment.category, equipment.name);
}

export async function getEquipmentByPropertyAndSpace(propertyId: string, spaceId: string): Promise<Equipment[]> {
  return await db
    .select()
    .from(equipment)
    .where(
      and(
        eq(equipment.propertyId, propertyId),
        or(isNull(equipment.spaceId), eq(equipment.spaceId, spaceId))
      )
    )
    .orderBy(equipment.category, equipment.name);
}

export async function getEquipmentByCategory(propertyId: string, category: string): Promise<Equipment[]> {
  return await db
    .select()
    .from(equipment)
    .where(and(eq(equipment.propertyId, propertyId), eq(equipment.category, category as any)))
    .orderBy(equipment.name);
}

export async function createEquipment(equipmentData: InsertEquipment): Promise<Equipment> {
  const [item] = await db.insert(equipment).values(equipmentData).returning();
  return item;
}

export async function updateEquipment(id: string, data: Partial<InsertEquipment>): Promise<Equipment | undefined> {
  const [item] = await db
    .update(equipment)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(equipment.id, id))
    .returning();
  return item;
}

export async function deleteEquipment(id: string): Promise<void> {
  await db.delete(equipment).where(eq(equipment.id, id));
}

export async function getLockboxes(): Promise<Lockbox[]> {
  return await db.select().from(lockboxes).orderBy(lockboxes.name);
}

export async function getLockbox(id: string): Promise<Lockbox | undefined> {
  const [lockbox] = await db.select().from(lockboxes).where(eq(lockboxes.id, id));
  return lockbox;
}

export async function createLockbox(lockbox: InsertLockbox): Promise<Lockbox> {
  const [created] = await db.insert(lockboxes).values(lockbox).returning();
  return created;
}

export async function updateLockbox(id: string, data: Partial<InsertLockbox>): Promise<Lockbox | undefined> {
  const [updated] = await db.update(lockboxes).set(data).where(eq(lockboxes.id, id)).returning();
  return updated;
}

export async function deleteLockbox(id: string): Promise<void> {
  await db.delete(lockboxes).where(eq(lockboxes.id, id));
}

export async function getLockboxCodes(lockboxId: string): Promise<LockboxCode[]> {
  return await db.select().from(lockboxCodes).where(eq(lockboxCodes.lockboxId, lockboxId)).orderBy(lockboxCodes.createdAt);
}

export async function getLockboxCode(id: string): Promise<LockboxCode | undefined> {
  const [code] = await db.select().from(lockboxCodes).where(eq(lockboxCodes.id, id));
  return code;
}

export async function createLockboxCode(code: InsertLockboxCode): Promise<LockboxCode> {
  const [created] = await db.insert(lockboxCodes).values(code).returning();
  return created;
}

export async function updateLockboxCode(id: string, data: Partial<InsertLockboxCode>): Promise<LockboxCode | undefined> {
  const [updated] = await db.update(lockboxCodes).set(data).where(eq(lockboxCodes.id, id)).returning();
  return updated;
}

export async function deleteLockboxCode(id: string): Promise<void> {
  await db.delete(lockboxCodes).where(eq(lockboxCodes.id, id));
}

export async function assignRandomCode(lockboxId: string): Promise<LockboxCode | null> {
  const activeCodes = await db.select().from(lockboxCodes)
    .where(and(eq(lockboxCodes.lockboxId, lockboxId), eq(lockboxCodes.status, "active")));

  if (activeCodes.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * activeCodes.length);
  const selected = activeCodes[randomIndex];

  const [updated] = await db.update(lockboxCodes)
    .set({
      lastUsedAt: new Date(),
      useCount: sql`${lockboxCodes.useCount} + 1`,
    })
    .where(eq(lockboxCodes.id, selected.id))
    .returning();

  return updated;
}
