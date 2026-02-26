import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Car, User, Search, Edit, ClipboardCheck } from "lucide-react";
import { Link } from "wouter";
import type { VehicleCheckInLog } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format } from "date-fns";
import type { VehicleReservation, Vehicle, User as UserType, VehicleCheckOutLog } from "@shared/schema";
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

const statusColors: Record<string, "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  approved: "secondary",
  active: "default",
  completed: "default",
  cancelled: "destructive",
};

export function VehicleReservationsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [handoffDialogOpen, setHandoffDialogOpen] = useState(false);
  const [selectedReservationForHandoff, setSelectedReservationForHandoff] = useState<string | null>(null);
  const [keyPickupMethod, setKeyPickupMethod] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedReservationForEdit, setSelectedReservationForEdit] = useState<VehicleReservation | null>(null);
  const [editPurpose, setEditPurpose] = useState<string>("");
  const [editPassengerCount, setEditPassengerCount] = useState<number>(1);
  const [editNotes, setEditNotes] = useState<string>("");
  const [editVehicleId, setEditVehicleId] = useState<string>("");
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [editStartTime, setEditStartTime] = useState<string>("");
  const [editEndDate, setEditEndDate] = useState<string>("");
  const [editEndTime, setEditEndTime] = useState<string>("");
  const [editKeyPickupMethod, setEditKeyPickupMethod] = useState<string>("");
  const [editAdminNotes, setEditAdminNotes] = useState<string>("");
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

  const editReservationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReservationForEdit) return;
      
      // Combine date and time for start and end
      const startDateTime = new Date(`${editStartDate}T${editStartTime}`);
      const endDateTime = new Date(`${editEndDate}T${editEndTime}`);

      return await apiRequest("PATCH", `/api/vehicle-reservations/${selectedReservationForEdit.id}`, {
        purpose: editPurpose,
        passengerCount: editPassengerCount,
        notes: editNotes,
        vehicleId: editVehicleId && editVehicleId !== "unassigned" ? editVehicleId : null,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        keyPickupMethod: editKeyPickupMethod && editKeyPickupMethod !== "not_specified" ? editKeyPickupMethod : null,
        adminNotes: editAdminNotes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-reservations"] });
      toast({
        title: "Success",
        description: "Reservation updated successfully. The user will be notified.",
      });
      setEditDialogOpen(false);
      setSelectedReservationForEdit(null);
      setEditPurpose("");
      setEditPassengerCount(1);
      setEditNotes("");
      setEditVehicleId("");
      setEditStartDate("");
      setEditStartTime("");
      setEditEndDate("");
      setEditEndTime("");
      setEditKeyPickupMethod("");
      setEditAdminNotes("");
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

  const { data: checkInLogs } = useQuery<VehicleCheckInLog[]>({
    queryKey: ["/api/vehicle-checkin-logs"],
  });

  const { data: checkOutLogs } = useQuery<VehicleCheckOutLog[]>({
    queryKey: ["/api/vehicle-checkout-logs"],
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
  })?.sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reservations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            data-testid="input-search-reservations"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-status-filter">
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
        <div className="space-y-3">
          {filteredReservations.map((reservation) => (
            <Card key={reservation.id} data-testid={`card-reservation-${reservation.id}`} className={reservation.status === "pending" ? "ring-1 ring-primary/30 bg-primary/[0.03]" : ""}>
              <CardContent className="pt-4 pb-3 px-4 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-semibold text-sm truncate">{getVehicleName(reservation.vehicleId)}</span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <User className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{getUserName(reservation.userId)}</span>
                  </div>
                  <Badge variant={statusColors[reservation.status]} data-testid={`badge-status-${reservation.id}`}>
                    {reservation.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>
                    {format(new Date(reservation.startDate), "MMM d, yyyy h:mm a")} &ndash; {format(new Date(reservation.endDate), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span><span className="text-muted-foreground">Purpose: </span>{reservation.purpose}</span>
                  <span><span className="text-muted-foreground">Passengers: </span>{reservation.passengerCount}</span>
                  {reservation.notes && (
                    <span><span className="text-muted-foreground">Notes: </span>{reservation.notes}</span>
                  )}
                </div>
                {reservation.status === "cancelled" && (
                  <div className="text-xs p-2 bg-destructive/10 rounded-md">
                    <span className="text-destructive font-semibold">Cancelled</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-2 flex-wrap pt-0 pb-3 px-4">
                {reservation.status === "pending" && (
                  <>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-500/20 text-blue-700 dark:text-blue-300"
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
                                {vehicles
                                  ?.filter((vehicle) =>
                                    vehicle.passengerCapacity &&
                                    vehicle.passengerCapacity >= reservation.passengerCount
                                  )
                                  .map((vehicle) => (
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
                          className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
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
                            className="bg-destructive text-destructive-foreground"
                          >
                            Cancel Reservation
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
                {(reservation.status === "pending" || reservation.status === "approved") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedReservationForEdit(reservation);
                      setEditPurpose(reservation.purpose);
                      setEditPassengerCount(reservation.passengerCount);
                      setEditNotes(reservation.notes || "");
                      setEditVehicleId(reservation.vehicleId || "");
                      
                      // Parse dates and times
                      const startDate = new Date(reservation.startDate);
                      const endDate = new Date(reservation.endDate);
                      setEditStartDate(format(startDate, "yyyy-MM-dd"));
                      setEditStartTime(format(startDate, "HH:mm"));
                      setEditEndDate(format(endDate, "yyyy-MM-dd"));
                      setEditEndTime(format(endDate, "HH:mm"));
                      
                      setEditKeyPickupMethod(reservation.keyPickupMethod || "");
                      setEditAdminNotes(reservation.adminNotes || "");
                      setEditDialogOpen(true);
                    }}
                    data-testid={`button-edit-${reservation.id}`}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                {reservation.status === "completed" && (() => {
                  const checkOutLog = checkOutLogs?.find(log => log.reservationId === reservation.id);
                  if (!checkOutLog) return null;
                  const checkInLog = checkInLogs?.find(log => log.checkOutLogId === checkOutLog.id);
                  if (checkInLog) {
                    return (
                      <Link href={`/vehicle-checkin-verify/${checkInLog.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500/20 text-green-700 dark:text-green-300"
                          data-testid={`button-verify-checkin-${reservation.id}`}
                        >
                          <ClipboardCheck className="h-4 w-4 mr-1" />
                          Verify Check-In
                        </Button>
                      </Link>
                    );
                  }
                  return null;
                })()}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${reservation.id}`}
                    >
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
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
                        className="bg-destructive text-destructive-foreground"
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Reservation</DialogTitle>
            <DialogDescription>
              Make changes to the reservation. The user will be notified of any updates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-vehicle">Assigned Vehicle</Label>
              <Select value={editVehicleId} onValueChange={setEditVehicleId}>
                <SelectTrigger id="edit-vehicle">
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {vehicles
                    ?.filter((vehicle) =>
                      vehicle.passengerCapacity &&
                      vehicle.passengerCapacity >= editPassengerCount
                    )
                    .map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} ({vehicle.vehicleId}) - Capacity: {vehicle.passengerCapacity}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="cursor-pointer block [appearance:none] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 relative"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-start-time">Start Time</Label>
                <Input
                  id="edit-start-time"
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="cursor-pointer block [appearance:none] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 relative"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-end-date">End Date</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="cursor-pointer block [appearance:none] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 relative"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-end-time">End Time</Label>
                <Input
                  id="edit-end-time"
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="cursor-pointer block [appearance:none] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 relative"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-purpose">Purpose</Label>
              <Input
                id="edit-purpose"
                value={editPurpose}
                onChange={(e) => setEditPurpose(e.target.value)}
                placeholder="Trip purpose"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-passengers">Number of Passengers</Label>
              <Input
                id="edit-passengers"
                type="number"
                min={1}
                value={editPassengerCount}
                onChange={(e) => setEditPassengerCount(parseInt(e.target.value))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-key-pickup">Key Pickup Method</Label>
              <Select value={editKeyPickupMethod} onValueChange={setEditKeyPickupMethod}>
                <SelectTrigger id="edit-key-pickup">
                  <SelectValue placeholder="Select pickup method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_specified">Not specified</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="mailbox">Mailbox</SelectItem>
                  <SelectItem value="inside_vehicle">Inside the Vehicle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-admin-notes">Key Location Details</Label>
              <Textarea
                id="edit-admin-notes"
                placeholder="Provide specific instructions about key location..."
                value={editAdminNotes}
                onChange={(e) => setEditAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">User Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional notes from user..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedReservationForEdit(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => editReservationMutation.mutate()}
              disabled={editReservationMutation.isPending || !editStartDate || !editStartTime || !editEndDate || !editEndTime}
            >
              {editReservationMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function VehicleReservations() {
  return (
    <div className="flex-1 space-y-4 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-page-title">
            All Vehicle Reservations
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            View and manage all vehicle reservations
          </p>
        </div>
      </div>
      <VehicleReservationsContent />
    </div>
  );
}