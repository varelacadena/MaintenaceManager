import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import type { VehicleReservation, Vehicle } from "@shared/schema";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleReservationSchema, type InsertVehicleReservation } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MyReservations() {
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: reservations, isLoading } = useQuery<VehicleReservation[]>({
    queryKey: [`/api/vehicle-reservations?userId=${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles?status=available"],
  });

  const form = useForm<InsertVehicleReservation>({
    resolver: zodResolver(insertVehicleReservationSchema.omit({ userId: true })),
    defaultValues: {
      vehicleId: "",
      startDate: new Date(),
      endDate: new Date(),
      purpose: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<InsertVehicleReservation, "userId">) => {
      return await apiRequest("POST", "/api/vehicle-reservations", {
        ...data,
        userId: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/vehicle-reservations');
        }
      });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/vehicles');
        }
      });
      toast({
        title: "Success",
        description: "Reservation created successfully",
      });
      setCreateDialogOpen(false);
      form.reset();
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
      return await apiRequest("DELETE", `/api/vehicle-reservations/${reservationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/vehicle-reservations');
        }
      });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/vehicles');
        }
      });
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

  return (
    <div className="flex-1 space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">My Reservations</h2>
          <p className="text-muted-foreground">
            Manage your vehicle reservations
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-reservation">
              <Plus className="mr-2 h-4 w-4" />
              New Reservation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Reservation</DialogTitle>
              <DialogDescription>
                Reserve a vehicle for your upcoming trip
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vehicle">
                            <SelectValue placeholder="Select a vehicle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicles?.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.make} {vehicle.model} ({vehicle.vehicleId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <FormControl>
                          <Input
                            type="date"
                            min={new Date().toISOString().slice(0, 10)}
                            value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ""}
                            onChange={(e) => {
                              const currentTime = field.value ? new Date(field.value).toTimeString().slice(0, 5) : "09:00";
                              const newDateTime = new Date(`${e.target.value}T${currentTime}`);
                              field.onChange(newDateTime);
                            }}
                            data-testid="input-start-date"
                            className="cursor-pointer relative [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:z-10"
                          />
                        </FormControl>
                        <FormControl>
                          <Input
                            type="time"
                            value={field.value ? new Date(field.value).toTimeString().slice(0, 5) : ""}
                            onChange={(e) => {
                              const currentDate = field.value ? new Date(field.value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
                              const newDateTime = new Date(`${currentDate}T${e.target.value}`);
                              field.onChange(newDateTime);
                            }}
                            data-testid="input-start-time"
                            className="cursor-pointer relative [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:z-10"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <FormControl>
                          <Input
                            type="date"
                            min={form.watch("startDate") ? new Date(form.watch("startDate")).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}
                            value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ""}
                            onChange={(e) => {
                              const currentTime = field.value ? new Date(field.value).toTimeString().slice(0, 5) : "17:00";
                              const newDateTime = new Date(`${e.target.value}T${currentTime}`);
                              field.onChange(newDateTime);
                            }}
                            data-testid="input-end-date"
                            className="cursor-pointer relative [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:z-10"
                          />
                        </FormControl>
                        <FormControl>
                          <Input
                            type="time"
                            value={field.value ? new Date(field.value).toTimeString().slice(0, 5) : ""}
                            onChange={(e) => {
                              const currentDate = field.value ? new Date(field.value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
                              const newDateTime = new Date(`${currentDate}T${e.target.value}`);
                              field.onChange(newDateTime);
                            }}
                            data-testid="input-end-time"
                            className="cursor-pointer relative [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:z-10"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-purpose" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} data-testid="textarea-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-reservation">
                    {createMutation.isPending ? "Creating..." : "Create Reservation"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
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
      ) : reservations && reservations.length > 0 ? (
        <div className="space-y-4">
          {reservations.map((reservation) => {
            const vehicle = vehicles?.find(v => v.id === reservation.vehicleId);
            return (
              <Card key={reservation.id} data-testid={`card-reservation-${reservation.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg">
                          {vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle"}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(reservation.startDate), "MMM d, yyyy h:mm a")} -{" "}
                          {format(new Date(reservation.endDate), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    </div>
                    <Badge variant={reservation.status === "completed" ? "default" : "secondary"} data-testid={`badge-status-${reservation.id}`}>
                      {reservation.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Purpose:</span>
                    <span>{reservation.purpose}</span>
                  </div>
                  {reservation.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Notes: </span>
                      <span>{reservation.notes}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2">
                  {reservation.status === "pending" && (
                    <>
                      <Link href={`/vehicle-checkout/${reservation.id}`}>
                        <Button size="sm" data-testid={`button-checkout-${reservation.id}`}>
                          Check Out
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelMutation.mutate(reservation.id)}
                        disabled={cancelMutation.isPending}
                        data-testid={`button-cancel-${reservation.id}`}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No reservations</p>
            <p className="text-sm text-muted-foreground">
              Create your first reservation to get started
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}