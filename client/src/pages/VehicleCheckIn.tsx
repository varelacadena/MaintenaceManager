import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Car, Camera, MapPin, ClipboardList, CircleCheck, Check,
  Gauge, Fuel, Sparkles, AlertTriangle, MessageSquare, ImagePlus,
  Navigation, CheckCircle, Wrench, ChevronLeft, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VehicleCheckOutLog, Vehicle, VehicleReservation, Lockbox } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

type Step = "summary" | "inspection" | "complete";
type InspectionSubStep = "mileage" | "fuel" | "cleanliness" | "issues" | "photos" | "notes" | "keyReturn";

const STEPS: { id: Step; label: string; icon: any }[] = [
  { id: "summary", label: "Trip Summary", icon: MapPin },
  { id: "inspection", label: "Inspection", icon: ClipboardList },
  { id: "complete", label: "Done", icon: CircleCheck },
];

const INSPECTION_SUB_STEPS: InspectionSubStep[] = ["mileage", "fuel", "cleanliness", "issues", "photos", "notes"];

type CheckInOutcome = {
  hasIssues: boolean;
  hasLowFuel: boolean;
  fuelViolationAcknowledged: boolean;
  cleanlinessViolationAcknowledged: boolean;
  endMileage: number;
  startMileage: number;
};

const FUEL_OPTIONS = [
  { value: "empty", label: "Empty", filled: 0 },
  { value: "1/4", label: "¼ Tank", filled: 1 },
  { value: "1/2", label: "½ Tank", filled: 2 },
  { value: "3/4", label: "¾ Tank", filled: 3 },
  { value: "full", label: "Full", filled: 4 },
];

function FuelLevelSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {FUEL_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        const isLow = opt.value === "empty" || opt.value === "1/4";
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            data-testid={`fuel-option-${opt.value}`}
            className={`flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-all ${
              isSelected
                ? isLow
                  ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                  : "border-primary bg-primary/10"
                : "border-muted hover-elevate"
            }`}
          >
            <div className="flex flex-col gap-0.5 w-full">
              {[0, 1, 2, 3].map((barIdx) => {
                const isFilled = (4 - barIdx) <= opt.filled;
                return (
                  <div
                    key={barIdx}
                    className={`h-1.5 rounded-sm transition-colors ${
                      isFilled
                        ? isSelected
                          ? isLow ? "bg-red-500" : "bg-primary"
                          : "bg-muted-foreground/40"
                        : "bg-muted"
                    }`}
                  />
                );
              })}
            </div>
            <span className={`text-xs font-medium leading-tight text-center ${
              isSelected
                ? isLow ? "text-red-700 dark:text-red-400" : "text-primary"
                : "text-muted-foreground"
            }`}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SubStepDots({ total, currentIndex }: { total: number; currentIndex: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-1 pb-3">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < currentIndex
              ? "w-4 bg-primary/40"
              : i === currentIndex
              ? "w-5 bg-primary"
              : "w-1.5 bg-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function StepProgress({ currentStep }: { currentStep: Step }) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);
  return (
    <div className="flex items-center justify-between mb-6 px-2">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                isCompleted ? "bg-primary border-primary text-primary-foreground"
                  : isCurrent ? "border-primary text-primary bg-primary/10"
                  : "border-muted-foreground/30 text-muted-foreground/40"
              }`}>
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs text-center leading-tight max-w-[60px] ${
                isCurrent ? "text-primary font-medium" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/50"
              }`}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-5 transition-all duration-300 ${
                index < currentIndex ? "bg-primary" : "bg-muted"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function VehicleCheckIn() {
  const { checkOutLogId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [dashPhoto, setDashPhoto] = useState<{ fileName: string; objectUrl: string; fileType: string; objectPath?: string } | null>(null);
  const [interiorPhoto, setInteriorPhoto] = useState<{ fileName: string; objectUrl: string; fileType: string; objectPath?: string } | null>(null);
  const [damagePhotos, setDamagePhotos] = useState<Array<{ fileName: string; objectUrl: string; fileType: string; objectPath?: string }>>([]);

  const [step, setStep] = useState<Step>("summary");
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");
  const [isAnimating, setIsAnimating] = useState(false);
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);

  const [inspSubStep, setInspSubStep] = useState<InspectionSubStep>("mileage");
  const [inspSlideDir, setInspSlideDir] = useState<"left" | "right">("left");
  const [inspIsAnimating, setInspIsAnimating] = useState(false);

  const [ciMileage, setCiMileage] = useState<number>(0);
  const [ciFuelLevel, setCiFuelLevel] = useState<string>("");
  const [ciIsClean, setCiIsClean] = useState<boolean | null>(null);
  const [ciHasIssues, setCiHasIssues] = useState<boolean | null>(null);
  const [ciIssues, setCiIssues] = useState<string>("");
  const [ciReturnNotes, setCiReturnNotes] = useState<string>("");

  const [fuelViolationAck, setFuelViolationAck] = useState(false);
  const [cleanlinessViolationAck, setCleanlinessViolationAck] = useState(false);
  const [keyReturned, setKeyReturned] = useState(false);

  const { data: checkOutLog, isLoading } = useQuery<VehicleCheckOutLog>({
    queryKey: [`/api/vehicle-checkout-logs/${checkOutLogId}`],
  });

  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${checkOutLog?.vehicleId}`],
    enabled: !!checkOutLog?.vehicleId,
  });

  const { data: reservation } = useQuery<VehicleReservation>({
    queryKey: [`/api/vehicle-reservations/${checkOutLog?.reservationId}`],
    enabled: !!checkOutLog?.reservationId,
  });

  const { data: lockbox } = useQuery<Lockbox>({
    queryKey: ["/api/lockboxes", vehicle?.lockboxId],
    enabled: !!vehicle?.lockboxId,
  });

  const hasLockbox = !!vehicle?.lockboxId;

  useEffect(() => {
    if (checkOutLog?.startMileage) setCiMileage(checkOutLog.startMileage);
  }, [checkOutLog?.startMileage]);

  const advanceStep = (next: Step) => {
    setSlideDirection("left");
    setIsAnimating(true);
    setTimeout(() => { setStep(next); setIsAnimating(false); }, 150);
  };

  const goBackStep = (prev: Step) => {
    setSlideDirection("right");
    setIsAnimating(true);
    setTimeout(() => { setStep(prev); setIsAnimating(false); }, 150);
  };

  const advanceInspSubStep = (next: InspectionSubStep) => {
    setInspSlideDir("left");
    setInspIsAnimating(true);
    setTimeout(() => { setInspSubStep(next); setInspIsAnimating(false); }, 150);
  };

  const goBackInspSubStep = (prev: InspectionSubStep) => {
    setInspSlideDir("right");
    setInspIsAnimating(true);
    setTimeout(() => { setInspSubStep(prev); setInspIsAnimating(false); }, 150);
  };

  const getUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", { method: "POST", credentials: "include" });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to get upload URL" }));
      throw new Error(error.message || "Failed to get upload URL");
    }
    const { uploadURL } = await response.json();
    return { method: "PUT" as const, url: uploadURL };
  };

  const handleFileUpload = (result: any, type: "dash" | "interior" | "damage") => {
    const { successful, failed } = result;
    if (failed?.length > 0) {
      toast({ title: "Some uploads failed", description: failed.map((f: any) => f.error).join(", "), variant: "destructive" });
    }
    if (successful?.length > 0) {
      const newFiles = successful.map((file: any) => ({
        fileName: file.fileName || file.name,
        objectUrl: file.objectUrl || file.uploadURL || file.url,
        fileType: file.type || "image/jpeg",
        objectPath: file.objectPath,
      }));
      if (type === "dash") setDashPhoto(newFiles[0]);
      else if (type === "interior") setInteriorPhoto(newFiles[0]);
      else setDamagePhotos(prev => [...prev, ...newFiles]);
      toast({ title: "Upload successful", description: `${successful.length} file(s) uploaded` });
    }
  };

  const checkInMutation = useMutation({
    mutationFn: async (data: { endMileage: number; fuelLevel: string; cleanlinessStatus: string; issues: string; returnNotes: string }) => {
      const response = await apiRequest("POST", "/api/vehicle-checkin-logs", {
        ...data,
        userId: user!.id,
        vehicleId: checkOutLog!.vehicleId,
        checkOutLogId: checkOutLogId!,
      });

      const checkInLog = await response.json();

      const allFiles: Array<{ fileName: string; fileType: string; objectUrl: string; objectPath?: string; prefix: string }> = [];
      if (dashPhoto) allFiles.push({ ...dashPhoto, prefix: "DASH_" });
      if (interiorPhoto) allFiles.push({ ...interiorPhoto, prefix: "INTERIOR_" });
      damagePhotos.forEach(f => allFiles.push({ ...f, prefix: "" }));

      for (const file of allFiles) {
        try {
          await fetch("/api/uploads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              fileName: `${file.prefix}${file.fileName}`,
              fileType: file.fileType,
              objectUrl: file.objectUrl,
              objectPath: file.objectPath,
              vehicleCheckInLogId: checkInLog.id,
            }),
          });
        } catch (uploadError) {
          console.error("Error saving upload:", uploadError);
        }
      }

      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0]?.toString();
          return !!(key?.startsWith("/api/vehicle-checkin-logs") ||
            key?.startsWith("/api/vehicles") ||
            key?.startsWith("/api/vehicle-reservations") ||
            key?.startsWith("/api/tasks") ||
            key?.startsWith("/api/requests"));
        }
      });

      return { checkInLog, data };
    },
    onSuccess: ({ data }) => {
      setOutcome({
        hasIssues: !!(ciHasIssues && ciIssues.trim()),
        hasLowFuel: ciFuelLevel === "empty" || ciFuelLevel === "1/4",
        fuelViolationAcknowledged: fuelViolationAck,
        cleanlinessViolationAcknowledged: cleanlinessViolationAck,
        endMileage: ciMileage,
        startMileage: checkOutLog?.startMileage || 0,
      });
      advanceStep("complete");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCheckInSubmit = (notes = ciReturnNotes) => {
    checkInMutation.mutate({
      endMileage: ciMileage,
      fuelLevel: ciFuelLevel,
      cleanlinessStatus: ciIsClean === false ? "needs_cleaning" : "clean",
      issues: ciHasIssues ? ciIssues : "",
      returnNotes: notes,
    });
  };

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

  const milesDriven = outcome ? outcome.endMileage - outcome.startMileage : 0;
  const isLowFuel = ciFuelLevel === "empty" || ciFuelLevel === "1/4";
  const isDirty = ciIsClean === false;
  const milesDrivenPreview = ciMileage - (checkOutLog.startMileage || 0);

  const animationClass = isAnimating
    ? slideDirection === "left" ? "opacity-0 -translate-x-4" : "opacity-0 translate-x-4"
    : "opacity-100 translate-x-0";

  const inspAnimClass = inspIsAnimating
    ? inspSlideDir === "left" ? "opacity-0 -translate-x-4" : "opacity-0 translate-x-4"
    : "opacity-100 translate-x-0";

  const activeSubSteps = hasLockbox
    ? [...INSPECTION_SUB_STEPS, "keyReturn" as InspectionSubStep]
    : INSPECTION_SUB_STEPS;
  const inspSubStepIndex = activeSubSteps.indexOf(inspSubStep);

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto">
      <div className="mb-2">
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Vehicle Check-In</h2>
        <p className="text-muted-foreground mt-0.5">{vehicle.make} {vehicle.model} ({vehicle.vehicleId})</p>
      </div>

      <StepProgress currentStep={step} />

      <div className="overflow-hidden">
        <div className={`transition-all duration-300 ease-in-out ${animationClass}`}>

          {/* ── SUMMARY ── */}
          {step === "summary" && (
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
          )}

          {/* ── INSPECTION (sub-stepped) ── */}
          {step === "inspection" && (
            <Card>
              <div className="px-6 pt-4">
                <SubStepDots total={activeSubSteps.length} currentIndex={inspSubStepIndex} />
              </div>
              <div className="overflow-hidden">
                <div className={`transition-all duration-300 ease-in-out ${inspAnimClass}`}>
                  <CardContent className="pt-2">

                    {/* SUB: MILEAGE */}
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

                    {/* SUB: FUEL */}
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

                    {/* SUB: CLEANLINESS */}
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

                    {/* SUB: ISSUES */}
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

                    {/* SUB: PHOTOS */}
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

                    {/* SUB: NOTES */}
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

                    {/* SUB: KEY RETURN */}
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
          )}

          {/* ── COMPLETE ── */}
          {step === "complete" && outcome && (
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
          )}

        </div>
      </div>
    </div>
  );
}
