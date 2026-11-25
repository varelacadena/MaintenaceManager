import type { AnalyticsFilters } from "./analyticsService";

export interface ExportSheet {
  name: string;
  rows: (string | number)[][];
}

const FILE_SLUGS: Record<string, string> = {
  overview: "overview",
  "work-orders-complete": "work-orders",
  "technicians-detailed": "team",
  assets: "assets",
  "facilities-detailed": "facilities",
  "fleet-detailed": "fleet",
  "inventory-detailed": "inventory",
  "service-requests-detailed": "service-requests",
  alerts: "alerts",
  projects: "projects",
};

export function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]]/g, "").slice(0, 31);
}

export function buildExportFilename(dataType: string, format: "xlsx" | "pdf", filters: AnalyticsFilters): string {
  const slug = FILE_SLUGS[dataType] ?? dataType.replace(/[^a-z0-9]+/gi, "-");
  let datePart = "all-time";
  if (filters.startDate && filters.endDate) {
    datePart = `${filters.startDate}_to_${filters.endDate}`;
  } else if (filters.startDate) {
    datePart = `from_${filters.startDate}`;
  } else if (filters.endDate) {
    datePart = `until_${filters.endDate}`;
  }
  const ext = format === "xlsx" ? "xlsx" : "pdf";
  return `${slug}_${datePart}.${ext}`;
}

function stripColumns(rows: (string | number)[][], pattern: RegExp): (string | number)[][] {
  if (rows.length === 0) return rows;
  const keep = rows[0].map((cell) => !pattern.test(String(cell)));
  if (keep.every(Boolean)) return rows;
  return rows.map((row) => row.filter((_, index) => keep[index] !== false));
}

function stripCostColumns(rows: (string | number)[][]): (string | number)[][] {
  return stripColumns(rows, /cost|budget|labor/i);
}

export function applyColumnOptions(rows: (string | number)[][], filters: AnalyticsFilters): (string | number)[][] {
  let next = rows;
  if (filters.includeCost === false) next = stripCostColumns(next);
  if (filters.includeStudents !== true) next = stripColumns(next, /clock|recap/i);
  return next;
}

export function selectSheets(sheets: ExportSheet[], filters: AnalyticsFilters): ExportSheet[] {
  let selected = sheets;
  if (filters.sheets && filters.sheets.length > 0) {
    const allow = new Set(filters.sheets.map((name) => name.toLowerCase()));
    const matched = selected.filter((sheet) => allow.has(sheet.name.toLowerCase()));
    if (matched.length > 0) selected = matched;
  }
  if (filters.includeCost === false) {
    const withoutCost = selected.filter((sheet) => !/cost|budget/i.test(sheet.name));
    if (withoutCost.length > 0) selected = withoutCost;
  }
  return selected.map((sheet) => ({ ...sheet, rows: applyColumnOptions(sheet.rows, filters) }));
}
