import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface NotificationCounts {
  pendingServiceRequests: number;
  pendingVehicleReservations: number;
  unreadMessages: number;
  approvedReservations: number;
  pendingSignups: number;
  pendingStudentTimeEdits: number;
}

const emptyCounts: NotificationCounts = {
  pendingServiceRequests: 0,
  pendingVehicleReservations: 0,
  unreadMessages: 0,
  approvedReservations: 0,
  pendingSignups: 0,
  pendingStudentTimeEdits: 0,
};

export function useNotificationCounts() {
  const { user } = useAuth();

  const { data: counts = emptyCounts } = useQuery<NotificationCounts>({
    queryKey: ["/api/notifications/counts"],
    enabled: !!user,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "hidden"
        ? false
        : 60000,
    refetchIntervalInBackground: false,
  });

  return counts;
}
