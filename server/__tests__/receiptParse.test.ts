import { describe, expect, it } from "vitest";
import { parseReceiptText } from "../receiptParse";

describe("parseReceiptText", () => {
  it("reads the store, date, and total, and skips the subtotal", () => {
    const text = [
      "HOME DEPOT",
      "123 Main Street",
      "11/13/2026 4:12 PM",
      "Wax ring",
      "SUBTOTAL 25.00",
      "TAX 2.43",
      "TOTAL 27.43",
      "CHANGE 0.57",
    ].join("\n");

    expect(parseReceiptText(text)).toEqual({
      storeName: "HOME DEPOT",
      purchasedOn: "2026-11-13",
      amount: 27.43,
    });
  });

  it("prefers amount due over an earlier number", () => {
    const text = ["AutoZone", "Nov 2, 2024", "Oil filter 12.00", "AMOUNT DUE $64.18"].join("\n");
    expect(parseReceiptText(text)).toEqual({
      storeName: "AutoZone",
      purchasedOn: "2024-11-02",
      amount: 64.18,
    });
  });

  it("leaves the store blank when the top line is camera noise", () => {
    const text = [
      "op EE v R D 5 ot NEES",
      "11/13/2026",
      "TOTAL 20.65",
    ].join("\n");

    expect(parseReceiptText(text)).toEqual({
      storeName: null,
      purchasedOn: "2026-11-13",
      amount: 20.65,
    });
  });

  it("skips a noisy first line and keeps the store name under it", () => {
    const text = [
      "Y : RB er : . fo - er",
      "HOME DEPOT",
      "11/13/2026",
      "nails 4.00",
      "TOTAL 27.43",
    ].join("\n");

    expect(parseReceiptText(text)).toEqual({
      storeName: "HOME DEPOT",
      purchasedOn: "2026-11-13",
      amount: 27.43,
    });
  });

  it("does not treat a receipt phrase as the store", () => {
    const text = ["PROVIDED i", "Please Come Again", "Lowe's", "11/10/2026", "TOTAL 28.41"].join("\n");
    expect(parseReceiptText(text)).toEqual({
      storeName: "Lowe's",
      purchasedOn: "2026-11-10",
      amount: 28.41,
    });
  });

  it("uses a saved store name when the scan is close to it", () => {
    const text = ["op EE v R D", "F00D L10N", "11/13/2026", "TOTAL 66.08"].join("\n");
    expect(parseReceiptText(text, ["Food Lion", "op EE v R D 5 ot NEES"])).toMatchObject({
      storeName: "Food Lion",
      purchasedOn: "2026-11-13",
      amount: 66.08,
    });
  });

  it("returns empty fields when the page has no receipt text", () => {
    expect(parseReceiptText("   \n")).toEqual({
      storeName: null,
      purchasedOn: null,
      amount: null,
    });
  });
});
