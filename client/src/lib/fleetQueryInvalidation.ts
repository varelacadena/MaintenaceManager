import type { QueryClient } from "@tanstack/react-query";

export function invalidateVehicleQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.startsWith("/api/vehicles");
    },
  });
}

export function invalidateVehicleReservationQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.startsWith("/api/vehicle-reservations");
    },
  });
}

/** Screens that show a vehicle, its reservation, or the dashboard count after checkout. */
export function isCheckoutRefreshQueryKey(key: readonly unknown[]): boolean {
  const head = key[0];
  if (typeof head !== "string") return false;
  return (
    head.startsWith("/api/vehicle-checkout-logs") ||
    head.startsWith("/api/vehicles") ||
    head.startsWith("/api/vehicle-reservations") ||
    head.startsWith("/api/tasks") ||
    head === "/api/dashboard" ||
    head.startsWith("/api/dashboard/")
  );
}
