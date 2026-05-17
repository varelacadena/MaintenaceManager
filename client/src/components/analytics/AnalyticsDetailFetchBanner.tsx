interface AnalyticsDetailFetchBannerProps {
  message?: string;
  onRetry?: () => void;
}

export default function AnalyticsDetailFetchBanner({
  message = "Detail tables could not be loaded. Summary metrics above are still accurate.",
  onRetry,
}: AnalyticsDetailFetchBannerProps) {
  return (
    <div
      className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
      role="status"
    >
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="text-primary underline mt-1 text-xs" onClick={onRetry}>
          Retry loading details
        </button>
      )}
    </div>
  );
}
