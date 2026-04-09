import {
  resources,
  resourceCategories,
  resourceFolders,
  propertyResources,
  equipment,
  type ResourceCategory,
  type InsertResourceCategory,
  type ResourceFolder,
  type InsertResourceFolder,
  type Resource,
  type InsertResource,
} from "@shared/schema";
import { db } from "../db";
import { eq, or, desc, isNull, sql } from "drizzle-orm";

export async function getResourceCategories(): Promise<ResourceCategory[]> {
  return await db.select().from(resourceCategories).orderBy(resourceCategories.name);
}

export async function createResourceCategory(data: InsertResourceCategory): Promise<ResourceCategory> {
  const [created] = await db.insert(resourceCategories).values(data).returning();
  return created;
}

export async function getResourceFolders(parentId?: string | null): Promise<ResourceFolder[]> {
  if (parentId === null || parentId === undefined) {
    return await db.select().from(resourceFolders)
      .where(isNull(resourceFolders.parentId))
      .orderBy(resourceFolders.name);
  }
  return await db.select().from(resourceFolders)
    .where(eq(resourceFolders.parentId, parentId))
    .orderBy(resourceFolders.name);
}

export async function getAllResourceFolders(): Promise<ResourceFolder[]> {
  return await db.select().from(resourceFolders).orderBy(resourceFolders.name);
}

export async function getResourceFolderById(id: string): Promise<(ResourceFolder & { breadcrumbs: { id: string; name: string }[] }) | undefined> {
  const [folder] = await db.select().from(resourceFolders).where(eq(resourceFolders.id, id));
  if (!folder) return undefined;

  const breadcrumbs: { id: string; name: string }[] = [];
  const visited = new Set<string>();
  let current: ResourceFolder | undefined = folder;
  while (current && !visited.has(current.id) && breadcrumbs.length < 50) {
    visited.add(current.id);
    breadcrumbs.unshift({ id: current.id, name: current.name });
    if (current.parentId) {
      const [parent] = await db.select().from(resourceFolders).where(eq(resourceFolders.id, current.parentId));
      current = parent;
    } else {
      current = undefined;
    }
  }

  return { ...folder, breadcrumbs };
}

export async function createResourceFolder(data: InsertResourceFolder): Promise<ResourceFolder> {
  const [created] = await db.insert(resourceFolders).values(data as any).returning();
  return created;
}

export async function updateResourceFolder(id: string, data: Partial<InsertResourceFolder>): Promise<ResourceFolder | undefined> {
  if (data.parentId !== undefined) {
    if (data.parentId === id) {
      throw new Error("A folder cannot be its own parent");
    }
    if (data.parentId) {
      const visited = new Set<string>();
      visited.add(id);
      let currentId: string | null = data.parentId;
      while (currentId) {
        if (visited.has(currentId)) {
          throw new Error("Moving this folder would create a circular reference");
        }
        visited.add(currentId);
        const [parent] = await db.select().from(resourceFolders).where(eq(resourceFolders.id, currentId));
        currentId = parent?.parentId || null;
      }
    }
  }
  const [updated] = await db.update(resourceFolders).set(data as any).where(eq(resourceFolders.id, id)).returning();
  return updated;
}

export async function deleteResourceFolder(id: string, visited?: Set<string>): Promise<void> {
  const seen = visited || new Set<string>();
  if (seen.has(id)) return;
  seen.add(id);
  await db.update(resources).set({ folderId: null }).where(eq(resources.folderId, id));
  const childFolders = await db.select().from(resourceFolders).where(eq(resourceFolders.parentId, id));
  for (const child of childFolders) {
    await deleteResourceFolder(child.id, seen);
  }
  await db.delete(resourceFolders).where(eq(resourceFolders.id, id));
}

export async function getResources(filters?: { categoryId?: string; type?: string; folderId?: string | null }): Promise<(Resource & { category: ResourceCategory | null; propertyIds: string[] })[]> {
  const rows = await db.select().from(resources)
    .leftJoin(resourceCategories, eq(resources.categoryId, resourceCategories.id))
    .orderBy(desc(resources.createdAt));

  const filtered = rows.filter(row => {
    if (filters?.categoryId && row.resources.categoryId !== filters.categoryId) return false;
    if (filters?.type && row.resources.type !== filters.type) return false;
    if (filters && 'folderId' in filters) {
      if (filters.folderId === null) {
        if (row.resources.folderId !== null) return false;
      } else if (filters.folderId !== undefined) {
        if (row.resources.folderId !== filters.folderId) return false;
      }
    }
    return true;
  });

  const result = await Promise.all(filtered.map(async (row) => {
    const propRows = await db.select({ propertyId: propertyResources.propertyId })
      .from(propertyResources)
      .where(eq(propertyResources.resourceId, row.resources.id));
    return {
      ...row.resources,
      category: row.resource_categories,
      propertyIds: propRows.map(p => p.propertyId),
    };
  }));
  return result;
}

export async function getResourceById(id: string): Promise<(Resource & { category: ResourceCategory | null; propertyIds: string[] }) | undefined> {
  const [row] = await db.select().from(resources)
    .leftJoin(resourceCategories, eq(resources.categoryId, resourceCategories.id))
    .where(eq(resources.id, id));
  if (!row) return undefined;
  const propRows = await db.select({ propertyId: propertyResources.propertyId })
    .from(propertyResources)
    .where(eq(propertyResources.resourceId, id));
  return {
    ...row.resources,
    category: row.resource_categories,
    propertyIds: propRows.map(p => p.propertyId),
  };
}

export async function createResource(data: InsertResource, propertyIds: string[]): Promise<Resource> {
  const [created] = await db.insert(resources).values(data as any).returning();
  if (propertyIds.length > 0) {
    await db.insert(propertyResources).values(
      propertyIds.map(pid => ({ propertyId: pid, resourceId: created.id }))
    ).onConflictDoNothing();
  }
  return created;
}

export async function updateResource(id: string, data: Partial<InsertResource>, propertyIds: string[]): Promise<Resource | undefined> {
  const [updated] = await db.update(resources).set(data as any).where(eq(resources.id, id)).returning();
  if (!updated) return undefined;
  await db.delete(propertyResources).where(eq(propertyResources.resourceId, id));
  if (propertyIds.length > 0) {
    await db.insert(propertyResources).values(
      propertyIds.map(pid => ({ propertyId: pid, resourceId: id }))
    ).onConflictDoNothing();
  }
  return updated;
}

export async function deleteResource(id: string): Promise<void> {
  await db.delete(propertyResources).where(eq(propertyResources.resourceId, id));
  await db.delete(resources).where(eq(resources.id, id));
}

export async function getPropertyResources(propertyId: string): Promise<(Resource & { category: ResourceCategory | null })[]> {
  const rows = await db.select().from(propertyResources)
    .innerJoin(resources, eq(propertyResources.resourceId, resources.id))
    .leftJoin(resourceCategories, eq(resources.categoryId, resourceCategories.id))
    .where(eq(propertyResources.propertyId, propertyId))
    .orderBy(resourceCategories.name, resources.title);
  return rows.map(row => ({
    ...row.resources,
    category: row.resource_categories,
  }));
}

export async function getEquipmentResources(equipmentId: string): Promise<(Resource & { category: ResourceCategory | null; propertyIds: string[] })[]> {
  const [item] = await db.select().from(equipment).where(eq(equipment.id, equipmentId));
  if (!item) return [];

  const rows = await db.select().from(resources)
    .leftJoin(resourceCategories, eq(resources.categoryId, resourceCategories.id))
    .where(
      or(
        sql`${resources.equipmentId}::text = ${equipmentId}`,
        eq(resources.equipmentCategory, item.category)
      )
    )
    .orderBy(resources.title);

  const seen = new Set<string>();
  const result = await Promise.all(
    rows
      .filter(row => {
        if (seen.has(row.resources.id)) return false;
        seen.add(row.resources.id);
        return true;
      })
      .map(async (row) => {
        const propRows = await db.select({ propertyId: propertyResources.propertyId })
          .from(propertyResources)
          .where(eq(propertyResources.resourceId, row.resources.id));
        return {
          ...row.resources,
          category: row.resource_categories,
          propertyIds: propRows.map(p => p.propertyId),
        };
      })
  );
  return result;
}
