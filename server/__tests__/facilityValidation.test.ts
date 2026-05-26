import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  FacilityValidationError,
  validateEquipmentLocation,
  validateSpaceBelongsToProperty,
  validateTaskLocation,
} from "../facilityValidation";

vi.mock("../storage", () => ({
  storage: {
    getProperty: vi.fn(),
    getSpace: vi.fn(),
    getEquipmentItem: vi.fn(),
  },
}));

import { storage } from "../storage";

describe("facilityValidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validateSpaceBelongsToProperty rejects mismatched property", async () => {
    vi.mocked(storage.getSpace).mockResolvedValue({
      id: "s1",
      propertyId: "p-other",
      name: "Room A",
    } as any);

    await expect(validateSpaceBelongsToProperty("s1", "p1")).rejects.toThrow(
      FacilityValidationError
    );
  });

  it("validateEquipmentLocation accepts property-wide equipment", async () => {
    vi.mocked(storage.getProperty).mockResolvedValue({
      id: "p1",
      type: "building",
      name: "Main",
    } as any);

    await expect(validateEquipmentLocation("p1", null)).resolves.toBeUndefined();
  });

  it("validateTaskLocation rejects equipment on wrong property", async () => {
    vi.mocked(storage.getProperty).mockResolvedValue({
      id: "p1",
      type: "building",
      name: "Main",
    } as any);
    vi.mocked(storage.getEquipmentItem).mockResolvedValue({
      id: "e1",
      propertyId: "p2",
      spaceId: null,
      name: "Pump",
    } as any);

    await expect(
      validateTaskLocation({ propertyId: "p1", equipmentId: "e1" })
    ).rejects.toThrow("Equipment does not belong to this property");
  });
});
