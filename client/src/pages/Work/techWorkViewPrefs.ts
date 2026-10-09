export type TechWorkView = "list" | "week";

const STORAGE_KEY = "tech-work-view";

export function isTechWorkView(value: string | null | undefined): value is TechWorkView {
  return value === "list" || value === "week";
}

export function loadTechWorkView(): TechWorkView {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isTechWorkView(raw)) return raw;
  } catch {
    // private mode / unavailable
  }
  return "list";
}

export function saveTechWorkView(value: TechWorkView) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore quota / private mode
  }
}
