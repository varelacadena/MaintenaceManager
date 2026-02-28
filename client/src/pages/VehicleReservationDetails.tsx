import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Car, Calendar, FileText, Key, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VehicleReservation, Vehicle, User } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VehicleReservationDetails() {
  const { reservationId } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: reservation, isLoading: reservationLoading } = useQuery<VehicleReservation>({
    queryKey: [`/api/vehicle-reservations/${reservationId}`],
  });

  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${reservation?.vehicleId}`],
    enabled: !!reservation?.vehicleId,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/vehicle-reservations/${reservationId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicle-reservations/${reservationId}`] });
      toast({
        title: "Reservation Cancelled",
        description: "The reservation has been successfully cancelled.",
      });
      setLocation("/my-reservations");
    },
    onError: (error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "An error occurred while cancelling the reservation.",
        variant: "destructive",
      });
    },
  });

  const getKeyPickupMethodLabel = (method: string | null) => {
    if (!method) return "Not specified";
    const labels: Record<string, string> = {
      "in_person": "In Person Pickup",
      "mailbox": "Mailbox Pickup",
      "inside_vehicle": "Inside the Vehicle"
    };
    return labels[method] || method;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved": return "default";
      case "pending": return "secondary";
      case "active": return "default";
      case "completed": return "secondary";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  if (reservationLoading) {
    return (
      <div className="flex-1 space-y-4 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="flex-1 space-y-4 p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Reservation not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "technician";
  const isApproved = reservation.status === "approved";
  const hasVehicle = !!vehicle;

  return (
    <div className="flex-1 space-y-4 p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Reservation Details
          </h2>
          <p className="text-muted-foreground mt-0.5">
            {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.vehicleId})` : "Vehicle Pending Assignment"}
          </p>
        </div>
        <Badge variant={getStatusColor(reservation.status)} className="text-sm capitalize">
          {reservation.status}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasVehicle ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Make & Model</p>
                  <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle ID</p>
                  <p className="font-medium">{vehicle.vehicleId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-medium">{vehicle.year}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Passenger Capacity</p>
                  <p className="font-medium">{vehicle.passengerCapacity} passengers</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
                <Clock className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium text-muted-foreground">No vehicle assigned yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A vehicle will be assigned once your reservation is approved. You'll be able to see the details here.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Reservation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Start Date & Time</p>
              <p className="font-medium">
                {format(new Date(reservation.startDate), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Date & Time</p>
              <p className="font-medium">
                {format(new Date(reservation.endDate), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Purpose</p>
              <p className="font-medium">{reservation.purpose}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Passengers</p>
              <p className="font-medium">{reservation.passengerCount || "Not specified"}</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <p className="text-sm text-muted-foreground">Advisory Status:</p>
              {reservation.advisoryAccepted ? (
                <Badge variant="default" className="flex items-center gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  Accepted
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  Pending
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {isApproved && hasVehicle && (
        <div className="relative">
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Key className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">Key Pickup Instructions</AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <div className="space-y-2 mt-2">
                <div>
                  <p className="font-semibold">Method:</p>
                  <p>{getKeyPickupMethodLabel(reservation.keyPickupMethod)}</p>
                </div>
                {reservation.adminNotes && (
                  <div className="mt-3">
                    <p className="font-semibold">Additional Instructions:</p>
                    <p className="whitespace-pre-wrap">{reservation.adminNotes}</p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {reservation.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{reservation.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        {isAdmin && (
          <>
            <Link href={`/vehicle-reservations/edit/${reservation.id}`}>
              <Button variant="outline" size="lg">
                Edit Reservation
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="lg">
                  Cancel Reservation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will cancel the reservation
                    {vehicle ? ` for ${vehicle.make} ${vehicle.model}` : ""} from{" "}
                    {format(new Date(reservation.startDate), "MMM d, yyyy 'at' h:mm a")}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                    {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        {isApproved && !isAdmin && (
          <Link href={`/vehicle-checkout/${reservation.id}`} className="flex-1">
            <Button className="w-full" size="lg" data-testid="button-proceed-checkout">
              Proceed to Check Out Vehicle
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
