import { getSignedUploadParameters } from "@/lib/uploadUtils";

const MAX_RECEIPT_BYTES = 15 * 1024 * 1024;

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

export async function uploadReceipt(file: File): Promise<ReceiptPayload> {
  if (file.size > MAX_RECEIPT_BYTES) throw new Error("Receipt must be 15 MB or smaller");
  const params = await getSignedUploadParameters();
  if (!params.objectPath) throw new Error("Could not start the receipt upload");
  const isMock = params.url.startsWith("https://mock-storage.local/");
  if (!isMock) {
    const response = await fetch(params.url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": fileTypeOf(file) },
    });
    if (!response.ok) throw new Error("Could not upload the receipt");
  }
  return {
    fileName: file.name,
    fileType: fileTypeOf(file),
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
