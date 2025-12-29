import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Car, Calendar, User, MapPin, FileText, Key, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VehicleReservation, Vehicle } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

export default function VehicleReservationDetails() {
  const { reservationId } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [showSafetyDialog, setShowSafetyDialog] = useState(false);
  const [safetyCheckboxChecked, setSafetyCheckboxChecked] = useState(false);

  // Get current user to check role - must be first to avoid hook order issues
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

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
      // Show safety acknowledgment dialog after accepting advisory
      setShowSafetyDialog(true);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/vehicle-reservations/${reservationId}/cancel`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicle-reservations/${reservationId}`] });
      toast({
        title: "Reservation Cancelled",
        description: "The reservation has been successfully cancelled.",
        variant: "success",
      });
      // Redirect to the reservation list page or a confirmation page
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

  const handleAcceptAdvisory = () => {
    acceptMutation.mutate();
  };

  const handleSafetyAcknowledgment = () => {
    if (safetyCheckboxChecked) {
      setSafetyAcknowledged(true);
      setShowSafetyDialog(false);
      window.location.reload();
    }
  };

  const handleCancelReservation = () => {
    cancelMutation.mutate();
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

  // Show safety acknowledgment dialog after advisory acceptance
  if (showSafetyDialog) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Dialog open={true} onOpenChange={() => setShowSafetyDialog(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                <DialogTitle className="text-2xl">Safety Acknowledgment</DialogTitle>
              </div>
            </DialogHeader>

            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <AlertTitle className="text-red-900 dark:text-red-100 text-lg">
                Important Safety Notice
              </AlertTitle>
              <AlertDescription className="text-red-800 dark:text-red-200 mt-2">
                <div className="space-y-4">
                  <p className="font-semibold">
                    Before viewing key pickup instructions, you must confirm:
                  </p>
                  <div className="flex items-start gap-3 p-4 bg-white/50 dark:bg-black/20 rounded-md">
                    <Checkbox
                      id="safety-checkbox"
                      checked={safetyCheckboxChecked}
                      onCheckedChange={(checked) => setSafetyCheckboxChecked(checked === true)}
                    />
                    <label
                      htmlFor="safety-checkbox"
                      className="text-sm font-medium leading-relaxed cursor-pointer"
                    >
                      I confirm I will not operate the vehicle until checkout is completed
                    </label>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <DialogFooter className="flex gap-3 sm:gap-3">
              <Button
                onClick={handleSafetyAcknowledgment}
                disabled={!safetyCheckboxChecked}
                className="flex-1"
              >
                Continue
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

  // Determine if the current user is an admin to show edit/cancel buttons
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "maintenance";

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

      {/* Key Pickup Information - Blurred until safety acknowledgment */}
      <div className="relative">
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <Key className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Key Pickup Instructions</AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className={`space-y-2 mt-2 ${!safetyAcknowledged ? 'blur-md select-none' : ''}`}>
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
        {!safetyAcknowledged && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-lg">
            <Button
              onClick={() => setShowSafetyDialog(true)}
              variant="default"
              size="lg"
              className="shadow-lg"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              View Key Pickup Instructions
            </Button>
          </div>
        )}
      </div>

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
                    This action cannot be undone. This will cancel the reservation for {vehicle.make} {vehicle.model} from {format(new Date(reservation.startDate), "MMM d, yyyy 'at' h:mm a")}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelReservation} disabled={cancelMutation.isPending}>
                    {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        {reservation.status === "approved" && !isAdmin && (
          safetyAcknowledged ? (
            <Link href={`/vehicle-checkout/${reservation.id}`} className="flex-1">
              <Button className="w-full" size="lg">
                Proceed to Check Out Vehicle
              </Button>
            </Link>
          ) : (
            <Button 
              className="w-full" 
              size="lg" 
              disabled
              onClick={() => setShowSafetyDialog(true)}
            >
              Proceed to Check Out Vehicle
            </Button>
          )
        )}
      </div>
    </div>
  );
}