import { describe, it, expect } from "vitest";
import {
  buildFolderPathLabel,
  clearResourceFileFields,
  hasActiveResourceFilters,
  isFilteredEmptyView,
  shouldUsePasteUrlMode,
} from "@/pages/ResourceLibrary/resourceUtils";

describe("resourceLibraryUtils", () => {
  it("clears url, fileName, and objectPath together", () => {
    expect(clearResourceFileFields()).toEqual({
      url: "",
      fileName: "",
      objectPath: "",
    });
  });

  it("detects uploaded resources vs pasted URLs", () => {
    expect(shouldUsePasteUrlMode("document", "/api/objects/image?path=abc", "uploads/file.pdf")).toBe(false);
    expect(shouldUsePasteUrlMode("document", "https://example.com/manual.pdf", null)).toBe(true);
  });

  it("builds nested folder path labels", () => {
    const folders = [
      { id: "root", name: "Root", parentId: null },
      { id: "child", name: "HVAC", parentId: "root" },
    ];
    expect(buildFolderPathLabel(folders[1], folders)).toBe("Root / HVAC");
  });

  it("distinguishes filtered empty from truly empty", () => {
    expect(isFilteredEmptyView(0, 3, 1, "hvac", "all", "all")).toBe(true);
    expect(isFilteredEmptyView(0, 0, 0, "", "all", "all")).toBe(false);
    expect(hasActiveResourceFilters("", "video", "all")).toBe(true);
  });
});
