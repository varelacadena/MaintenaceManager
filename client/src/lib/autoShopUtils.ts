export function isAutoShopName(name: string | null | undefined): boolean {
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  return normalized.includes("auto shop") || normalized.includes("autoshop");
}
