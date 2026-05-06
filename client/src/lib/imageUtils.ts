/**
 * Converts any image URL to a displayable URL.
 * Raw GCS private URLs and Supabase Storage object URLs are routed through
 * the backend image proxy which generates a fresh signed GET URL.
 */
export function toDisplayUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("https://storage.googleapis.com/")) {
    return `/api/objects/image?path=${encodeURIComponent(url)}`;
  }
  if (url.includes(".supabase.co/storage/")) {
    return `/api/objects/image?path=${encodeURIComponent(url)}`;
  }
  return url;
}
