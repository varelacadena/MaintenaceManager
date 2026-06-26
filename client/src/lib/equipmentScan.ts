const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseEquipmentIdFromScan(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const equipmentPathMatch = trimmed.match(/\/equipment\/([a-f0-9-]{36})/i);
  if (equipmentPathMatch) return equipmentPathMatch[1];

  const uuidMatch = trimmed.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
  if (uuidMatch) return uuidMatch[1];

  if (UUID_REGEX.test(trimmed)) return trimmed;
  return null;
}

export function parseVehicleIdFromScan(value: string): string | null {
  const match = value.match(/\/vehicles\/([a-f0-9-]{36})/i);
  return match ? match[1] : null;
}

export async function resolveEquipmentIdFromScan(value: string): Promise<string | null> {
  const equipmentId = parseEquipmentIdFromScan(value);
  if (equipmentId) return equipmentId;

  const assetTag = value.trim();
  if (!assetTag) return null;

  const byTag = await fetch(`/api/equipment/by-tag/${encodeURIComponent(assetTag)}`, {
    credentials: "include",
  });
  if (byTag.ok) {
    const equipment = await byTag.json();
    return equipment.id as string;
  }

  return null;
}
