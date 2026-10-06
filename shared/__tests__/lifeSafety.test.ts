import { describe, expect, it } from "vitest";
import {
  compareLifeSafetyItems,
  equipmentIdFromScan,
  isLifeSafetyDue,
  lifeSafetyNextDue,
  lifeSafetyPlace,
} from "../lifeSafety";

describe("life safety rounds", () => {
  it("orders detectors before exit signs, then by floor and room", () => {
    const rows = [
      { category: "exit_sign", spaceName: "Hall", floor: "1st Floor", equipmentName: "Sign" },
      { category: "smoke_detector", spaceName: "Bedroom 2", floor: "2nd Floor", equipmentName: "Detector" },
      { category: "smoke_detector", spaceName: "Kitchen", floor: "1st Floor", equipmentName: "Detector" },
      { category: "smoke_detector", spaceName: "Basement hall", floor: "Basement", equipmentName: "Detector" },
    ].sort(compareLifeSafetyItems);

    expect(rows.map((row) => lifeSafetyPlace(row.spaceName, row.floor))).toEqual([
      "Basement hall · Basement",
      "Kitchen · 1st Floor",
      "Bedroom 2 · 2nd Floor",
      "Hall · 1st Floor",
    ]);
  });

  it("reads an equipment id from a sticker link", () => {
    expect(equipmentIdFromScan("https://app.example/equipment/869ee52b-1e34-42ab-ad9c-5f9289c39faa/work-history"))
      .toBe("869ee52b-1e34-42ab-ad9c-5f9289c39faa");
  });

  it("schedules the next round one week after the last one, even if that round is open", () => {
    const last = new Date(2026, 9, 6);
    const next = lifeSafetyNextDue(last, 1);
    expect(next.getDate()).toBe(13);
    expect(isLifeSafetyDue(next, new Date(2026, 9, 12))).toBe(false);
    expect(isLifeSafetyDue(next, new Date(2026, 9, 13))).toBe(true);
  });
});
