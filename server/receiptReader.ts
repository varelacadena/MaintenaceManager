import sharp from "sharp";
import { parseReceiptText, type ReceiptRead } from "./receiptParse";

const EMPTY: ReceiptRead = { storeName: null, purchasedOn: null, amount: null };

type OcrWorker = {
  recognize: (image: Buffer) => Promise<{ data: { text: string } }>;
};

let workerPromise: Promise<OcrWorker> | null = null;

async function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker("eng");
    })().catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

async function imageText(buffer: Buffer): Promise<string> {
  const png = await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({ width: 1800, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .png()
    .toBuffer();
  const worker = await getWorker();
  const result = await worker.recognize(png);
  return result.data.text || "";
}

async function pdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const extracted = await extractText(pdf, { mergePages: true });
  const text = Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text;
  return text || "";
}

export async function readReceiptBuffer(buffer: Buffer, fileType: string): Promise<ReceiptRead> {
  const type = fileType.toLowerCase();
  let text = "";
  if (type === "application/pdf") {
    text = await pdfText(buffer);
  } else if (type.startsWith("image/")) {
    text = await imageText(buffer);
  } else {
    return EMPTY;
  }
  return parseReceiptText(text);
}
