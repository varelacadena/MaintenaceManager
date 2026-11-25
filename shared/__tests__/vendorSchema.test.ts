import { describe, expect, it } from "vitest";
import { insertVendorSchema } from "../schema/vendors";

describe("vendor save contract", () => {
  it("requires a name field and currently allows it to be an empty string", () => {
    expect(insertVendorSchema.parse({ name: "Ace Hardware" }).name).toBe("Ace Hardware");
    expect(insertVendorSchema.safeParse({ name: "" }).success).toBe(true);
    expect(insertVendorSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a known trade and rejects an unknown one", () => {
    expect(insertVendorSchema.parse({ name: "Ace", trades: ["plumbing"] }).trades).toEqual(["plumbing"]);
    expect(insertVendorSchema.safeParse({ name: "Ace", trades: ["spaceships"] }).success).toBe(false);
  });
});
