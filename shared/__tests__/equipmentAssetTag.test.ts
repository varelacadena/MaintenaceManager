import { describe, it, expect } from "vitest";
import {
  abbreviateTagPart,
  buildEquipmentAssetTagPrefix,
  equipmentCategoryCode,
  nextEquipmentAssetTag,
  suggestEquipmentAssetTag,
} from "../equipmentAssetTag";

describe("equipmentAssetTag", () => {
  it("abbreviates single and multi-word strings", () => {
    expect(abbreviateTagPart("Administration")).toBe("ADMI");
    expect(abbreviateTagPart("Room 205")).toBe("R2");
    expect(abbreviateTagPart("205")).toBe("205");
  });

  it("builds structured tag prefix", () => {
    expect(
      buildEquipmentAssetTagPrefix({
        propertyName: "Library",
        spaceName: "Room 205",
        category: "hvac",
      }),
    ).toBe("LIBR-R2-HVAC");
  });

  it("increments sequence for matching prefix", () => {
    expect(
      nextEquipmentAssetTag("LIBR-R2-HVAC", ["LIBR-R2-HVAC-01", "LIBR-R2-HVAC-02"]),
    ).toBe("LIBR-R2-HVAC-03");
  });

  it("uses the category code printed on the asset tag", () => {
    expect(equipmentCategoryCode("hvac")).toBe("HVAC");
    expect(equipmentCategoryCode("electrical")).toBe("ELEC");
    expect(equipmentCategoryCode("custom_pump")).toBe("CP");
  });

  it("suggests first tag when none exist", () => {
    expect(
      suggestEquipmentAssetTag({
        propertyName: "Library",
        spaceName: null,
        category: "general",
        existingTags: [],
      }),
    ).toBe("LIBR-GEN-GEN-01");
  });
});
