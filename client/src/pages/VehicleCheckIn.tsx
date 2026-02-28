import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Car, Camera, MapPin, ClipboardList, CircleCheck, Check,
  Gauge, Fuel, Sparkles, AlertTriangle, MessageSquare, ImagePlus,
  Navigation, CheckCircle, Wrench, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VehicleCheckOutLog, Vehicle, VehicleReservation } from "@shared/schema";
import { insertVehicleCheckInLogSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

type Step = "summary" | "inspection" | "complete";

const STEPS: { id: Step; label: string; icon: any }[] = [
  { id: "summary", label: "Trip Summary", icon: MapPin },
  { id: "inspection", label: "Inspection", icon: ClipboardList },
  { id: "complete", label: "Done", icon: CircleCheck },
];

type CheckInOutcome = {
  hasIssues: boolean;
  hasLowFuel: boolean;
  fuelViolationAcknowledged: boolean;
  cleanlinessViolationAcknowledged: boolean;
  endMileage: number;
  startMileage: number;
};

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
  const [fuelViolationAck, setFuelViolationAck] = useState(false);
  const [cleanlinessViolationAck, setCleanlinessViolationAck] = useState(false);

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

  type CheckInFormData = {
    endMileage: number;
    fuelLevel: string;
    cleanlinessStatus: string;
    issues: string;
    returnNotes: string;
  };

  const form = useForm<CheckInFormData>({
    resolver: zodResolver(insertVehicleCheckInLogSchema.omit({ userId: true, vehicleId: true, checkOutLogId: true })),
    defaultValues: {
      endMileage: checkOutLog?.startMileage || 0,
      fuelLevel: "full",
      cleanlinessStatus: "clean",
      issues: "",
      returnNotes: "",
    },
  });

  const fuelLevel = form.watch("fuelLevel");
  const cleanlinessStatus = form.watch("cleanlinessStatus");
  const issues = form.watch("issues");

  const isLowFuel = fuelLevel === "empty" || fuelLevel === "1/4";
  const isDirty = cleanlinessStatus === "needs_cleaning";

  const canSubmit = dashPhoto && interiorPhoto &&
    (!isLowFuel || fuelViolationAck) &&
    (!isDirty || cleanlinessViolationAck);

  const getUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", { method: "POST", credentials: "include" });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to get upload URL" }));
      throw new Error(error.message || "Failed to get upload URL");
    }
    const { uploadURL } = await response.json();
    return { method: "PUT" as const, url: uploadURL };
  };

  const handleFileUpload = (result: any, type: 'dash' | 'interior' | 'damage') => {
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
      else if (type === 'interior') setInteriorPhoto(newFiles[0]);
      else setDamagePhotos(prev => [...prev, ...newFiles]);
      toast({ title: "Upload successful", description: `${successful.length} file(s) uploaded` });
    }
  };

  const checkInMutation = useMutation({
    mutationFn: async (data: CheckInFormData) => {
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
          return !!(key?.startsWith('/api/vehicle-checkin-logs') ||
                 key?.startsWith('/api/vehicles') ||
                 key?.startsWith('/api/vehicle-reservations') ||
                 key?.startsWith('/api/tasks') ||
                 key?.startsWith('/api/requests'));
        }
      });

      return { checkInLog, formData: data };
    },
    onSuccess: ({ formData }) => {
      setOutcome({
        hasIssues: !!(formData.issues && formData.issues.trim().length > 0),
        hasLowFuel: formData.fuelLevel === "empty" || formData.fuelLevel === "1/4",
        fuelViolationAcknowledged: fuelViolationAck,
        cleanlinessViolationAcknowledged: cleanlinessViolationAck,
        endMileage: formData.endMileage,
        startMileage: checkOutLog?.startMileage || 0,
      });
      advanceStep("complete");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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

  const animationClass = isAnimating
    ? slideDirection === "left" ? "opacity-0 -translate-x-4" : "opacity-0 translate-x-4"
    : "opacity-100 translate-x-0";

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
                  <Button onClick={() => advanceStep("inspection")} className="w-full" data-testid="button-start-inspection">
                    Start Return Inspection
                  </Button>
                  <Button variant="outline" onClick={() => setLocation("/my-reservations")} className="w-full">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "inspection" && (
            <Card>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl">Return Inspection</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Be thorough and honest — your report is recorded and protects everyone.
                </p>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => checkInMutation.mutate(data))} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="endMileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                            Ending Mileage
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">Enter the current odometer reading right now</p>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-end-mileage"
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
                            Ending Fuel Level
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">Please refuel to at least ½ tank before returning</p>
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
                          {isLowFuel && (
                            <div className="mt-2 space-y-2">
                              <Alert variant="destructive" className="py-2">
                                <Fuel className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                  You agreed to return the vehicle with at least ½ tank of fuel. Please refuel before completing check-in if possible.
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
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cleanlinessStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                            Vehicle Cleanliness
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-cleanliness">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="clean">Clean</SelectItem>
                              <SelectItem value="needs_cleaning">Needs Cleaning</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          {isDirty && (
                            <div className="mt-2 space-y-2">
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
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="issues"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            Mechanical Issues or Damage (Optional)
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Report any mechanical problems, damage, or safety concerns. This will immediately flag the vehicle for admin review.
                          </p>
                          <FormControl>
                            <Textarea
                              placeholder="e.g., Engine warning light on, brake noise, tire damage..."
                              className="min-h-[80px]"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-issues"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="returnNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            General Notes (Optional)
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            General observations. These will not trigger maintenance.
                          </p>
                          <FormControl>
                            <Textarea
                              placeholder="e.g., Great trip, returned on time, parked in lot B..."
                              className="min-h-[60px]"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-return-notes"
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
                        Clear photo of the dashboard showing the current mileage and fuel gauge
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
                          <Camera className="mr-2 h-4 w-4" />
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
                      <Label className="flex items-center gap-2 text-base font-semibold">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        Interior Photo (Required) *
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Show the interior condition so our team can verify cleanliness
                      </p>
                      <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-blue-50 dark:bg-blue-950/20">
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={10485760}
                          onGetUploadParameters={getUploadParameters}
                          onComplete={(res) => handleFileUpload(res, 'interior')}
                          onError={(error) => toast({ title: "Upload failed", description: error.message, variant: "destructive" })}
                          buttonClassName="bg-blue-600 text-white"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Upload Interior Photo
                        </ObjectUploader>
                      </div>
                      {interiorPhoto && (
                        <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800 flex items-center justify-between">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-1">
                            <Check className="h-3 w-3" /> {interiorPhoto.fileName}
                          </p>
                          <Button variant="ghost" size="sm" onClick={() => setInteriorPhoto(null)}>Remove</Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ImagePlus className="h-4 w-4 text-muted-foreground" />
                        Damage / Issue Photos (Optional)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Document any new damage or issues discovered during your trip
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
                          <ImagePlus className="mr-2 h-4 w-4" />
                          Upload Photos
                        </ObjectUploader>
                      </div>
                      {damagePhotos.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <p className="text-sm font-medium">Photos ({damagePhotos.length})</p>
                          {damagePhotos.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm truncate flex-1">{file.fileName}</span>
                              <Button
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

                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        type="submit"
                        disabled={checkInMutation.isPending || !canSubmit}
                        className="w-full"
                        data-testid="button-submit-checkin"
                      >
                        {checkInMutation.isPending ? "Completing Check-In..." : "Complete Check-In"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => goBackStep("summary")} className="w-full">
                        Back
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

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
                        A <strong>high-priority maintenance task</strong> has been created for the admin team based on your reported issues. The vehicle is flagged for review.
                      </AlertDescription>
                    </Alert>
                  )}
                  {outcome.fuelViolationAcknowledged && (
                    <Alert className="border-red-500/50 bg-red-500/10 text-left">
                      <Fuel className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <AlertDescription className="text-red-800 dark:text-red-200 text-sm">
                        <strong>Low fuel return recorded</strong> on your account. Please ensure you return with at least ½ tank next time.
                      </AlertDescription>
                    </Alert>
                  )}
                  {outcome.cleanlinessViolationAcknowledged && (
                    <Alert className="border-red-500/50 bg-red-500/10 text-left">
                      <Sparkles className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <AlertDescription className="text-red-800 dark:text-red-200 text-sm">
                        <strong>Unclean return recorded</strong> on your account. Please ensure you return the vehicle clean next time.
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
