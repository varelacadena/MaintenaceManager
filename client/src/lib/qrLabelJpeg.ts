import QRCode from "qrcode";
import type { AssetTagFields } from "@/lib/equipmentQrLabel";
import {
  QR_LABEL_HEIGHT_MM,
  QR_LABEL_QR_COLUMN_MM,
  QR_LABEL_QR_MM,
  QR_LABEL_WIDTH_MM,
} from "@/lib/printQrLabel";

/** Dots per inch stored in the JPEG so the file prints at the sticker size. */
export const QR_LABEL_DPI = 300;

const QUIET_MODULES = 4;

type QrModules = {
  size: number;
  get(row: number, col: number): number | boolean;
};

type Rect = { x: number; y: number; width: number; height: number };

export function mmToPx(mm: number, dpi = QR_LABEL_DPI): number {
  return Math.round((mm / 25.4) * dpi);
}

function ptToPx(pt: number, dpi = QR_LABEL_DPI): number {
  return (pt / 72) * dpi;
}

export function labelPixelSize(dpi = QR_LABEL_DPI): { width: number; height: number } {
  return {
    width: mmToPx(QR_LABEL_WIDTH_MM, dpi),
    height: mmToPx(QR_LABEL_HEIGHT_MM, dpi),
  };
}

export function assetTagLayout(dpi = QR_LABEL_DPI) {
  const { width, height } = labelPixelSize(dpi);
  const border = Math.max(1, mmToPx(0.25, dpi));
  const rule = Math.max(1, mmToPx(0.2, dpi));
  const headerHeight = mmToPx(4.2, dpi);
  const qrColumnWidth = mmToPx(QR_LABEL_QR_COLUMN_MM, dpi);
  const keyWidth = mmToPx(8.5, dpi);
  const innerLeft = border;
  const innerTop = border;
  const innerRight = width - border;
  const innerBottom = height - border;
  const header: Rect = {
    x: innerLeft,
    y: innerTop,
    width: innerRight - innerLeft,
    height: headerHeight,
  };
  const bodyTop = innerTop + headerHeight + rule;
  const bodyHeight = innerBottom - bodyTop;
  const qrColumn: Rect = {
    x: innerRight - qrColumnWidth,
    y: bodyTop,
    width: qrColumnWidth,
    height: bodyHeight,
  };
  const rowsWidth = qrColumn.x - rule - innerLeft;
  const rowHeight = bodyHeight / 4;
  const rowCount = 4;
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const y = bodyTop + rowHeight * index;
    const heightPx = index === rowCount - 1 ? innerBottom - y : rowHeight;
    return {
      label: { x: innerLeft, y, width: keyWidth, height: heightPx },
      value: {
        x: innerLeft + keyWidth + rule,
        y,
        width: rowsWidth - keyWidth - rule,
        height: heightPx,
      },
    };
  });
  const qrSize = Math.min(mmToPx(QR_LABEL_QR_MM, dpi), qrColumn.width - rule * 2, qrColumn.height - rule * 2);
  const qrBox: Rect = {
    x: qrColumn.x + Math.floor((qrColumn.width - qrSize) / 2),
    y: qrColumn.y + Math.floor((qrColumn.height - qrSize) / 2),
    width: qrSize,
    height: qrSize,
  };
  return { width, height, border, rule, header, rows, qrColumn, qrBox, bodyTop, innerBottom, innerLeft, innerRight };
}

export function textQrLayout(dpi = QR_LABEL_DPI) {
  const { width, height } = labelPixelSize(dpi);
  const border = Math.max(1, mmToPx(0.25, dpi));
  const rule = Math.max(1, mmToPx(0.2, dpi));
  const pad = mmToPx(1.2, dpi);
  const qrColumnWidth = mmToPx(QR_LABEL_QR_COLUMN_MM, dpi);
  const innerLeft = border;
  const innerTop = border;
  const innerRight = width - border;
  const innerBottom = height - border;
  const qrColumn: Rect = {
    x: innerRight - qrColumnWidth,
    y: innerTop,
    width: qrColumnWidth,
    height: innerBottom - innerTop,
  };
  const qrSize = Math.min(mmToPx(QR_LABEL_QR_MM, dpi), qrColumn.width - pad, qrColumn.height - pad);
  const qrBox: Rect = {
    x: qrColumn.x + Math.floor((qrColumn.width - qrSize) / 2),
    y: qrColumn.y + Math.floor((qrColumn.height - qrSize) / 2),
    width: qrSize,
    height: qrSize,
  };
  const textBox: Rect = {
    x: innerLeft + pad,
    y: innerTop + pad,
    width: Math.max(0, qrColumn.x - rule - (innerLeft + pad) - pad),
    height: Math.max(0, innerBottom - innerTop - pad * 2),
  };
  return { width, height, border, rule, qrColumn, qrBox, textBox };
}

function createQr(value: string): QrModules {
  const create = (QRCode as unknown as {
    create: (data: string, options?: { errorCorrectionLevel?: "M" }) => { modules: QrModules };
  }).create;
  return create(value, { errorCorrectionLevel: "M" }).modules;
}

function drawQr(ctx: CanvasRenderingContext2D, value: string, box: Rect) {
  const modules = createQr(value);
  const cells = modules.size + QUIET_MODULES * 2;
  const modulePx = Math.max(1, Math.floor(box.width / cells));
  const drawn = modulePx * cells;
  const originX = box.x + Math.floor((box.width - drawn) / 2);
  const originY = box.y + Math.floor((box.height - drawn) / 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.fillStyle = "#000000";
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (!modules.get(row, col)) continue;
      ctx.fillRect(
        originX + (col + QUIET_MODULES) * modulePx,
        originY + (row + QUIET_MODULES) * modulePx,
        modulePx,
        modulePx,
      );
    }
  }
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (maxWidth <= 0) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let end = text.length;
  while (end > 0 && ctx.measureText(text.slice(0, end) + ellipsis).width > maxWidth) end -= 1;
  return `${text.slice(0, end)}${ellipsis}`;
}

function fitLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  family: string,
  startPx: number,
  minPx: number,
): string {
  let size = startPx;
  ctx.font = `700 ${size}px ${family}`;
  while (size > minPx && ctx.measureText(text).width > maxWidth) {
    size = Math.max(minPx, size - 0.5);
    ctx.font = `700 ${size}px ${family}`;
    if (size === minPx) break;
  }
  return ellipsize(ctx, text, maxWidth);
}

function drawFrame(ctx: CanvasRenderingContext2D, width: number, height: number, border: number) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, border);
  ctx.fillRect(0, height - border, width, border);
  ctx.fillRect(0, 0, border, height);
  ctx.fillRect(width - border, 0, border, height);
}

function drawAssetTag(ctx: CanvasRenderingContext2D, fields: AssetTagFields, qrValue: string) {
  const layout = assetTagLayout();
  drawFrame(ctx, layout.width, layout.height, layout.border);

  ctx.fillStyle = "#000000";
  ctx.fillRect(layout.innerLeft, layout.header.y + layout.header.height, layout.header.width, layout.rule);
  ctx.fillRect(layout.qrColumn.x - layout.rule, layout.bodyTop, layout.rule, layout.innerBottom - layout.bodyTop);

  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${ptToPx(8)}px Arial, Helvetica, sans-serif`;
  const letterSpacing = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  letterSpacing.letterSpacing = `${ptToPx(0.6)}px`;
  ctx.fillText("ASSET TAG", layout.header.x + layout.header.width / 2, layout.header.y + layout.header.height / 2);
  letterSpacing.letterSpacing = "0px";

  const rows: { label: string; value: string; mono: boolean }[] = [
    { label: "ID", value: fields.id, mono: true },
    { label: "NAME", value: fields.name, mono: false },
    { label: "LOC", value: fields.location, mono: false },
    { label: "CAT", value: fields.category, mono: true },
  ];
  const valuePad = mmToPx(0.7);

  rows.forEach((row, index) => {
    const slot = layout.rows[index];
    if (index < rows.length - 1) {
      ctx.fillRect(layout.innerLeft, slot.label.y + slot.label.height - layout.rule, layout.qrColumn.x - layout.rule - layout.innerLeft, layout.rule);
    }
    ctx.fillRect(slot.label.x + slot.label.width, slot.label.y, layout.rule, slot.label.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${ptToPx(5.5)}px Arial, Helvetica, sans-serif`;
    ctx.fillText(row.label, slot.label.x + slot.label.width / 2, slot.label.y + slot.label.height / 2);

    ctx.textAlign = "left";
    const family = row.mono ? '"Courier New", Courier, monospace' : "Arial, Helvetica, sans-serif";
    const text = fitLine(
      ctx,
      row.value,
      Math.max(0, slot.value.width - valuePad * 2),
      family,
      ptToPx(row.mono ? 6 : 6.5),
      ptToPx(4.5),
    );
    ctx.fillText(text, slot.value.x + valuePad, slot.value.y + slot.value.height / 2);
  });

  drawQr(ctx, qrValue, layout.qrBox);
}

function drawTextQr(ctx: CanvasRenderingContext2D, lines: string[], qrValue: string) {
  const layout = textQrLayout();
  drawFrame(ctx, layout.width, layout.height, layout.border);
  ctx.fillStyle = "#000000";
  ctx.fillRect(layout.qrColumn.x - layout.rule, layout.qrColumn.y, layout.rule, layout.qrColumn.height);

  const visible = lines.map((line) => line.trim()).filter(Boolean).slice(0, 4);
  if (visible.length > 0) {
    const sizes = visible.map((_, index) => ptToPx(index === 0 ? 8 : 6));
    const gap = mmToPx(0.7);
    const blockHeight = sizes.reduce((sum, size) => sum + size, 0) + gap * (visible.length - 1);
    let y = layout.textBox.y + Math.max(0, (layout.textBox.height - blockHeight) / 2);

    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    visible.forEach((line, index) => {
      const size = sizes[index];
      const text = fitLine(ctx, line, layout.textBox.width, "Arial, Helvetica, sans-serif", size, ptToPx(index === 0 ? 5 : 4.5));
      ctx.fillText(text, layout.textBox.x, y + size / 2);
      y += size + gap;
    });
  }

  drawQr(ctx, qrValue, layout.qrBox);
}

export function renderQrLabel(
  ctx: CanvasRenderingContext2D,
  options: { qrValue: string; assetTag?: AssetTagFields; lines?: string[] },
) {
  const { width, height } = labelPixelSize();
  if (options.assetTag) drawAssetTag(ctx, options.assetTag, options.qrValue);
  else drawTextQr(ctx, options.lines ?? [], options.qrValue);
  return { width, height };
}

/** Write 300 dpi into the JPEG so printer software treats the pixels as 50 × 25 mm. */
export function stampJpegDpi(bytes: Uint8Array, dpi = QR_LABEL_DPI): Uint8Array {
  const densityHi = (dpi >> 8) & 0xff;
  const densityLo = dpi & 0xff;
  const hasJfif =
    bytes.length >= 20 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff &&
    bytes[3] === 0xe0 &&
    String.fromCharCode(bytes[6], bytes[7], bytes[8], bytes[9], bytes[10]) === "JFIF\0";

  if (hasJfif) {
    const out = new Uint8Array(bytes);
    out[13] = 1;
    out[14] = densityHi;
    out[15] = densityLo;
    out[16] = densityHi;
    out[17] = densityLo;
    return out;
  }

  const jfif = new Uint8Array([
    0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00,
    0x01, 0x01,
    0x01,
    densityHi, densityLo,
    densityHi, densityLo,
    0x00, 0x00,
  ]);
  const body = bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8 ? bytes.subarray(2) : bytes;
  const out = new Uint8Array(2 + jfif.length + body.length);
  out[0] = 0xff;
  out[1] = 0xd8;
  out.set(jfif, 2);
  out.set(body, 2 + jfif.length);
  return out;
}

export function readJpegDpi(bytes: Uint8Array): number | null {
  if (bytes.length < 18 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff || bytes[3] !== 0xe0) {
    return null;
  }
  if (String.fromCharCode(bytes[6], bytes[7], bytes[8], bytes[9], bytes[10]) !== "JFIF\0") return null;
  if (bytes[13] !== 1) return null;
  return (bytes[14] << 8) | bytes[15];
}

export function qrJpegFileName(name: string): string {
  const safe = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return `${safe || "qr-label"}.jpg`;
}

function canvasToJpeg(canvas: HTMLCanvasElement, dpi: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Could not create the JPEG"));
        return;
      }
      const stamped = stampJpegDpi(new Uint8Array(await blob.arrayBuffer()), dpi);
      const copy = new Uint8Array(stamped);
      resolve(new Blob([copy.buffer], { type: "image/jpeg" }));
    }, "image/jpeg", 1);
  });
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadQrLabelJpeg(options: {
  qrValue: string;
  fileName: string;
  assetTag?: AssetTagFields;
  lines?: string[];
}): Promise<void> {
  const value = options.qrValue.trim();
  if (!value) throw new Error("Missing QR value");

  const { width, height } = labelPixelSize();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw the label");

  renderQrLabel(ctx, { ...options, qrValue: value });
  const blob = await canvasToJpeg(canvas, QR_LABEL_DPI);
  triggerDownload(blob, qrJpegFileName(options.fileName));
}
