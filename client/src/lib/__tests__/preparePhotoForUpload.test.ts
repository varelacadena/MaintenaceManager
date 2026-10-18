import { describe, it, expect, vi, afterEach } from "vitest";
import {
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_EDGE_PX,
  preparePhotoForUpload,
  scaledPhotoSize,
  shouldKeepOriginalPhoto,
} from "../preparePhotoForUpload";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("scaledPhotoSize", () => {
  it("fits a phone photo inside the long-edge limit", () => {
    expect(scaledPhotoSize(4032, 3024)).toEqual({ width: 1920, height: 1440 });
    expect(scaledPhotoSize(3024, 4032)).toEqual({ width: 1440, height: 1920 });
  });

  it("leaves a photo that is already small enough", () => {
    expect(scaledPhotoSize(1280, 720)).toEqual({ width: 1280, height: 720 });
  });
});

describe("shouldKeepOriginalPhoto", () => {
  it("keeps a modest JPEG", () => {
    expect(
      shouldKeepOriginalPhoto({
        fileType: "image/jpeg",
        fileSize: 400_000,
        width: 1600,
        height: 1200,
      }),
    ).toBe(true);
  });

  it("re-encodes a large camera JPEG", () => {
    expect(
      shouldKeepOriginalPhoto({
        fileType: "image/jpeg",
        fileSize: 4_000_000,
        width: 4032,
        height: 3024,
      }),
    ).toBe(false);
  });
});

describe("preparePhotoForUpload", () => {
  it("leaves documents and GIFs unchanged", async () => {
    const pdf = new File(["manual"], "manual.pdf", { type: "application/pdf" });
    const gif = new File(["anim"], "anim.gif", { type: "image/gif" });
    expect(await preparePhotoForUpload(pdf)).toBe(pdf);
    expect(await preparePhotoForUpload(gif)).toBe(gif);
  });

  it("returns the original when the photo cannot be decoded", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => {
      throw new Error("decode failed");
    }));
    const photo = new File([new Uint8Array(100)], "leak.jpg", { type: "image/jpeg" });
    expect(await preparePhotoForUpload(photo)).toBe(photo);
  });

  it("stores a smaller JPEG at the quality limit", async () => {
    const original = new File([new Uint8Array(2_000_000)], "leak.png", { type: "image/png" });
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({
        width: 4000,
        height: 3000,
        close() {},
      })),
    );

    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName !== "canvas") return realCreate(tagName);
      const canvas = {
        width: 0,
        height: 0,
        getContext() {
          return {
            fillStyle: "",
            fillRect() {},
            drawImage() {},
          };
        },
        toBlob(callback: BlobCallback, type?: string, quality?: number) {
          expect(canvas.width).toBe(PHOTO_MAX_EDGE_PX);
          expect(canvas.height).toBe(1440);
          expect(type).toBe("image/jpeg");
          expect(quality).toBe(PHOTO_JPEG_QUALITY);
          callback(new Blob([new Uint8Array(180_000)], { type: "image/jpeg" }));
        },
      };
      return canvas as unknown as HTMLCanvasElement;
    });

    const prepared = await preparePhotoForUpload(original);
    expect(prepared).not.toBe(original);
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toBe("leak.jpg");
    expect(prepared.size).toBe(180_000);
  });

  it("keeps the original when shrinking would not save space", async () => {
    const original = new File([new Uint8Array(50_000)], "already-small.png", { type: "image/png" });
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({
        width: 800,
        height: 600,
        close() {},
      })),
    );

    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName !== "canvas") return realCreate(tagName);
      return {
        width: 0,
        height: 0,
        getContext() {
          return { fillStyle: "", fillRect() {}, drawImage() {} };
        },
        toBlob(callback: BlobCallback) {
          callback(new Blob([new Uint8Array(80_000)], { type: "image/jpeg" }));
        },
      } as unknown as HTMLCanvasElement;
    });

    expect(await preparePhotoForUpload(original)).toBe(original);
  });
});
