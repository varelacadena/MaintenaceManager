import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar, Car, MapPin, Users, Plus, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import type { Vehicle } from "@shared/schema";

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [passengerCount, setPassengerCount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  const { data: reservations = [], isLoading } = useQuery<VehicleReservation[]>({
    queryKey: ["/api/vehicle-reservations/my"],
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    enabled: createDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/vehicle-reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create reservation");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-reservations/my"] });
      toast({
        title: "Success",
        description: "Reservation request submitted successfully",
      });
      setCreateDialogOpen(false);
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      setPassengerCount("");
      setPurpose("");
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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

  const handleCreateReservation = () => {
    if (!startDate || !startTime || !endDate || !endTime || !passengerCount || !purpose) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    createMutation.mutate({
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      passengerCount: parseInt(passengerCount),
      purpose,
      notes,
      status: "pending",
    });
  };

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
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 shrink-0"
            size="default"
          >
            <Plus className="h-4 w-4" />
            <span className="whitespace-nowrap">New Reservation</span>
          </Button>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Reservation</DialogTitle>
              <DialogDescription>
                Reserve a vehicle for your upcoming trip
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passengerCount">Number of Passengers *</Label>
                  <Input
                    id="passengerCount"
                    type="number"
                    min="1"
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose *</Label>
                <Input
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g., Trip to Washington"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateReservation}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Reservation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            <Button 
              onClick={() => {
                console.log("Navigating to /vehicles from empty state");
                setLocation("/vehicles");
              }} 
              size="sm"
            >
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