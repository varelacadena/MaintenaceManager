/**
 * Download analytics export via fetch (session cookies + no stale cached PDF in new tab).
 */
export async function downloadAnalyticsExport(
  dataType: string,
  format: "pdf" | "xlsx",
  queryString: string,
): Promise<void> {
  const params = new URLSearchParams(queryString);
  params.set("type", dataType);
  params.set("format", format);
  params.set("_", String(Date.now()));

  const response = await fetch(`/api/analytics/export?${params.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) {
    let message = "Export failed";
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      /* not json */
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `analytics-${dataType}.${format}`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
