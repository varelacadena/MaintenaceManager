import {
  CircleCheck, Check, Camera, Sparkles, AlertTriangle, ImagePlus, Info,
  Gauge, Fuel, ChevronLeft, Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import {
  CHECKOUT_SUB_STEPS,
  getKeyPickupMethodLabel,
  type VehicleCheckOutContext,
} from "./useVehicleCheckOut";
import { FuelLevelSelector, SubStepDots } from "./CheckOutComponents";

export function CheckoutStep({ ctx }: { ctx: VehicleCheckOutContext }) {
  const {
    checkoutSubStep, subAnimClass, subStepIndex,
    coMileage, setCoMileage, coFuelLevel, setCoFuelLevel,
    coIsClean, setCoIsClean, coHasDamage, setCoHasDamage,
    coDamageNotes, setCoDamageNotes,
    dashPhoto, setDashPhoto, damagePhotos, setDamagePhotos,
    advanceSubStep, goBackSubStep, goBackStep,
    getUploadParameters, handleFileUpload, handleCheckoutSubmit,
    checkOutMutation, toast,
  } = ctx;
  return (
    <Card>
      <div className="px-6 pt-4">
        <SubStepDots total={CHECKOUT_SUB_STEPS.length} currentIndex={subStepIndex} />
      </div>
      <div className="overflow-hidden">
        <div className={`transition-all duration-300 ease-in-out ${subAnimClass}`}>
          <CardContent className="pt-2">

            {checkoutSubStep === "mileage" && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Gauge className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">What does the odometer show?</h3>
                  <p className="text-sm text-muted-foreground">Look at the odometer before starting the engine</p>
                </div>
                <div className="space-y-1">
                  <Input
                    type="number"
                    value={coMileage || ""}
                    onChange={(e) => setCoMileage(parseInt(e.target.value) || 0)}
                    className="text-center text-2xl font-bold h-14"
                    placeholder="0"
                    data-testid="input-start-mileage"
                  />
                  <p className="text-xs text-muted-foreground text-center">miles</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => advanceSubStep("fuel")}
                    disabled={!coMileage}
                    className="w-full"
                    data-testid="button-mileage-next"
                  >
                    Next
                  </Button>
                  <Button variant="ghost" onClick={() => goBackStep("responsibility")} className="w-full text-sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              </div>
            )}

            {checkoutSubStep === "fuel" && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Fuel className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">What's the current fuel level?</h3>
                  <p className="text-sm text-muted-foreground">Record the fuel level as it is right now</p>
                </div>
                <FuelLevelSelector value={coFuelLevel} onChange={setCoFuelLevel} />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => advanceSubStep("condition")}
                    disabled={!coFuelLevel}
                    className="w-full"
                    data-testid="button-fuel-next"
                  >
                    Next
                  </Button>
                  <Button variant="ghost" onClick={() => goBackSubStep("mileage")} className="w-full text-sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              </div>
            )}

            {checkoutSubStep === "condition" && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">Is the vehicle clean?</h3>
                  <p className="text-sm text-muted-foreground">Document the vehicle's current cleanliness</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCoIsClean(true)}
                    data-testid="condition-clean"
                    className={`flex flex-col items-center gap-3 p-5 rounded-md border-2 transition-all ${
                      coIsClean === true
                        ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                        : "border-muted hover-elevate"
                    }`}
                  >
                    <Sparkles className={`h-8 w-8 ${coIsClean === true ? "text-green-600" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${coIsClean === true ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
                      Yes, it's clean
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoIsClean(false)}
                    data-testid="condition-dirty"
                    className={`flex flex-col items-center gap-3 p-5 rounded-md border-2 transition-all ${
                      coIsClean === false
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                        : "border-muted hover-elevate"
                    }`}
                  >
                    <AlertTriangle className={`h-8 w-8 ${coIsClean === false ? "text-amber-600" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${coIsClean === false ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                      Needs cleaning
                    </span>
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => advanceSubStep("damage")}
                    disabled={coIsClean === null}
                    className="w-full"
                    data-testid="button-condition-next"
                  >
                    Next
                  </Button>
                  <Button variant="ghost" onClick={() => goBackSubStep("fuel")} className="w-full text-sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              </div>
            )}

            {checkoutSubStep === "damage" && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <ImagePlus className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">Any pre-existing damage?</h3>
                  <p className="text-sm text-muted-foreground">Document existing damage to protect yourself</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setCoHasDamage(false); setCoDamageNotes(""); }}
                    data-testid="damage-none"
                    className={`flex flex-col items-center gap-3 p-5 rounded-md border-2 transition-all ${
                      coHasDamage === false
                        ? "border-primary bg-primary/10"
                        : "border-muted hover-elevate"
                    }`}
                  >
                    <Check className={`h-8 w-8 ${coHasDamage === false ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${coHasDamage === false ? "text-primary" : "text-muted-foreground"}`}>
                      No damage
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoHasDamage(true)}
                    data-testid="damage-yes"
                    className={`flex flex-col items-center gap-3 p-5 rounded-md border-2 transition-all ${
                      coHasDamage === true
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                        : "border-muted hover-elevate"
                    }`}
                  >
                    <AlertTriangle className={`h-8 w-8 ${coHasDamage === true ? "text-amber-600" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${coHasDamage === true ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                      Yes, add notes
                    </span>
                  </button>
                </div>
                {coHasDamage === true && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Describe the damage</Label>
                    <Textarea
                      placeholder="e.g., Scratch on rear bumper, dent on passenger door..."
                      value={coDamageNotes}
                      onChange={(e) => setCoDamageNotes(e.target.value)}
                      className="min-h-[80px]"
                      data-testid="textarea-damage-notes"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => advanceSubStep("photos")}
                    disabled={coHasDamage === null || (coHasDamage === true && !coDamageNotes.trim())}
                    className="w-full"
                    data-testid="button-damage-next"
                  >
                    Next
                  </Button>
                  <Button variant="ghost" onClick={() => goBackSubStep("condition")} className="w-full text-sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              </div>
            )}

            {checkoutSubStep === "photos" && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Camera className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">Take your required photos</h3>
                  <p className="text-sm text-muted-foreground">Snap the odometer and fuel gauge — your starting proof</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-semibold text-sm">
                      Dash Photo <span className="text-destructive">*</span>
                    </Label>
                    {dashPhoto && <Check className="h-4 w-4 text-green-600 ml-auto" />}
                  </div>
                  {!dashPhoto ? (
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      onGetUploadParameters={getUploadParameters}
                      onComplete={(res) => handleFileUpload(res, "dash")}
                      onError={(err) => toast({ title: "Upload failed", description: err.message, variant: "destructive" })}
                      buttonClassName="w-full bg-amber-600 text-white"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Upload Dash Photo
                    </ObjectUploader>
                  ) : (
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800 flex items-center justify-between">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                        <Check className="h-4 w-4" /> {dashPhoto.fileName}
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => setDashPhoto(null)}>Remove</Button>
                    </div>
                  )}
                </div>

                {coHasDamage === true && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ImagePlus className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-semibold text-sm">
                        Damage Photos <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                      </Label>
                    </div>
                    <ObjectUploader
                      maxNumberOfFiles={5}
                      maxFileSize={10485760}
                      onGetUploadParameters={getUploadParameters}
                      onComplete={(res) => handleFileUpload(res, "damage")}
                      onError={(err) => toast({ title: "Upload failed", description: err.message, variant: "destructive" })}
                      buttonClassName="w-full bg-primary text-primary-foreground"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Upload Photos
                    </ObjectUploader>
                    {damagePhotos.length > 0 && (
                      <div className="space-y-2">
                        {damagePhotos.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm truncate flex-1">{file.fileName}</span>
                            <Button variant="ghost" size="sm" onClick={() => setDamagePhotos(damagePhotos.filter((_, i) => i !== index))}>Remove</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Documenting the starting condition protects you if any issues are disputed later.
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleCheckoutSubmit}
                    disabled={checkOutMutation.isPending || !dashPhoto}
                    className="w-full"
                    data-testid="button-submit-checkout"
                  >
                    {checkOutMutation.isPending ? "Checking Out..." : "Complete Checkout"}
                  </Button>
                  <Button variant="ghost" onClick={() => goBackSubStep("damage")} className="w-full text-sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </div>
      </div>
    </Card>
  );
}

export function CompleteStep({ ctx }: { ctx: VehicleCheckOutContext }) {
  const { vehicle, reservation, coMileage, reservationId, setLocation } = ctx;
  if (!vehicle || !reservation) return null;
  return (
    <Card>
      <CardContent className="flex flex-col items-center text-center py-10 gap-6">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CircleCheck className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-2xl font-bold">You're All Set!</h3>
          <p className="text-muted-foreground mt-1">Your vehicle checkout has been recorded. Have a safe trip!</p>
        </div>
        <div className="w-full bg-muted/50 rounded-md p-4 text-left space-y-2">
          <p className="text-sm font-semibold">Trip Details</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Vehicle</span>
            <span className="font-medium">{vehicle.make} {vehicle.model}</span>
            <span className="text-muted-foreground">Start Time</span>
            <span className="font-medium">{format(new Date(reservation.startDate), "MMM d 'at' h:mm a")}</span>
            <span className="text-muted-foreground">Starting Mileage</span>
            <span className="font-medium">{coMileage.toLocaleString()} mi</span>
          </div>
        </div>
        {reservation.keyPickupMethod && (
          <div className="w-full rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 p-4 text-left space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
              <Key className="h-4 w-4" />
              Key Pickup Reference
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">{getKeyPickupMethodLabel(reservation.keyPickupMethod)}</p>
            {reservation.adminNotes && (
              <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap">{reservation.adminNotes}</p>
            )}
          </div>
        )}
        <Alert className="w-full">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Remember: Return with <strong>½ tank or more</strong> of fuel and leave the vehicle clean.
          </AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 w-full">
          <Button
            onClick={() => setLocation(`/vehicle-reservation-details/${reservationId}`)}
            variant="outline"
            className="w-full"
            data-testid="button-view-details"
          >
            View Reservation Details
          </Button>
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
