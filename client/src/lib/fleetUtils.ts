/** Roles that can manage fleet reservations and see org-wide trip logs. */
export function isFleetPrivilegedRole(role: string | undefined): boolean {
  return role === "admin" || role === "technician";
}

export const FLEET_PAGE_SIZE = 24;
export const RESERVATIONS_PAGE_SIZE = 20;

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

function appendPagination(params: URLSearchParams, page: number, pageSize: number, paginate: boolean) {
  if (paginate) {
    params.set("limit", String(pageSize));
    params.set("offset", String(page * pageSize));
  }
}

export function vehiclesListUrl(
  statusFilter: string,
  page = 0,
  pageSize = FLEET_PAGE_SIZE,
  paginate = true,
): string {
  const params = new URLSearchParams();
  appendPagination(params, page, pageSize, paginate);
  if (statusFilter !== "all") {
    params.set("status", statusFilter);
  }
  const qs = params.toString();
  return qs ? `/api/vehicles?${qs}` : "/api/vehicles";
}

/** Build reservations API URL with server-side status filtering when possible. */
export function reservationsListUrl(
  statusFilter: string,
  page = 0,
  pageSize = RESERVATIONS_PAGE_SIZE,
  paginate = true,
): string {
  const params = new URLSearchParams();
  appendPagination(params, page, pageSize, paginate);

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

  return `/api/vehicle-reservations?${params.toString()}`;
}

export function parseOptionalInt(value: string, fallback: number): number {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
