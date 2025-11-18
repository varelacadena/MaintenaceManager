import { useParams, Link as RouterLink } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Car, Calendar, ClipboardList, QrCode, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import type { Vehicle, VehicleReservation, VehicleCheckOutLog, VehicleCheckInLog } from "@shared/schema";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import QRCode from "react-qr-code";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/api";
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

const statusColors = {
  available: "default",
  reserved: "secondary",
  in_use: "default",
  needs_maintenance: "destructive",
  needs_cleaning: "secondary",
  out_of_service: "destructive",
} as const;

export default function VehicleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteVehicleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Vehicle deleted successfully" });
      navigate("/vehicles");
    },
    onError: () => {
      toast({ title: "Failed to delete vehicle", variant: "destructive" });
    },
  });

  const { data: vehicle, isLoading } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${id}`],
  });

  const { data: reservations } = useQuery<VehicleReservation[]>({
    queryKey: [`/api/vehicle-reservations?vehicleId=${id}`],
  });

  const { data: checkOutLogs } = useQuery<VehicleCheckOutLog[]>({
    queryKey: [`/api/vehicle-checkout-logs?vehicleId=${id}`],
  });

  const { data: checkInLogs } = useQuery<VehicleCheckInLog[]>({
    queryKey: [`/api/vehicle-checkin-logs?vehicleId=${id}`],
  });

  const canManageVehicles = user?.role === "admin" || user?.role === "maintenance";

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

  if (!vehicle) {
    return (
      <div className="flex-1 space-y-4 p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Vehicle not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const qrCodeUrl = `${window.location.origin}/vehicles/${vehicle.id}`;

  return (
    <div className="flex-1 space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <RouterLink href="/vehicles">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </RouterLink>
          <div>
            <h2 className="text-3xl font-bold tracking-tight" data-testid="text-vehicle-name">
              {vehicle.make} {vehicle.model}
            </h2>
            <p className="text-muted-foreground">{vehicle.year} • {vehicle.vehicleId}</p>
          </div>
        </div>
        {canManageVehicles && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/vehicles/${id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-delete-vehicle">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this vehicle and all associated data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteVehicleMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-delete-vehicle"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="reservations" data-testid="tab-reservations">Reservations</TabsTrigger>
          <TabsTrigger value="logbook" data-testid="tab-logbook">Logbook</TabsTrigger>
          <TabsTrigger value="qr-code" data-testid="tab-qr-code">QR Code</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={statusColors[vehicle.status]} data-testid="badge-status">
                    {vehicle.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">VIN</span>
                  <span className="text-sm font-medium">{vehicle.vin || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">License Plate</span>
                  <span className="text-sm font-medium">{vehicle.licensePlate || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <span className="text-sm font-medium">{vehicle.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fuel Type</span>
                  <span className="text-sm font-medium">{vehicle.fuelType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Passenger Capacity</span>
                  <span className="text-sm font-medium">{vehicle.passengerCapacity}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mileage & Maintenance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Mileage</span>
                  <span className="text-sm font-medium" data-testid="text-mileage">
                    {vehicle.currentMileage?.toLocaleString()} mi
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Color</span>
                  <span className="text-sm font-medium">{vehicle.color || "N/A"}</span>
                </div>
                {vehicle.notes && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm text-muted-foreground">Notes</span>
                      <p className="text-sm mt-1">{vehicle.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reservations" className="space-y-4">
          {reservations && reservations.length > 0 ? (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <Card key={reservation.id} data-testid={`card-reservation-${reservation.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {format(new Date(reservation.startDate), "MMM d, yyyy")} - {format(new Date(reservation.endDate), "MMM d, yyyy")}
                      </CardTitle>
                      <Badge variant={reservation.status === "completed" ? "default" : "secondary"}>
                        {reservation.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Purpose</span>
                      <span>{reservation.purpose}</span>
                    </div>
                    {reservation.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes: </span>
                        <span>{reservation.notes}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No reservations</p>
                <p className="text-sm text-muted-foreground">
                  No reservations have been made for this vehicle
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logbook" className="space-y-4">
          {checkOutLogs && checkOutLogs.length > 0 ? (
            <div className="space-y-4">
              {checkOutLogs.map((log) => {
                const checkInLog = checkInLogs?.find(cil => cil.checkOutLogId === log.id);
                return (
                  <Card key={log.id} data-testid={`card-checkout-log-${log.id}`}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {format(new Date(log.checkOutDate), "MMM d, yyyy h:mm a")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Check-Out</p>
                          <p className="text-sm font-medium">Mileage: {log.startMileage} mi</p>
                          <p className="text-sm font-medium">Fuel: {log.startFuelLevel}%</p>
                        </div>
                        {checkInLog && (
                          <div>
                            <p className="text-sm text-muted-foreground">Check-In</p>
                            <p className="text-sm font-medium">Mileage: {checkInLog.endMileage} mi</p>
                            <p className="text-sm font-medium">Fuel: {checkInLog.endFuelLevel}%</p>
                          </div>
                        )}
                      </div>
                      {log.inspectionNotes && (
                        <div>
                          <p className="text-sm text-muted-foreground">Inspection Notes</p>
                          <p className="text-sm">{log.inspectionNotes}</p>
                        </div>
                      )}
                      {checkInLog?.issues && (
                        <div>
                          <p className="text-sm text-muted-foreground">Issues Reported</p>
                          <p className="text-sm text-destructive">{checkInLog.issues}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No logbook entries</p>
                <p className="text-sm text-muted-foreground">
                  Check-out and check-in logs will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="qr-code" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle QR Code</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCode
                  value={qrCodeUrl}
                  size={256}
                  data-testid="qr-code"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code to quickly access this vehicle's details
              </p>
              <Button variant="outline" onClick={() => window.print()} data-testid="button-print-qr">
                <QrCode className="h-4 w-4 mr-2" />
                Print QR Code
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}