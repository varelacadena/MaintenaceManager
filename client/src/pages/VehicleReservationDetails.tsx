
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Car, Calendar, User, MapPin, FileText, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VehicleReservation, Vehicle } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

  // If advisory not accepted yet, show message
  if (!reservation.advisoryAccepted) {
    return (
      <div className="flex-1 space-y-4 p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Please accept the vehicle use advisory first</p>
            <p className="text-sm text-muted-foreground mt-2">Return to My Reservations and click "View Details" to continue</p>
            <Link href="/my-reservations" className="mt-4">
              <Button>Go to My Reservations</Button>
            </Link>
          </CardContent>
        </Card>
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
