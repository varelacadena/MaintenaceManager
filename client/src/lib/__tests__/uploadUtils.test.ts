import { describe, it, expect } from "vitest";
import {
  buildDisplayUrlFromUpload,
  mapUploaderResultToPending,
} from "../uploadUtils";

describe("uploadUtils", () => {
  it("buildDisplayUrlFromUpload uses image proxy for objectPath", () => {
    const url = buildDisplayUrlFromUpload("uploads/abc/file.png", "https://old.example/x");
    expect(url).toContain("/api/objects/image?path=");
    expect(url).toContain(encodeURIComponent("uploads/abc/file.png"));
  });

  it("mapUploaderResultToPending prefers objectPath display url", () => {
    const pending = mapUploaderResultToPending(
      {
        fileName: "manual.pdf",
        type: "application/pdf",
        objectPath: "uploads/manual.pdf",
        uploadURL: "https://signed.example/upload",
      },
      "manual"
    );
    expect(pending.objectPath).toBe("uploads/manual.pdf");
    expect(pending.objectUrl).toContain("/api/objects/image?path=");
    expect(pending.label).toBe("manual");
  });
});
