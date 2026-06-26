import { describe, expect, it } from "vitest";
import { compareVehicleIds, sortVehiclesByVehicleId } from "../vehicleSort";

describe("vehicleSort", () => {
  it("sorts numeric suffixes naturally", () => {
    expect(compareVehicleIds("V-2", "V-10")).toBeLessThan(0);
    expect(compareVehicleIds("V-10", "V-2")).toBeGreaterThan(0);
    expect(compareVehicleIds("V-2", "V-2")).toBe(0);
  });

  it("sorts a mixed fleet list by vehicleId", () => {
    const sorted = sortVehiclesByVehicleId([
      { vehicleId: "V-10", id: "a" },
      { vehicleId: "V-2", id: "b" },
      { vehicleId: "V-1", id: "c" },
      { vehicleId: "TRUCK-3", id: "d" },
    ]);
    expect(sorted.map((v) => v.vehicleId)).toEqual(["TRUCK-3", "V-1", "V-2", "V-10"]);
  });
});
