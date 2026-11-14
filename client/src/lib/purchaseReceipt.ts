import { getSignedUploadParameters } from "@/lib/uploadUtils";

const MAX_RECEIPT_BYTES = 15 * 1024 * 1024;
const MAX_RECEIPT_EDGE = 1600;
const RECEIPT_JPEG_QUALITY = 0.72;

export type ReceiptPayload = {
  fileName: string;
  fileType: string;
  objectPath: string;
};

export type ReceiptSuggestion = {
  storeName: string | null;
  purchasedOn: string | null;
  amount: number | null;
  message: string;
};

function fileTypeOf(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

async function shrinkReceiptPhoto(file: File): Promise<File> {
  const type = fileTypeOf(file);
  if (!type.startsWith("image/")) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > MAX_RECEIPT_EDGE ? MAX_RECEIPT_EDGE / longest : 1;
  if (scale === 1 && type === "image/jpeg" && file.size <= 500 * 1024) {
    bitmap.close();
    return file;
  }
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", RECEIPT_JPEG_QUALITY));
  if (!blob || blob.size >= file.size) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "receipt";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
}

export async function uploadReceipt(file: File): Promise<ReceiptPayload> {
  if (file.size > MAX_RECEIPT_BYTES) throw new Error("Receipt must be 15 MB or smaller");
  const stored = await shrinkReceiptPhoto(file);
  const params = await getSignedUploadParameters();
  if (!params.objectPath) throw new Error("Could not start the receipt upload");
  const isMock = params.url.startsWith("https://mock-storage.local/");
  if (!isMock) {
    const response = await fetch(params.url, {
      method: "PUT",
      body: stored,
      headers: { "Content-Type": fileTypeOf(stored) },
    });
    if (!response.ok) throw new Error("Could not upload the receipt");
  }
  return {
    fileName: stored.name,
    fileType: fileTypeOf(stored),
    objectPath: params.objectPath,
  };
}

export async function readUploadedReceipt(receipt: Pick<ReceiptPayload, "objectPath" | "fileType">): Promise<ReceiptSuggestion> {
  const response = await fetch("/api/purchases/read-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ objectPath: receipt.objectPath, fileType: receipt.fileType }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body?.message === "string" ? body.message : "Could not read the receipt");
  }
  return body as ReceiptSuggestion;
}

export async function prepareReceipt(file: File): Promise<{
  receipt: ReceiptPayload;
  suggestion: ReceiptSuggestion | null;
  warning: string | null;
}> {
  const receipt = await uploadReceipt(file);
  try {
    const suggestion = await readUploadedReceipt(receipt);
    return { receipt, suggestion, warning: null };
  } catch (error) {
    return {
      receipt,
      suggestion: null,
      warning: error instanceof Error ? error.message : "Could not read the receipt. Enter the store, date, and amount.",
    };
  }
}
