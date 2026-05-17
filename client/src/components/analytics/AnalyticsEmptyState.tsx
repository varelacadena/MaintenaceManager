import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyticsEmptyStateProps {
  title?: string;
  description?: string;
  onClearFilters?: () => void;
}

export default function AnalyticsEmptyState({
  title = "No data for these filters",
  description = "Try widening the date range or clearing filters to see results.",
  onClearFilters,
}: AnalyticsEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center"
      data-testid="analytics-empty-state"
    >
      <FilterX className="w-10 h-10 text-muted-foreground mb-3" />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
      {onClearFilters && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
