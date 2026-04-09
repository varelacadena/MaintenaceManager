import {
  Camera, MapPin, Check,
  Gauge, Fuel, Sparkles, AlertTriangle, MessageSquare, ImagePlus,
  CheckCircle, Wrench, ChevronLeft, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FuelLevelSelector, SubStepDots } from "./CheckInComponents";
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
    ciHasIssues, setCiHasIssues, ciIssues, setCiIssues,
    dashPhoto, setDashPhoto, interiorPhoto, setInteriorPhoto,
    damagePhotos, setDamagePhotos, getUploadParameters, handleFileUpload, toast,
    ciReturnNotes, setCiReturnNotes, hasLockbox, lockbox,
    keyReturned, setKeyReturned, checkInMutation, handleCheckInSubmit,
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

            {inspSubStep === "issues" && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wrench className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">Any mechanical issues?</h3>
                  <p className="text-sm text-muted-foreground">Report problems, damage, or safety concerns</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setCiHasIssues(false); setCiIssues(""); }}
                    data-testid="issues-none"
                    className={`flex flex-col items-center gap-3 p-5 rounded-md border-2 transition-all ${
                      ciHasIssues === false
                        ? "border-primary bg-primary/10"
                        : "border-muted hover-elevate"
                    }`}
                  >
                    <CheckCircle className={`h-8 w-8 ${ciHasIssues === false ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${ciHasIssues === false ? "text-primary" : "text-muted-foreground"}`}>
                      No issues
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCiHasIssues(true)}
                    data-testid="issues-yes"
                    className={`flex flex-col items-center gap-3 p-5 rounded-md border-2 transition-all ${
                      ciHasIssues === true
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                        : "border-muted hover-elevate"
                    }`}
                  >
                    <Wrench className={`h-8 w-8 ${ciHasIssues === true ? "text-amber-600" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${ciHasIssues === true ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                      Report issue
                    </span>
                  </button>
                </div>
                {ciHasIssues === true && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Describe the issue</Label>
                    <Textarea
                      placeholder="e.g., Engine warning light on, brake noise, tire damage..."
                      value={ciIssues}
                      onChange={(e) => setCiIssues(e.target.value)}
                      className="min-h-[80px]"
                      data-testid="input-issues"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => advanceInspSubStep("photos")}
                    disabled={ciHasIssues === null || (ciHasIssues === true && !ciIssues.trim())}
                    className="w-full"
                    data-testid="button-issues-next"
                  >
                    Next
                  </Button>
                  <Button variant="ghost" onClick={() => goBackInspSubStep("cleanliness")} className="w-full text-sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              </div>
            )}

            {inspSubStep === "photos" && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Camera className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">Upload your return photos</h3>
                  <p className="text-sm text-muted-foreground">Dash and interior photos are required</p>
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

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-semibold text-sm">
                      Interior Photo <span className="text-destructive">*</span>
                    </Label>
                    {interiorPhoto && <Check className="h-4 w-4 text-green-600 ml-auto" />}
                  </div>
                  {!interiorPhoto ? (
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      onGetUploadParameters={getUploadParameters}
                      onComplete={(res) => handleFileUpload(res, "interior")}
                      onError={(err) => toast({ title: "Upload failed", description: err.message, variant: "destructive" })}
                      buttonClassName="w-full bg-blue-600 text-white"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Upload Interior Photo
                    </ObjectUploader>
                  ) : (
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800 flex items-center justify-between">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                        <Check className="h-4 w-4" /> {interiorPhoto.fileName}
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => setInteriorPhoto(null)}>Remove</Button>
                    </div>
                  )}
                </div>

                {ciHasIssues === true && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ImagePlus className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-semibold text-sm">
                        Issue Photos <span className="text-muted-foreground font-normal text-xs">(optional)</span>
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

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => advanceInspSubStep("notes")}
                    disabled={!dashPhoto || !interiorPhoto}
                    className="w-full"
                    data-testid="button-photos-next"
                  >
                    Next
                  </Button>
                  <Button variant="ghost" onClick={() => goBackInspSubStep("issues")} className="w-full text-sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              </div>
            )}

            {inspSubStep === "notes" && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">Any final notes?</h3>
                  <p className="text-sm text-muted-foreground">General observations — optional, won't trigger maintenance</p>
                </div>
                <Textarea
                  placeholder="e.g., Great trip, returned on time, parked in lot B..."
                  value={ciReturnNotes}
                  onChange={(e) => setCiReturnNotes(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="input-return-notes"
                />
                <div className="flex flex-col gap-2">
                  {hasLockbox ? (
                    <>
                      <Button
                        onClick={() => advanceInspSubStep("keyReturn")}
                        className="w-full"
                        data-testid="button-notes-next"
                      >
                        Continue
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setCiReturnNotes(""); advanceInspSubStep("keyReturn"); }}
                        className="w-full"
                        data-testid="button-skip-notes"
                      >
                        Skip Notes — Continue
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleCheckInSubmit(ciReturnNotes)}
                        disabled={checkInMutation.isPending}
                        className="w-full"
                        data-testid="button-submit-checkin"
                      >
                        {checkInMutation.isPending ? "Completing Check-In..." : "Complete Check-In"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleCheckInSubmit("")}
                        disabled={checkInMutation.isPending}
                        className="w-full"
                        data-testid="button-skip-notes"
                      >
                        Skip — Complete Check-In
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" onClick={() => goBackInspSubStep("photos")} className="w-full text-sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              </div>
            )}

            {inspSubStep === "keyReturn" && (
              <div className="space-y-5" data-testid="key-return-section">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <KeyRound className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">Return the Key</h3>
                  <p className="text-sm text-muted-foreground">Please return the vehicle key to the lockbox drop slot</p>
                </div>

                <div className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-900/10 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium" data-testid="text-lockbox-name">
                        {lockbox?.name || "Lockbox"}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="text-lockbox-location">
                        {lockbox?.location || "See admin for location"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Drop the key into the lockbox's key return slot. You do not need a code to return the key.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-md border">
                  <Checkbox
                    id="key-returned"
                    checked={keyReturned}
                    onCheckedChange={(checked) => setKeyReturned(checked === true)}
                    data-testid="checkbox-key-returned"
                  />
                  <Label htmlFor="key-returned" className="text-sm leading-snug cursor-pointer">
                    I have returned the key to the lockbox
                  </Label>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleCheckInSubmit(ciReturnNotes)}
                    disabled={!keyReturned || checkInMutation.isPending}
                    className="w-full"
                    data-testid="button-complete-checkin-key"
                  >
                    {checkInMutation.isPending ? "Completing Check-In..." : "Complete Check-In"}
                  </Button>
                  <Button variant="ghost" onClick={() => goBackInspSubStep("notes")} className="w-full text-sm">
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
