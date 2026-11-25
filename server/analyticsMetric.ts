export interface MetricComparison {
  current: number;
  previous: number;
  changePercent: number | null;
  isPositive: boolean;
}

export function buildMetricComparison(
  current: number,
  previous: number,
  lowerIsBetter = false,
): MetricComparison {
  let changePercent: number | null = null;
  if (previous > 0) {
    changePercent = Math.round(((current - previous) / previous) * 100);
  } else if (current > 0) {
    changePercent = 100;
  } else {
    changePercent = 0;
  }

  const delta = current - previous;
  const isPositive = lowerIsBetter ? delta < 0 : delta > 0;

  return { current, previous, changePercent, isPositive };
}
