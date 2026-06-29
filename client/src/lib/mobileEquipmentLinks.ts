const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function mobileEquipmentPath(equipmentId: string) {
  return `/tools-equipment/${equipmentId}`;
}

export function mobileEquipmentQrUrl(origin: string, equipmentId: string) {
  return `${origin}${mobileEquipmentPath(equipmentId)}`;
}

export function parseMobileEquipmentIdFromScan(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const pathMatch = trimmed.match(/\/tools-equipment\/([a-f0-9-]{36})/i);
  if (pathMatch) return pathMatch[1];

  if (UUID_REGEX.test(trimmed)) return trimmed;
  return null;
}
