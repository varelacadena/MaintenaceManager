import { buildMetricComparison, type MetricComparison } from "./analyticsMetric";

export interface ExecutiveOverviewNumbers {
  periodLabel: string;
  previousPeriodLabel: string;
  openTasks: MetricComparison;
  pendingRequests: MetricComparison;
  overdueWorkOrders: MetricComparison;
  fleetAvailable: MetricComparison;
  inventoryLowStock: MetricComparison;
  completionRate: MetricComparison;
  completedInPeriod: MetricComparison;
  convertedInPeriod: MetricComparison;
}

export function assembleExecutiveOverview(input: {
  periodLabel: string;
  previousPeriodLabel: string;
  workOrders: {
    current: { totalWorkOrders: number; completedWorkOrders: number; overdueWorkOrders: number; completionRate: number };
    previous: { totalWorkOrders: number; completedWorkOrders: number; overdueWorkOrders: number; completionRate: number };
  };
  requests: {
    current: { pendingRequests: number; convertedRequests: number };
    previous: { pendingRequests: number; convertedRequests: number };
  };
  fleetAvailable: { current: number; previous: number };
  lowStockCount: number;
}): ExecutiveOverviewNumbers {
  const openCurrent = input.workOrders.current.totalWorkOrders - input.workOrders.current.completedWorkOrders;
  const openPrevious = input.workOrders.previous.totalWorkOrders - input.workOrders.previous.completedWorkOrders;
  return {
    periodLabel: input.periodLabel,
    previousPeriodLabel: input.previousPeriodLabel,
    openTasks: buildMetricComparison(openCurrent, openPrevious, true),
    pendingRequests: buildMetricComparison(
      input.requests.current.pendingRequests,
      input.requests.previous.pendingRequests,
      true,
    ),
    overdueWorkOrders: buildMetricComparison(
      input.workOrders.current.overdueWorkOrders,
      input.workOrders.previous.overdueWorkOrders,
      true,
    ),
    fleetAvailable: buildMetricComparison(input.fleetAvailable.current, input.fleetAvailable.previous),
    inventoryLowStock: {
      current: input.lowStockCount,
      previous: input.lowStockCount,
      changePercent: null,
      isPositive: input.lowStockCount === 0,
    },
    completionRate: buildMetricComparison(
      input.workOrders.current.completionRate,
      input.workOrders.previous.completionRate,
    ),
    completedInPeriod: buildMetricComparison(
      input.workOrders.current.completedWorkOrders,
      input.workOrders.previous.completedWorkOrders,
    ),
    convertedInPeriod: buildMetricComparison(
      input.requests.current.convertedRequests,
      input.requests.previous.convertedRequests,
    ),
  };
}
