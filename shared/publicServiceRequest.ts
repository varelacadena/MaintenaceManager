import { z } from "zod";

export const PUBLIC_REQUEST_SUMMARY_MAX = 80;
export const PUBLIC_REQUEST_PHOTO_MAX = 5;
export const PUBLIC_OBJECT_PATH_PATTERN = /^uploads\/[A-Za-z0-9._-]+$/;

export const PUBLIC_PHOTO_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

export const publicRequestPhotoSchema = z.object({
  fileName: z.string().trim().min(1).max(500),
  fileType: z.preprocess(
    (value) => (value === "image/jpg" ? "image/jpeg" : value),
    z.enum(PUBLIC_PHOTO_FILE_TYPES),
  ),
  objectUrl: z.string().trim().min(1).max(1000),
  objectPath: z.string().regex(PUBLIC_OBJECT_PATH_PATTERN, "Invalid upload path"),
});

export function isAllowedObjectPath(path: string | undefined | null): boolean {
  return typeof path === "string" && PUBLIC_OBJECT_PATH_PATTERN.test(path);
}

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const publicServiceRequestSchema = z.object({
  title: z.string().trim().min(1, "Please describe what needs attention").max(PUBLIC_REQUEST_SUMMARY_MAX),
  description: z.string().trim().min(1, "Please tell us what happened").max(5000),
  propertyId: z.string().min(1, "Please select where the issue is"),
  spaceId: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  urgency: z.enum(["low", "medium", "high"]).default("medium"),
  requesterName: z.string().trim().min(1, "Please add your name").max(200),
  requesterPhone: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
  requesterEmail: z.preprocess(emptyToUndefined, z.string().trim().email("Enter a valid email").max(200).optional()),
  website: z.string().optional(),
  photos: z.array(publicRequestPhotoSchema).min(1, "Please add a photo of the problem").max(PUBLIC_REQUEST_PHOTO_MAX),
});

export type PublicServiceRequestInput = z.infer<typeof publicServiceRequestSchema>;

export function isPublicRequestHoneypot(input: { website?: string }) {
  return Boolean(input.website?.trim());
}
