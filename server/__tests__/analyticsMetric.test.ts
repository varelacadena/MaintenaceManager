import { describe, expect, it } from "vitest";
import { buildMetricComparison } from "../analyticsService";

describe("report comparison numbers", () => {
  it("rounds the percent change from the previous period", () => {
    expect(buildMetricComparison(15, 10)).toEqual({
      current: 15,
      previous: 10,
      changePercent: 50,
      isPositive: true,
    });
  });

  it("treats a rise as worse when a lower number is better", () => {
    expect(buildMetricComparison(8, 4, true)).toEqual({
      current: 8,
      previous: 4,
      changePercent: 100,
      isPositive: false,
    });
  });

  it("calls a drop from zero a full increase and a flat zero no change", () => {
    expect(buildMetricComparison(3, 0).changePercent).toBe(100);
    expect(buildMetricComparison(0, 0)).toEqual({
      current: 0,
      previous: 0,
      changePercent: 0,
      isPositive: false,
    });
  });
});
