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
