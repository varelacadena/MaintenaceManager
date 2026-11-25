import { describe, expect, it } from "vitest";
import { linkSchema, money, purchaseFields, refundFields } from "../routes/purchases";

const receipt = {
  storeName: "Home Depot",
  description: "Coupling",
  amount: 12.5,
  purchasedOn: "2026-03-01",
  poNumber: "PO-14",
};

describe("purchase save contract", () => {
  it("accepts a receipt and rejects a blank store", () => {
    expect(purchaseFields.parse(receipt)).toMatchObject(receipt);
    expect(purchaseFields.safeParse({ ...receipt, storeName: "  " }).success).toBe(false);
  });

  it("accepts a task link and rejects an unknown kind", () => {
    expect(linkSchema.parse({ kind: "task", targetId: "task-1" })).toEqual({
      kind: "task",
      targetId: "task-1",
    });
    expect(linkSchema.safeParse({ kind: "invoice", targetId: "task-1" }).success).toBe(false);
  });

  it("accepts a refund amount and rounds money to cents", () => {
    expect(refundFields.parse({ amount: 4, refundedOn: "2026-03-02" })).toEqual({
      amount: 4,
      refundedOn: "2026-03-02",
    });
    expect(refundFields.safeParse({ amount: 0, refundedOn: "2026-03-02" }).success).toBe(false);
    expect(money(10.126)).toBe(10.13);
    expect(money(10.1)).toBe(10.1);
  });
});
