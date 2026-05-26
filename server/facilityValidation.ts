import { storage } from "./storage";

export class FacilityValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function validatePropertyExists(propertyId: string) {
  const property = await storage.getProperty(propertyId);
  if (!property) {
    throw new FacilityValidationError("Property not found", 404);
  }
  return property;
}

export async function validateBuildingProperty(propertyId: string) {
  const property = await validatePropertyExists(propertyId);
  if (property.type !== "building") {
    throw new FacilityValidationError("Spaces can only be added to building properties");
  }
  return property;
}

export async function validateSpaceBelongsToProperty(spaceId: string, propertyId: string) {
  const space = await storage.getSpace(spaceId);
  if (!space) {
    throw new FacilityValidationError("Space not found", 404);
  }
  if (space.propertyId !== propertyId) {
    throw new FacilityValidationError("Space does not belong to this property");
  }
  return space;
}

export async function validateSpaceForProperty(spaceId: string, propertyId: string) {
  const property = await validatePropertyExists(propertyId);
  if (property.type !== "building") {
    throw new FacilityValidationError("Spaces can only be used with building properties");
  }
  return validateSpaceBelongsToProperty(spaceId, propertyId);
}

export async function validateEquipmentLocation(
  propertyId: string,
  spaceId?: string | null
) {
  await validatePropertyExists(propertyId);
  if (spaceId) {
    await validateSpaceForProperty(spaceId, propertyId);
  }
}

export async function validatePropertyIdsExist(propertyIds: string[]) {
  for (const propertyId of propertyIds) {
    await validatePropertyExists(propertyId);
  }
}

export async function validateTaskLocation(data: {
  propertyId?: string | null;
  spaceId?: string | null;
  equipmentId?: string | null;
  propertyIds?: string[] | null;
}) {
  if (data.propertyIds?.length) {
    await validatePropertyIdsExist(data.propertyIds);
  }
  if (data.propertyId) {
    await validatePropertyExists(data.propertyId);
    if (data.spaceId) {
      await validateSpaceForProperty(data.spaceId, data.propertyId);
    }
  } else if (data.spaceId) {
    throw new FacilityValidationError("spaceId requires propertyId");
  }
  if (data.equipmentId) {
    const equip = await storage.getEquipmentItem(data.equipmentId);
    if (!equip) {
      throw new FacilityValidationError("Equipment not found", 404);
    }
    if (data.propertyId && equip.propertyId && equip.propertyId !== data.propertyId) {
      throw new FacilityValidationError("Equipment does not belong to this property");
    }
    if (data.spaceId && equip.spaceId && equip.spaceId !== data.spaceId) {
      throw new FacilityValidationError("Equipment does not belong to this space");
    }
  }
}

export async function validateServiceRequestLocation(data: {
  propertyId?: string | null;
  spaceId?: string | null;
}) {
  if (!data.propertyId) return;
  const property = await validatePropertyExists(data.propertyId);
  if (data.spaceId) {
    await validateSpaceForProperty(data.spaceId, data.propertyId);
  }
}

export async function validateProjectLocation(data: {
  propertyId?: string | null;
  spaceId?: string | null;
}) {
  if (data.spaceId && !data.propertyId) {
    throw new FacilityValidationError("spaceId requires propertyId");
  }
  if (!data.propertyId) return;

  const property = await validatePropertyExists(data.propertyId);
  if (data.spaceId) {
    await validateSpaceForProperty(data.spaceId, data.propertyId);
  }
}
