import {
  Gauge, Fuel, Sparkles, AlertTriangle,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FuelLevelSelector, SubStepDots } from "./CheckInComponents";
import { InspectionStepExtra } from "./CheckInInspectionStepExtra";
import type { VehicleCheckInContext } from "./useVehicleCheckIn";

type PhotoFile = { fileName: string; objectUrl: string; fileType: string; objectPath?: string };

export interface InspectionStepProps {
  activeSubSteps: VehicleCheckInContext["activeSubSteps"];
  inspSubStepIndex: number;
  inspAnimClass: string;
  inspSubStep: VehicleCheckInContext["inspSubStep"];
  ciMileage: number;
  setCiMileage: VehicleCheckInContext["setCiMileage"];
  checkOutLog: NonNullable<VehicleCheckInContext["checkOutLog"]>;
  milesDrivenPreview: number;
  advanceInspSubStep: VehicleCheckInContext["advanceInspSubStep"];
  goBackStep: VehicleCheckInContext["goBackStep"];
  goBackInspSubStep: VehicleCheckInContext["goBackInspSubStep"];
  ciFuelLevel: string;
  setCiFuelLevel: VehicleCheckInContext["setCiFuelLevel"];
  isLowFuel: boolean;
  fuelViolationAck: boolean;
  setFuelViolationAck: VehicleCheckInContext["setFuelViolationAck"];
  ciIsClean: boolean | null;
  setCiIsClean: VehicleCheckInContext["setCiIsClean"];
  isDirty: boolean;
  cleanlinessViolationAck: boolean;
  setCleanlinessViolationAck: VehicleCheckInContext["setCleanlinessViolationAck"];
  ciHasIssues: boolean | null;
  setCiHasIssues: VehicleCheckInContext["setCiHasIssues"];
  ciIssues: string;
  setCiIssues: VehicleCheckInContext["setCiIssues"];
  dashPhoto: PhotoFile | null;
  setDashPhoto: VehicleCheckInContext["setDashPhoto"];
  interiorPhoto: PhotoFile | null;
  setInteriorPhoto: VehicleCheckInContext["setInteriorPhoto"];
  damagePhotos: PhotoFile[];
  setDamagePhotos: VehicleCheckInContext["setDamagePhotos"];
  getUploadParameters: VehicleCheckInContext["getUploadParameters"];
  handleFileUpload: VehicleCheckInContext["handleFileUpload"];
  toast: VehicleCheckInContext["toast"];
  ciReturnNotes: string;
  setCiReturnNotes: VehicleCheckInContext["setCiReturnNotes"];
  hasLockbox: boolean;
  lockbox: VehicleCheckInContext["lockbox"];
  keyReturned: boolean;
  setKeyReturned: VehicleCheckInContext["setKeyReturned"];
  checkInMutation: VehicleCheckInContext["checkInMutation"];
  handleCheckInSubmit: VehicleCheckInContext["handleCheckInSubmit"];
}

export function InspectionStep(props: InspectionStepProps) {
  const {
    activeSubSteps, inspSubStepIndex, inspAnimClass, inspSubStep,
    ciMileage, setCiMileage, checkOutLog, milesDrivenPreview,
    advanceInspSubStep, goBackStep, goBackInspSubStep,
    ciFuelLevel, setCiFuelLevel, isLowFuel, fuelViolationAck, setFuelViolationAck,
    ciIsClean, setCiIsClean, isDirty, cleanlinessViolationAck, setCleanlinessViolationAck,
  } = props;

  return (
    <Card>
      <div className="px-6 pt-4">
        <SubStepDots total={activeSubSteps.length} currentIndex={inspSubStepIndex} />
      </div>
      <div className="overflow-hidden">
        <div className={`transition-all duration-300 ease-in-out ${inspAnimClass}`}>
          <CardContent className="pt-2">

            {inspSubStep === "mileage" && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Gauge className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">What's the ending mileage?</h3>
                  <p className="text-sm text-muted-foreground">Enter the current odometer reading</p>
                </div>
                <div className="space-y-1">
                  <Input
                    type="number"
                    value={ciMileage || ""}
                    onChange={(e) => setCiMileage(parseInt(e.target.value) || 0)}
                    className="text-center text-2xl font-bold h-14"
                    placeholder="0"
                    data-testid="input-end-mileage"
                  />
                  <p className="text-xs text-muted-foreground text-center">miles</p>
                </div>
                {ciMileage > 0 && milesDrivenPreview >= 0 && (
                  <div className="text-center p-3 bg-muted/50 rounded-md">
                    <p className="text-xs text-muted-foreground">Miles driven this trip</p>
                    <p className="text-xl font-bold">{milesDrivenPreview.toLocaleString()} mi</p>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => advanceInspSubStep("fuel")}
                    disabled={!ciMileage || ciMileage < (checkOutLog.startMileage || 0)}
                    className="w-full"
                    data-testid="button-mileage-next"
                  >
                    Next
                  </Button>
                  <Button variant="ghost" onClick={() => goBackStep("summary")} className="w-full text-sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              </div>
            )}

            {inspSubStep === "fuel" && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Fuel className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">What's the fuel level?</h3>
                  <p className="text-sm text-muted-foreground">Please refuel to at least ½ tank before returning</p>
                </div>
                <FuelLevelSelector value={ciFuelLevel} onChange={(v) => { setCiFuelLevel(v); setFuelViolationAck(false); }} />
                {isLowFuel && ciFuelLevel && (
                  <div className="space-y-2">
                    <Alert variant="destructive" className="py-2">
                      <Fuel className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        You agreed to return with at least ½ tank of fuel. Please refuel before completing check-in if possible.
                      </AlertDescription>
                    </Alert>
                    <div className="bg-muted/50 rounded-md p-3 flex items-start gap-2">
                      <Checkbox
                        id="fuel-violation-ack"
                        checked={fuelViolationAck}
                        onCheckedChange={(v) => setFuelViolationAck(v === true)}
                        data-testid="checkbox-fuel-violation"
                      />
                      <label htmlFor="fuel-violation-ack" className="text-xs leading-relaxed cursor-pointer text-muted-foreground">
                        I am unable to refuel at this time. I acknowledge this is a policy violation and understand it will be recorded on my account.
                      </label>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => advanceInspSubStep("cleanliness")}
                    disabled={!ciFuelLevel || (isLowFuel && !fuelViolationAck)}
                    className="w-full"
                    data-testid="button-fuel-next"
                  >
                    Next
                  </Button>
                  <Button variant="ghost" onClick={() => goBackInspSubStep("mileage")} className="w-full text-sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              </div>
            )}

            {inspSubStep === "cleanliness" && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">Is the vehicle clean?</h3>
                  <p className="text-sm text-muted-foreground">You agreed to return the vehicle clean</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setCiIsClean(true); setCleanlinessViolationAck(false); }}
                    data-testid="cleanliness-clean"
                    className={`flex flex-col items-center gap-3 p-5 rounded-md border-2 transition-all ${
                      ciIsClean === true
                        ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                        : "border-muted hover-elevate"
                    }`}
                  >
                    <Sparkles className={`h-8 w-8 ${ciIsClean === true ? "text-green-600" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${ciIsClean === true ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
                      Yes, it's clean
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCiIsClean(false); setCleanlinessViolationAck(false); }}
                    data-testid="cleanliness-dirty"
                    className={`flex flex-col items-center gap-3 p-5 rounded-md border-2 transition-all ${
                      ciIsClean === false
                        ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                        : "border-muted hover-elevate"
                    }`}
                  >
                    <AlertTriangle className={`h-8 w-8 ${ciIsClean === false ? "text-red-600" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${ciIsClean === false ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>
                      Needs cleaning
                    </span>
                  </button>
                </div>
                {isDirty && (
                  <div className="space-y-2">
                    <Alert variant="destructive" className="py-2">
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        You agreed to return the vehicle clean. Please clean it before completing check-in if possible.
                      </AlertDescription>
                    </Alert>
                    <div className="bg-muted/50 rounded-md p-3 flex items-start gap-2">
                      <Checkbox
                        id="cleanliness-violation-ack"
                        checked={cleanlinessViolationAck}
                        onCheckedChange={(v) => setCleanlinessViolationAck(v === true)}
                        data-testid="checkbox-cleanliness-violation"
                      />
                      <label htmlFor="cleanliness-violation-ack" className="text-xs leading-relaxed cursor-pointer text-muted-foreground">
                        I am unable to clean the vehicle at this time. I acknowledge this is a policy violation and will be recorded on my account.
                      </label>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => advanceInspSubStep("issues")}
                    disabled={ciIsClean === null || (isDirty && !cleanlinessViolationAck)}
                    className="w-full"
                    data-testid="button-cleanliness-next"
                  >
                    Next
                  </Button>
                  <Button variant="ghost" onClick={() => goBackInspSubStep("fuel")} className="w-full text-sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              </div>
            )}

            <InspectionStepExtra {...props} />

          </CardContent>
        </div>
      </div>
    </Card>
  );
}
