import type { Request } from "express";

/** Public origin for emails and links. Prefer APP_URL so Host headers cannot mint attacker URLs. */
export function getPublicAppUrl(req: Request): string {
  const configured = (process.env.APP_URL || process.env.PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;

  const protocol = process.env.NODE_ENV === "production" ? "https" : (req.protocol || "http");
  const hostHeader = req.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return `${protocol}://${host || "localhost:3000"}`;
}
