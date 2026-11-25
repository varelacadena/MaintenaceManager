import { formatUserDisplayName } from "@shared/displayNames";
import { getProperty } from "./storage/facilities";
import { getUser } from "./storage/users";

export async function userDisplayName(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const user = await getUser(userId);
  return user ? formatUserDisplayName(user) : null;
}

export async function propertyDisplayName(propertyId: string | null | undefined): Promise<string | null> {
  if (!propertyId) return null;
  const property = await getProperty(propertyId);
  return property?.name ?? null;
}
