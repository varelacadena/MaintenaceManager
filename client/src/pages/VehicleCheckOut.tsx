import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Car, Upload, ScrollText, ShieldCheck, ClipboardList, CircleCheck,
  Check, CircleAlert, Gauge, Fuel, Camera, Sparkles, ImagePlus, Info, ClipboardCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import type { VehicleReservation, Vehicle, InsertVehicleCheckOutLog } from "@shared/schema";
import { insertVehicleCheckOutLogSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

type Step = "advisory" | "safety" | "responsibility" | "checkout" | "complete";

const STEPS: { id: Step; label: string; icon: any }[] = [
  { id: "advisory", label: "Advisory", icon: ScrollText },
  { id: "safety", label: "Safety", icon: ShieldCheck },
  { id: "responsibility", label: "My Responsibilities", icon: ClipboardCheck },
  { id: "checkout", label: "Checkout Details", icon: Car },
  { id: "complete", label: "Done", icon: CircleCheck },
];

function StepProgress({ currentStep, advisoryAlreadyAccepted }: { currentStep: Step; advisoryAlreadyAccepted: boolean }) {
  const visibleSteps = STEPS;
  const currentIndex = visibleSteps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center justify-between mb-6 px-2">
      {visibleSteps.map((step, index) => {
        const isCompleted = advisoryAlreadyAccepted && step.id === "advisory"
          ? true
          : index < currentIndex;
        const isCurrent = step.id === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                isCompleted
                  ? "bg-primary border-primary text-primary-foreground"
                  : isCurrent
                  ? "border-primary text-primary bg-primary/10"
                  : "border-muted-foreground/30 text-muted-foreground/40"
              }`}>
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span className={`text-xs text-center leading-tight max-w-[56px] ${
                isCurrent ? "text-primary font-medium" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/50"
              }`}>
                {step.label}
              </span>
            </div>
            {index < visibleSteps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-5 transition-all duration-300 ${
                index < currentIndex || (advisoryAlreadyAccepted && index === 0) ? "bg-primary" : "bg-muted"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function VehicleCheckOut() {
  const { reservationId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [dashPhoto, setDashPhoto] = useState<{ fileName: string; objectUrl: string; fileType: string; objectPath?: string } | null>(null);
  const [damagePhotos, setDamagePhotos] = useState<Array<{ fileName: string; objectUrl: string; fileType: string; objectPath?: string }>>([]);
  const [adminOverride, setAdminOverride] = useState(false);
  const [safetyChecked, setSafetyChecked] = useState(false);
  const [fuelChecked, setFuelChecked] = useState(false);
  const [cleanlinessChecked, setCleanlinessChecked] = useState(false);
  const [step, setStep] = useState<Step>("advisory");
  const [advisoryAccepted, setAdvisoryAccepted] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");
  const [isAnimating, setIsAnimating] = useState(false);

  const isAdmin = user?.role === "admin";

  const isWithinReservationTime = (reservation: VehicleReservation | undefined): boolean => {
    if (!reservation) return false;
    const now = new Date();
    const startDate = new Date(reservation.startDate);
    return now >= startDate;
  };

  const { data: reservation, isLoading } = useQuery<VehicleReservation>({
    queryKey: [`/api/vehicle-reservations/${reservationId}`],
  });

  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${reservation?.vehicleId}`],
    enabled: !!reservation?.vehicleId,
  });

  const form = useForm<InsertVehicleCheckOutLog>({
    resolver: zodResolver(insertVehicleCheckOutLogSchema.omit({ userId: true, vehicleId: true, reservationId: true, adminOverride: true })),
    defaultValues: {
      startMileage: 0,
      fuelLevel: "full",
      cleanlinessConfirmed: false,
      damageNotes: "",
    },
  });

  useEffect(() => {
    if (vehicle?.currentMileage !== undefined && vehicle?.currentMileage !== null) {
      form.setValue("startMileage", vehicle.currentMileage);
    }
  }, [vehicle?.currentMileage]);

  useEffect(() => {
    if (reservation) {
      if (reservation.advisoryAccepted) {
        setAdvisoryAccepted(true);
        setStep("safety");
      } else {
        setStep("advisory");
      }
    }
  }, [reservation?.advisoryAccepted]);

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
      advanceStep("safety");
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (data: Omit<InsertVehicleCheckOutLog, "userId" | "vehicleId" | "reservationId" | "adminOverride">) => {
      const payload: any = {
        ...data,
        userId: user!.id,
        vehicleId: reservation!.vehicleId,
        reservationId: reservationId!,
      };
      if (adminOverride) payload.adminOverride = true;
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
        } catch (uploadError) {
          console.error("Error saving upload:", uploadError);
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
      let errorMessage = error.message;
      if (errorMessage.match(/^\d{3}:\s*/)) errorMessage = errorMessage.replace(/^\d{3}:\s*/, "");
      toast({ title: "Error", description: errorMessage || "Failed to create vehicle check-out log", variant: "destructive" });
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

  const handleFileUpload = (result: any, type: 'dash' | 'damage') => {
    const { successful, failed } = result;
    if (failed?.length > 0) {
      toast({ title: "Some uploads failed", description: failed.map((f: any) => f.error).join(", "), variant: "destructive" });
    }
    if (successful?.length > 0) {
      const newFiles = successful.map((file: any) => ({
        fileName: file.fileName || file.name,
        objectUrl: file.objectUrl || file.uploadURL || file.url,
        fileType: file.type || "image/jpeg",
        objectPath: file.objectPath
      }));
      if (type === 'dash') setDashPhoto(newFiles[0]);
      else setDamagePhotos(prev => [...prev, ...newFiles]);
      toast({ title: "Upload successful", description: `${successful.length} file(s) uploaded` });
    }
  };

  const onSubmit = (data: InsertVehicleCheckOutLog) => {
    checkOutMutation.mutate({
      startMileage: Number(data.startMileage) || 0,
      fuelLevel: data.fuelLevel || "full",
      cleanlinessConfirmed: Boolean(data.cleanlinessConfirmed),
      damageNotes: data.damageNotes || "",
    });
  };

  const advanceStep = (next: Step) => {
    setSlideDirection("left");
    setIsAnimating(true);
    setTimeout(() => {
      setStep(next);
      setIsAnimating(false);
    }, 150);
  };

  const goBackStep = (prev: Step) => {
    setSlideDirection("right");
    setIsAnimating(true);
    setTimeout(() => {
      setStep(prev);
      setIsAnimating(false);
    }, 150);
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
    ? slideDirection === "left"
      ? "opacity-0 -translate-x-4"
      : "opacity-0 translate-x-4"
    : "opacity-100 translate-x-0";

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto">
      <div className="mb-2">
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Vehicle Check-Out</h2>
        <p className="text-muted-foreground mt-0.5">{vehicle.make} {vehicle.model} ({vehicle.vehicleId})</p>
      </div>

      <StepProgress currentStep={step} advisoryAlreadyAccepted={advisoryAccepted && step !== "advisory"} />

      <div className="overflow-hidden">
        <div className={`transition-all duration-300 ease-in-out ${animationClass}`}>

          {step === "advisory" && (
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
                  <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                    By accepting, you agree to the following:
                  </p>
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

          {step === "safety" && (
            <Card>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Safety Acknowledgment</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Before we hand over the keys, please confirm the following.
                </p>
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
                    onClick={() => advisoryAccepted
                      ? setLocation("/my-reservations")
                      : goBackStep("advisory")
                    }
                    className="w-full"
                  >
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "responsibility" && (
            <Card>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ClipboardCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Your Responsibilities</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Before we hand over the keys, please confirm you understand your obligations for this vehicle.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-muted/50 border rounded-md p-4 space-y-3">
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
                        I will return the vehicle with at least half a tank of fuel (1/2 or more). If I return with less fuel, it will be recorded on my account.
                      </label>
                    </div>
                  </div>

                  <div className="bg-muted/50 border rounded-md p-4 space-y-3">
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

                <p className="text-xs text-muted-foreground text-center">
                  Violations are recorded and may affect your reservation privileges.
                </p>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() => advanceStep("checkout")}
                    disabled={!fuelChecked || !cleanlinessChecked}
                    className="w-full"
                    data-testid="button-responsibility-continue"
                  >
                    I Understand — Continue to Checkout
                  </Button>
                  <Button variant="outline" onClick={() => goBackStep("safety")} className="w-full">
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "checkout" && (
            <Card>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Car className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl">Checkout Details</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Record the vehicle's current condition before your trip.
                </p>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Documenting the starting condition protects you if any issues are disputed later.
                  </AlertDescription>
                </Alert>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="startMileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                            Starting Mileage
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">Enter the odometer reading right now before driving</p>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || 0}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-start-mileage"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fuelLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Fuel className="h-4 w-4 text-muted-foreground" />
                            Current Fuel Level
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-fuel-level">
                                <SelectValue placeholder="Select fuel level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="empty">Empty</SelectItem>
                              <SelectItem value="1/4">1/4 Tank</SelectItem>
                              <SelectItem value="1/2">1/2 Tank</SelectItem>
                              <SelectItem value="3/4">3/4 Tank</SelectItem>
                              <SelectItem value="full">Full</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cleanlinessConfirmed"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-cleanliness"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="flex items-center gap-2 cursor-pointer">
                              <Sparkles className="h-4 w-4 text-muted-foreground" />
                              I confirm the vehicle is clean and in good condition
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="damageNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <ImagePlus className="h-4 w-4 text-muted-foreground" />
                            Pre-Existing Damage Notes (Optional)
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">Document any existing damage to protect yourself</p>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder="e.g., Scratch on rear bumper, dent on passenger door..."
                              data-testid="textarea-damage-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-base font-semibold">
                        <Camera className="h-4 w-4 text-muted-foreground" />
                        Dash Photo (Required) *
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Snap the odometer and fuel gauge before driving — this is your starting proof
                      </p>
                      <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-amber-50 dark:bg-amber-950/20">
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={10485760}
                          onGetUploadParameters={getUploadParameters}
                          onComplete={(res) => handleFileUpload(res, 'dash')}
                          onError={(error) => toast({ title: "Upload failed", description: error.message, variant: "destructive" })}
                          buttonClassName="bg-amber-600 text-white"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Dash Photo
                        </ObjectUploader>
                      </div>
                      {dashPhoto && (
                        <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800 flex items-center justify-between">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-1">
                            <Check className="h-3 w-3" /> {dashPhoto.fileName}
                          </p>
                          <Button variant="ghost" size="sm" onClick={() => setDashPhoto(null)}>Remove</Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ImagePlus className="h-4 w-4 text-muted-foreground" />
                        Damage Photos (Optional)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        If you spot any pre-existing damage, document it here to protect yourself
                      </p>
                      <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-3">
                        <ObjectUploader
                          maxNumberOfFiles={5}
                          maxFileSize={10485760}
                          onGetUploadParameters={getUploadParameters}
                          onComplete={(res) => handleFileUpload(res, 'damage')}
                          onError={(error) => toast({ title: "Upload failed", description: error.message, variant: "destructive" })}
                          buttonClassName="bg-primary text-primary-foreground"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Photos
                        </ObjectUploader>
                      </div>
                      {damagePhotos.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <p className="text-sm font-medium">Damage Photos ({damagePhotos.length})</p>
                          {damagePhotos.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm truncate flex-1">{file.fileName}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDamagePhotos(damagePhotos.filter((_, i) => i !== index))}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {!dashPhoto && (
                      <Alert variant="destructive" className="py-2">
                        <AlertDescription className="text-sm">A dash photo is required to complete check-out</AlertDescription>
                      </Alert>
                    )}

                    {!isWithinReservationTime(reservation) && !adminOverride && (
                      <Alert className="py-2">
                        <AlertDescription className="text-sm">
                          Check-out will be available at: {new Date(reservation.startDate).toLocaleString()}
                        </AlertDescription>
                      </Alert>
                    )}

                    {isAdmin && !isWithinReservationTime(reservation) && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                        <Switch
                          id="admin-override"
                          checked={adminOverride}
                          onCheckedChange={setAdminOverride}
                        />
                        <Label htmlFor="admin-override" className="cursor-pointer">
                          Admin Override — Allow Early Check-Out
                        </Label>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        type="submit"
                        disabled={
                          checkOutMutation.isPending ||
                          !form.formState.isValid ||
                          !dashPhoto ||
                          (!isWithinReservationTime(reservation) && !adminOverride)
                        }
                        className="w-full"
                        data-testid="button-submit-checkout"
                      >
                        {checkOutMutation.isPending ? "Checking Out..." : "Submit Checkout"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => goBackStep("responsibility")} className="w-full">
                        Back
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {step === "complete" && (
            <Card>
              <CardContent className="flex flex-col items-center text-center py-10 gap-6">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
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
                  </div>
                </div>

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
