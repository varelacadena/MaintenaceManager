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

  it("mapUploaderResultToPending keeps document uploads off the image proxy", () => {
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
    expect(pending.objectUrl).toBe("https://signed.example/upload");
    expect(pending.label).toBe("manual");
  });
});
