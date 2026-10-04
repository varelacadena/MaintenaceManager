import { categoryLabel } from "@/lib/mobileEquipmentConstants";
import type { AssetTagFields } from "@/lib/equipmentQrLabel";

export function getMobileEquipmentAssetTagFields(equipment: {
  assetTag?: string | null;
  name: string;
  category: string;
  currentLocationNotes?: string | null;
}): AssetTagFields {
  const location = equipment.currentLocationNotes?.trim() || "—";
  return {
    id: equipment.assetTag?.trim() || "—",
    name: equipment.name.trim() || "—",
    location,
    category: categoryLabel(equipment.category),
  };
}
