const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function inventoryItemPath(itemId: string) {
  return `/inventory?item=${itemId}`;
}

export function inventoryQrUrl(origin: string, itemId: string) {
  return `${origin}${inventoryItemPath(itemId)}`;
}

export function parseInventoryIdFromScan(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/[?&]item=([0-9a-f-]{36})/i);
  if (urlMatch) return urlMatch[1];

  if (UUID_REGEX.test(trimmed)) return trimmed;
  return null;
}

export async function resolveInventoryItemFromScan<T = unknown>(
  value: string,
): Promise<T | null> {
  const itemId = parseInventoryIdFromScan(value);
  if (itemId) {
    const byId = await fetch(`/api/inventory/${encodeURIComponent(itemId)}`, {
      credentials: "include",
    });
    if (byId.ok) return byId.json();
  }

  const code = value.trim();
  if (!code) return null;

  const byBarcode = await fetch(`/api/inventory/by-barcode/${encodeURIComponent(code)}`, {
    credentials: "include",
  });
  if (byBarcode.ok) return byBarcode.json();

  const byRawId = await fetch(`/api/inventory/${encodeURIComponent(code)}`, {
    credentials: "include",
  });
  if (byRawId.ok) return byRawId.json();

  return null;
}
