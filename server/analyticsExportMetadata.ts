import { areas, properties, spaces, users } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import type { AnalyticsFilters } from "./analyticsService";
import { db } from "./db";
import { DATE_BASIS_LABEL, parseCsvIds, parseDateBasis, parsePropertyIds } from "./localDates";
import { formatDateRange, statusLabel } from "./analyticsExportText";

export async function resolveFilterMetadata(filters: AnalyticsFilters): Promise<(string | number)[][]> {
  const rows: (string | number)[][] = [
    ["Field", "Value"],
    ["Generated", new Date().toLocaleString()],
    ["Date range", formatDateRange(filters)],
    ["Dates mean", DATE_BASIS_LABEL[parseDateBasis(filters.dateBasis)]],
  ];

  const selectedPropertyIds = parsePropertyIds(filters.propertyId);
  if (selectedPropertyIds.length) {
    const matches = await db.select().from(properties).where(inArray(properties.id, selectedPropertyIds));
    const names = selectedPropertyIds.map((id) => matches.find((property) => property.id === id)?.name ?? id);
    rows.push(["Property", names.join(", ")]);
  }
  if (filters.spaceId) {
    const [s] = await db.select().from(spaces).where(eq(spaces.id, filters.spaceId));
    rows.push(["Space", s?.name ?? filters.spaceId]);
  }
  if (filters.areaId) {
    const [a] = await db.select().from(areas).where(eq(areas.id, filters.areaId));
    rows.push(["Area", a?.name ?? filters.areaId]);
  }
  const selectedTechnicianIds = parseCsvIds(filters.technicianId);
  if (selectedTechnicianIds.length) {
    const matches = await db.select().from(users).where(inArray(users.id, selectedTechnicianIds));
    const names = selectedTechnicianIds.map((id) => {
      const person = matches.find((user) => user.id === id);
      return person ? [person.firstName, person.lastName].filter(Boolean).join(" ") || person.username : id;
    });
    rows.push(["People", names.join(", ")]);
  }
  if (filters.status) rows.push(["Status", statusLabel(filters.status)]);
  if (filters.urgency) rows.push(["Priority", filters.urgency]);
  if (filters.roleType && filters.roleType !== "all") {
    rows.push(["Team role", filters.roleType === "student" ? "Students" : "Technicians"]);
  }

  return rows;
}
