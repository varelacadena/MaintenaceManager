import type { InsertTask } from "@shared/schema";
import {
  formatEquipmentDisplayName,
  formatUserDisplayName,
  formatVehicleDisplayName,
} from "@shared/displayNames";
import { getUser } from "../storage/users";
import { getProperty, getSpace, getEquipmentItem } from "../storage/facilities";
import { getVehicle } from "../storage/vehicles";

export async function enrichTaskWithNameSnapshots(
  data: Partial<InsertTask>,
): Promise<Partial<InsertTask>> {
  const enriched: Partial<InsertTask> = { ...data };

  if (data.createdById) {
    const user = await getUser(data.createdById);
    if (user) enriched.createdByName = formatUserDisplayName(user);
  }

  if (data.assignedToId) {
    const user = await getUser(data.assignedToId);
    if (user) enriched.assignedToName = formatUserDisplayName(user);
  } else if (data.assignedToId === null) {
    enriched.assignedToName = null;
  }

  if (data.contactStaffId) {
    const user = await getUser(data.contactStaffId);
    if (user) enriched.contactStaffName = formatUserDisplayName(user);
  } else if (data.contactStaffId === null) {
    enriched.contactStaffName = null;
  }

  if (data.propertyId) {
    const property = await getProperty(data.propertyId);
    if (property) enriched.propertyName = property.name;
  } else if (data.propertyId === null) {
    enriched.propertyName = null;
  }

  if (data.spaceId) {
    const space = await getSpace(data.spaceId);
    if (space) enriched.spaceName = space.name;
  } else if (data.spaceId === null) {
    enriched.spaceName = null;
  }

  if (data.equipmentId) {
    const item = await getEquipmentItem(data.equipmentId);
    if (item) enriched.equipmentName = formatEquipmentDisplayName(item);
  } else if (data.equipmentId === null) {
    enriched.equipmentName = null;
  }

  if (data.vehicleId) {
    const vehicle = await getVehicle(data.vehicleId);
    if (vehicle) enriched.vehicleName = formatVehicleDisplayName(vehicle);
  } else if (data.vehicleId === null) {
    enriched.vehicleName = null;
  }

  return enriched;
}
