import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { VehicleReservation, Vehicle } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Car, ScrollText, ShieldCheck, CircleCheck, ClipboardCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Step = "advisory" | "safety" | "responsibility" | "checkout" | "complete";
export type CheckoutSubStep = "mileage" | "fuel" | "condition" | "damage" | "photos";

export const STEPS: { id: Step; label: string; icon: LucideIcon }[] = [
  { id: "advisory", label: "Advisory", icon: ScrollText },
  { id: "safety", label: "Safety", icon: ShieldCheck },
  { id: "responsibility", label: "Responsibilities", icon: ClipboardCheck },
  { id: "checkout", label: "Checkout", icon: Car },
  { id: "complete", label: "Done", icon: CircleCheck },
];

export const CHECKOUT_SUB_STEPS: CheckoutSubStep[] = ["mileage", "fuel", "condition", "damage", "photos"];

export const FUEL_OPTIONS = [
  { value: "empty", label: "Empty", filled: 0 },
  { value: "1/4", label: "¼ Tank", filled: 1 },
  { value: "1/2", label: "½ Tank", filled: 2 },
  { value: "3/4", label: "¾ Tank", filled: 3 },
  { value: "full", label: "Full", filled: 4 },
];

export const getKeyPickupMethodLabel = (method: string | null) => {
  if (!method) return "Not specified";
  const labels: Record<string, string> = {
    "in_person": "In Person Pickup",
    "mailbox": "Mailbox Pickup",
    "inside_vehicle": "Inside the Vehicle",
    "key_box": "Key Box Pickup",
  };
  return labels[method] || method;
};

export function useVehicleCheckOut() {
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
  const [assignedCode, setAssignedCode] = useState<{ id: string; code: string } | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState(false);

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
    return new Date() >= new Date(new Date(res.startDate).getTime() - 60 * 60 * 1000);
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
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicle-reservations/${reservationId}`] });
      setAdvisoryAccepted(true);

      if (reservation?.lockboxId) {
        setCodeLoading(true);
        setCodeError(false);
        try {
          const codeRes = await fetch(`/api/lockboxes/${reservation.lockboxId}/assign-code`, {
            method: "POST",
            credentials: "include",
          });
          if (codeRes.ok) {
            const codeData = await codeRes.json();
            setAssignedCode({ id: codeData.id, code: codeData.code });
          } else {
            setCodeError(true);
            toast({ title: "Code Assignment Failed", description: "Could not assign a lockbox code. Contact an administrator.", variant: "destructive" });
          }
        } catch (err) {
          console.error("Failed to assign lockbox code:", err);
          setCodeError(true);
          toast({ title: "Code Assignment Failed", description: "Could not assign a lockbox code. Contact an administrator.", variant: "destructive" });
        } finally {
          setCodeLoading(false);
        }
      }

      if (!reservation?.keyPickupMethod && !reservation?.lockboxId) {
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
        userId: user?.id,
        vehicleId: reservation?.vehicleId,
        reservationId: reservationId,
        ...(assignedCode ? { assignedCodeId: assignedCode.id } : {}),
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

  const withinTime = isWithinReservationTime(reservation);

  const animationClass = isAnimating
    ? slideDirection === "left" ? "opacity-0 -translate-x-4" : "opacity-0 translate-x-4"
    : "opacity-100 translate-x-0";

  const subAnimClass = subIsAnimating
    ? subSlideDir === "left" ? "opacity-0 -translate-x-4" : "opacity-0 translate-x-4"
    : "opacity-100 translate-x-0";

  const subStepIndex = CHECKOUT_SUB_STEPS.indexOf(checkoutSubStep);

  return {
    reservationId, setLocation, user, toast, isAdmin,
    dashPhoto, setDashPhoto,
    damagePhotos, setDamagePhotos,
    step, setStep,
    advisoryAccepted, setAdvisoryAccepted,
    advisoryJustAccepted, setAdvisoryJustAccepted,
    slideDirection, isAnimating,
    safetyChecked, setSafetyChecked,
    fuelChecked, setFuelChecked,
    cleanlinessChecked, setCleanlinessChecked,
    checkoutSubStep, setCheckoutSubStep,
    subSlideDir, subIsAnimating,
    coMileage, setCoMileage,
    coFuelLevel, setCoFuelLevel,
    coIsClean, setCoIsClean,
    coHasDamage, setCoHasDamage,
    coDamageNotes, setCoDamageNotes,
    assignedCode, setAssignedCode,
    codeLoading, codeError,
    reservation, isLoading, vehicle,
    withinTime,
    advanceStep, goBackStep, advanceSubStep, goBackSubStep,
    acceptAdvisoryMutation, checkOutMutation,
    getUploadParameters, handleFileUpload, handleCheckoutSubmit,
    animationClass, subAnimClass, subStepIndex,
  };
}

export type VehicleCheckOutContext = ReturnType<typeof useVehicleCheckOut>;
