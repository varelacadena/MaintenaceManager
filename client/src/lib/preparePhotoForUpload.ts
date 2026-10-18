import { inferUploadFileType } from "@/lib/uploadUtils";

/** Longest side kept for maintenance photos. Phone cameras are often 4000px or more. */
export const PHOTO_MAX_EDGE_PX = 1920;

/** High enough that a leak, crack, or label still looks sharp. */
export const PHOTO_JPEG_QUALITY = 0.85;

/** JPEGs already within the size limit and this file size are stored as taken. */
const PHOTO_SKIP_REENCODE_BYTES = 1_500_000;

const SKIP_IMAGE_TYPES = new Set(["image/gif", "image/svg+xml"]);

export function scaledPhotoSize(
  width: number,
  height: number,
  maxEdge = PHOTO_MAX_EDGE_PX,
): { width: number; height: number } {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const longEdge = Math.max(safeWidth, safeHeight);
  if (longEdge <= maxEdge) {
    return { width: safeWidth, height: safeHeight };
  }
  const scale = maxEdge / longEdge;
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

export function shouldKeepOriginalPhoto(options: {
  fileType: string;
  fileSize: number;
  width: number;
  height: number;
}): boolean {
  const longEdge = Math.max(options.width, options.height);
  return (
    options.fileType === "image/jpeg" &&
    longEdge <= PHOTO_MAX_EDGE_PX &&
    options.fileSize > 0 &&
    options.fileSize <= PHOTO_SKIP_REENCODE_BYTES
  );
}

function jpegFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (/\.jpe?g$/i.test(trimmed)) return trimmed;
  const base = trimmed.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}.jpg`;
}

/**
 * Shrink a camera photo before it is stored.
 * Documents, GIFs, and photos that are already a modest JPEG are left as-is.
 * If the browser cannot decode the file, the original is uploaded.
 */
export async function preparePhotoForUpload(file: File): Promise<File> {
  const fileType = inferUploadFileType(file);
  if (!fileType.startsWith("image/") || SKIP_IMAGE_TYPES.has(fileType)) return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    if (
      shouldKeepOriginalPhoto({
        fileType,
        fileSize: file.size,
        width: bitmap.width,
        height: bitmap.height,
      })
    ) {
      return file;
    }

    const target = scaledPhotoSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, target.width, target.height);
    ctx.drawImage(bitmap, 0, 0, target.width, target.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", PHOTO_JPEG_QUALITY);
    });
    if (!blob || blob.size === 0 || blob.size >= file.size) return file;

    return new File([blob], jpegFileName(file.name || "photo"), {
      type: "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
