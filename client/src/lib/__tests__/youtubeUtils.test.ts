import { describe, it, expect } from "vitest";
import { extractYoutubeId, getYoutubeEmbedUrl, getYoutubeThumbnail } from "../youtubeUtils";

describe("youtubeUtils", () => {
  it("extracts id from watch URLs", () => {
    expect(extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts id from youtu.be URLs", () => {
    expect(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("builds thumbnail and embed URLs", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    expect(getYoutubeThumbnail(url)).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
    expect(getYoutubeEmbedUrl(url)).toContain("youtube.com/embed/dQw4w9WgXcQ");
  });

  it("returns null for non-youtube URLs", () => {
    expect(extractYoutubeId("https://example.com/video")).toBeNull();
    expect(getYoutubeThumbnail("https://example.com")).toBeNull();
  });
});
