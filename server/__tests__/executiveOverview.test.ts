import { describe, expect, it } from "vitest";
import { assembleExecutiveOverview } from "../analyticsExecutiveOverview";

describe("executive overview numbers", () => {
  it("builds open tasks, pending requests, and the completion rate from the period rows", () => {
    const overview = assembleExecutiveOverview({
      periodLabel: "Jan 2026",
      previousPeriodLabel: "Dec 2025",
      workOrders: {
        current: { totalWorkOrders: 10, completedWorkOrders: 4, overdueWorkOrders: 1, completionRate: 40 },
        previous: { totalWorkOrders: 8, completedWorkOrders: 2, overdueWorkOrders: 2, completionRate: 25 },
      },
      requests: {
        current: { pendingRequests: 3, convertedRequests: 1 },
        previous: { pendingRequests: 6, convertedRequests: 0 },
      },
      fleetAvailable: { current: 5, previous: 4 },
      lowStockCount: 2,
    });

    expect(overview.periodLabel).toBe("Jan 2026");
    expect(overview.openTasks).toEqual({ current: 6, previous: 6, changePercent: 0, isPositive: false });
    expect(overview.pendingRequests).toEqual({ current: 3, previous: 6, changePercent: -50, isPositive: true });
    expect(overview.completionRate).toEqual({ current: 40, previous: 25, changePercent: 60, isPositive: true });
    expect(overview.overdueWorkOrders.changePercent).toBe(-50);
    expect(overview.fleetAvailable).toEqual({ current: 5, previous: 4, changePercent: 25, isPositive: true });
    expect(overview.completedInPeriod.current).toBe(4);
    expect(overview.convertedInPeriod).toEqual({ current: 1, previous: 0, changePercent: 100, isPositive: true });
    expect(overview.inventoryLowStock).toEqual({ current: 2, previous: 2, changePercent: null, isPositive: false });
  });
});
