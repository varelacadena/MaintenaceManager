import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import type { VehicleReservation, Vehicle, InsertVehicleCheckOutLog } from "@shared/schema";
import { insertVehicleCheckOutLogSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function VehicleCheckOut() {
  const { reservationId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: reservation, isLoading } = useQuery<VehicleReservation>({
    queryKey: [`/api/vehicle-reservations/${reservationId}`],
  });

  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${reservation?.vehicleId}`],
    enabled: !!reservation?.vehicleId,
  });

  const form = useForm<InsertVehicleCheckOutLog>({
    resolver: zodResolver(insertVehicleCheckOutLogSchema.omit({ userId: true, vehicleId: true, reservationId: true })),
    defaultValues: {
      checkOutDate: new Date(),
      startMileage: vehicle?.currentMileage || 0,
      startFuelLevel: 100,
      inspectionNotes: "",
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (data: Omit<InsertVehicleCheckOutLog, "userId" | "vehicleId" | "reservationId">) => {
      return await apiRequest("POST", "/api/vehicle-checkout-logs", {
        ...data,
        userId: user!.id,
        vehicleId: reservation!.vehicleId,
        reservationId: reservationId!,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0]?.toString();
          return key?.startsWith('/api/vehicle-checkout-logs') ||
                 key?.startsWith('/api/vehicles') ||
                 key?.startsWith('/api/vehicle-reservations') ||
                 key?.startsWith('/api/tasks');
        }
      });
      toast({
        title: "Success",
        description: "Vehicle checked out successfully",
      });
      setLocation("/my-reservations");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
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

  return (
    <div className="flex-1 space-y-4 p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/my-reservations">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Vehicle Check-Out</h2>
          <p className="text-muted-foreground">
            {vehicle.make} {vehicle.model} ({vehicle.vehicleId})
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pre-Departure Inspection</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => checkOutMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="checkOutDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-Out Date & Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        data-testid="input-checkout-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startMileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starting Mileage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-start-mileage"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startFuelLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starting Fuel Level (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-start-fuel"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inspectionNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inspection Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Document any existing damage or issues..."
                        data-testid="textarea-inspection-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Link href="/my-reservations">
                  <Button type="button" variant="outline" data-testid="button-cancel">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={checkOutMutation.isPending} data-testid="button-submit-checkout">
                  {checkOutMutation.isPending ? "Checking Out..." : "Complete Check-Out"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
