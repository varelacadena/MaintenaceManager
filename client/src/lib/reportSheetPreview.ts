export const PREVIEW_ROW_CAP = 200;

export interface PreviewTable {
  title: string[];
  header: string[];
  body: string[][];
  totalBodyRows: number;
}

function asText(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString("en-US")
      : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  return String(value);
}

/** Turn a report sheet into a title, a header row, and the rows shown in the preview. */
export function previewSheetTable(rows: (string | number | null | undefined)[][]): PreviewTable {
  const textRows = rows.map((row) => row.map((cell) => asText(cell)));
  const scan = textRows.slice(0, 12);
  const width = scan.reduce((max, row) => Math.max(max, row.length), 0);
  const headerIndex = width > 1 ? scan.findIndex((row) => row.length === width) : -1;

  if (headerIndex < 0) {
    return {
      title: [],
      header: [],
      body: textRows.slice(0, PREVIEW_ROW_CAP),
      totalBodyRows: textRows.length,
    };
  }

  const title = textRows
    .slice(0, headerIndex)
    .map((row) => row.filter(Boolean).join(" "))
    .filter(Boolean);
  const body = textRows.slice(headerIndex + 1);
  return {
    title,
    header: textRows[headerIndex],
    body: body.slice(0, PREVIEW_ROW_CAP),
    totalBodyRows: body.length,
  };
}
