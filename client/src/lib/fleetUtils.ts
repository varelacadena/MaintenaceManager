/** Roles that can manage fleet reservations and see org-wide trip logs. */
export function isFleetPrivilegedRole(role: string | undefined): boolean {
  return role === "admin" || role === "technician";
}

export const FLEET_PAGE_SIZE = 24;
export const RESERVATIONS_PAGE_SIZE = 20;
export const MY_RESERVATIONS_PAGE_SIZE = 15;

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export function isPaginatedResponse<T>(data: unknown): data is PaginatedResponse<T> {
  return (
    typeof data === "object" &&
    data !== null &&
    "items" in data &&
    Array.isArray((data as PaginatedResponse<T>).items) &&
    "total" in data
  );
}

function appendPagination(params: URLSearchParams, page: number, pageSize: number) {
  params.set("limit", String(pageSize));
  params.set("offset", String(page * pageSize));
}

export function vehiclesListUrl(
  statusFilter: string,
  page = 0,
  pageSize = FLEET_PAGE_SIZE,
  search = "",
): string {
  const params = new URLSearchParams();
  appendPagination(params, page, pageSize);
  if (statusFilter !== "all") {
    params.set("status", statusFilter);
  }
  const trimmed = search.trim();
  if (trimmed) {
    params.set("search", trimmed);
  }
  return `/api/vehicles?${params.toString()}`;
}

/** Build reservations API URL with server-side status filtering when possible. */
export function reservationsListUrl(
  statusFilter: string,
  page = 0,
  pageSize = RESERVATIONS_PAGE_SIZE,
  search = "",
): string {
  const params = new URLSearchParams();
  appendPagination(params, page, pageSize);

  switch (statusFilter) {
    case "pending_and_review":
      params.set("statuses", "pending,pending_review");
      break;
    case "approved_active":
      params.set("statuses", "approved,active");
      break;
    case "all":
      break;
    default:
      params.set("status", statusFilter);
  }

  const trimmed = search.trim();
  if (trimmed) {
    params.set("q", trimmed);
  }

  return `/api/vehicle-reservations?${params.toString()}`;
}

export function myReservationsListUrl(page = 0, pageSize = MY_RESERVATIONS_PAGE_SIZE): string {
  const params = new URLSearchParams();
  appendPagination(params, page, pageSize);
  return `/api/vehicle-reservations/my?${params.toString()}`;
}

export function parseFleetUrlState(search: string): {
  tab: string;
  fleetStatus: string;
  fleetPage: number;
  fleetSearch: string;
  resStatus: string;
  resPage: number;
  resSearch: string;
} {
  const params = new URLSearchParams(search);
  return {
    tab: params.get("tab") || "fleet",
    fleetStatus: params.get("fleetStatus") || "all",
    fleetPage: Math.max(0, parseInt(params.get("fleetPage") || "0", 10) || 0),
    fleetSearch: params.get("fleetSearch") || "",
    resStatus: params.get("resStatus") || "pending_and_review",
    resPage: Math.max(0, parseInt(params.get("resPage") || "0", 10) || 0),
    resSearch: params.get("resSearch") || "",
  };
}

export function buildFleetLocationSearch(state: ReturnType<typeof parseFleetUrlState>): string {
  const params = new URLSearchParams();
  if (state.tab && state.tab !== "fleet") params.set("tab", state.tab);
  if (state.fleetStatus !== "all") params.set("fleetStatus", state.fleetStatus);
  if (state.fleetPage > 0) params.set("fleetPage", String(state.fleetPage));
  if (state.fleetSearch) params.set("fleetSearch", state.fleetSearch);
  if (state.resStatus !== "pending_and_review") params.set("resStatus", state.resStatus);
  if (state.resPage > 0) params.set("resPage", String(state.resPage));
  if (state.resSearch) params.set("resSearch", state.resSearch);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function parseOptionalInt(value: string, fallback: number): number {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Large page for vehicle pickers (assign vehicle, etc.). */
export function vehiclesPickerListUrl(): string {
  return vehiclesListUrl("all", 0, 200);
}

export function parseMyReservationsUrlState(search: string): { page: number } {
  const params = new URLSearchParams(search);
  return {
    page: Math.max(0, parseInt(params.get("page") || "0", 10) || 0),
  };
}

export function buildMyReservationsLocationSearch(page: number): string {
  if (page <= 0) return "";
  return `?page=${page}`;
}

export function clampPageIndex(page: number, total: number, pageSize: number): number {
  if (total <= 0) return 0;
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  return Math.min(Math.max(0, page), maxPage);
}
