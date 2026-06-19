import { apiRequest } from "@/lib/queryClient";

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

function rawStorageUrl(file: UploaderFileResult): string {
  const rawUrl = file.objectUrl || file.url || file.uploadURL || "";
  return rawUrl.split("?")[0];
}

/** Maps ObjectUploader output for DB registration (keeps raw storage URL + objectPath). */
export function mapUploaderResultForRegistration(file: UploaderFileResult) {
  return {
    fileName: file.fileName || file.name || "attachment",
    fileType: file.type || "application/octet-stream",
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
  return {
    fileName: file.fileName || file.name || "attachment",
    fileType: file.type || "application/octet-stream",
    objectUrl: objectPath
      ? buildDisplayUrlFromUpload(objectPath, fallbackUrl, file.type)
      : fallbackUrl,
    objectPath,
    label,
  };
}
