import type { TechPermissionUser } from "@shared/techPermissions";
import { canManageEquipment } from "@shared/techPermissions";

export function canEditEquipment(user: TechPermissionUser | null | undefined): boolean {
  return canManageEquipment(user);
}
