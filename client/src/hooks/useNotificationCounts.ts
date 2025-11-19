import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface NotificationCounts {
  pendingServiceRequests: number;
  pendingVehicleReservations: number;
  unreadMessages: number;
  approvedReservations: number;
}

export function useNotificationCounts() {
  const { user } = useAuth();

  const { data: counts = { pendingServiceRequests: 0, pendingVehicleReservations: 0, unreadMessages: 0, approvedReservations: 0 } } = useQuery<NotificationCounts>({
    queryKey: ["/api/notifications/counts"],
    enabled: !!user,
    refetchInterval: 5000,
  });

  return counts;
}
