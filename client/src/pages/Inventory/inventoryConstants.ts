export const CATEGORIES = [
  { value: "all", label: "All", icon: "LayoutGrid" },
  { value: "auto", label: "Auto", icon: "Truck" },
  { value: "cleaning", label: "Cleaning", icon: "Droplets" },
  { value: "landscaping", label: "Landscaping", icon: "Leaf" },
  { value: "plumbing", label: "Plumbing", icon: "Wrench" },
  { value: "electrical", label: "Electrical", icon: "Zap" },
  { value: "repairs", label: "Repairs", icon: "HardHat" },
  { value: "general", label: "General", icon: "Package" },
];

export const TRACKING_MODES = [
  { value: "counted", label: "Counted", description: "Track exact quantities (auto parts, fluids, hardware)" },
  { value: "container", label: "Container / Unit", description: "Track whole containers or packages (spray bottles, bags)" },
  { value: "status", label: "Status Only", description: "Stocked / Low / Out — no counting (small fasteners, consumables)" },
];

export const CATEGORY_TRACKING_DEFAULTS: Record<string, string> = {
  auto: "counted", cleaning: "container", landscaping: "container",
  plumbing: "counted", electrical: "counted", repairs: "counted", general: "counted",
};

export const STATUS_CYCLE: Record<string, string> = { stocked: "low", low: "out", out: "stocked" };

export const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "destructive" | "outline"; dot: string }> = {
  stocked: { label: "Stocked", variant: "secondary", dot: "bg-green-500" },
  low:     { label: "Low",     variant: "outline",   dot: "bg-yellow-500" },
  out:     { label: "Out",     variant: "destructive", dot: "bg-red-500" },
};

export function formatQty(qty: string | number | null | undefined): string {
  const n = parseFloat(String(qty ?? 0));
  if (isNaN(n)) return "0";
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}
