const CATEGORY_ABBREV: Record<string, string> = {
  hvac: "HVAC",
  electrical: "ELEC",
  plumbing: "PLMB",
  mechanical: "MECH",
  appliances: "APPL",
  grounds: "GRND",
  janitorial: "JANI",
  structural: "STRU",
  water_treatment: "WTR",
  general: "GEN",
};

export function abbreviateTagPart(text: string, maxLen = 4): string {
  const cleaned = text.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  if (!cleaned) return "GEN";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    const word = words[0];
    if (/^\d+$/.test(word)) return word.slice(0, maxLen);
    return word.slice(0, maxLen).toUpperCase();
  }
  return words
    .map((word) => word[0])
    .join("")
    .slice(0, maxLen)
    .toUpperCase();
}

export function buildEquipmentAssetTagPrefix(params: {
  propertyName: string;
  spaceName?: string | null;
  category: string;
}): string {
  const propertyPart = abbreviateTagPart(params.propertyName);
  const spacePart = params.spaceName ? abbreviateTagPart(params.spaceName) : "GEN";
  const categoryKey = params.category.toLowerCase();
  const categoryPart =
    CATEGORY_ABBREV[categoryKey] ?? abbreviateTagPart(params.category.replace(/_/g, " "));
  return `${propertyPart}-${spacePart}-${categoryPart}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function nextEquipmentAssetTag(prefix: string, existingTags: string[]): string {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`, "i");
  let max = 0;
  for (const tag of existingTags) {
    const match = tag.match(pattern);
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  }
  return `${prefix}-${String(max + 1).padStart(2, "0")}`;
}

export function normalizeEquipmentAssetTag(tag: string | null | undefined): string | undefined {
  const trimmed = tag?.trim();
  if (!trimmed) return undefined;
  return trimmed.toUpperCase();
}

export function suggestEquipmentAssetTag(params: {
  propertyName: string;
  spaceName?: string | null;
  category: string;
  existingTags: string[];
}): string {
  const prefix = buildEquipmentAssetTagPrefix(params);
  return nextEquipmentAssetTag(prefix, params.existingTags);
}

export function getEquipmentCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    hvac: "HVAC",
    electrical: "Electrical",
    plumbing: "Plumbing",
    mechanical: "Mechanical / Fleet",
    appliances: "Appliances",
    grounds: "Grounds / Landscaping",
    janitorial: "Janitorial",
    structural: "Structural",
    water_treatment: "Water Treatment",
    general: "General",
  };
  return labels[category.toLowerCase()] ?? category;
}
