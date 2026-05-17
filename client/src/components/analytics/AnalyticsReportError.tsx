import AnalyticsFilters, { type FilterState } from "@/components/analytics/AnalyticsFilters";

interface AnalyticsReportErrorProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onExport?: (format: string) => void | Promise<void>;
  exportLoading?: boolean;
  exportOptions?: string[];
  filterExtras?: React.ReactNode;
  message?: string;
  onRetry: () => void;
}

export default function AnalyticsReportError({
  filters,
  onFilterChange,
  onExport,
  exportLoading,
  exportOptions,
  filterExtras,
  message = "Could not load report data",
  onRetry,
}: AnalyticsReportErrorProps) {
  return (
    <div className="space-y-3 md:space-y-4">
      <AnalyticsFilters
        filters={filters}
        onFilterChange={onFilterChange}
        onExport={onExport}
        exportLoading={exportLoading}
        exportOptions={exportOptions}
      />
      {filterExtras}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="font-medium text-destructive">{message}</p>
        <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
        <button type="button" className="text-sm text-primary underline mt-3" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  );
}
