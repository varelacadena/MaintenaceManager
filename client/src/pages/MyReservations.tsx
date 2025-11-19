import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar, Car, MapPin, Users, Plus, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VehicleReservation {
  id: string;
  vehicleId: string;
  vehicleName: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: string;
  passengerCount: number | null;
  keyPickupLocation: string | null;
  handoffInstructions: string | null;
  createdAt: string;
}

export default function MyReservations() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reservations = [], isLoading } = useQuery<VehicleReservation[]>({
    queryKey: ["/api/vehicle-reservations/my"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const res = await fetch(`/api/vehicle-reservations/${reservationId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to cancel reservation");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-reservations/my"] });
      toast({
        title: "Success",
        description: "Reservation cancelled successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
  };

  const canCheckOut = (reservation: VehicleReservation) => {
    if (reservation.status.toLowerCase() !== "approved") return false;
    const now = new Date();
    const startTime = new Date(reservation.startTime);
    const hoursBefore = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursBefore <= 2 && hoursBefore >= -1;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">My Reservations</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your vehicle reservations</p>
          </div>
        </div>
        <div className="text-center py-8 sm:py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header Section - Mobile Optimized */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold truncate">My Reservations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your vehicle reservations</p>
        </div>
        <Button
          onClick={() => setLocation("/vehicles")}
          className="w-full sm:w-auto flex items-center justify-center gap-2 shrink-0"
          size="default"
        >
          <Plus className="h-4 w-4" />
          <span className="whitespace-nowrap">New Reservation</span>
        </Button>
      </div>

      {/* Reservations List */}
      {reservations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
            <Car className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No reservations yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              You haven't made any vehicle reservations. Click the button above to reserve a vehicle.
            </p>
            <Button onClick={() => setLocation("/vehicles")} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Make a Reservation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {reservations.map((reservation) => (
            <Card key={reservation.id} className="overflow-hidden">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2 mb-2">
                      <Car className="h-5 w-5 shrink-0" />
                      <span className="truncate">{reservation.vehicleName}</span>
                    </CardTitle>
                  </div>
                  <Badge className={`${getStatusColor(reservation.status)} shrink-0 self-start`}>
                    {reservation.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 sm:space-y-4">
                {/* Date & Time - Stacked on mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Start</p>
                      <p className="text-sm font-medium break-words">
                        {format(new Date(reservation.startTime), "MMM dd, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">End</p>
                      <p className="text-sm font-medium break-words">
                        {format(new Date(reservation.endTime), "MMM dd, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Purpose */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Purpose:</p>
                  <p className="text-sm break-words">{reservation.purpose}</p>
                </div>

                {/* Passenger Count */}
                {reservation.passengerCount && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-sm">
                      <span className="text-muted-foreground">Passengers:</span>{" "}
                      {reservation.passengerCount}
                    </p>
                  </div>
                )}

                {/* Key Pickup Location */}
                {reservation.keyPickupLocation && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      Key Pickup:
                    </p>
                    <p className="text-sm break-words pl-6">{reservation.keyPickupLocation}</p>
                  </div>
                )}

                {/* Handoff Instructions */}
                {reservation.handoffInstructions && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Instructions:</p>
                    <p className="text-sm break-words whitespace-pre-wrap bg-muted/50 p-2 sm:p-3 rounded-md">
                      {reservation.handoffInstructions}
                    </p>
                  </div>
                )}

                {/* Action Buttons - Full width on mobile, inline on desktop */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                  {canCheckOut(reservation) && (
                    <Button
                      onClick={() => setLocation(`/vehicles/${reservation.vehicleId}/check-out?reservationId=${reservation.id}`)}
                      className="w-full sm:w-auto"
                    >
                      Check Out
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setLocation(`/vehicle-reservation-details/${reservation.id}`)}
                    className="w-full sm:w-auto"
                  >
                    View Details
                  </Button>
                  {reservation.status.toLowerCase() === "pending" && (
                    <Button
                      variant="destructive"
                      onClick={() => cancelMutation.mutate(reservation.id)}
                      disabled={cancelMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}