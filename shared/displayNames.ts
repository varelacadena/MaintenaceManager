export type UserNameFields = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
};

export function formatUserDisplayName(user: UserNameFields): string {
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (full) return full;
  if (user.username) return user.username;
  return "Unknown user";
}

export function formatVehicleDisplayName(vehicle: {
  year: number;
  make: string;
  model: string;
}): string {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim();
}

export function formatEquipmentDisplayName(equipment: {
  name: string;
  assetTag?: string | null;
}): string {
  if (equipment.assetTag?.trim()) {
    return `${equipment.name} (${equipment.assetTag.trim()})`;
  }
  return equipment.name;
}

export function resolveUserDisplayName(opts: {
  userId?: string | null;
  snapshotName?: string | null;
  users?: UserNameFields[];
}): string {
  const { userId, snapshotName, users } = opts;
  if (userId && users?.length) {
    const match = users.find((u) => u.id === userId);
    if (match) return formatUserDisplayName(match);
  }
  if (snapshotName?.trim()) return snapshotName.trim();
  if (userId) return "Unknown user";
  return "—";
}

export function resolveEntityDisplayName(opts: {
  entityId?: string | null;
  snapshotName?: string | null;
  liveName?: string | null;
  fallback?: string;
}): string {
  const { entityId, snapshotName, liveName, fallback = "—" } = opts;
  if (entityId && liveName?.trim()) return liveName.trim();
  if (snapshotName?.trim()) return snapshotName.trim();
  if (entityId) return "Unknown";
  return fallback;
}
