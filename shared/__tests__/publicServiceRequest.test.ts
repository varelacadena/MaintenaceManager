import { describe, expect, it } from "vitest";
import {
  isPublicRequestHoneypot,
  publicServiceRequestSchema,
} from "../publicServiceRequest";

const validPhoto = {
  fileName: "leak.jpg",
  fileType: "image/jpeg",
  objectUrl: "https://example.com/leak.jpg",
  objectPath: "uploads/123-abc",
};

const validRequest = {
  title: "Leaking pipe",
  description: "Water is pooling under the sink in the first-floor restroom.",
  propertyId: "prop-1",
  urgency: "high" as const,
  requesterName: "Alex Rivera",
  photos: [validPhoto],
};

describe("publicServiceRequestSchema", () => {
  it("accepts a simple public report", () => {
    const parsed = publicServiceRequestSchema.parse(validRequest);
    expect(parsed.spaceId).toBeUndefined();
    expect(parsed.requesterPhone).toBeUndefined();
    expect(parsed.photos).toHaveLength(1);
  });

  it("rejects a report without a photo", () => {
    const { photos: _photos, ...withoutPhotos } = validRequest;
    expect(publicServiceRequestSchema.safeParse(withoutPhotos).success).toBe(false);
    expect(publicServiceRequestSchema.safeParse({ ...validRequest, photos: [] }).success).toBe(false);
  });

  it("treats blank optional contact and space as omitted", () => {
    const parsed = publicServiceRequestSchema.parse({
      ...validRequest,
      spaceId: "",
      requesterPhone: "  ",
      requesterEmail: "",
    });
    expect(parsed.spaceId).toBeUndefined();
    expect(parsed.requesterPhone).toBeUndefined();
    expect(parsed.requesterEmail).toBeUndefined();
  });

  it("rejects a non-image photo type", () => {
    const result = publicServiceRequestSchema.safeParse({
      ...validRequest,
      photos: [
        {
          ...validPhoto,
          fileType: "application/pdf",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a photo path outside uploads/", () => {
    const result = publicServiceRequestSchema.safeParse({
      ...validRequest,
      photos: [
        {
          fileName: "leak.jpg",
          fileType: "image/jpeg",
          objectUrl: "https://example.com/leak.jpg",
          objectPath: "../secret",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a photo with a storage object path", () => {
    const parsed = publicServiceRequestSchema.parse({
      ...validRequest,
      photos: [
        {
          fileName: "leak.jpg",
          fileType: "image/jpeg",
          objectUrl: "https://example.com/leak.jpg",
          objectPath: "uploads/123-abc",
        },
      ],
    });
    expect(parsed.photos?.[0].objectPath).toBe("uploads/123-abc");
  });

  it("flags honeypot submissions", () => {
    expect(isPublicRequestHoneypot({})).toBe(false);
    expect(isPublicRequestHoneypot({ website: "http://spam.test" })).toBe(true);
  });
});
