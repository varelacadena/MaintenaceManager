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

  it("returns empty fields when the page has no receipt text", () => {
    expect(parseReceiptText("   \n")).toEqual({
      storeName: null,
      purchasedOn: null,
      amount: null,
    });
  });
});
