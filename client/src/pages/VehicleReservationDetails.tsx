import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Car, Calendar, User, MapPin, FileText, Key, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VehicleReservation, Vehicle } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";

export default function VehicleReservationDetails() {
  const { reservationId } = useParams();
  const [, setLocation] = useLocation();

  const { data: reservation, isLoading: reservationLoading } = useQuery<VehicleReservation>({
    queryKey: [`/api/vehicle-reservations/${reservationId}`],
  });

  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${reservation?.vehicleId}`],
    enabled: !!reservation?.vehicleId,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/vehicle-reservations/${reservationId}/accept-advisory`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to accept advisory");
      }

      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch the reservation data
      window.location.reload();
    },
  });

  const handleAcceptAdvisory = () => {
    acceptMutation.mutate();
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

  if (!reservation || !vehicle) {
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

  // Show advisory dialog if not yet accepted
  const showAdvisoryDialog = reservation.status === "approved" && !reservation.advisoryAccepted;

  if (showAdvisoryDialog) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Dialog open={true} onOpenChange={() => setLocation("/my-reservations")}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <Car className="h-8 w-8 text-primary" />
                <DialogTitle className="text-2xl">Vehicle Use Advisory</DialogTitle>
              </div>
            </DialogHeader>

            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-900 dark:text-yellow-100 text-lg">
                Important Information
              </AlertTitle>
              <AlertDescription className="text-yellow-800 dark:text-yellow-200 mt-2">
                <div className="space-y-3">
                  <p className="font-semibold">
                    Please read and acknowledge the following before proceeding:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Vehicle usage is for official college business only</li>
                    <li>You are responsible for the vehicle during the reservation period</li>
                    <li>Report any damages or issues immediately</li>
                    <li>Follow all traffic laws and college policies</li>
                    <li>Return the vehicle on time and in the same condition</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <DialogFooter className="flex gap-3 sm:gap-3">
              <Button
                onClick={handleAcceptAdvisory}
                disabled={acceptMutation.isPending}
                className="flex-1"
              >
                {acceptMutation.isPending ? "Processing..." : "I Accept"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/my-reservations")}
                className="flex-1"
              >
                Return to My Reservations
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const getKeyPickupMethodLabel = (method: string | null) => {
    if (!method) return "Not specified";
    const labels: Record<string, string> = {
      "in_person": "In Person Pickup",
      "mailbox": "Mailbox Pickup",
      "inside_vehicle": "Inside the Vehicle"
    };
    return labels[method] || method;
  };

  return (
    <div className="flex-1 space-y-4 p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/my-reservations">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Reservation Details
          </h2>
          <p className="text-muted-foreground">
            {vehicle.make} {vehicle.model} ({vehicle.vehicleId})
          </p>
        </div>
        <Badge variant="default" className="text-sm">
          {reservation.status}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Vehicle Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>

        {/* Reservation Details Card */}
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
              <p className="font-medium">{reservation.passengers || reservation.passengerCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Pickup Information - Only shown after advisory acceptance */}
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

      {/* Notes Card - if user added notes */}
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

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Link href={`/vehicle-checkout/${reservation.id}`} className="flex-1">
          <Button className="w-full" size="lg">
            Proceed to Check Out Vehicle
          </Button>
        </Link>
      </div>
    </div>
  );
}