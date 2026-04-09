import { Car, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { useVehicleCheckOut } from "./useVehicleCheckOut";
import {
  StepProgress,
  AdvisoryPreAcceptStep,
  AdvisoryKeyRevealStep,
  SafetyStep,
  ResponsibilityStep,
  CheckoutStep,
  CompleteStep,
} from "./CheckOutComponents";

export default function VehicleCheckOut() {
  const ctx = useVehicleCheckOut();
  const {
    setLocation,
    step,
    advisoryAccepted,
    advisoryJustAccepted,
    reservation, isLoading, vehicle,
    withinTime,
    animationClass,
  } = ctx;

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

  if (!withinTime) {
    return (
      <div className="flex-1 p-4 max-w-2xl mx-auto">
        <div className="mb-2">
          <h2 className="text-2xl font-bold tracking-tight">Vehicle Check-Out</h2>
          <p className="text-muted-foreground mt-0.5">{vehicle.make} {vehicle.model} ({vehicle.vehicleId})</p>
        </div>
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center text-center py-12 gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold">Checkout Not Available Yet</h3>
              <p className="text-muted-foreground text-sm">
                Checkout opens on{" "}
                <span className="font-semibold text-foreground">
                  {format(new Date(new Date(reservation.startDate).getTime() - 60 * 60 * 1000), "EEEE, MMM d 'at' h:mm a")}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Please come back 1 hour before your reservation to begin checkout.
              </p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/my-reservations")} className="mt-2">
              Back to My Reservations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto">
      <div className="mb-2">
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Vehicle Check-Out</h2>
        <p className="text-muted-foreground mt-0.5">{vehicle.make} {vehicle.model} ({vehicle.vehicleId})</p>
      </div>

      <StepProgress currentStep={step} advisoryAlreadyAccepted={advisoryAccepted && step !== "advisory"} />

      <div className="overflow-hidden">
        <div className={`transition-all duration-300 ease-in-out ${animationClass}`}>
          {step === "advisory" && !advisoryJustAccepted && <AdvisoryPreAcceptStep ctx={ctx} />}
          {step === "advisory" && advisoryJustAccepted && <AdvisoryKeyRevealStep ctx={ctx} />}
          {step === "safety" && <SafetyStep ctx={ctx} />}
          {step === "responsibility" && <ResponsibilityStep ctx={ctx} />}
          {step === "checkout" && <CheckoutStep ctx={ctx} />}
          {step === "complete" && <CompleteStep ctx={ctx} />}
        </div>
      </div>
    </div>
  );
}
