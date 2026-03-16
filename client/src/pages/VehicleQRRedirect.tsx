import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Car, Gauge, Fuel, Calendar, Wrench, AlertCircle, ArrowLeft } from "lucide-react";
import type { Vehicle, VehicleReservation, VehicleCheckOutLog, VehicleCheckInLog } from "@shared/schema";

export default function VehicleQRRedirect() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [redirected, setRedirected] = useState(false);

  const { data: vehicle, isLoading: vehicleLoading } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${id}`],
    enabled: !!id,
  });

  const { data: reservations, isLoading: reservationsLoading, error: reservationsError } = useQuery<VehicleReservation[]>({
    queryKey: ["/api/vehicle-reservations/my"],
    enabled: !!user && user.role !== "admin",
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: checkOutLogs, isLoading: logsLoading, error: logsError } = useQuery<VehicleCheckOutLog[]>({
    queryKey: ["/api/vehicle-checkout-logs"],
    enabled: !!user && user.role !== "admin",
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: checkInLogs, isLoading: checkInLogsLoading, error: checkInError } = useQuery<VehicleCheckInLog[]>({
    queryKey: ["/api/vehicle-checkin-logs"],
    enabled: !!user && user.role !== "admin",
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: maintenanceLogs } = useQuery({
    queryKey: [`/api/vehicles/${id}/maintenance-logs`],
    enabled: !!id && user?.role === "technician" && !redirected,
  });

  useEffect(() => {
    if (!user || user.role === "admin" || !id || redirected) return;
    if (reservationsLoading || logsLoading || checkInLogsLoading) return;

    const activeLog = (checkOutLogs || []).find((log: VehicleCheckOutLog) => {
      if (log.vehicleId !== id || log.userId !== user.id) return false;
      const hasCheckIn = (checkInLogs || []).some((ci: VehicleCheckInLog) => ci.checkOutLogId === log.id);
      return !hasCheckIn;
    });
    if (activeLog) {
      setRedirected(true);
      setLocation(`/vehicle-checkin/${activeLog.id}`);
      return;
    }

    const now = new Date();
    const approvedReservation = (reservations || []).find((r: VehicleReservation) => {
      if (r.vehicleId !== id) return false;
      if (r.status.toLowerCase() !== "approved") return false;
      const startTime = new Date(r.startDate);
      const endTime = new Date(r.endDate);
      const hoursBefore = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursBefore <= 24 && now <= endTime;
    });

    if (approvedReservation) {
      setRedirected(true);
      setLocation(`/vehicle-checkout/${approvedReservation.id}`);
      return;
    }
  }, [user, id, reservations, checkOutLogs, checkInLogs, reservationsLoading, logsLoading, checkInLogsLoading, redirected, setLocation]);

  if (vehicleLoading || reservationsLoading || logsLoading || checkInLogsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="loading-qr-redirect">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Looking up vehicle information...</p>
        </div>
      </div>
    );
  }

  const queryError = reservationsError || logsError || checkInError;
  if (queryError && !redirected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="qr-redirect-error">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground">Unable to load your reservation information. Please try again.</p>
            <Button onClick={() => window.location.reload()} data-testid="button-retry">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="vehicle-not-found">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Vehicle Not Found</h2>
            <p className="text-muted-foreground">This QR code does not match any vehicle in the system.</p>
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user?.role === "technician") {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-6" data-testid="vehicle-info-technician">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Vehicle Information</h1>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                {vehicle.year} {vehicle.make} {vehicle.model}
              </CardTitle>
              <Badge
                variant={vehicle.status === "available" ? "default" : "secondary"}
                data-testid="badge-vehicle-status"
              >
                {vehicle.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {vehicle.vin && (
                <div>
                  <p className="text-xs text-muted-foreground">VIN</p>
                  <p className="text-sm font-mono" data-testid="text-vin">{vehicle.vin}</p>
                </div>
              )}
              {vehicle.licensePlate && (
                <div>
                  <p className="text-xs text-muted-foreground">License Plate</p>
                  <p className="text-sm font-semibold" data-testid="text-license-plate">{vehicle.licensePlate}</p>
                </div>
              )}
              {vehicle.displayId && (
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle ID</p>
                  <p className="text-sm" data-testid="text-display-id">{vehicle.displayId}</p>
                </div>
              )}
              {vehicle.currentMileage != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Current Mileage</p>
                  <p className="text-sm flex items-center gap-1" data-testid="text-mileage">
                    <Gauge className="h-3.5 w-3.5" />
                    {Number(vehicle.currentMileage).toLocaleString()} mi
                  </p>
                </div>
              )}
              {vehicle.fuelType && (
                <div>
                  <p className="text-xs text-muted-foreground">Fuel Type</p>
                  <p className="text-sm flex items-center gap-1" data-testid="text-fuel-type">
                    <Fuel className="h-3.5 w-3.5" />
                    {vehicle.fuelType}
                  </p>
                </div>
              )}
              {vehicle.category && (
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm" data-testid="text-category">{vehicle.category}</p>
                </div>
              )}
              {vehicle.passengerCapacity != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Passenger Capacity</p>
                  <p className="text-sm" data-testid="text-capacity">{vehicle.passengerCapacity}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {Array.isArray(maintenanceLogs) && maintenanceLogs.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4" />
                Recent Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {maintenanceLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="flex items-start justify-between gap-2 py-2 border-b border-border/40 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{log.serviceType || log.description || "Service"}</p>
                      {log.notes && <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>}
                    </div>
                    {log.serviceDate && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.serviceDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No active reservation found for this vehicle.
            </p>
            <Button variant="outline" onClick={() => setLocation("/my-reservations")} data-testid="button-my-reservations">
              View My Reservations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]" data-testid="no-reservation-message">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-6 text-center space-y-4">
          <Car className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h2>
          <p className="text-muted-foreground">
            No active reservation found for this vehicle. If you have an upcoming reservation, please check back closer to your pickup time.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => setLocation("/my-reservations")} data-testid="button-my-reservations">
              View My Reservations
            </Button>
            <Button variant="outline" onClick={() => window.history.back()} data-testid="button-go-back">
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
