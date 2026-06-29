import { categoryLabel } from "@/lib/mobileEquipmentConstants";
import type { MobileEquipment } from "@shared/schema";

export function getMobileEquipmentQrLabelLines(equipment: MobileEquipment): {
  primary: string;
  secondary?: string;
  serialNumber?: string;
} {
  const secondaryParts = [
    categoryLabel(equipment.category),
    equipment.currentLocationNotes?.trim() || null,
  ].filter(Boolean);

  return {
    primary: equipment.assetTag?.trim() || equipment.name,
    secondary: secondaryParts.length > 0 ? secondaryParts.join(" · ") : undefined,
    serialNumber: equipment.serialNumber?.trim() || undefined,
  };
}
