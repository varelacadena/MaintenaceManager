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
import { apiRequest } from "@/lib/queryClient";
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
      <div className="space-y-4 sm:space-y-6 pb-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="space-y-4 sm:space-y-6 pb-6">
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
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header Section - Mobile Optimized */}
      <div className="space-y-3 sm:space-y-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <RouterLink href="/vehicles">
            <Button variant="ghost" size="icon" data-testid="button-back" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </RouterLink>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate" data-testid="text-vehicle-name">
              {vehicle.make} {vehicle.model}
            </h2>
            <p className="text-sm text-muted-foreground truncate">{vehicle.year} • {vehicle.vehicleId}</p>
          </div>
        </div>

        {/* Action Buttons - Full width on mobile, inline on desktop */}
        {canManageVehicles && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => navigate(`/vehicles/${id}/edit`)} className="w-full sm:w-auto">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-delete-vehicle" className="w-full sm:w-auto">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this vehicle and all associated data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto mt-0">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteVehicleMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="reservations" className="text-xs sm:text-sm">Reservations</TabsTrigger>
          <TabsTrigger value="logbook" className="text-xs sm:text-sm">Logbook</TabsTrigger>
          <TabsTrigger value="qr-code" className="text-xs sm:text-sm">QR Code</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={statusColors[vehicle.status]} className="text-xs">
                    {vehicle.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-start gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">VIN</span>
                  <span className="font-mono text-xs sm:text-sm text-right break-all">{vehicle.vin || "N/A"}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">License Plate</span>
                  <span className="font-mono text-sm">{vehicle.licensePlate || "N/A"}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <span className="text-sm">{vehicle.category}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">Fuel Type</span>
                  <span className="text-sm">{vehicle.fuelType}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">Passenger Capacity</span>
                  <span className="text-sm">{vehicle.passengerCapacity}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Mileage & Maintenance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">Current Mileage</span>
                  <span className="text-sm" data-testid="text-mileage">
                    {vehicle.currentMileage?.toLocaleString()} mi
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">Color</span>
                  <span className="text-sm">{vehicle.color || "N/A"}</span>
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
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <CardTitle className="text-sm sm:text-base md:text-lg">
                        {format(new Date(reservation.startDate), "MMM d, yyyy")} - {format(new Date(reservation.endDate), "MMM d, yyyy")}
                      </CardTitle>
                      <Badge variant={reservation.status === "completed" ? "default" : "secondary"} className="text-xs self-start sm:self-auto">
                        {reservation.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-start gap-2 text-sm">
                      <span className="text-muted-foreground shrink-0">Purpose</span>
                      <span className="text-right break-words">{reservation.purpose}</span>
                    </div>
                    {reservation.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes: </span>
                        <span className="break-words">{reservation.notes}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                <p className="text-base sm:text-lg font-medium">No reservations</p>
                <p className="text-sm text-muted-foreground text-center">This vehicle has no reservations yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logbook" className="space-y-4 sm:space-y-6">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Check-Out Logs</h3>
              {checkOutLogs && checkOutLogs.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {checkOutLogs.map((log) => (
                    <Card key={log.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm sm:text-base">
                          {log.checkOutDate ? format(new Date(log.checkOutDate), "MMM d, yyyy h:mm a") : "Date unavailable"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Check-Out</p>
                            <p className="text-sm font-medium">Mileage: {log.startMileage} mi</p>
                            <p className="text-sm font-medium">Fuel: {log.startFuelLevel}%</p>
                          </div>
                        </div>
                        {log.inspectionNotes && (
                          <div>
                            <p className="text-sm text-muted-foreground">Inspection Notes</p>
                            <p className="text-sm">{log.inspectionNotes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
                    <p className="text-sm text-muted-foreground">No check-out logs</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Check-In Logs</h3>
              {checkInLogs && checkInLogs.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {checkInLogs.map((log) => {
                    const checkInLog = checkOutLogs?.find(cil => cil.checkOutLogId === log.id);
                    return (
                      <Card key={log.id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm sm:text-base">
                            {log.checkInDate ? format(new Date(log.checkInDate), "MMM d, yyyy h:mm a") : "Date unavailable"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Check-In</p>
                              <p className="text-sm font-medium">Mileage: {log.endMileage} mi</p>
                              <p className="text-sm font-medium">Fuel: {log.endFuelLevel}%</p>
                            </div>
                            {checkInLog && (
                              <div>
                                {checkInLog.issues && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">Issues Reported</p>
                                    <p className="text-sm text-destructive">{checkInLog.issues}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
                    <p className="text-sm text-muted-foreground">No check-in logs</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="qr-code" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Vehicle QR Code</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Scan this QR code to quickly access this vehicle's details
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6 sm:py-8 px-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCode
                  value={qrCodeUrl}
                  size={Math.min(200, window.innerWidth - 100)}
                  data-testid="qr-code"
                />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-4 text-center break-words">
                {vehicle.make} {vehicle.model} ({vehicle.vehicleId})
              </p>
              <Button variant="outline" onClick={() => window.print()} data-testid="button-print-qr" className="mt-4">
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