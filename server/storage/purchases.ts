import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import {
  equipment,
  mobileEquipment,
  projects,
  properties,
  purchaseLinks,
  purchases,
  tasks,
  vehicles,
  type Purchase,
  type PurchaseLink,
  type PurchaseLinkKind,
  type PurchaseLinkView,
  type PurchaseView,
} from "@shared/schema";
import { db } from "../db";

export type PurchaseLinkInput = {
  kind: PurchaseLinkKind;
  targetId: string;
};

const KIND_COLUMN = {
  task: "taskId",
  vehicle: "vehicleId",
  equipment: "equipmentId",
  tool: "mobileEquipmentId",
  property: "propertyId",
  project: "projectId",
} as const;

function linkColumn(kind: PurchaseLinkKind): (typeof KIND_COLUMN)[PurchaseLinkKind] {
  return KIND_COLUMN[kind];
}

function pattern(query: string): string {
  return `%${query.replace(/[%_\\]/g, "")}%`;
}

export async function listTaskPurchases(taskId: string): Promise<PurchaseView[]> {
  const links = await db
    .select({ purchaseId: purchaseLinks.purchaseId })
    .from(purchaseLinks)
    .where(eq(purchaseLinks.taskId, taskId));
  const ids = links.map((link) => link.purchaseId);
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(purchases)
    .where(inArray(purchases.id, ids))
    .orderBy(asc(purchases.purchasedOn), asc(purchases.createdAt));
  return withLinks(rows);
}

export async function getPurchase(id: string): Promise<Purchase | undefined> {
  const [row] = await db.select().from(purchases).where(eq(purchases.id, id));
  return row;
}

export async function getPurchaseView(id: string): Promise<PurchaseView | undefined> {
  const row = await getPurchase(id);
  if (!row) return undefined;
  const [view] = await withLinks([row]);
  return view;
}

export async function createPurchase(
  values: typeof purchases.$inferInsert,
  links: PurchaseLinkInput[],
): Promise<PurchaseView> {
  const row = await db.transaction(async (tx) => {
    const [created] = await tx.insert(purchases).values(values).returning();
    if (links.length > 0) {
      await tx.insert(purchaseLinks).values(links.map((link) => linkValues(created.id, link)));
    }
    return created;
  });
  const [view] = await withLinks([row]);
  return view;
}

export async function updatePurchase(
  id: string,
  values: Partial<typeof purchases.$inferInsert>,
): Promise<PurchaseView | undefined> {
  const [row] = await db
    .update(purchases)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(purchases.id, id))
    .returning();
  if (!row) return undefined;
  const [view] = await withLinks([row]);
  return view;
}

export async function deletePurchase(id: string): Promise<void> {
  await db.delete(purchases).where(eq(purchases.id, id));
}

export async function addPurchaseLink(purchaseId: string, link: PurchaseLinkInput): Promise<PurchaseLink> {
  const [row] = await db.insert(purchaseLinks).values(linkValues(purchaseId, link)).returning();
  return row;
}

export async function getPurchaseLink(id: string): Promise<PurchaseLink | undefined> {
  const [row] = await db.select().from(purchaseLinks).where(eq(purchaseLinks.id, id));
  return row;
}

export async function deletePurchaseLink(id: string): Promise<void> {
  await db.delete(purchaseLinks).where(eq(purchaseLinks.id, id));
}

export async function countPurchaseLinks(purchaseId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseLinks)
    .where(eq(purchaseLinks.purchaseId, purchaseId));
  return Number(row?.count) || 0;
}

export async function listPurchases(filters: {
  startDate?: string;
  endDate?: string;
  propertyIds?: string[];
  query?: string;
}): Promise<PurchaseView[]> {
  const conditions = [];
  if (filters.startDate) conditions.push(gte(purchases.purchasedOn, filters.startDate));
  if (filters.endDate) conditions.push(lte(purchases.purchasedOn, filters.endDate));
  if (filters.propertyIds && filters.propertyIds.length > 0) {
    conditions.push(propertyMatch(filters.propertyIds));
  }
  const query = filters.query?.trim();
  if (query) conditions.push(searchMatch(pattern(query)));

  const rows = await db
    .select()
    .from(purchases)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(purchases.purchasedOn), asc(purchases.storeName))
    .limit(500);
  return withLinks(rows);
}

export async function searchPurchaseOptions(kind: PurchaseLinkKind, query: string): Promise<{ id: string; label: string }[]> {
  const like = pattern(query.trim());
  const hasQuery = query.trim().length > 0;
  if (kind === "task") {
    const rows = await db
      .select({ id: tasks.id, label: tasks.name })
      .from(tasks)
      .where(hasQuery ? ilike(tasks.name, like) : undefined)
      .orderBy(asc(tasks.name))
      .limit(30);
    return rows;
  }
  if (kind === "vehicle") {
    const rows = await db
      .select({ id: vehicles.id, make: vehicles.make, model: vehicles.model, code: vehicles.vehicleId })
      .from(vehicles)
      .where(hasQuery ? or(ilike(vehicles.make, like), ilike(vehicles.model, like), ilike(vehicles.vehicleId, like)) : undefined)
      .orderBy(asc(vehicles.vehicleId))
      .limit(30);
    return rows.map((row) => ({ id: row.id, label: `${row.code} · ${row.make} ${row.model}` }));
  }
  if (kind === "equipment") {
    const rows = await db
      .select({ id: equipment.id, label: equipment.name })
      .from(equipment)
      .where(hasQuery ? ilike(equipment.name, like) : undefined)
      .orderBy(asc(equipment.name))
      .limit(30);
    return rows;
  }
  if (kind === "tool") {
    const rows = await db
      .select({ id: mobileEquipment.id, label: mobileEquipment.name })
      .from(mobileEquipment)
      .where(hasQuery ? ilike(mobileEquipment.name, like) : undefined)
      .orderBy(asc(mobileEquipment.name))
      .limit(30);
    return rows;
  }
  if (kind === "property") {
    const rows = await db
      .select({ id: properties.id, label: properties.name })
      .from(properties)
      .where(hasQuery ? ilike(properties.name, like) : undefined)
      .orderBy(asc(properties.name))
      .limit(30);
    return rows;
  }
  const rows = await db
    .select({ id: projects.id, label: projects.name })
    .from(projects)
    .where(hasQuery ? ilike(projects.name, like) : undefined)
    .orderBy(asc(projects.name))
    .limit(30);
  return rows;
}

export async function purchaseTargetExists(kind: PurchaseLinkKind, targetId: string): Promise<boolean> {
  if (kind === "task") {
    const [row] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, targetId));
    return !!row;
  }
  if (kind === "vehicle") {
    const [row] = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.id, targetId));
    return !!row;
  }
  if (kind === "equipment") {
    const [row] = await db.select({ id: equipment.id }).from(equipment).where(eq(equipment.id, targetId));
    return !!row;
  }
  if (kind === "tool") {
    const [row] = await db.select({ id: mobileEquipment.id }).from(mobileEquipment).where(eq(mobileEquipment.id, targetId));
    return !!row;
  }
  if (kind === "property") {
    const [row] = await db.select({ id: properties.id }).from(properties).where(eq(properties.id, targetId));
    return !!row;
  }
  const [row] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, targetId));
  return !!row;
}

function linkValues(purchaseId: string, link: PurchaseLinkInput): typeof purchaseLinks.$inferInsert {
  return {
    purchaseId,
    taskId: null,
    vehicleId: null,
    equipmentId: null,
    mobileEquipmentId: null,
    propertyId: null,
    projectId: null,
    [linkColumn(link.kind)]: link.targetId,
  };
}

function propertyMatch(propertyIds: string[]) {
  const list = sql.join(propertyIds.map((id) => sql`${id}`), sql`, `);
  return sql`exists (
    select 1 from purchase_links pl
    left join tasks t on t.id = pl.task_id
    left join equipment e on e.id = pl.equipment_id
    left join projects pr on pr.id = pl.project_id
    left join mobile_equipment m on m.id = pl.mobile_equipment_id
    where pl.purchase_id = ${purchases.id}
      and (
        pl.property_id in (${list})
        or t.property_id in (${list})
        or e.property_id in (${list})
        or pr.property_id in (${list})
        or m.current_property_id in (${list})
      )
  )`;
}

function searchMatch(like: string) {
  return sql`(
    ${purchases.storeName} ilike ${like}
    or ${purchases.description} ilike ${like}
    or coalesce(${purchases.purposeNote}, '') ilike ${like}
    or exists (
      select 1 from purchase_links pl
      left join tasks t on t.id = pl.task_id
      left join vehicles v on v.id = pl.vehicle_id
      left join equipment e on e.id = pl.equipment_id
      left join mobile_equipment m on m.id = pl.mobile_equipment_id
      left join properties p on p.id = pl.property_id
      left join projects pr on pr.id = pl.project_id
      where pl.purchase_id = ${purchases.id}
        and (
          coalesce(t.name, '') ilike ${like}
          or coalesce(v.make, '') ilike ${like}
          or coalesce(v.model, '') ilike ${like}
          or coalesce(v.vehicle_id, '') ilike ${like}
          or coalesce(e.name, '') ilike ${like}
          or coalesce(m.name, '') ilike ${like}
          or coalesce(p.name, '') ilike ${like}
          or coalesce(pr.name, '') ilike ${like}
        )
    )
  )`;
}

async function withLinks(rows: Purchase[]): Promise<PurchaseView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const links = await db.select().from(purchaseLinks).where(inArray(purchaseLinks.purchaseId, ids));
  const labels = await loadLabels(links);
  const byPurchase = new Map<string, PurchaseLinkView[]>();
  for (const link of links) {
    const view = toLinkView(link, labels);
    const list = byPurchase.get(link.purchaseId) ?? [];
    list.push(view);
    byPurchase.set(link.purchaseId, list);
  }
  return rows.map((row) => ({
    ...row,
    links: (byPurchase.get(row.id) ?? []).sort((a, b) => a.label.localeCompare(b.label)),
    hasReceipt: !!row.receiptObjectPath,
  }));
}

type LabelMaps = Record<PurchaseLinkKind, Map<string, string>>;

async function loadLabels(links: PurchaseLink[]): Promise<LabelMaps> {
  const ids = {
    task: unique(links.map((link) => link.taskId)),
    vehicle: unique(links.map((link) => link.vehicleId)),
    equipment: unique(links.map((link) => link.equipmentId)),
    tool: unique(links.map((link) => link.mobileEquipmentId)),
    property: unique(links.map((link) => link.propertyId)),
    project: unique(links.map((link) => link.projectId)),
  };
  const [taskRows, vehicleRows, equipmentRows, toolRows, propertyRows, projectRows] = await Promise.all([
    ids.task.length ? db.select({ id: tasks.id, name: tasks.name }).from(tasks).where(inArray(tasks.id, ids.task)) : [],
    ids.vehicle.length
      ? db.select({ id: vehicles.id, make: vehicles.make, model: vehicles.model, code: vehicles.vehicleId }).from(vehicles).where(inArray(vehicles.id, ids.vehicle))
      : [],
    ids.equipment.length ? db.select({ id: equipment.id, name: equipment.name }).from(equipment).where(inArray(equipment.id, ids.equipment)) : [],
    ids.tool.length ? db.select({ id: mobileEquipment.id, name: mobileEquipment.name }).from(mobileEquipment).where(inArray(mobileEquipment.id, ids.tool)) : [],
    ids.property.length ? db.select({ id: properties.id, name: properties.name }).from(properties).where(inArray(properties.id, ids.property)) : [],
    ids.project.length ? db.select({ id: projects.id, name: projects.name }).from(projects).where(inArray(projects.id, ids.project)) : [],
  ]);
  return {
    task: new Map(taskRows.map((row) => [row.id, row.name])),
    vehicle: new Map(vehicleRows.map((row) => [row.id, `${row.code} · ${row.make} ${row.model}`])),
    equipment: new Map(equipmentRows.map((row) => [row.id, row.name])),
    tool: new Map(toolRows.map((row) => [row.id, row.name])),
    property: new Map(propertyRows.map((row) => [row.id, row.name])),
    project: new Map(projectRows.map((row) => [row.id, row.name])),
  };
}

function toLinkView(link: PurchaseLink, labels: LabelMaps): PurchaseLinkView {
  const kind = linkKind(link);
  const targetId =
    link.taskId || link.vehicleId || link.equipmentId || link.mobileEquipmentId || link.propertyId || link.projectId || "";
  return {
    id: link.id,
    kind,
    targetId,
    label: labels[kind].get(targetId) || "Removed record",
  };
}

function linkKind(link: PurchaseLink): PurchaseLinkKind {
  if (link.taskId) return "task";
  if (link.vehicleId) return "vehicle";
  if (link.equipmentId) return "equipment";
  if (link.mobileEquipmentId) return "tool";
  if (link.propertyId) return "property";
  return "project";
}

function unique(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => !!value))];
}
