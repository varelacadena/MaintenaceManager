import { apiRequest, parseApiError } from "@/lib/queryClient";

export type SignedUploadParams = {
  method: "PUT";
  url: string;
  objectPath?: string;
};

export async function getSignedUploadParameters(): Promise<SignedUploadParams> {
  const res = await apiRequest("POST", "/api/objects/upload");
  const data = await res.json();
  return {
    method: "PUT" as const,
    url: data.uploadURL,
    objectPath: data.objectPath,
  };
}

export async function getSignedPublicUploadParameters(): Promise<SignedUploadParams> {
  const res = await fetch("/api/public/objects/upload", { method: "POST" });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Could not start photo upload"));
  }
  const data = await res.json();
  return {
    method: "PUT" as const,
    url: data.uploadURL,
    objectPath: data.objectPath,
  };
}

export function buildDisplayUrlFromUpload(
  objectPath: string | undefined,
  fallbackUrl?: string,
  fileType?: string
): string {
  const isImage = !fileType || fileType.startsWith("image/");
  if (objectPath && isImage) {
    return `/api/objects/image?path=${encodeURIComponent(objectPath)}`;
  }
  return fallbackUrl || objectPath || "";
}

/** Persisted image URL for entity fields (equipment photo, vehicle photo, etc.). */
export function buildStoredImageUrl(
  objectPath: string | undefined,
  currentUrl?: string | null
): string | undefined {
  if (objectPath) {
    return `/api/objects/image?path=${encodeURIComponent(objectPath)}`;
  }
  return currentUrl || undefined;
}

export type PendingUploadPayload = {
  fileName: string;
  fileType: string;
  objectUrl: string;
  objectPath?: string;
  label?: string;
};

export type UploaderFileResult = {
  fileName?: string;
  name?: string;
  type?: string;
  objectUrl?: string;
  url?: string;
  uploadURL?: string;
  objectPath?: string;
};

const IMAGE_TYPES_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
};

/** Phone cameras often omit a MIME type. Keep those files as images so they count and preview. */
export function inferUploadFileType(file: { name?: string; type?: string }): string {
  const declared = (file.type || "").trim().toLowerCase();
  if (declared === "image/jpg") return "image/jpeg";
  if (declared.startsWith("image/")) return declared;
  const extension = (file.name || "").split(".").pop()?.toLowerCase() || "";
  return IMAGE_TYPES_BY_EXTENSION[extension] || declared || "application/octet-stream";
}

function rawStorageUrl(file: UploaderFileResult): string {
  const rawUrl = file.objectUrl || file.url || file.uploadURL || "";
  return rawUrl.split("?")[0];
}

/** Maps ObjectUploader output for DB registration (keeps raw storage URL + objectPath). */
export function mapUploaderResultForRegistration(file: UploaderFileResult) {
  return {
    fileName: file.fileName || file.name || "attachment",
    fileType: inferUploadFileType({ name: file.fileName || file.name, type: file.type }),
    objectUrl: rawStorageUrl(file),
    objectPath: file.objectPath,
  };
}

export function mapUploaderResultToPending(
  file: UploaderFileResult,
  label?: string
): PendingUploadPayload {
  const objectPath = file.objectPath;
  const fallbackUrl = rawStorageUrl(file);
  const fileType = inferUploadFileType({ name: file.fileName || file.name, type: file.type });
  return {
    fileName: file.fileName || file.name || "attachment",
    fileType,
    objectUrl: objectPath
      ? buildDisplayUrlFromUpload(objectPath, fallbackUrl, fileType)
      : fallbackUrl,
    objectPath,
    label,
  };
}
