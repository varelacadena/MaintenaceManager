import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { VehicleCheckOutLog, Vehicle, VehicleReservation, Lockbox } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type Step = "summary" | "inspection" | "complete";
export type InspectionSubStep = "mileage" | "fuel" | "cleanliness" | "issues" | "photos" | "notes" | "keyReturn";

export const STEPS: { id: Step; label: string; icon: string }[] = [
  { id: "summary", label: "Trip Summary", icon: "MapPin" },
  { id: "inspection", label: "Inspection", icon: "ClipboardList" },
  { id: "complete", label: "Done", icon: "CircleCheck" },
];

export const INSPECTION_SUB_STEPS: InspectionSubStep[] = ["mileage", "fuel", "cleanliness", "issues", "photos", "notes"];

export type CheckInOutcome = {
  hasIssues: boolean;
  hasLowFuel: boolean;
  fuelViolationAcknowledged: boolean;
  cleanlinessViolationAcknowledged: boolean;
  endMileage: number;
  startMileage: number;
};

export const FUEL_OPTIONS = [
  { value: "empty", label: "Empty", filled: 0 },
  { value: "1/4", label: "¼ Tank", filled: 1 },
  { value: "1/2", label: "½ Tank", filled: 2 },
  { value: "3/4", label: "¾ Tank", filled: 3 },
  { value: "full", label: "Full", filled: 4 },
];

export function useVehicleCheckIn() {
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
    queryKey: ["/api/lockboxes", reservation?.lockboxId],
    enabled: !!reservation?.lockboxId,
  });

  const hasLockbox = !!reservation?.lockboxId;

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
    const { uploadURL, objectPath } = await response.json();
    return { method: "PUT" as const, url: uploadURL, objectPath };
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
        userId: user?.id,
        vehicleId: checkOutLog?.vehicleId,
        checkOutLogId: checkOutLogId,
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

  const milesDriven = outcome ? outcome.endMileage - outcome.startMileage : 0;
  const isLowFuel = ciFuelLevel === "empty" || ciFuelLevel === "1/4";
  const isDirty = ciIsClean === false;
  const milesDrivenPreview = ciMileage - (checkOutLog?.startMileage || 0);

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

  return {
    checkOutLogId, setLocation, user, toast,
    dashPhoto, setDashPhoto,
    interiorPhoto, setInteriorPhoto,
    damagePhotos, setDamagePhotos,
    step, setStep,
    slideDirection, isAnimating,
    outcome, setOutcome,
    inspSubStep, setInspSubStep,
    inspSlideDir, inspIsAnimating,
    ciMileage, setCiMileage,
    ciFuelLevel, setCiFuelLevel,
    ciIsClean, setCiIsClean,
    ciHasIssues, setCiHasIssues,
    ciIssues, setCiIssues,
    ciReturnNotes, setCiReturnNotes,
    fuelViolationAck, setFuelViolationAck,
    cleanlinessViolationAck, setCleanlinessViolationAck,
    keyReturned, setKeyReturned,
    checkOutLog, isLoading, vehicle, reservation, lockbox,
    hasLockbox,
    advanceStep, goBackStep, advanceInspSubStep, goBackInspSubStep,
    getUploadParameters, handleFileUpload,
    checkInMutation, handleCheckInSubmit,
    milesDriven, isLowFuel, isDirty, milesDrivenPreview,
    animationClass, inspAnimClass,
    activeSubSteps, inspSubStepIndex,
  };
}

export type VehicleCheckInContext = ReturnType<typeof useVehicleCheckIn>;
