import {
  users,
  tasks,
  serviceRequests,
  uploads,
  projects,
  projectComments,
  quotes,
  emergencyContacts,
  properties,
  equipment,
  vehicles,
  vehicleReservations,
  vehicleCheckOutLogs,
  vehicleCheckInLogs,
  deletionAuditLog,
  deletedEntityRegistry,
  type User,
  type Property,
  type Equipment,
  type Vehicle,
} from "@shared/schema";
import {
  formatUserDisplayName,
  formatVehicleDisplayName,
  formatEquipmentDisplayName,
} from "@shared/displayNames";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";

export type DeletionEntityType =
  | "user"
  | "property"
  | "vehicle"
  | "equipment";

function userSnapshot(user: User): Record<string, unknown> {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

async function snapshotUserReferences(userId: string, displayName: string): Promise<void> {
  await db.execute(sql`
    UPDATE tasks
    SET
      created_by_name = COALESCE(created_by_name, ${displayName}),
      assigned_to_name = COALESCE(assigned_to_name, ${displayName}),
      contact_staff_name = COALESCE(contact_staff_name, ${displayName}),
      assigned_to_id = CASE WHEN assigned_to_id = ${userId} THEN NULL ELSE assigned_to_id END,
      contact_staff_id = CASE WHEN contact_staff_id = ${userId} THEN NULL ELSE contact_staff_id END,
      created_by_id = CASE WHEN created_by_id = ${userId} THEN NULL ELSE created_by_id END
    WHERE created_by_id = ${userId}
       OR assigned_to_id = ${userId}
       OR contact_staff_id = ${userId}
  `);

  await db.execute(sql`
    UPDATE time_entries
    SET user_name = COALESCE(user_name, ${displayName}),
        user_id = NULL
    WHERE user_id = ${userId}
  `);

  await db.execute(sql`
    UPDATE task_notes
    SET user_name = COALESCE(user_name, ${displayName}),
        user_id = NULL
    WHERE user_id = ${userId}
  `);

  await db.execute(sql`
    UPDATE service_requests
    SET requester_name = COALESCE(requester_name, ${displayName}),
        requester_id = NULL
    WHERE requester_id = ${userId}
  `);

  await db.execute(sql`
    UPDATE uploads
    SET uploaded_by_name = COALESCE(uploaded_by_name, ${displayName}),
        uploaded_by_id = NULL
    WHERE uploaded_by_id = ${userId}
  `);

  await db.execute(sql`
    UPDATE projects
    SET created_by_name = COALESCE(created_by_name, ${displayName}),
        created_by_id = NULL
    WHERE created_by_id = ${userId}
  `);

  await db.execute(sql`
    UPDATE project_comments
    SET sender_name = COALESCE(sender_name, ${displayName}),
        sender_id = NULL
    WHERE sender_id = ${userId}
  `);

  await db.execute(sql`
    UPDATE quotes
    SET created_by_name = COALESCE(created_by_name, ${displayName}),
        created_by_id = NULL
    WHERE created_by_id = ${userId}
  `);

  await db.execute(sql`
    UPDATE emergency_contacts
    SET assigned_by_name = COALESCE(assigned_by_name, ${displayName}),
        assigned_by_id = NULL
    WHERE assigned_by_id = ${userId}
  `);

  await db.execute(sql`
    UPDATE checklist_templates
    SET created_by_id = NULL
    WHERE created_by_id = ${userId}
  `);

  await db.execute(sql`
    UPDATE ai_agent_logs
    SET reviewed_by = NULL
    WHERE reviewed_by = ${userId}
  `);

  await db.delete(vehicleReservations).where(eq(vehicleReservations.userId, userId));
  await db.delete(vehicleCheckOutLogs).where(eq(vehicleCheckOutLogs.userId, userId));
  await db.delete(vehicleCheckInLogs).where(eq(vehicleCheckInLogs.userId, userId));
}

async function snapshotPropertyReferences(property: Property): Promise<void> {
  const propertyName = property.name;

  await db.execute(sql`
    UPDATE tasks
    SET
      property_name = COALESCE(property_name, ${propertyName}),
      property_id = NULL,
      space_id = NULL,
      property_ids = CASE
        WHEN property_ids IS NULL THEN NULL
        ELSE ARRAY(SELECT unnest(property_ids) EXCEPT SELECT ${property.id}::text)
      END
    WHERE property_id = ${property.id}
       OR ${property.id} = ANY(property_ids)
  `);

  await db.execute(sql`
    UPDATE service_requests
    SET property_name = COALESCE(property_name, ${propertyName}),
        property_id = NULL,
        space_id = NULL
    WHERE property_id = ${property.id}
  `);

  await db.execute(sql`
    UPDATE projects
    SET property_id = NULL,
        space_id = NULL
    WHERE property_id = ${property.id}
  `);
}

async function snapshotVehicleReferences(vehicle: Vehicle): Promise<void> {
  const vehicleName = formatVehicleDisplayName(vehicle);

  await db.execute(sql`
    UPDATE tasks
    SET vehicle_name = COALESCE(vehicle_name, ${vehicleName}),
        vehicle_id = NULL
    WHERE vehicle_id = ${vehicle.id}
  `);
}

async function snapshotEquipmentReferences(item: Equipment): Promise<void> {
  const equipmentName = formatEquipmentDisplayName(item);

  await db.execute(sql`
    UPDATE tasks
    SET equipment_name = COALESCE(equipment_name, ${equipmentName}),
        equipment_id = NULL
    WHERE equipment_id = ${item.id}
  `);
}

async function writeDeletionRecords(
  entityType: DeletionEntityType,
  entityId: string,
  entityLabel: string,
  deletedById: string,
  snapshot: Record<string, unknown>,
): Promise<void> {
  await db.insert(deletedEntityRegistry).values({
    entityType,
    entityId,
    displayLabel: entityLabel,
    snapshot,
    deletedById,
  }).onConflictDoUpdate({
    target: [deletedEntityRegistry.entityType, deletedEntityRegistry.entityId],
    set: {
      displayLabel: entityLabel,
      snapshot,
      deletedAt: new Date(),
      deletedById,
    },
  });

  await db.insert(deletionAuditLog).values({
    entityType,
    entityId,
    entityLabel,
    deletedById,
    snapshot,
  });
}

export async function deleteUserWithAudit(user: User, deletedById: string): Promise<void> {
  const displayName = formatUserDisplayName(user);

  await db.transaction(async () => {
    await snapshotUserReferences(user.id, displayName);
    await writeDeletionRecords("user", user.id, displayName, deletedById, userSnapshot(user));
    await db.delete(users).where(eq(users.id, user.id));
  });
}

export async function deletePropertyWithAudit(property: Property, deletedById: string): Promise<void> {
  await db.transaction(async () => {
    await snapshotPropertyReferences(property);
    await writeDeletionRecords("property", property.id, property.name, deletedById, {
      id: property.id,
      name: property.name,
      type: property.type,
      address: property.address,
    });
    await db.delete(properties).where(eq(properties.id, property.id));
  });
}

export async function deleteVehicleWithAudit(vehicle: Vehicle, deletedById: string): Promise<void> {
  const label = formatVehicleDisplayName(vehicle);

  await db.transaction(async () => {
    await snapshotVehicleReferences(vehicle);
    await writeDeletionRecords("vehicle", vehicle.id, label, deletedById, {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vehicleId: vehicle.vehicleId,
      licensePlate: vehicle.licensePlate,
    });
    await db.delete(vehicles).where(eq(vehicles.id, vehicle.id));
  });
}

export async function deleteEquipmentWithAudit(item: Equipment, deletedById: string): Promise<void> {
  const label = formatEquipmentDisplayName(item);

  await db.transaction(async () => {
    await snapshotEquipmentReferences(item);
    await writeDeletionRecords("equipment", item.id, label, deletedById, {
      id: item.id,
      name: item.name,
      category: item.category,
      assetTag: item.assetTag,
      propertyId: item.propertyId,
      spaceId: item.spaceId,
    });
    await db.delete(equipment).where(eq(equipment.id, item.id));
  });
}

export async function getDeletionAuditLog(limit = 100) {
  return db
    .select()
    .from(deletionAuditLog)
    .orderBy(sql`${deletionAuditLog.deletedAt} DESC`)
    .limit(limit);
}
