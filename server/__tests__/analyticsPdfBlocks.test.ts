import { describe, expect, it } from "vitest";
import { selectPdfBlocks } from "../analyticsExportBuilder";

const blocks = [
  { kind: "text" as const, heading: "Note", paragraphs: ["Hi"] },
  { kind: "pie" as const, heading: "Chart: status", explanation: "", slices: [] },
  {
    kind: "table" as const,
    heading: "Labor cost",
    rows: [
      ["Name", "Labor cost", "Clock hours"],
      ["Ada", 1, 2],
    ],
  },
  {
    kind: "table" as const,
    heading: "Jobs",
    rows: [
      ["Name", "Clock hours"],
      ["Ada", 2],
    ],
  },
];

describe("PDF block filter", () => {
  it("drops charts and student columns unless the export asks for them", () => {
    expect(selectPdfBlocks(blocks, { includeCharts: false })).toEqual([
      { kind: "text", heading: "Note", paragraphs: ["Hi"] },
      {
        kind: "table",
        heading: "Labor cost",
        rows: [
          ["Name", "Labor cost"],
          ["Ada", 1],
        ],
      },
      {
        kind: "table",
        heading: "Jobs",
        rows: [["Name"], ["Ada"]],
      },
    ]);
  });

  it("drops a cost section by its heading", () => {
    expect(selectPdfBlocks(blocks, { includeCost: false, includeStudents: true, includeCharts: true })).toEqual([
      { kind: "text", heading: "Note", paragraphs: ["Hi"] },
      { kind: "pie", heading: "Chart: status", explanation: "", slices: [] },
      {
        kind: "table",
        heading: "Jobs",
        rows: [
          ["Name", "Clock hours"],
          ["Ada", 2],
        ],
      },
    ]);
  });
});
