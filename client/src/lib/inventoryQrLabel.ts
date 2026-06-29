import type { InventoryItem } from "@shared/schema";

const CATEGORY_LABELS: Record<string, string> = {
  auto: "Auto",
  cleaning: "Cleaning",
  landscaping: "Landscaping",
  plumbing: "Plumbing",
  electrical: "Electrical",
  repairs: "Repairs",
  general: "General",
};

export function getInventoryQrLabelLines(item: InventoryItem): {
  primary: string;
  secondary?: string;
} {
  const categoryLabel = CATEGORY_LABELS[item.category] || item.category || "General";
  const locationParts = [categoryLabel, item.location?.trim() || null].filter(Boolean);

  return {
    primary: item.barcode?.trim() || item.id,
    secondary: locationParts.length > 0 ? locationParts.join(" · ") : undefined,
  };
}
