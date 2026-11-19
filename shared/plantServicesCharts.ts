import { REPORT_GRAY, REPORT_GREEN, REPORT_NAVY, formatHours, formatMoney } from "./plantServicesReport";

export interface ChartSvg {
  svg: string;
  width: number;
  height: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapSvg(width: number, height: number, body: string): ChartSvg {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${body}
</svg>`;
  return { svg, width, height };
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const padded = value * 1.15;
  const power = Math.pow(10, Math.floor(Math.log10(padded)));
  const step = padded / power > 5 ? power : padded / power > 2 ? power / 2 : power / 5;
  return Math.ceil(padded / step) * step;
}

export function technicianHoursChart(
  rows: { name: string; hours: number; tasks: number }[],
): ChartSvg {
  const width = 680;
  const height = 360;
  const left = 52;
  const right = 16;
  const top = 48;
  const bottom = 72;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = niceMax(Math.max(0, ...rows.map((row) => row.hours)));
  const slot = rows.length > 0 ? plotWidth / rows.length : plotWidth;
  const barWidth = Math.min(46, slot * 0.55);
  const ticks = 4;
  const grid = Array.from({ length: ticks + 1 }, (_, index) => {
    const value = (max / ticks) * index;
    const y = top + plotHeight - (value / max) * plotHeight;
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#E6E8EC" stroke-width="1"/>
      <text x="${left - 8}" y="${y + 4}" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#${REPORT_GRAY}">${formatHours(value)}</text>`;
  }).join("");
  const bars = rows
    .map((row, index) => {
      const barHeight = (row.hours / max) * plotHeight;
      const x = left + slot * index + (slot - barWidth) / 2;
      const y = top + plotHeight - barHeight;
      const label = escapeXml(row.name);
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#${REPORT_NAVY}"/>
        <text x="${x + barWidth / 2}" y="${y - 16}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#${REPORT_NAVY}">${formatHours(row.hours)} h</text>
        <text x="${x + barWidth / 2}" y="${y - 3}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#${REPORT_GRAY}">${row.tasks} ${row.tasks === 1 ? "task" : "tasks"}</text>
        <text x="${x + barWidth / 2}" y="${top + plotHeight + 18}" text-anchor="end" transform="rotate(-28 ${x + barWidth / 2} ${top + plotHeight + 18})" font-family="Arial, sans-serif" font-size="11" fill="#243044">${label}</text>`;
    })
    .join("");
  return wrapSvg(
    width,
    height,
    `<text x="${left}" y="26" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#${REPORT_NAVY}">Work Spread by Technician</text>
    ${grid}
    <line x1="${left}" y1="${top}" x2="${left}" y2="${top + plotHeight}" stroke="#243044" stroke-width="1"/>
    <line x1="${left}" y1="${top + plotHeight}" x2="${width - right}" y2="${top + plotHeight}" stroke="#243044" stroke-width="1"/>
    <text x="16" y="${top + plotHeight / 2}" text-anchor="middle" transform="rotate(-90 16 ${top + plotHeight / 2})" font-family="Arial, sans-serif" font-size="12" fill="#${REPORT_GRAY}">Hours logged</text>
    ${bars}`,
  );
}

export function tasksByPropertyChart(rows: { name: string; tasks: number }[]): ChartSvg {
  const width = 680;
  const rowHeight = 28;
  const top = 48;
  const bottom = 36;
  const left = 168;
  const height = top + Math.max(rows.length, 1) * rowHeight + bottom;
  const max = niceMax(Math.max(0, ...rows.map((row) => row.tasks)));
  const plotWidth = width - left - 36;
  const bars = rows
    .map((row, index) => {
      const y = top + index * rowHeight;
      const barWidth = (row.tasks / max) * plotWidth;
      return `<text x="${left - 8}" y="${y + 16}" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="#243044">${escapeXml(row.name)}</text>
        <rect x="${left}" y="${y + 6}" width="${Math.max(barWidth, row.tasks > 0 ? 2 : 0)}" height="14" fill="#${REPORT_GREEN}"/>
        <text x="${left + barWidth + 6}" y="${y + 17}" font-family="Arial, sans-serif" font-size="12" fill="#243044">${row.tasks}</text>`;
    })
    .join("");
  return wrapSvg(
    width,
    height,
    `<text x="24" y="26" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#${REPORT_NAVY}">Work Spread by Property</text>
    <line x1="${left}" y1="${top - 6}" x2="${left}" y2="${top + rows.length * rowHeight}" stroke="#243044" stroke-width="1"/>
    <line x1="${left}" y1="${top + rows.length * rowHeight}" x2="${width - 24}" y2="${top + rows.length * rowHeight}" stroke="#243044" stroke-width="1"/>
    <text x="${left + plotWidth / 2}" y="${height - 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#${REPORT_GRAY}">Tasks completed</text>
    ${bars}`,
  );
}

export function costByPropertyChart(
  rows: { name: string; laborCost: number; materialsCost: number }[],
): ChartSvg {
  const width = 680;
  const height = 380;
  const left = 64;
  const right = 150;
  const top = 48;
  const bottom = 78;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = niceMax(Math.max(0, ...rows.map((row) => row.laborCost + row.materialsCost)));
  const slot = rows.length > 0 ? plotWidth / rows.length : plotWidth;
  const barWidth = Math.min(36, slot * 0.55);
  const ticks = 4;
  const grid = Array.from({ length: ticks + 1 }, (_, index) => {
    const value = (max / ticks) * index;
    const y = top + plotHeight - (value / max) * plotHeight;
    return `<line x1="${left}" y1="${y}" x2="${left + plotWidth}" y2="${y}" stroke="#E6E8EC" stroke-width="1"/>
      <text x="${left - 8}" y="${y + 4}" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#${REPORT_GRAY}">${formatMoney(value)}</text>`;
  }).join("");
  const bars = rows
    .map((row, index) => {
      const laborHeight = max > 0 ? (row.laborCost / max) * plotHeight : 0;
      const materialsHeight = max > 0 ? (row.materialsCost / max) * plotHeight : 0;
      const x = left + slot * index + (slot - barWidth) / 2;
      const laborY = top + plotHeight - laborHeight;
      const materialsY = laborY - materialsHeight;
      return `<rect x="${x}" y="${laborY}" width="${barWidth}" height="${laborHeight}" fill="#${REPORT_NAVY}"/>
        <rect x="${x}" y="${materialsY}" width="${barWidth}" height="${materialsHeight}" fill="#${REPORT_GREEN}"/>
        <text x="${x + barWidth / 2}" y="${top + plotHeight + 16}" text-anchor="end" transform="rotate(-32 ${x + barWidth / 2} ${top + plotHeight + 16})" font-family="Arial, sans-serif" font-size="11" fill="#243044">${escapeXml(row.name)}</text>`;
    })
    .join("");
  return wrapSvg(
    width,
    height,
    `<text x="${left}" y="26" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#${REPORT_NAVY}">Cost by Property</text>
    ${grid}
    <line x1="${left}" y1="${top}" x2="${left}" y2="${top + plotHeight}" stroke="#243044" stroke-width="1"/>
    <line x1="${left}" y1="${top + plotHeight}" x2="${left + plotWidth}" y2="${top + plotHeight}" stroke="#243044" stroke-width="1"/>
    <text x="18" y="${top + plotHeight / 2}" text-anchor="middle" transform="rotate(-90 18 ${top + plotHeight / 2})" font-family="Arial, sans-serif" font-size="12" fill="#${REPORT_GRAY}">Cost ($)</text>
    ${bars}
    <rect x="${width - 136}" y="52" width="12" height="12" fill="#${REPORT_NAVY}"/>
    <text x="${width - 118}" y="63" font-family="Arial, sans-serif" font-size="12" fill="#243044">Labor</text>
    <rect x="${width - 136}" y="74" width="12" height="12" fill="#${REPORT_GREEN}"/>
    <text x="${width - 118}" y="85" font-family="Arial, sans-serif" font-size="12" fill="#243044">Materials / parts</text>`,
  );
}
