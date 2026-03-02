export const CATEGORY_COLORS = [
  { value: "blue", label: "Blue" },
  { value: "purple", label: "Purple" },
  { value: "orange", label: "Orange" },
  { value: "yellow", label: "Yellow" },
  { value: "red", label: "Red" },
  { value: "teal", label: "Teal" },
  { value: "indigo", label: "Indigo" },
  { value: "green", label: "Green" },
  { value: "pink", label: "Pink" },
  { value: "gray", label: "Gray" },
];

const COLOR_STYLES: Record<string, { background: string; color: string; borderColor: string }> = {
  blue: { background: "#dbeafe", color: "#1e40af", borderColor: "#bfdbfe" },
  purple: { background: "#ede9fe", color: "#6b21a8", borderColor: "#ddd6fe" },
  orange: { background: "#ffedd5", color: "#c2410c", borderColor: "#fed7aa" },
  yellow: { background: "#fef9c3", color: "#854d0e", borderColor: "#fef08a" },
  red: { background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" },
  teal: { background: "#ccfbf1", color: "#0f766e", borderColor: "#99f6e4" },
  indigo: { background: "#e0e7ff", color: "#3730a3", borderColor: "#c7d2fe" },
  green: { background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" },
  pink: { background: "#fce7f3", color: "#9d174d", borderColor: "#fbcfe8" },
  gray: { background: "#f3f4f6", color: "#374151", borderColor: "#e5e7eb" },
};

const DARK_COLOR_STYLES: Record<string, { background: string; color: string; borderColor: string }> = {
  blue: { background: "#1e3a8a", color: "#bfdbfe", borderColor: "#1d4ed8" },
  purple: { background: "#4c1d95", color: "#ddd6fe", borderColor: "#6d28d9" },
  orange: { background: "#7c2d12", color: "#fed7aa", borderColor: "#c2410c" },
  yellow: { background: "#713f12", color: "#fef08a", borderColor: "#a16207" },
  red: { background: "#7f1d1d", color: "#fecaca", borderColor: "#b91c1c" },
  teal: { background: "#134e4a", color: "#99f6e4", borderColor: "#0f766e" },
  indigo: { background: "#1e1b4b", color: "#c7d2fe", borderColor: "#3730a3" },
  green: { background: "#14532d", color: "#bbf7d0", borderColor: "#15803d" },
  pink: { background: "#831843", color: "#fbcfe8", borderColor: "#9d174d" },
  gray: { background: "#374151", color: "#e5e7eb", borderColor: "#4b5563" },
};

export function getCategoryStyle(color: string): React.CSSProperties {
  const isDark = document.documentElement.classList.contains("dark");
  const styles = isDark ? DARK_COLOR_STYLES : COLOR_STYLES;
  return styles[color] || styles.gray;
}

export function getCategoryBadgeClass(color: string): string {
  return "";
}
