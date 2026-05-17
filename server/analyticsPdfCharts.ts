/** Server-side chart drawing for analytics PDF exports (jsPDF). */

export interface ChartSlice {
  label: string;
  value: number;
  color?: [number, number, number];
}

export interface BarSeries {
  name: string;
  color: [number, number, number];
}

export interface GroupedBarItem {
  label: string;
  values: number[];
}

type JsPdfDoc = {
  setFillColor: (r: number, g: number, b: number) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setFont: (face: string, style?: string) => void;
  setFontSize: (size: number) => void;
  setLineWidth?: (width: number) => void;
  text: (text: string | string[], x: number, y: number, options?: Record<string, unknown>) => void;
  path: (ops: [string, number, number][], style?: string) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  circle?: (x: number, y: number, r: number, style?: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number, style?: string) => void;
  splitTextToSize: (text: string, maxWidth: number) => string | string[];
};

export const CHART_PALETTE: [number, number, number][] = [
  [59, 130, 246],
  [34, 197, 94],
  [234, 179, 8],
  [239, 68, 68],
  [168, 85, 247],
  [20, 184, 166],
  [249, 115, 22],
  [107, 114, 128],
  [236, 72, 153],
  [14, 165, 233],
];

export const WO_STATUS_RGB: Record<string, [number, number, number]> = {
  completed: [34, 197, 94],
  in_progress: [59, 130, 246],
  on_hold: [234, 179, 8],
  not_started: [156, 163, 175],
  needs_estimate: [168, 85, 247],
  waiting_approval: [249, 115, 22],
  ready: [20, 184, 166],
};

export const URGENCY_RGB: Record<string, [number, number, number]> = {
  high: [239, 68, 68],
  medium: [234, 179, 8],
  low: [34, 197, 94],
};

export const SEVERITY_RGB: Record<string, [number, number, number]> = {
  high: [239, 68, 68],
  medium: [234, 179, 8],
  low: [59, 130, 246],
};

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function consolidateSlices(slices: ChartSlice[], maxSlices = 7): ChartSlice[] {
  const filtered = slices.filter((s) => s.value > 0);
  if (filtered.length <= maxSlices) return filtered;
  const sorted = [...filtered].sort((a, b) => b.value - a.value);
  const keep = sorted.slice(0, maxSlices - 1);
  const otherVal = sorted.slice(maxSlices - 1).reduce((s, x) => s + x.value, 0);
  return [...keep, { label: "Other", value: otherVal, color: [107, 114, 128] }];
}

/** Height in mm consumed below startY */
export function drawPieChart(
  doc: JsPdfDoc,
  startX: number,
  startY: number,
  width: number,
  slices: ChartSlice[],
  subtitle?: string,
): number {
  const data = consolidateSlices(slices);
  const total = data.reduce((s, d) => s + d.value, 0);
  const chartH = 58;
  const radius = 22;
  const cx = startX + radius + 4;
  const cy = startY + 14 + radius;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30);
  if (subtitle) {
    doc.text(subtitle, startX, startY + 5);
  }

  if (total <= 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("No data to chart for current filters.", startX, startY + 20);
    return chartH;
  }

  if (data.length === 1) {
    const rgb = data[0].color ?? CHART_PALETTE[0];
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    const ops: ([string] | [string, number, number])[] = [["M", cx, cy]];
    for (let s = 0; s <= 36; s++) {
      const rad = (((s * 360) / 36 - 90) * Math.PI) / 180;
      ops.push(["L", cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)]);
    }
    ops.push(["Z"]);
    doc.path(ops as Parameters<typeof doc.path>[0], "F");
  } else {
    let angle = 0;
    data.forEach((slice, i) => {
      const sweep = (slice.value / total) * 360;
      if (sweep <= 0) return;
      const rgb = slice.color ?? CHART_PALETTE[i % CHART_PALETTE.length];
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      const ops: ([string] | [string, number, number])[] = [["M", cx, cy]];
      const steps = Math.max(14, Math.ceil(sweep / 3));
      for (let s = 0; s <= steps; s++) {
        const deg = angle + (sweep * s) / steps;
        const rad = ((deg - 90) * Math.PI) / 180;
        ops.push(["L", cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)]);
      }
      ops.push(["Z"]);
      doc.path(ops as Parameters<typeof doc.path>[0], "F");
      angle += sweep;
    });
  }

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth?.(0.2);
  doc.circle?.(cx, cy, radius, "S");

  // Legend
  let ly = startY + 12;
  const lx = startX + radius * 2 + 14;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  data.forEach((slice, i) => {
    const rgb = slice.color ?? CHART_PALETTE[i % CHART_PALETTE.length];
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(lx, ly - 2.5, 3, 3, "F");
    doc.setTextColor(50);
    const pct = Math.round((slice.value / total) * 100);
    const label = `${slice.label} (${slice.value}, ${pct}%)`;
    const lines = doc.splitTextToSize(label, width - (lx - startX) - 2) as string[];
    doc.text(lines, lx + 5, ly + 1);
    ly += lines.length * 3.5 + 2;
  });

  return Math.max(chartH, ly - startY + 4);
}

/** Vertical bar chart. Returns height in mm. */
export function drawBarChart(
  doc: JsPdfDoc,
  startX: number,
  startY: number,
  width: number,
  bars: ChartSlice[],
  subtitle?: string,
  maxBars = 10,
): number {
  const data = bars.filter((b) => b.value > 0).slice(0, maxBars);
  const chartH = 52;
  const top = startY + 12;
  const bottom = startY + chartH - 10;
  const plotW = width - 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30);
  if (subtitle) doc.text(subtitle, startX, startY + 5);

  if (data.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("No data to chart for current filters.", startX, startY + 20);
    return chartH;
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const slot = plotW / data.length;
  const barW = Math.min(slot * 0.55, 14);

  doc.setDrawColor(220, 220, 220);
  doc.line(startX + 4, bottom, startX + 4 + plotW, bottom);

  data.forEach((bar, i) => {
    const rgb = bar.color ?? CHART_PALETTE[i % CHART_PALETTE.length];
    const h = ((bottom - top) * bar.value) / maxVal;
    const x = startX + 4 + i * slot + (slot - barW) / 2;
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(x, bottom - h, barW, h, "F");
    doc.setFontSize(6);
    doc.setTextColor(40);
    doc.text(String(bar.value), x + barW / 2, bottom - h - 2, { align: "center" } as Record<string, unknown>);
    const labelLines = doc.splitTextToSize(bar.label, barW + 4) as string[];
    doc.setTextColor(80);
    doc.text(labelLines, x + barW / 2, bottom + 3, { align: "center" } as Record<string, unknown>);
  });

  return chartH;
}

/** Grouped bars (e.g. created vs completed per month). */
export function drawGroupedBarChart(
  doc: JsPdfDoc,
  startX: number,
  startY: number,
  width: number,
  items: GroupedBarItem[],
  series: BarSeries[],
  subtitle?: string,
  maxItems = 8,
): number {
  const data = items.slice(-maxItems);
  const chartH = 54;
  const top = startY + 12;
  const bottom = startY + chartH - 12;
  const plotW = width - 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30);
  if (subtitle) doc.text(subtitle, startX, startY + 5);

  if (data.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("No trend data for current filters.", startX, startY + 20);
    return chartH;
  }

  const maxVal = Math.max(...data.flatMap((d) => d.values), 1);
  const slot = plotW / data.length;
  const groupW = Math.min(slot * 0.7, 18);
  const barW = groupW / series.length - 0.5;

  doc.setDrawColor(220, 220, 220);
  doc.line(startX + 4, bottom, startX + 4 + plotW, bottom);

  data.forEach((item, i) => {
    const gx = startX + 4 + i * slot + (slot - groupW) / 2;
    series.forEach((s, si) => {
      const val = item.values[si] ?? 0;
      const h = ((bottom - top) * val) / maxVal;
      const x = gx + si * (barW + 0.5);
      doc.setFillColor(s.color[0], s.color[1], s.color[2]);
      doc.rect(x, bottom - h, barW, h, "F");
    });
    doc.setFontSize(5.5);
    doc.setTextColor(80);
    const lbl = item.label.length > 7 ? item.label.slice(-7) : item.label;
    doc.text(lbl, gx + groupW / 2, bottom + 3, { align: "center" } as Record<string, unknown>);
  });

  // Legend
  let lx = startX + 4;
  const ly = startY + chartH - 4;
  doc.setFontSize(6);
  series.forEach((s) => {
    doc.setFillColor(s.color[0], s.color[1], s.color[2]);
    doc.rect(lx, ly - 2, 2.5, 2.5, "F");
    doc.setTextColor(60);
    doc.text(s.name, lx + 4, ly);
    lx += doc.splitTextToSize(s.name, 40).length > 1 ? 28 : 22;
  });

  return chartH + 4;
}
