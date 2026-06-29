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
