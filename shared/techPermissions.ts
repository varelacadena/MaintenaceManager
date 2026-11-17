/** Fields used to evaluate per-technician management permissions. */
export type TechPermissionUser = {
  role: string;
  canManageEquipment?: boolean | null;
  canManageFleet?: boolean | null;
  canManageInventory?: boolean | null;
  canManagePurchases?: boolean | null;
};

export type TechPermissionKey = "equipment" | "fleet" | "inventory" | "purchases";

const PERMISSION_FIELD: Record<TechPermissionKey, keyof TechPermissionUser> = {
  equipment: "canManageEquipment",
  fleet: "canManageFleet",
  inventory: "canManageInventory",
  purchases: "canManagePurchases",
};

export function techPermissionField(
  permission: TechPermissionKey,
): Exclude<keyof TechPermissionUser, "role"> {
  return PERMISSION_FIELD[permission];
}

export function canManageEquipment(user: TechPermissionUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin" || (user.role === "technician" && !!user.canManageEquipment);
}

export function canManageFleet(user: TechPermissionUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin" || (user.role === "technician" && !!user.canManageFleet);
}

export function canManageInventory(user: TechPermissionUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin" || (user.role === "technician" && !!user.canManageInventory);
}

export function canManagePurchases(user: TechPermissionUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin" || (user.role === "technician" && !!user.canManagePurchases);
}

export function hasTechPermission(
  user: TechPermissionUser | null | undefined,
  permission: TechPermissionKey,
): boolean {
  switch (permission) {
    case "equipment":
      return canManageEquipment(user);
    case "fleet":
      return canManageFleet(user);
    case "inventory":
      return canManageInventory(user);
    case "purchases":
      return canManagePurchases(user);
  }
}

export function getTechPermissionValue(
  user: TechPermissionUser | null | undefined,
  permission: TechPermissionKey,
): boolean {
  if (!user || user.role !== "technician") return false;
  const field = PERMISSION_FIELD[permission];
  return !!user[field];
}

export const TECH_PERMISSION_LABELS: Record<TechPermissionKey, { title: string; description: string }> = {
  equipment: {
    title: "Equipment & Tools",
    description: "Add and edit facility equipment and mobile tools",
  },
  fleet: {
    title: "Fleet",
    description: "Open the vehicle list, edit vehicles, and manage reservations. Lockbox codes stay admin-only.",
  },
  inventory: {
    title: "Inventory",
    description: "Add and edit inventory items and stock levels",
  },
  purchases: {
    title: "Purchases",
    description: "Open the receipt list, add receipts, and attach a saved receipt to a job. Store runs on a job stay available without this.",
  },
};
