import { describe, expect, it } from "vitest";
import { PREVIEW_ROW_CAP, previewSheetTable } from "../reportSheetPreview";

describe("previewSheetTable", () => {
  it("uses the first wide row as the header", () => {
    const table = previewSheetTable([
      ["Status", "Count"],
      ["Open", 4],
      ["Done", 12],
    ]);
    expect(table.title).toEqual([]);
    expect(table.header).toEqual(["Status", "Count"]);
    expect(table.body).toEqual([
      ["Open", "4"],
      ["Done", "12"],
    ]);
    expect(table.totalBodyRows).toBe(2);
  });

  it("keeps the cover lines above the field table", () => {
    const table = previewSheetTable([
      ["Maintenance Manager — Analytics Export"],
      ["Work Orders"],
      [],
      ["Field", "Value"],
      ["Date range", "All time (no date filter)"],
    ]);
    expect(table.title).toEqual(["Maintenance Manager — Analytics Export", "Work Orders"]);
    expect(table.header).toEqual(["Field", "Value"]);
    expect(table.body).toEqual([["Date range", "All time (no date filter)"]]);
  });

  it("caps a long sheet and reports how many rows the file has", () => {
    const rows = [
      ["Name", "Status"],
      ...Array.from({ length: PREVIEW_ROW_CAP + 25 }, (_, index) => [`Job ${index}`, "Open"]),
    ];
    const table = previewSheetTable(rows);
    expect(table.header).toEqual(["Name", "Status"]);
    expect(table.body).toHaveLength(PREVIEW_ROW_CAP);
    expect(table.totalBodyRows).toBe(PREVIEW_ROW_CAP + 25);
  });
});
