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

export type PendingUploadPayload = {
  fileName: string;
  fileType: string;
  objectUrl: string;
  objectPath?: string;
  label?: string;
};

export function mapUploaderResultToPending(
  file: {
    fileName?: string;
    name?: string;
    type?: string;
    objectUrl?: string;
    url?: string;
    uploadURL?: string;
    objectPath?: string;
  },
  label?: string
): PendingUploadPayload {
  const objectPath = file.objectPath;
  const rawUrl = file.objectUrl || file.url || file.uploadURL || "";
  const fallbackUrl = rawUrl.split("?")[0];
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
