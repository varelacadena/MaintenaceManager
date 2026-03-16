import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Car, Calendar, FileText, Key, Clock,
  Lock, ShieldAlert, TriangleAlert, X, OctagonX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VehicleReservation, Vehicle, User } from "@shared/schema";
import { format } from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

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

  const [isTimeAvailable, setIsTimeAvailable] = useState<boolean>(false);

  useEffect(() => {
    if (!reservation?.startDate) return;
    const check = () => new Date() >= new Date(new Date(reservation.startDate).getTime() - 60 * 60 * 1000);
    setIsTimeAvailable(check());
    if (check()) return;
    const interval = setInterval(() => {
      if (check()) {
        setIsTimeAvailable(true);
        clearInterval(interval);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [reservation?.startDate]);

  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [showAdvisoryDialog, setShowAdvisoryDialog] = useState(false);
  const [warningChecked, setWarningChecked] = useState(false);

  useEffect(() => {
    if (reservation?.advisoryAccepted) {
      setSafetyAcknowledged(true);
    }
  }, [reservation?.advisoryAccepted]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPurpose, setEditPurpose] = useState("");
  const [editPassengerCount, setEditPassengerCount] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const openEditDialog = () => {
    if (!reservation) return;
    setEditPurpose(reservation.purpose ?? "");
    setEditPassengerCount(String(reservation.passengerCount ?? ""));
    setEditStartDate(
      reservation.startDate
        ? new Date(reservation.startDate).toISOString().slice(0, 16)
        : ""
    );
    setEditEndDate(
      reservation.endDate
        ? new Date(reservation.endDate).toISOString().slice(0, 16)
        : ""
    );
    setEditNotes(reservation.notes ?? "");
    setEditDialogOpen(true);
  };

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/vehicle-reservations/${reservationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicle-reservations/${reservationId}`] });
      toast({ title: "Reservation Cancelled", description: "The reservation has been successfully cancelled." });
      setLocation("/my-reservations");
    },
    onError: (error: Error) => {
      toast({ title: "Cancellation Failed", description: error.message || "An error occurred.", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/vehicle-reservations/${reservationId}`, {
        purpose: editPurpose,
        passengerCount: parseInt(editPassengerCount, 10),
        startDate: new Date(editStartDate).toISOString(),
        endDate: new Date(editEndDate).toISOString(),
        notes: editNotes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicle-reservations/${reservationId}`] });
      toast({ title: "Reservation Updated", description: "The reservation has been updated successfully." });
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message || "An error occurred.", variant: "destructive" });
    },
  });

  const advisoryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/vehicle-reservations/${reservationId}/accept-advisory`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to accept advisory");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicle-reservations/${reservationId}`] });
      setSafetyAcknowledged(true);
      setShowAdvisoryDialog(false);
      setWarningChecked(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getKeyPickupMethodLabel = (method: string | null) => {
    if (!method) return "Not specified";
    const labels: Record<string, string> = {
      "in_person": "In Person Pickup",
      "mailbox": "Mailbox Pickup",
      "inside_vehicle": "Inside the Vehicle",
      "key_box": "Key Box Pickup",
    };
    return labels[method] || method;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved": return "default";
      case "pending": return "secondary";
      case "active": return "default";
      case "pending_review": return "secondary";
      case "completed": return "secondary";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const formatStatusLabel = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

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

  const isAdmin = currentUser?.role === "admin";
  const isApproved = reservation.status === "approved";
  const isCheckoutComplete = reservation.status === "active" || reservation.status === "pending_review" || reservation.status === "completed";
  const hasVehicle = !!vehicle;

  const isUnblurred = isAdmin || safetyAcknowledged || reservation.advisoryAccepted || isCheckoutComplete;

  const checkoutLocked = isApproved && !isTimeAvailable && !isAdmin;
  const showKeyPickup = hasVehicle && !!reservation.keyPickupMethod;

  const moreThan24hAway = new Date(reservation.startDate) > new Date(Date.now() + 24 * 60 * 60 * 1000);
  const showEditButton = isAdmin && isApproved && moreThan24hAway;

  return (
    <div className="flex-1 space-y-4 p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Reservation Details
          </h2>
          <p className="text-muted-foreground mt-0.5">{reservation.purpose}</p>
        </div>
        <Badge variant={getStatusColor(reservation.status)} className="text-sm" data-testid="badge-status">
          {formatStatusLabel(reservation.status)}
        </Badge>
      </div>

      {checkoutLocked && (
        <div className="rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600 p-4" data-testid="banner-checkout-locked">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex-shrink-0">
              <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">Checkout not available yet</p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-0.5">
                You can begin checkout on{" "}
                <span className="font-semibold">
                  {format(new Date(reservation.startDate), "EEEE, MMM d 'at' h:mm a")}
                </span>
                . Come back then to pick up your key and start the checkout process.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasVehicle ? (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
                <Clock className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium text-muted-foreground">No vehicle assigned yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A vehicle will be assigned once your reservation is approved.
                  </p>
                </div>
              </div>
            ) : (isAdmin || isCheckoutComplete) ? (
              <div className="space-y-3" data-testid="vehicle-full-details">
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
              <div className="flex flex-col items-center justify-center py-6 text-center gap-3" data-testid="vehicle-placeholder">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Your vehicle is ready</p>
                  <p className="text-base font-bold">{vehicle.make} {vehicle.model}</p>
                </div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Fleet No.</p>
                    <p className="font-medium">{vehicle.vehicleId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">License Plate</p>
                    <p className="font-medium">{vehicle.licensePlate ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Color</p>
                    <p className="font-medium">{vehicle.color ?? "—"}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  Full vehicle details will be visible once checkout is complete.
                </p>
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
              <p className="font-medium">{format(new Date(reservation.startDate), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Date & Time</p>
              <p className="font-medium">{format(new Date(reservation.endDate), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Purpose</p>
              <p className="font-medium">{reservation.purpose}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Passengers</p>
              <p className="font-medium">{reservation.passengerCount || "Not specified"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showKeyPickup && (
        <div className="relative" data-testid="key-pickup-section">
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Key className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">Key Pickup Instructions</AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <div className={`space-y-2 mt-2 transition-all duration-300 ${!isUnblurred ? "blur-md select-none pointer-events-none" : ""}`}>
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

          {!isUnblurred && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg">
              <Button
                onClick={() => setShowAdvisoryDialog(true)}
                variant="default"
                size="lg"
                className="shadow-lg"
                data-testid="button-view-key-pickup"
              >
                <Lock className="h-4 w-4 mr-2" />
                View Key Pickup Instructions
              </Button>
            </div>
          )}
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

      <div className="flex gap-3 flex-wrap">
        {showEditButton && (
          <Button
            variant="outline"
            size="lg"
            onClick={openEditDialog}
            data-testid="button-edit-reservation"
          >
            Edit Reservation
          </Button>
        )}

        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="lg" data-testid="button-cancel-reservation">
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
                <AlertDialogCancel>Go Back</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="bg-destructive text-destructive-foreground"
                >
                  {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {isApproved && !isAdmin && (
          <div className="flex-1 space-y-1.5" data-testid="checkout-button-area">
            {isTimeAvailable ? (
              <a href={`/vehicle-checkout/${reservation.id}`}>
                <Button className="w-full" size="lg" data-testid="button-proceed-checkout">
                  Proceed to Check Out Vehicle
                </Button>
              </a>
            ) : (
              <>
                <Button
                  disabled
                  className="w-full opacity-50 cursor-not-allowed"
                  size="lg"
                  data-testid="button-proceed-checkout"
                >
                  Proceed to Check Out Vehicle
                </Button>
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1" data-testid="text-checkout-unlock-time">
                  <Lock className="h-3 w-3" />
                  Checkout opens {format(new Date(new Date(reservation.startDate).getTime() - 60 * 60 * 1000), "MMM d 'at' h:mm a")}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Safety Advisory Dialog ── */}
      <Dialog
        open={showAdvisoryDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAdvisoryDialog(false);
            setWarningChecked(false);
          }
        }}
      >
        <DialogContent className="max-w-lg" data-testid="dialog-advisory">
          <div className="flex flex-col items-center text-center pt-2 pb-1">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <ShieldAlert className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-red-700 dark:text-red-400">
              Important Safety Warning
            </h2>
          </div>

          <div className="rounded-md border border-red-500 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <OctagonX className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="font-bold text-red-800 dark:text-red-300 text-sm leading-snug">
                Do NOT operate this vehicle before completing checkout
              </p>
            </div>
            <ul className="space-y-2 pl-1">
              {[
                "Do not start or drive the vehicle",
                "Do not move or reposition the vehicle",
                "Do not enter the vehicle until you are ready to begin the checkout process",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                  <X className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md bg-muted/60 border px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <TriangleAlert className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
              <p>
                Checkout records your starting mileage, fuel level, and vehicle condition.
                Operating the vehicle before checkout will invalidate these readings and may result
                in a policy violation.
              </p>
            </div>
          </div>

          <div
            className="flex items-start gap-3 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3 cursor-pointer"
            onClick={() => setWarningChecked(!warningChecked)}
          >
            <Checkbox
              id="warning-checkbox"
              checked={warningChecked}
              onCheckedChange={(v) => setWarningChecked(v === true)}
              className="mt-0.5 border-red-500 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
              data-testid="checkbox-advisory"
            />
            <label
              htmlFor="warning-checkbox"
              className="text-sm font-medium leading-relaxed cursor-pointer text-red-800 dark:text-red-300 select-none"
            >
              I understand — I will <strong>NOT</strong> operate this vehicle until checkout is fully completed
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAdvisoryDialog(false);
                setWarningChecked(false);
              }}
              data-testid="button-advisory-back"
            >
              Go Back
            </Button>
            <Button
              disabled={!warningChecked || advisoryMutation.isPending}
              onClick={() => advisoryMutation.mutate()}
              className="bg-red-600 hover:bg-red-700 text-white flex-1"
              data-testid="button-advisory-confirm"
            >
              {advisoryMutation.isPending ? "Confirming..." : "I Understand, Show Key Instructions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Reservation Dialog ── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-edit-reservation">
          <DialogHeader>
            <DialogTitle>Edit Reservation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-purpose">Purpose</Label>
              <Input
                id="edit-purpose"
                value={editPurpose}
                onChange={(e) => setEditPurpose(e.target.value)}
                placeholder="Purpose of reservation"
                data-testid="input-edit-purpose"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-passengers">Passenger Count</Label>
              <Input
                id="edit-passengers"
                type="number"
                min={1}
                value={editPassengerCount}
                onChange={(e) => setEditPassengerCount(e.target.value)}
                data-testid="input-edit-passengers"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-start">Start Date & Time</Label>
              <Input
                id="edit-start"
                type="datetime-local"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                data-testid="input-edit-start"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-end">End Date & Time</Label>
              <Input
                id="edit-end"
                type="datetime-local"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                data-testid="input-edit-end"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Notes (optional)</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                data-testid="textarea-edit-notes"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={editMutation.isPending || !editPurpose || !editStartDate || !editEndDate}
              data-testid="button-save-edit"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
