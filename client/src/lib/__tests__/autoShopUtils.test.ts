import { describe, expect, it } from "vitest";
import { isAutoShopName } from "../autoShopUtils";

describe("isAutoShopName", () => {
  it("matches Auto Shop department names", () => {
    expect(isAutoShopName("Auto Shop")).toBe(true);
    expect(isAutoShopName("College Auto Shop")).toBe(true);
    expect(isAutoShopName("autoshop")).toBe(true);
  });

  it("does not match unrelated names", () => {
    expect(isAutoShopName("Grounds & Landscaping")).toBe(false);
    expect(isAutoShopName("")).toBe(false);
    expect(isAutoShopName(undefined)).toBe(false);
  });
});
