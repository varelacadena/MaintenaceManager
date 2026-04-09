import { Car } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useVehicleCheckIn } from "./useVehicleCheckIn";
import { StepProgress } from "./CheckInComponents";
import { SummaryStep, CompleteStep } from "./CheckInSteps";
import { InspectionStep } from "./CheckInInspectionStep";

export default function VehicleCheckIn() {
  const ctx = useVehicleCheckIn();

  const {
    step, vehicle, checkOutLog, isLoading, animationClass,
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

  if (!checkOutLog || !vehicle) {
    return (
      <div className="flex-1 space-y-4 p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Check-out log not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto">
      <div className="mb-2">
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Vehicle Check-In</h2>
        <p className="text-muted-foreground mt-0.5">{vehicle.make} {vehicle.model} ({vehicle.vehicleId})</p>
      </div>

      <StepProgress currentStep={step} />

      <div className="overflow-hidden">
        <div className={`transition-all duration-300 ease-in-out ${animationClass}`}>

          {step === "summary" && (
            <SummaryStep
              vehicle={vehicle}
              checkOutLog={checkOutLog}
              reservation={ctx.reservation}
              setInspSubStep={ctx.setInspSubStep}
              advanceStep={ctx.advanceStep}
              setLocation={ctx.setLocation}
            />
          )}

          {step === "inspection" && (
            <InspectionStep
              activeSubSteps={ctx.activeSubSteps}
              inspSubStepIndex={ctx.inspSubStepIndex}
              inspAnimClass={ctx.inspAnimClass}
              inspSubStep={ctx.inspSubStep}
              ciMileage={ctx.ciMileage}
              setCiMileage={ctx.setCiMileage}
              checkOutLog={checkOutLog}
              milesDrivenPreview={ctx.milesDrivenPreview}
              advanceInspSubStep={ctx.advanceInspSubStep}
              goBackStep={ctx.goBackStep}
              goBackInspSubStep={ctx.goBackInspSubStep}
              ciFuelLevel={ctx.ciFuelLevel}
              setCiFuelLevel={ctx.setCiFuelLevel}
              isLowFuel={ctx.isLowFuel}
              fuelViolationAck={ctx.fuelViolationAck}
              setFuelViolationAck={ctx.setFuelViolationAck}
              ciIsClean={ctx.ciIsClean}
              setCiIsClean={ctx.setCiIsClean}
              isDirty={ctx.isDirty}
              cleanlinessViolationAck={ctx.cleanlinessViolationAck}
              setCleanlinessViolationAck={ctx.setCleanlinessViolationAck}
              ciHasIssues={ctx.ciHasIssues}
              setCiHasIssues={ctx.setCiHasIssues}
              ciIssues={ctx.ciIssues}
              setCiIssues={ctx.setCiIssues}
              dashPhoto={ctx.dashPhoto}
              setDashPhoto={ctx.setDashPhoto}
              interiorPhoto={ctx.interiorPhoto}
              setInteriorPhoto={ctx.setInteriorPhoto}
              damagePhotos={ctx.damagePhotos}
              setDamagePhotos={ctx.setDamagePhotos}
              getUploadParameters={ctx.getUploadParameters}
              handleFileUpload={ctx.handleFileUpload}
              toast={ctx.toast}
              ciReturnNotes={ctx.ciReturnNotes}
              setCiReturnNotes={ctx.setCiReturnNotes}
              hasLockbox={ctx.hasLockbox}
              lockbox={ctx.lockbox}
              keyReturned={ctx.keyReturned}
              setKeyReturned={ctx.setKeyReturned}
              checkInMutation={ctx.checkInMutation}
              handleCheckInSubmit={ctx.handleCheckInSubmit}
            />
          )}

          {step === "complete" && ctx.outcome && (
            <CompleteStep
              outcome={ctx.outcome}
              vehicle={vehicle}
              milesDriven={ctx.milesDriven}
              checkOutLog={checkOutLog}
              setLocation={ctx.setLocation}
            />
          )}

        </div>
      </div>
    </div>
  );
}
