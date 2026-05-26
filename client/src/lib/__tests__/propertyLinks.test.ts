import { describe, it, expect } from "vitest";
import { equipmentQrUrl, equipmentWorkHistoryPath } from "../propertyLinks";

describe("property equipment links", () => {
  it("work history path matches app route", () => {
    expect(equipmentWorkHistoryPath("abc-123")).toBe("/equipment/abc-123/work-history");
  });

  it("QR URL points to work history not missing detail page", () => {
    const url = equipmentQrUrl("https://app.example", "eq-1");
    expect(url).toBe("https://app.example/equipment/eq-1/work-history");
    expect(url).not.toMatch(/\/equipment\/eq-1$/);
  });
});
