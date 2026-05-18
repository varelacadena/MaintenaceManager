import { Button } from "@/components/ui/button";

type FleetListPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  testIdPrefix?: string;
};

export function FleetListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel = "items",
  testIdPrefix = "fleet",
}: FleetListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);

  if (total <= pageSize) {
    return null;
  }

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2"
      data-testid={`${testIdPrefix}-pagination`}
    >
      <p className="text-sm text-muted-foreground" data-testid={`${testIdPrefix}-pagination-summary`}>
        Showing {start}–{end} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          data-testid={`${testIdPrefix}-pagination-prev`}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">
          Page {page + 1} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
          data-testid={`${testIdPrefix}-pagination-next`}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
