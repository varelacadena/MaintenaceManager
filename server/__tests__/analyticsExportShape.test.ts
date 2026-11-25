import { describe, expect, it } from "vitest";
import { buildExportFilename, sanitizeSheetName, selectSheets } from "../analyticsExportBuilder";

describe("analytics export filename", () => {
  it("names the file from the report and the date filter", () => {
    expect(buildExportFilename("overview", "xlsx", {})).toBe("overview_all-time.xlsx");
    expect(buildExportFilename("work-orders-complete", "pdf", {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    })).toBe("work-orders_2026-01-01_to_2026-01-31.pdf");
    expect(buildExportFilename("technicians-detailed", "xlsx", {
      startDate: "2026-02-01",
    })).toBe("team_from_2026-02-01.xlsx");
    expect(buildExportFilename("alerts", "pdf", {
      endDate: "2026-03-01",
    })).toBe("alerts_until_2026-03-01.pdf");
    expect(buildExportFilename("Custom Report!", "xlsx", {})).toBe("Custom-Report-_all-time.xlsx");
  });

  it("keeps a spreadsheet tab name Excel will accept", () => {
    expect(sanitizeSheetName("Cost / Budget?")).toBe("Cost  Budget");
    expect(sanitizeSheetName("a".repeat(40))).toBe("a".repeat(31));
  });

  it("drops cost and student columns when the export options say so", () => {
    const sheets = [
      {
        name: "Team",
        rows: [
          ["Name", "Labor cost", "Clock hours", "Recap"],
          ["Ada", 12, 3, 1],
        ],
      },
      {
        name: "Jobs",
        rows: [
          ["Name", "Status"],
          ["Fix door", "Open"],
        ],
      },
    ];

    expect(selectSheets(sheets, { includeCost: false, sheets: ["Jobs"] })).toEqual([
      {
        name: "Jobs",
        rows: [
          ["Name", "Status"],
          ["Fix door", "Open"],
        ],
      },
    ]);

    expect(selectSheets(sheets, { includeCost: false, includeStudents: true })).toEqual([
      {
        name: "Team",
        rows: [
          ["Name", "Clock hours", "Recap"],
          ["Ada", 3, 1],
        ],
      },
      {
        name: "Jobs",
        rows: [
          ["Name", "Status"],
          ["Fix door", "Open"],
        ],
      },
    ]);

    expect(selectSheets([{ name: "Budget", rows: [["Budget"], [1]] }], { includeCost: false })).toEqual([
      { name: "Budget", rows: [[], []] },
    ]);
  });
});
