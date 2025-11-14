
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Car, User, Search, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format } from "date-fns";
import type { VehicleReservation, Vehicle, User as UserType } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const statusColors = {
  pending: "secondary",
  active: "default",
  completed: "default",
  cancelled: "destructive",
} as const;

export default function VehicleReservations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<VehicleReservation | null>(null);
  const [keyLocation, setKeyLocation] = useState<string>("");
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: reservations, isLoading: reservationsLoading } = useQuery<VehicleReservation[]>({
    queryKey: ["/api/vehicle-reservations"],
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ reservationId, keyLocation }: { reservationId: string; keyLocation: string }) => {
      // Update reservation status to approved
      await apiRequest("PATCH", `/api/vehicle-reservations/${reservationId}`, {
        status: "approved",
      });

      // Get reservation details to find the user
      const reservation = reservations?.find(r => r.id === reservationId);
      if (!reservation) throw new Error("Reservation not found");

      // Send message to the user
      const vehicle = vehicles?.find(v => v.id === reservation.vehicleId);
      const vehicleName = vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.vehicleId})` : "the vehicle";
      
      await apiRequest("POST", "/api/messages", {
        requestId: null,
        taskId: null,
        content: `Your vehicle reservation for ${vehicleName} has been approved!\n\nKey Location: ${keyLocation}\n\nReservation Details:\nStart: ${format(new Date(reservation.startDate), "MMM d, yyyy h:mm a")}\nEnd: ${format(new Date(reservation.endDate), "MMM d, yyyy h:mm a")}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/vehicle-reservations');
        }
      });
      toast({
        title: "Success",
        description: "Reservation approved and user notified",
      });
      setApproveDialogOpen(false);
      setKeyLocation("");
      setSelectedReservation(null);
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
    mutationFn: async ({ reservationId, reason }: { reservationId: string; reason: string }) => {
      // Update reservation status to cancelled
      await apiRequest("PATCH", `/api/vehicle-reservations/${reservationId}`, {
        status: "cancelled",
      });

      // Get reservation details
      const reservation = reservations?.find(r => r.id === reservationId);
      if (!reservation) throw new Error("Reservation not found");

      // Send message to the user
      const vehicle = vehicles?.find(v => v.id === reservation.vehicleId);
      const vehicleName = vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.vehicleId})` : "the vehicle";
      
      await apiRequest("POST", "/api/messages", {
        requestId: null,
        taskId: null,
        content: `Your vehicle reservation for ${vehicleName} has been cancelled.\n\nReason: ${reason}\n\nReservation Details:\nStart: ${format(new Date(reservation.startDate), "MMM d, yyyy h:mm a")}\nEnd: ${format(new Date(reservation.endDate), "MMM d, yyyy h:mm a")}\n\nPlease contact the maintenance department if you have any questions.`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/vehicle-reservations');
        }
      });
      toast({
        title: "Success",
        description: "Reservation cancelled and user notified",
      });
      setCancelDialogOpen(false);
      setCancellationReason("");
      setOtherReason("");
      setSelectedReservation(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (reservation: VehicleReservation) => {
    setSelectedReservation(reservation);
    setApproveDialogOpen(true);
  };

  const handleCancel = (reservation: VehicleReservation) => {
    setSelectedReservation(reservation);
    setCancelDialogOpen(true);
  };

  const submitApproval = () => {
    if (!selectedReservation || !keyLocation) {
      toast({
        title: "Error",
        description: "Please select a key location",
        variant: "destructive",
      });
      return;
    }
    approveMutation.mutate({
      reservationId: selectedReservation.id,
      keyLocation,
    });
  };

  const submitCancellation = () => {
    if (!selectedReservation || !cancellationReason) {
      toast({
        title: "Error",
        description: "Please select a cancellation reason",
        variant: "destructive",
      });
      return;
    }
    
    const finalReason = cancellationReason === "Other" ? otherReason : cancellationReason;
    
    if (cancellationReason === "Other" && !otherReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason",
        variant: "destructive",
      });
      return;
    }

    cancelMutation.mutate({
      reservationId: selectedReservation.id,
      reason: finalReason,
    });
  };

  const canManageReservations = user?.role === "admin" || user?.role === "maintenance";

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles?.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.vehicleId})` : "Unknown Vehicle";
  };

  const getUserName = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown User";
  };

  const filteredReservations = reservations?.filter(reservation => {
    const vehicleName = getVehicleName(reservation.vehicleId).toLowerCase();
    const userName = getUserName(reservation.userId).toLowerCase();
    const purpose = reservation.purpose.toLowerCase();
    
    const matchesSearch = 
      vehicleName.includes(searchTerm.toLowerCase()) ||
      userName.includes(searchTerm.toLowerCase()) ||
      purpose.includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || reservation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            All Vehicle Reservations
          </h2>
          <p className="text-muted-foreground">
            View and manage all vehicle reservations
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by vehicle, user, or purpose..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            data-testid="input-search-reservations"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reservationsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent className="animate-pulse space-y-2">
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredReservations && filteredReservations.length > 0 ? (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => (
            <Card key={reservation.id} data-testid={`card-reservation-${reservation.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">
                        {getVehicleName(reservation.vehicleId)}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        <span>{getUserName(reservation.userId)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusColors[reservation.status]} data-testid={`badge-status-${reservation.id}`}>
                    {reservation.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Dates:</span>
                  <span>
                    {format(new Date(reservation.startDate), "MMM d, yyyy h:mm a")} -{" "}
                    {format(new Date(reservation.endDate), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Purpose: </span>
                  <span>{reservation.purpose}</span>
                </div>
                {reservation.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Notes: </span>
                    <span>{reservation.notes}</span>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Created: </span>
                  <span>{format(new Date(reservation.createdAt), "MMM d, yyyy h:mm a")}</span>
                </div>
              </CardContent>
              {canManageReservations && reservation.status === "pending" && (
                <CardFooter className="flex gap-2">
                  <Button 
                    onClick={() => handleApprove(reservation)}
                    className="flex-1"
                    variant="default"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    onClick={() => handleCancel(reservation)}
                    className="flex-1"
                    variant="destructive"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No reservations found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "No vehicle reservations have been created yet"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Reservation</DialogTitle>
            <DialogDescription>
              Select where the user can find the vehicle keys
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Key Location</Label>
              <Select value={keyLocation} onValueChange={setKeyLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select key location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mailbox">Mailbox</SelectItem>
                  <SelectItem value="Inside the car">Inside the car</SelectItem>
                  <SelectItem value="In person">In person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitApproval} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "Approving..." : "Approve & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Reservation</DialogTitle>
            <DialogDescription>
              Select a reason for cancellation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cancellation Reason</Label>
              <Select value={cancellationReason} onValueChange={setCancellationReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unit out of service">Unit out of service</SelectItem>
                  <SelectItem value="Unit in maintenance">Unit in maintenance</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {cancellationReason === "Other" && (
              <div className="space-y-2">
                <Label>Please specify reason</Label>
                <Textarea
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Enter cancellation reason..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={submitCancellation} 
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
