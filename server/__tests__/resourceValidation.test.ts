import { describe, it, expect } from "vitest";
import {
  normalizeResourceFields,
  parseResourceCreateBody,
  parseResourceUpdateBody,
} from "../resourceValidation";

describe("resourceValidation", () => {
  it("normalizes empty foreign keys to null", () => {
    expect(
      normalizeResourceFields({
        categoryId: "",
        folderId: "",
        equipmentId: "",
        equipmentCategory: "",
      })
    ).toEqual({
      categoryId: null,
      folderId: null,
      equipmentId: null,
      equipmentCategory: null,
    });
  });

  it("parses create body with propertyIds", () => {
    const parsed = parseResourceCreateBody({
      title: "Manual",
      type: "document",
      url: "https://example.com/manual.pdf",
      propertyIds: ["prop-1"],
    });
    expect(parsed.data.title).toBe("Manual");
    expect(parsed.propertyIds).toEqual(["prop-1"]);
  });

  it("accepts uploaded object URLs on create", () => {
    const parsed = parseResourceCreateBody({
      title: "Map",
      type: "image",
      url: "/api/objects/image?path=uploads%2Fmap.png",
      objectPath: "uploads/map.png",
    });
    expect(parsed.data.url).toContain("/api/objects/image");
  });

  it("rejects invalid external URLs", () => {
    expect(() =>
      parseResourceCreateBody({
        title: "Bad",
        type: "link",
        url: "javascript:alert(1)",
      })
    ).toThrow();
  });

  it("parses partial update bodies", () => {
    const parsed = parseResourceUpdateBody({
      title: "Updated",
      propertyIds: [],
    });
    expect(parsed.hasPropertyIds).toBe(true);
    expect(parsed.propertyIds).toEqual([]);
    expect(parsed.data.title).toBe("Updated");
  });
});
