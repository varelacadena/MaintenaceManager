import {
  Fuel, Sparkles, AlertTriangle,
  Navigation, CheckCircle, Wrench, CircleCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import type { VehicleCheckInContext } from "./useVehicleCheckIn";

interface SummaryStepProps {
  vehicle: NonNullable<VehicleCheckInContext["vehicle"]>;
  checkOutLog: NonNullable<VehicleCheckInContext["checkOutLog"]>;
  reservation: VehicleCheckInContext["reservation"];
  setInspSubStep: VehicleCheckInContext["setInspSubStep"];
  advanceStep: VehicleCheckInContext["advanceStep"];
  setLocation: VehicleCheckInContext["setLocation"];
}

export function SummaryStep({ vehicle, checkOutLog, reservation, setInspSubStep, advanceStep, setLocation }: SummaryStepProps) {
  return (
    <Card>
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Navigation className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <CardTitle className="text-xl">Welcome Back!</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Let's wrap up your trip. Here's a summary of your journey.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-md p-4 space-y-3">
          <p className="text-sm font-semibold">Trip Summary</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Vehicle</p>
              <p className="font-medium">{vehicle.make} {vehicle.model}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Vehicle ID</p>
              <p className="font-medium">{vehicle.vehicleId}</p>
            </div>
            {reservation && (
              <>
                <div>
                  <p className="text-muted-foreground text-xs">Reservation Start</p>
                  <p className="font-medium">{format(new Date(reservation.startDate), "MMM d 'at' h:mm a")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Reservation End</p>
                  <p className="font-medium">{format(new Date(reservation.endDate), "MMM d 'at' h:mm a")}</p>
                </div>
              </>
            )}
            <div>
              <p className="text-muted-foreground text-xs">Starting Mileage</p>
              <p className="font-medium">{checkOutLog.startMileage?.toLocaleString()} mi</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Fuel at Checkout</p>
              <p className="font-medium capitalize">{checkOutLog.fuelLevel || "N/A"}</p>
            </div>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Please ensure the vehicle is <strong>parked</strong>, <strong>clean</strong>, and has at least <strong>½ tank of fuel</strong> before completing your return inspection.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2 pt-1">
          <Button
            onClick={() => { setInspSubStep("mileage"); advanceStep("inspection"); }}
            className="w-full"
            data-testid="button-start-inspection"
          >
            Start Return Inspection
          </Button>
          <Button variant="outline" onClick={() => setLocation("/my-reservations")} className="w-full">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface CompleteStepProps {
  outcome: NonNullable<VehicleCheckInContext["outcome"]>;
  vehicle: NonNullable<VehicleCheckInContext["vehicle"]>;
  milesDriven: number;
  checkOutLog: NonNullable<VehicleCheckInContext["checkOutLog"]>;
  setLocation: VehicleCheckInContext["setLocation"];
}

export function CompleteStep({ outcome, vehicle, milesDriven, checkOutLog, setLocation }: CompleteStepProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center text-center py-10 gap-6">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CircleCheck className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-2xl font-bold">Vehicle Returned!</h3>
          <p className="text-muted-foreground mt-1">Thank you for completing your return inspection.</p>
        </div>

        <div className="w-full space-y-2">
          {outcome.hasIssues && (
            <Alert className="border-amber-500/50 bg-amber-500/10 text-left">
              <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                A <strong>high-priority maintenance task</strong> has been created for the admin team. The vehicle is flagged for review.
              </AlertDescription>
            </Alert>
          )}
          {outcome.fuelViolationAcknowledged && (
            <Alert className="border-red-500/50 bg-red-500/10 text-left">
              <Fuel className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200 text-sm">
                <strong>Low fuel return recorded</strong> on your account. Please return with at least ½ tank next time.
              </AlertDescription>
            </Alert>
          )}
          {outcome.cleanlinessViolationAcknowledged && (
            <Alert className="border-red-500/50 bg-red-500/10 text-left">
              <Sparkles className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200 text-sm">
                <strong>Unclean return recorded</strong> on your account. Please return the vehicle clean next time.
              </AlertDescription>
            </Alert>
          )}
          {!outcome.hasIssues && !outcome.fuelViolationAcknowledged && !outcome.cleanlinessViolationAcknowledged && (
            <Alert className="border-green-500/50 bg-green-500/10 text-left">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200 text-sm">
                Vehicle returned in good condition. It has been <strong>marked as available</strong> for the next reservation.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="w-full bg-muted/50 rounded-md p-4 text-left space-y-2">
          <p className="text-sm font-semibold">Trip Stats</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Vehicle</span>
            <span className="font-medium">{vehicle.make} {vehicle.model}</span>
            <span className="text-muted-foreground">Miles Driven</span>
            <span className="font-medium">{milesDriven.toLocaleString()} mi</span>
            <span className="text-muted-foreground">Returned</span>
            <span className="font-medium">{format(new Date(), "MMM d 'at' h:mm a")}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          {checkOutLog.reservationId && (
            <Button
              onClick={() => setLocation(`/vehicle-reservation-details/${checkOutLog.reservationId}`)}
              variant="outline"
              className="w-full"
              data-testid="button-view-details"
            >
              View Reservation Details
            </Button>
          )}
          <Button
            onClick={() => setLocation("/my-reservations")}
            variant="outline"
            className="w-full"
            data-testid="button-back-reservations"
          >
            Back to My Reservations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
