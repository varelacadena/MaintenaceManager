import { getEquipmentCategoryLabel } from "@shared/equipmentAssetTag";
import type { Equipment, Space } from "@shared/schema";

export function getEquipmentQrLabelLines(
  equipment: Equipment,
  spaces: Space[] = [],
): { primary: string; secondary?: string; serialNumber?: string } {
  const space = equipment.spaceId ? spaces.find((item) => item.id === equipment.spaceId) : undefined;
  const categoryLabel = getEquipmentCategoryLabel(equipment.category);
  const locationParts = [
    categoryLabel,
    space ? `${space.name}${space.floor ? ` · ${space.floor}` : ""}` : null,
  ].filter(Boolean);

  return {
    primary: equipment.assetTag || equipment.name,
    secondary: locationParts.length > 0 ? locationParts.join(" · ") : undefined,
    serialNumber: equipment.serialNumber || undefined,
  };
}
