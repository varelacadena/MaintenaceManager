/** Roles that can search inventory when adding parts to a task (staff excluded). */
export function canReadInventory(role: string | undefined): boolean {
  return role === "admin" || role === "technician" || role === "student";
}

/** Roles that can add items and adjust stock on the inventory page. */
export function canOperateInventory(role: string | undefined): boolean {
  return role === "admin";
}

export function isInventoryAdmin(role: string | undefined): boolean {
  return role === "admin";
}

/** Unit/line cost fields (catalog and previews) — admins only. */
export function canSeeInventoryCost(role: string | undefined): boolean {
  return role === "admin";
}
