import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { areas, lifeSafetyChecks, subdivisions, vehicleMaintenanceLogs } from "@shared/schema";

describe("table homes", () => {
  it("keeps the life-safety, maintenance-log, area, and subdivision columns", () => {
    expect(Object.keys(getTableColumns(lifeSafetyChecks))).toEqual(
      expect.arrayContaining(["id", "taskId", "equipmentName", "result"]),
    );
    expect(Object.keys(getTableColumns(vehicleMaintenanceLogs))).toEqual(
      expect.arrayContaining(["id", "vehicleId", "taskId", "description"]),
    );
    expect(Object.keys(getTableColumns(areas))).toEqual(expect.arrayContaining(["id", "name"]));
    expect(Object.keys(getTableColumns(subdivisions))).toEqual(
      expect.arrayContaining(["id", "areaId", "name"]),
    );
  });
});
