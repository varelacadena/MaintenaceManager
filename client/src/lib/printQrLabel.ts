import type { AssetTagFields } from "@/lib/equipmentQrLabel";
import { escapeHtml } from "@/lib/inventoryUtils";

export type QrPrintSize = "small" | "medium" | "large";

export const QR_PRINT_SIZE_PX: Record<QrPrintSize, number> = {
  small: 120,
  medium: 200,
  large: 320,
};

export type PrintQrLabelOptions = {
  title: string;
  qrHtml: string;
  primaryLine: string;
  secondaryLines?: string[];
  size?: QrPrintSize;
};

function scaleQrHtml(qrHtml: string, px: number): string {
  return qrHtml
    .replace(/\bwidth="[^"]*"/gi, `width="${px}"`)
    .replace(/\bheight="[^"]*"/gi, `height="${px}"`);
}

function buildPrintDocument(options: PrintQrLabelOptions): string {
  const size = options.size ?? "medium";
  const px = QR_PRINT_SIZE_PX[size];
  const qrHtml = scaleQrHtml(options.qrHtml, px);
  const primary = escapeHtml(options.primaryLine);
  const secondary = (options.secondaryLines ?? [])
    .filter(Boolean)
    .map((line) => `<p class="secondary">${escapeHtml(line)}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(options.title)}</title>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
    .qr-label { text-align: center; padding: 16px; }
    .qr-label svg, .qr-label img { display: block; margin: 0 auto; }
    .primary { font-size: 14px; font-weight: 600; font-family: monospace; margin: 8px 0 0; color: #000; }
    .secondary { font-size: 11px; color: #555; margin: 4px 0 0; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="qr-label">
    ${qrHtml}
    <p class="primary">${primary}</p>
    ${secondary}
  </div>
  <script>window.onload=function(){window.print();window.close();}</script>
</body>
</html>`;
}

export function buildAssetTagPrintDocument(options: {
  title: string;
  qrHtml: string;
  fields: AssetTagFields;
}): string {
  const qrHtml = options.qrHtml
    .replace(/\bwidth="[^"]*"/gi, 'width="17mm"')
    .replace(/\bheight="[^"]*"/gi, 'height="17mm"')
    .replace(/\sstyle="[^"]*"/gi, "");
  const rows = [
    ["ID", options.fields.id, true],
    ["NAME", options.fields.name, false],
    ["LOC", options.fields.location, false],
    ["CAT", options.fields.category, true],
  ] as const;

  const body = rows
    .map(
      ([label, value, mono], index) => `<div class="row${index === rows.length - 1 ? " last" : ""}">
        <div class="k">${label}</div>
        <div class="v${mono ? " mono" : ""}">${escapeHtml(value)}</div>
      </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(options.title)}</title>
  <style>
    @page { size: 50mm 25mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 50mm; height: 25mm; overflow: hidden; }
    .label {
      width: 50mm; height: 25mm; border: 0.25mm solid #000; background: #fff; color: #000;
      display: flex; flex-direction: column; font-family: Arial, Helvetica, sans-serif; overflow: hidden;
    }
    .head {
      height: 4.2mm; border-bottom: 0.2mm solid #000; display: flex; align-items: center; justify-content: center;
      font-size: 8pt; font-weight: 700; letter-spacing: 0.6pt;
    }
    .body { flex: 1; display: flex; min-height: 0; }
    .rows { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .row { flex: 1; display: flex; min-height: 0; border-bottom: 0.2mm solid #000; }
    .row.last { border-bottom: none; }
    .k {
      width: 8.5mm; border-right: 0.2mm solid #000; display: flex; align-items: center; justify-content: center;
      font-size: 5.5pt; font-weight: 700;
    }
    .v {
      flex: 1; min-width: 0; display: flex; align-items: center; padding: 0 0.7mm;
      font-size: 6.5pt; font-weight: 700; white-space: nowrap; overflow: hidden;
    }
    .v.mono { font-family: "Courier New", Courier, monospace; font-size: 6pt; }
    .qr {
      width: 19mm; border-left: 0.2mm solid #000; display: flex; align-items: center; justify-content: center;
    }
    .qr svg, .qr img { width: 17mm !important; height: 17mm !important; display: block; }
  </style>
</head>
<body>
  <div class="label">
    <div class="head">ASSET TAG</div>
    <div class="body">
      <div class="rows">${body}</div>
      <div class="qr">${qrHtml}</div>
    </div>
  </div>
  <script>window.onload=function(){window.print();window.close();}</script>
</body>
</html>`;
}

export function printAssetTagLabel(options: {
  title: string;
  qrHtml: string;
  fields: AssetTagFields;
}): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(buildAssetTagPrintDocument(options));
  w.document.close();
  return true;
}

export function printQrLabel(options: PrintQrLabelOptions): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(buildPrintDocument(options));
  w.document.close();
  return true;
}

export function printQrLabelFromArea(
  area: HTMLElement,
  options: { title: string; size?: QrPrintSize },
): boolean {
  const svg = area.querySelector("svg");
  const img = area.querySelector("img");
  const qrHtml = svg?.outerHTML ?? img?.outerHTML;
  if (!qrHtml) return false;

  const lines = Array.from(area.querySelectorAll("p"))
    .map((p) => p.textContent?.trim() ?? "")
    .filter(Boolean);

  return printQrLabel({
    title: options.title,
    size: options.size,
    qrHtml,
    primaryLine: lines[0] ?? options.title,
    secondaryLines: lines.slice(1),
  });
}
