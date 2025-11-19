import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Car, User, Search } from "lucide-react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const statusColors = {
  pending: "secondary",
  active: "default",
  completed: "default",
  cancelled: "destructive",
} as const;

export default function VehicleReservations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [handoffDialogOpen, setHandoffDialogOpen] = useState(false);
  const [selectedReservationForHandoff, setSelectedReservationForHandoff] = useState<string | null>(null);
  const [keyPickupMethod, setKeyPickupMethod] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const { toast } = useToast();

  const { data: reservations, isLoading: reservationsLoading } = useQuery<VehicleReservation[]>({
    queryKey: ["/api/vehicle-reservations"],
  });

  const approveMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      return await apiRequest("PATCH", `/api/vehicle-reservations/${reservationId}`, {
        status: "active",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-reservations"] });
      toast({
        title: "Success",
        description: "Reservation approved successfully",
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

  const cancelMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      return await apiRequest("PATCH", `/api/vehicle-reservations/${reservationId}`, {
        status: "cancelled",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-reservations"] });
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

  const deleteMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      return await apiRequest("DELETE", `/api/vehicle-reservations/${reservationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-reservations"] });
      toast({
        title: "Success",
        description: "Reservation deleted successfully",
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

  const assignVehicleMutation = useMutation({
    mutationFn: async ({ reservationId, vehicleId }: { reservationId: string; vehicleId: string }) => {
      return await apiRequest("PATCH", `/api/vehicle-reservations/${reservationId}`, {
        vehicleId,
        status: "approved",
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-reservations"] });
      setSelectedReservationForHandoff(variables.reservationId);
      setHandoffDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveHandoffDetailsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReservationForHandoff) return;
      return await apiRequest("PATCH", `/api/vehicle-reservations/${selectedReservationForHandoff}`, {
        keyPickupMethod,
        adminNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-reservations"] });
      toast({
        title: "Success",
        description: "Handoff details saved successfully",
      });
      setHandoffDialogOpen(false);
      setKeyPickupMethod("");
      setAdminNotes("");
      setSelectedReservationForHandoff(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const getVehicleName = (vehicleId: string | null) => {
    if (!vehicleId) return "Not assigned";
    const vehicle = vehicles?.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.vehicleId})` : "Unknown Vehicle";
  };

  const getUserName = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown User";
  };

  const filteredReservations = reservations?.filter(reservation => {
    const vehicleName = reservation.vehicleId ? getVehicleName(reservation.vehicleId).toLowerCase() : "not assigned";
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
                <div className="text-sm">
                  <span className="text-muted-foreground">Passengers: </span>
                  <span>{reservation.passengerCount}</span>
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
              <CardFooter className="flex gap-2">
                {reservation.status === "pending" && (
                  <>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10"
                          data-testid={`button-assign-vehicle-${reservation.id}`}
                        >
                          Assign Vehicle
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Assign Vehicle</DialogTitle>
                          <DialogDescription>
                            Select a vehicle for this reservation.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="vehicle" className="text-right">
                              Vehicle
                            </Label>
                            <Select onValueChange={(value) => assignVehicleMutation.mutate({ reservationId: reservation.id, vehicleId: value })} disabled={assignVehicleMutation.isPending}>
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a vehicle" />
                              </SelectTrigger>
                              <SelectContent>
                                {vehicles?.map((vehicle) => (
                                  <SelectItem key={vehicle.id} value={vehicle.id}>
                                    {vehicle.make} {vehicle.model} ({vehicle.vehicleId}) - Capacity: {vehicle.passengerCapacity}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" onClick={() => assignVehicleMutation.mutate({ reservationId: reservation.id, vehicleId: "" })} disabled={assignVehicleMutation.isPending}>
                            Save changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20 hover:bg-red-500/20"
                          data-testid={`button-cancel-${reservation.id}`}
                        >
                          Cancel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Reservation</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel this reservation? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Go Back</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => cancelMutation.mutate(reservation.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Cancel Reservation
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      data-testid={`button-delete-${reservation.id}`}
                    >
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this reservation? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Go Back</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(reservation.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Reservation
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
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

      <Dialog open={handoffDialogOpen} onOpenChange={setHandoffDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reservation Handoff Details</DialogTitle>
            <DialogDescription>
              Provide pickup instructions and additional details for the requestor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="key-pickup">Key Pickup Method</Label>
              <Select value={keyPickupMethod} onValueChange={setKeyPickupMethod}>
                <SelectTrigger id="key-pickup">
                  <SelectValue placeholder="Select pickup method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="mailbox">Mailbox</SelectItem>
                  <SelectItem value="inside_vehicle">Inside the Vehicle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-notes">Additional Details</Label>
              <Textarea
                id="admin-notes"
                placeholder="Enter any custom instructions or notes..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setHandoffDialogOpen(false);
                setKeyPickupMethod("");
                setAdminNotes("");
                setSelectedReservationForHandoff(null);
              }}
            >
              Skip
            </Button>
            <Button
              onClick={() => saveHandoffDetailsMutation.mutate()}
              disabled={saveHandoffDetailsMutation.isPending}
            >
              {saveHandoffDetailsMutation.isPending ? "Saving..." : "Save Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}