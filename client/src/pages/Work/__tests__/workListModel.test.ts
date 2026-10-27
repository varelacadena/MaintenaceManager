import { describe, expect, it } from "vitest";
import { compareWorkItems, isWorkOverdue, taskVisible, toWorkStatus } from "../workListModel";

describe("work list status", () => {
  it("folds unused stages into not started and hides hold and cancelled", () => {
    expect(toWorkStatus("needs_estimate")).toBe("not_started");
    expect(toWorkStatus("waiting_approval")).toBe("not_started");
    expect(toWorkStatus("ready")).toBe("not_started");
    expect(toWorkStatus("planning")).toBe("not_started");
    expect(toWorkStatus("in_progress")).toBe("in_progress");
    expect(toWorkStatus("completed")).toBe("completed");
    expect(toWorkStatus("on_hold")).toBeNull();
    expect(toWorkStatus("cancelled")).toBeNull();
  });
});

describe("work list order", () => {
  const today = new Date(2026, 9, 17);

  it("marks a past due date overdue and leaves done work alone", () => {
    expect(isWorkOverdue("2026-10-16", "not_started", today)).toBe(true);
    expect(isWorkOverdue("2026-10-17", "not_started", today)).toBe(false);
    expect(isWorkOverdue("2026-10-01", "completed", today)).toBe(false);
    expect(isWorkOverdue(null, "not_started", today)).toBe(false);
  });

  it("sorts overdue first, then by date, and leaves undated work last", () => {
    const rows = [
      { overdue: false, due: null, name: "No date" },
      { overdue: false, due: new Date(2026, 9, 21).getTime(), name: "Later" },
      { overdue: true, due: new Date(2026, 6, 17).getTime(), name: "Late" },
      { overdue: false, due: new Date(2026, 9, 18).getTime(), name: "Soon" },
    ];
    expect(rows.sort(compareWorkItems).map((row) => row.name)).toEqual(["Late", "Soon", "Later", "No date"]);
  });
});

describe("work list filters", () => {
  const base = {
    status: "not_started",
    due: "2026-10-16",
    assigneeId: "ivan",
    propertyId: "gym",
    name: "Repair door",
    statuses: ["not_started", "in_progress"] as const,
    overdueOnly: false,
    techIds: [] as string[],
    propertyIds: [] as string[],
    query: "",
    now: new Date(2026, 9, 17),
  };

  it("keeps open work and drops hold, done, and non-matching tech or property", () => {
    expect(taskVisible(base)).toBe(true);
    expect(taskVisible({ ...base, status: "on_hold" })).toBe(false);
    expect(taskVisible({ ...base, status: "completed" })).toBe(false);
    expect(taskVisible({ ...base, statuses: ["completed"] })).toBe(false);
    expect(taskVisible({ ...base, techIds: ["varela"] })).toBe(false);
    expect(taskVisible({ ...base, techIds: ["ivan"] })).toBe(true);
    expect(taskVisible({ ...base, propertyIds: ["mansion"], propertyId: null, taskPropertyIds: ["mansion", "gym"] })).toBe(true);
    expect(taskVisible({ ...base, propertyIds: ["duplex"], propertyId: null, taskPropertyIds: ["mansion"] })).toBe(false);
    expect(taskVisible({ ...base, query: "door" })).toBe(true);
    expect(taskVisible({ ...base, query: "window" })).toBe(false);
  });

  it("uses overdue as an extra filter on top of status", () => {
    expect(taskVisible({ ...base, overdueOnly: true })).toBe(true);
    expect(taskVisible({ ...base, overdueOnly: true, due: "2026-10-20" })).toBe(false);
  });
});
