import sharp from "sharp";
import { parseReceiptText, type ReceiptRead } from "./receiptParse";

const EMPTY: ReceiptRead = { storeName: null, purchasedOn: null, amount: null };

type OcrWorker = {
  recognize: (image: Buffer) => Promise<{ data: { text: string; confidence?: number } }>;
  setParameters: (params: Record<string, string>) => Promise<void>;
};

let workerPromise: Promise<OcrWorker> | null = null;

async function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_pageseg_mode: "6",
        user_defined_dpi: "300",
      });
      return worker;
    })().catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

function fieldsFound(text: string): number {
  const read = parseReceiptText(text);
  return [read.storeName, read.purchasedOn, read.amount].filter((value) => value != null).length;
}

async function prepareImage(buffer: Buffer, strong: boolean): Promise<Buffer> {
  let image = sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({ width: 2000, fit: "inside", withoutEnlargement: false })
    .grayscale()
    .normalize();
  image = strong ? image.linear(1.35, -30).threshold(150) : image.sharpen();
  return image.png().toBuffer();
}

async function imageText(buffer: Buffer): Promise<string> {
  const worker = await getWorker();
  const first = await worker.recognize(await prepareImage(buffer, false));
  const firstText = first.data.text || "";
  const confidence = first.data.confidence ?? 0;
  if (fieldsFound(firstText) >= 2 && confidence >= 50) return firstText;

  const second = await worker.recognize(await prepareImage(buffer, true));
  const secondText = second.data.text || "";
  return fieldsFound(secondText) > fieldsFound(firstText) ? secondText : firstText;
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
