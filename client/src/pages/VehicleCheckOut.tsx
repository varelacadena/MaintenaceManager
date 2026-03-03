import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Car, ScrollText, ShieldCheck, CircleCheck, Check, CircleAlert,
  Gauge, Fuel, Camera, Sparkles, AlertTriangle, ImagePlus, Info,
  ClipboardCheck, Key, ChevronLeft, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import type { VehicleReservation, Vehicle } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

type Step = "advisory" | "safety" | "responsibility" | "checkout" | "complete";
type CheckoutSubStep = "mileage" | "fuel" | "condition" | "damage" | "photos";

const STEPS: { id: Step; label: string; icon: any }[] = [
  { id: "advisory", label: "Advisory", icon: ScrollText },
  { id: "safety", label: "Safety", icon: ShieldCheck },
  { id: "responsibility", label: "Responsibilities", icon: ClipboardCheck },
  { id: "checkout", label: "Checkout", icon: Car },
  { id: "complete", label: "Done", icon: CircleCheck },
];

const CHECKOUT_SUB_STEPS: CheckoutSubStep[] = ["mileage", "fuel", "condition", "damage", "photos"];

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

function StepProgress({ currentStep, advisoryAlreadyAccepted }: { currentStep: Step; advisoryAlreadyAccepted: boolean }) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);
  const currentStepData = STEPS[currentIndex];
  return (
    <div className="mb-6">
      <div className="flex items-center px-2">
        {STEPS.map((step, index) => {
          const isCompleted = advisoryAlreadyAccepted && step.id === "advisory"
            ? true
            : index < currentIndex;
          const isCurrent = step.id === currentStep;
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${
                isCompleted
                  ? "bg-primary border-primary text-primary-foreground"
                  : isCurrent
                  ? "border-primary text-primary bg-primary/10"
                  : "border-muted-foreground/30 text-muted-foreground/40"
              }`}>
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${
                  index < currentIndex || (advisoryAlreadyAccepted && index === 0) ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-2">
        <span className="text-xs text-muted-foreground">Step {currentIndex + 1} of {STEPS.length}</span>
        <span className="text-xs text-muted-foreground">—</span>
        <span className="text-xs font-medium text-foreground">{currentStepData?.label}</span>
      </div>
    </div>
  );
}

const getKeyPickupMethodLabel = (method: string | null) => {
  if (!method) return "Not specified";
  const labels: Record<string, string> = {
    "in_person": "In Person Pickup",
    "mailbox": "Mailbox Pickup",
    "inside_vehicle": "Inside the Vehicle",
  };
  return labels[method] || method;
};

export default function VehicleCheckOut() {
  const { reservationId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [dashPhoto, setDashPhoto] = useState<{ fileName: string; objectUrl: string; fileType: string; objectPath?: string } | null>(null);
  const [damagePhotos, setDamagePhotos] = useState<Array<{ fileName: string; objectUrl: string; fileType: string; objectPath?: string }>>([]);

  const [step, setStep] = useState<Step>("advisory");
  const [advisoryAccepted, setAdvisoryAccepted] = useState(false);
  const [advisoryJustAccepted, setAdvisoryJustAccepted] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");
  const [isAnimating, setIsAnimating] = useState(false);

  const [safetyChecked, setSafetyChecked] = useState(false);
  const [fuelChecked, setFuelChecked] = useState(false);
  const [cleanlinessChecked, setCleanlinessChecked] = useState(false);

  const [checkoutSubStep, setCheckoutSubStep] = useState<CheckoutSubStep>("mileage");
  const [subSlideDir, setSubSlideDir] = useState<"left" | "right">("left");
  const [subIsAnimating, setSubIsAnimating] = useState(false);

  const [coMileage, setCoMileage] = useState<number>(0);
  const [coFuelLevel, setCoFuelLevel] = useState<string>("");
  const [coIsClean, setCoIsClean] = useState<boolean | null>(null);
  const [coHasDamage, setCoHasDamage] = useState<boolean | null>(null);
  const [coDamageNotes, setCoDamageNotes] = useState<string>("");

  const { data: reservation, isLoading } = useQuery<VehicleReservation>({
    queryKey: [`/api/vehicle-reservations/${reservationId}`],
  });

  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${reservation?.vehicleId}`],
    enabled: !!reservation?.vehicleId,
  });

  useEffect(() => {
    if (vehicle?.currentMileage !== undefined && vehicle?.currentMileage !== null) {
      setCoMileage(vehicle.currentMileage);
    }
  }, [vehicle?.currentMileage]);


  const isWithinReservationTime = (res: VehicleReservation | undefined): boolean => {
    if (!res) return false;
    return new Date() >= new Date(res.startDate);
  };

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

  const advanceSubStep = (next: CheckoutSubStep) => {
    setSubSlideDir("left");
    setSubIsAnimating(true);
    setTimeout(() => { setCheckoutSubStep(next); setSubIsAnimating(false); }, 150);
  };

  const goBackSubStep = (prev: CheckoutSubStep) => {
    setSubSlideDir("right");
    setSubIsAnimating(true);
    setTimeout(() => { setCheckoutSubStep(prev); setSubIsAnimating(false); }, 150);
  };

  const acceptAdvisoryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/vehicle-reservations/${reservationId}/accept-advisory`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to accept advisory");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicle-reservations/${reservationId}`] });
      setAdvisoryAccepted(true);
      if (!reservation?.keyPickupMethod) {
        advanceStep("safety");
      } else {
        setAdvisoryJustAccepted(true);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (data: { startMileage: number; fuelLevel: string; cleanlinessConfirmed: boolean; damageNotes: string }) => {
      const payload: any = {
        ...data,
        userId: user!.id,
        vehicleId: reservation!.vehicleId,
        reservationId: reservationId!,
      };
      const response = await apiRequest("POST", "/api/vehicle-checkout-logs", payload);
      return await response.json();
    },
    onSuccess: async (checkOutLog) => {
      const allFiles: Array<{ fileName: string; fileType: string; objectUrl: string; objectPath?: string; isDash: boolean }> = [];
      if (dashPhoto) allFiles.push({ ...dashPhoto, isDash: true });
      damagePhotos.forEach(f => allFiles.push({ ...f, isDash: false }));

      for (const file of allFiles) {
        try {
          await fetch("/api/uploads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              fileName: file.isDash ? `DASH_${file.fileName}` : file.fileName,
              fileType: file.fileType,
              objectUrl: file.objectUrl,
              objectPath: file.objectPath,
              vehicleCheckOutLogId: checkOutLog.id,
            }),
          });
        } catch (err) {
          console.error("Error saving upload:", err);
        }
      }

      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0]?.toString();
          return !!(key?.startsWith('/api/vehicle-checkout-logs') ||
            key?.startsWith('/api/vehicles') ||
            key?.startsWith('/api/vehicle-reservations') ||
            key?.startsWith('/api/tasks'));
        }
      });

      advanceStep("complete");
    },
    onError: (error: Error) => {
      let msg = error.message;
      if (msg.match(/^\d{3}:\s*/)) msg = msg.replace(/^\d{3}:\s*/, "");
      toast({ title: "Error", description: msg || "Failed to create vehicle check-out log", variant: "destructive" });
    },
  });

  const getUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", { method: "POST", credentials: "include" });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to get upload URL" }));
      throw new Error(error.message || "Failed to get upload URL");
    }
    const { uploadURL } = await response.json();
    return { method: "PUT" as const, url: uploadURL };
  };

  const handleFileUpload = (result: any, type: "dash" | "damage") => {
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
      else setDamagePhotos(prev => [...prev, ...newFiles]);
      toast({ title: "Upload successful", description: `${successful.length} file(s) uploaded` });
    }
  };

  const handleCheckoutSubmit = () => {
    if (!dashPhoto) return;
    checkOutMutation.mutate({
      startMileage: coMileage,
      fuelLevel: coFuelLevel,
      cleanlinessConfirmed: coIsClean === true,
      damageNotes: coHasDamage ? coDamageNotes : "",
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

  const animationClass = isAnimating
    ? slideDirection === "left" ? "opacity-0 -translate-x-4" : "opacity-0 translate-x-4"
    : "opacity-100 translate-x-0";

  const subAnimClass = subIsAnimating
    ? subSlideDir === "left" ? "opacity-0 -translate-x-4" : "opacity-0 translate-x-4"
    : "opacity-100 translate-x-0";

  const subStepIndex = CHECKOUT_SUB_STEPS.indexOf(checkoutSubStep);
  const withinTime = isWithinReservationTime(reservation);

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
                  {format(new Date(reservation.startDate), "EEEE, MMM d 'at' h:mm a")}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Please come back at the start of your reservation to begin checkout.
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

          {/* ── ADVISORY: PRE-ACCEPT ── */}
          {step === "advisory" && !advisoryJustAccepted && (
            <Card>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <ScrollText className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Vehicle Use Advisory</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Please read and acknowledge the following before taking out the vehicle.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-4 space-y-3">
                  <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm">By accepting, you agree to the following:</p>
                  <ul className="space-y-2">
                    {[
                      "Vehicle usage is for official college business only",
                      "You are responsible for the vehicle during the entire reservation period",
                      "Report any damages or issues immediately to the admin team",
                      "Follow all traffic laws and college vehicle policies at all times",
                      "Return the vehicle on time and in the same condition as received",
                      "Return with at least half a tank of fuel (1/2 or more)",
                      "Return the vehicle clean — interior and exterior",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                        <CircleAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() => acceptAdvisoryMutation.mutate()}
                    disabled={acceptAdvisoryMutation.isPending}
                    className="w-full"
                    data-testid="button-accept-advisory"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {acceptAdvisoryMutation.isPending ? "Processing..." : "I Accept & Continue"}
                  </Button>
                  <Button variant="outline" onClick={() => setLocation("/my-reservations")} className="w-full">
                    Cancel — Return to My Reservations
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── ADVISORY: KEY PICKUP REVEAL ── */}
          {step === "advisory" && advisoryJustAccepted && (
            <Card>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Advisory Accepted!</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Here's how to retrieve your keys before continuing.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
                  <p className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100 text-sm">
                    <Key className="h-4 w-4" />
                    Your Key Pickup Instructions
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Method</p>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      {getKeyPickupMethodLabel(reservation.keyPickupMethod)}
                    </p>
                  </div>
                  {reservation.adminNotes && (
                    <div className="space-y-1">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Additional Instructions</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{reservation.adminNotes}</p>
                    </div>
                  )}
                  <p className="text-xs text-blue-700 dark:text-blue-300 italic">
                    Go retrieve your keys using the instructions above, then tap Continue.
                  </p>
                </div>
                <Button
                  onClick={() => { setAdvisoryJustAccepted(false); advanceStep("safety"); }}
                  className="w-full"
                  data-testid="button-have-keys-continue"
                >
                  <Key className="h-4 w-4 mr-2" />
                  I Have the Keys — Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── SAFETY ── */}
          {step === "safety" && (
            <Card>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Safety Acknowledgment</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Please confirm the following before proceeding.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="safety-check"
                      checked={safetyChecked}
                      onCheckedChange={(v) => setSafetyChecked(v === true)}
                      data-testid="checkbox-safety"
                    />
                    <label htmlFor="safety-check" className="text-sm font-medium leading-relaxed cursor-pointer text-green-900 dark:text-green-100">
                      I confirm I will not operate the vehicle until the formal checkout process is completed and logged in the system.
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() => advanceStep("responsibility")}
                    disabled={!safetyChecked}
                    className="w-full"
                    data-testid="button-safety-continue"
                  >
                    Continue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => advisoryAccepted ? setLocation("/my-reservations") : goBackStep("advisory")}
                    className="w-full"
                  >
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── RESPONSIBILITY ── */}
          {step === "responsibility" && (
            <Card>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ClipboardCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Your Responsibilities</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Confirm you understand your obligations.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-muted/50 border rounded-md p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="fuel-responsibility"
                        checked={fuelChecked}
                        onCheckedChange={(v) => setFuelChecked(v === true)}
                        data-testid="checkbox-fuel-responsibility"
                      />
                      <label htmlFor="fuel-responsibility" className="text-sm leading-relaxed cursor-pointer">
                        <span className="font-semibold flex items-center gap-1 mb-1">
                          <Fuel className="h-4 w-4 text-primary" />
                          Fuel Agreement
                        </span>
                        I will return the vehicle with at least half a tank of fuel. If I return with less, it will be recorded on my account.
                      </label>
                    </div>
                  </div>
                  <div className="bg-muted/50 border rounded-md p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="cleanliness-responsibility"
                        checked={cleanlinessChecked}
                        onCheckedChange={(v) => setCleanlinessChecked(v === true)}
                        data-testid="checkbox-cleanliness-responsibility"
                      />
                      <label htmlFor="cleanliness-responsibility" className="text-sm leading-relaxed cursor-pointer">
                        <span className="font-semibold flex items-center gap-1 mb-1">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Cleanliness Agreement
                        </span>
                        I will return the vehicle clean and in the same condition as received. If returned unclean, it will be recorded on my account.
                      </label>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">Violations are recorded and may affect your reservation privileges.</p>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() => { setCheckoutSubStep("mileage"); advanceStep("checkout"); }}
                    disabled={!fuelChecked || !cleanlinessChecked}
                    className="w-full"
                    data-testid="button-responsibility-continue"
                  >
                    I Understand — Continue to Checkout
                  </Button>
                  <Button variant="outline" onClick={() => goBackStep("safety")} className="w-full">Back</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── CHECKOUT (sub-stepped) ── */}
          {step === "checkout" && (
            <Card>
              <div className="px-6 pt-4">
                <SubStepDots total={CHECKOUT_SUB_STEPS.length} currentIndex={subStepIndex} />
              </div>
              <div className="overflow-hidden">
                <div className={`transition-all duration-300 ease-in-out ${subAnimClass}`}>
                  <CardContent className="pt-2">

                    {/* SUB: MILEAGE */}
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

                    {/* SUB: FUEL */}
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

                    {/* SUB: CONDITION */}
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

                    {/* SUB: DAMAGE */}
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

                    {/* SUB: PHOTOS */}
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
          )}

          {/* ── COMPLETE ── */}
          {step === "complete" && (
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
          )}

        </div>
      </div>
    </div>
  );
}
