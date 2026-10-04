import { equipmentCategoryCode } from "@shared/equipmentAssetTag";

export type AssetTagFields = {
  id: string;
  name: string;
  location: string;
  category: string;
};

function shown(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || "—";
}

export function formatEquipmentLabelLocation(space?: { name: string; floor?: string | null } | null): string {
  const name = space?.name?.trim() ?? "";
  if (!name) return "—";
  const floor = space?.floor?.trim();
  return floor ? `${name} · ${floor}` : name;
}

export function getEquipmentAssetTagFields(
  equipment: { assetTag?: string | null; name: string; category: string; spaceId?: string | null },
  spaces: { id: string; name: string; floor?: string | null }[] = [],
): AssetTagFields {
  const space = equipment.spaceId ? spaces.find((item) => item.id === equipment.spaceId) : undefined;
  return {
    id: shown(equipment.assetTag),
    name: shown(equipment.name),
    location: formatEquipmentLabelLocation(space),
    category: equipmentCategoryCode(equipment.category),
  };
}
