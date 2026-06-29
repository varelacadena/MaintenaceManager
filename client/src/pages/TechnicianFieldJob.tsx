import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, ClipboardList, FileText, MapPin, Plus, Send, AlertTriangle, X } from "lucide-react";
import type { Area, Property, Task, Vehicle } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { invalidateTaskAfterMutation } from "@/lib/taskQueryInvalidation";
import { isAutoShopName } from "@/lib/autoShopUtils";
import { sortByName } from "@/lib/propertyDisplayUtils";
import { PropertySelectLabel, NameSelectItems } from "@/components/PropertySelectItems";
import {
  getSignedUploadParameters,
  mapUploaderResultForRegistration,
  mapUploaderResultToPending,
} from "@/lib/uploadUtils";
import { toDisplayUrl } from "@/lib/imageUtils";

const MAX_SUMMARY_LENGTH = 80;

type FieldJobForm = {
  name: string;
  description: string;
  urgency: "low" | "medium" | "high";
  propertyId: string;
  vehicleId: string;
  areaId: string;
};

type PendingPhoto = {
  fileName: string;
  objectUrl: string;
  objectPath?: string;
  type: string;
  previewUrl: string;
};

const steps = [
  { title: "Details", mobileTitle: "Details", description: "What did you find?" },
  { title: "Location", mobileTitle: "Location", description: "Where is the work?" },
  { title: "Review", mobileTitle: "Review", description: "Confirm and add it to today." },
];

const defaultForm: FieldJobForm = {
  name: "",
  description: "",
  urgency: "medium",
  propertyId: "",
  vehicleId: "",
  areaId: "",
};

const touchInputClass = "h-11 text-base sm:text-sm bg-background";
const touchSelectClass = "h-11 text-base sm:text-sm bg-background";

const sectionCard = {
  summary:
    "rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/30 p-4 space-y-2 border-l-4 border-l-blue-500",
  details:
    "rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/30 p-4 space-y-2 border-l-4 border-l-amber-500",
  photo:
    "rounded-lg border border-violet-200 dark:border-violet-800/80 bg-violet-50/80 dark:bg-violet-950/30 p-4 space-y-2 border-l-4 border-l-violet-500",
  urgency:
    "rounded-lg border border-rose-200 dark:border-rose-800/80 bg-rose-50/60 dark:bg-rose-950/25 p-4 space-y-2 border-l-4 border-l-rose-500",
  location:
    "rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/30 p-4 space-y-2 border-l-4 border-l-emerald-500",
  vehicle:
    "rounded-lg border border-orange-200 dark:border-orange-800/80 bg-orange-50/80 dark:bg-orange-950/30 p-4 space-y-2 border-l-4 border-l-orange-500",
  department:
    "rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/30 p-4 space-y-2 border-l-4 border-l-slate-400",
} as const;

const urgencyButtonClass = {
  low: {
    active: "bg-emerald-500 text-white border-emerald-600 shadow-sm",
    inactive: "bg-background text-emerald-700 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400",
  },
  medium: {
    active: "bg-amber-500 text-white border-amber-600 shadow-sm",
    inactive: "bg-background text-amber-700 border-amber-200 dark:border-amber-800 dark:text-amber-400",
  },
  high: {
    active: "bg-red-500 text-white border-red-600 shadow-sm",
    inactive: "bg-background text-red-700 border-red-200 dark:border-red-800 dark:text-red-400",
  },
} as const;

const stepAccent = [
  "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300",
] as const;

export default function TechnicianFieldJob() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FieldJobForm>(defaultForm);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });
  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const sortedProperties = useMemo(() => sortByName(properties), [properties]);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === form.propertyId),
    [form.propertyId, properties],
  );

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === form.vehicleId);
  const selectedArea = areas.find((area) => area.id === form.areaId);
  const showVehicle =
    isAutoShopName(selectedProperty?.name) || isAutoShopName(selectedArea?.name);
  const progressValue = ((step + 1) / steps.length) * 100;
  const currentStep = steps[step];
  const summaryLength = form.name.length;

  const createFieldJobMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/tasks/field-job", {
        name: form.name.trim(),
        description: form.description.trim(),
        urgency: form.urgency,
        propertyId: form.propertyId,
        vehicleId: form.vehicleId || undefined,
        areaId: form.areaId || undefined,
      });
      const task = (await response.json()) as Task;

      let failedPhotos = 0;
      for (const photo of pendingPhotos) {
        try {
          await apiRequest("POST", "/api/uploads", {
            taskId: task.id,
            ...mapUploaderResultForRegistration({
              fileName: photo.fileName,
              type: photo.type,
              objectUrl: photo.objectUrl,
              objectPath: photo.objectPath,
            }),
          });
        } catch {
          failedPhotos += 1;
        }
      }

      if (failedPhotos > 0) {
        throw new Error(
          `Job was created but ${failedPhotos} photo${failedPhotos === 1 ? "" : "s"} could not be attached. Open the task to try again.`,
        );
      }

      return task;
    },
    onSuccess: (task) => {
      invalidateTaskAfterMutation(task.id, { broad: true });
      toast({
        title: "Job added",
        description: "The job was added to your tasks for today.",
      });
      navigate("/work", { replace: true });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not add job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateForm = <K extends keyof FieldJobForm>(key: K, value: FieldJobForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handlePhotoUpload = (result: { successful?: Array<Record<string, unknown>> }) => {
    if (!result.successful?.length) return;

    const newPhotos = result.successful.map((file) => {
      const pending = mapUploaderResultToPending(file as Parameters<typeof mapUploaderResultToPending>[0]);
      return {
        fileName: pending.fileName,
        objectUrl: pending.objectUrl,
        objectPath: pending.objectPath,
        type: pending.fileType,
        previewUrl: toDisplayUrl(pending.objectUrl),
      };
    });

    setPendingPhotos((current) => [...current, ...newPhotos]);
    toast({
      title: "Photo added",
      description: `${newPhotos.length} photo${newPhotos.length === 1 ? "" : "s"} ready to submit`,
    });
  };

  const removePendingPhoto = (index: number) => {
    setPendingPhotos((current) => current.filter((_, i) => i !== index));
  };

  const validateDetails = () => {
    const summary = form.name.trim();

    if (!summary) {
      toast({
        title: "Summary required",
        description: "Add a short headline for the problem — not the full story.",
        variant: "destructive",
      });
      return false;
    }
    if (summary.length > MAX_SUMMARY_LENGTH) {
      toast({
        title: "Summary is too long",
        description: `Keep it under ${MAX_SUMMARY_LENGTH} characters. Put extra details in the description field.`,
        variant: "destructive",
      });
      return false;
    }
    if (pendingPhotos.length === 0) {
      toast({
        title: "Photo required",
        description: "Take a picture of the problem so we can see what you found.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateLocation = () => {
    if (!form.propertyId) {
      toast({ title: "Property required", description: "Select the property where this job is located.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateCurrentStep = () => {
    if (step === 0) return validateDetails();
    if (step === 1) return validateLocation();
    return validateDetails() && validateLocation();
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleSubmit = () => {
    if (!validateCurrentStep()) return;
    createFieldJobMutation.mutate();
  };

  return (
    <div className="min-h-full flex flex-col max-w-lg mx-auto w-full">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b px-3 sm:px-4 py-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary shrink-0" />
              <h1 className="text-lg font-semibold tracking-tight truncate">Add Job</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{currentStep.description}</p>
          </div>
          <span className="text-xs font-medium text-muted-foreground shrink-0 pt-1">
            {step + 1}/{steps.length}
          </span>
        </div>

        <Progress value={progressValue} className="h-1.5" />

        <div className="flex items-center gap-2" aria-label="Field job progress">
          {steps.map((item, index) => {
            const isActive = index === step;
            const isComplete = index < step;
            return (
              <div
                key={item.title}
                className={`flex-1 min-w-0 rounded-full px-2 py-1.5 text-center text-[11px] sm:text-xs border transition-colors ${
                  isActive
                    ? `${stepAccent[index]} font-medium`
                    : isComplete
                    ? `${stepAccent[index]} opacity-80`
                    : "border-border text-muted-foreground"
                }`}
              >
                <span className="sm:hidden">{item.mobileTitle}</span>
                <span className="hidden sm:inline">{item.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4"
        style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {step === 0 && (
          <div className="space-y-4">
            <div className={sectionCard.summary}>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="field-job-name" className="flex items-center gap-1.5 text-blue-800 dark:text-blue-200">
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  What&apos;s the problem?
                </Label>
                <span
                  className={`text-xs tabular-nums font-medium ${
                    summaryLength > MAX_SUMMARY_LENGTH
                      ? "text-destructive"
                      : "text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {summaryLength}/{MAX_SUMMARY_LENGTH}
                </span>
              </div>
              <Input
                id="field-job-name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value.slice(0, MAX_SUMMARY_LENGTH))}
                placeholder="e.g. Leaking pipe, No heat in room 204"
                className={touchInputClass}
                autoComplete="off"
                maxLength={MAX_SUMMARY_LENGTH}
                data-testid="input-field-job-name"
              />
              <p className="text-xs text-blue-700/80 dark:text-blue-300/80">
                Short headline only — not the full description.
              </p>
            </div>

            <div className={sectionCard.details}>
              <Label htmlFor="field-job-description" className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                <FileText className="w-4 h-4 shrink-0" />
                What did you see?
              </Label>
              <Textarea
                id="field-job-description"
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                placeholder="Where exactly? What does it look, sound, or smell like? When did you notice it? Any safety concerns?"
                className="min-h-[120px] sm:min-h-[140px] text-base sm:text-sm resize-y bg-background"
                data-testid="textarea-field-job-description"
              />
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                Give enough detail that someone who wasn&apos;t there can understand the issue.
              </p>
            </div>

            <div className={sectionCard.photo}>
              <Label className="flex items-center gap-1.5 text-violet-800 dark:text-violet-200">
                <Camera className="w-4 h-4 shrink-0" />
                Photo of the problem
              </Label>
              <p className="text-xs text-violet-700/80 dark:text-violet-300/80">
                Required — show us what you found so we know what we&apos;re dealing with.
              </p>
              <ObjectUploader
                maxNumberOfFiles={5}
                maxFileSize={10485760}
                accept="image/*"
                onGetUploadParameters={getSignedUploadParameters}
                onComplete={handlePhotoUpload}
                onError={(error) => {
                  toast({
                    title: "Upload failed",
                    description: error.message,
                    variant: "destructive",
                  });
                }}
                buttonVariant="outline"
                buttonClassName="w-full h-11 border-dashed border-violet-300 dark:border-violet-700 bg-background text-violet-900 dark:text-violet-200 hover:bg-violet-50 dark:hover:bg-violet-950/40"
              >
                <Camera className="w-4 h-4 mr-2" />
                {pendingPhotos.length === 0 ? "Take or upload a photo" : "Add another photo"}
              </ObjectUploader>

              {pendingPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {pendingPhotos.map((photo, index) => (
                    <div
                      key={`${photo.objectUrl}-${index}`}
                      className="relative aspect-square rounded-md overflow-hidden border-2 border-violet-200 dark:border-violet-700 bg-background"
                      data-testid={`field-job-photo-${index}`}
                    >
                      <img
                        src={photo.previewUrl}
                        alt={photo.fileName}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute top-1 right-1 rounded-full bg-background/90 p-1 shadow-sm"
                        onClick={() => removePendingPhoto(index)}
                        aria-label={`Remove photo ${index + 1}`}
                        data-testid={`button-remove-field-job-photo-${index}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={sectionCard.urgency}>
              <Label className="flex items-center gap-1.5 text-rose-800 dark:text-rose-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Urgency
              </Label>
              <div className="grid grid-cols-3 gap-2 sm:hidden">
                {(["low", "medium", "high"] as const).map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant="outline"
                    className={`h-11 capitalize border ${
                      form.urgency === level
                        ? urgencyButtonClass[level].active
                        : urgencyButtonClass[level].inactive
                    }`}
                    onClick={() => updateForm("urgency", level)}
                    data-testid={`button-field-job-urgency-${level}`}
                  >
                    {level}
                  </Button>
                ))}
              </div>
              <Select
                value={form.urgency}
                onValueChange={(value) => updateForm("urgency", value as FieldJobForm["urgency"])}
              >
                <SelectTrigger className={`${touchSelectClass} hidden sm:flex`} data-testid="select-field-job-urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className={sectionCard.location}>
              <Label className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200">
                <MapPin className="w-4 h-4 shrink-0" />
                Property
              </Label>
              <Select
                value={form.propertyId}
                onValueChange={(value) => {
                  const property = sortedProperties.find((item) => item.id === value);
                  setForm((current) => {
                    const area = areas.find((item) => item.id === current.areaId);
                    const nextShowVehicle =
                      isAutoShopName(property?.name) || isAutoShopName(area?.name);
                    return {
                      ...current,
                      propertyId: value,
                      vehicleId: nextShowVehicle ? current.vehicleId : "",
                    };
                  });
                }}
              >
                <SelectTrigger className={touchSelectClass} data-testid="select-field-job-property">
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  {sortedProperties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      <PropertySelectLabel property={property} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                Property is required for technician-created jobs.
              </p>
            </div>

            {showVehicle && (
              <div className={sectionCard.vehicle}>
                <Label className="text-orange-800 dark:text-orange-200">Vehicle</Label>
                <Select
                  value={form.vehicleId || "__none__"}
                  onValueChange={(value) => {
                    updateForm("vehicleId", value === "__none__" ? "" : value);
                  }}
                >
                  <SelectTrigger className={touchSelectClass} data-testid="select-field-job-vehicle">
                    <SelectValue placeholder="Optional vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No specific vehicle</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} {vehicle.year} — {vehicle.vehicleId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className={sectionCard.department}>
              <Label className="text-slate-700 dark:text-slate-300">Department</Label>
              <Select
                value={form.areaId || "__none__"}
                onValueChange={(value) => {
                  const areaId = value === "__none__" ? "" : value;
                  const area = areas.find((item) => item.id === areaId);
                  const nextShowVehicle =
                    isAutoShopName(selectedProperty?.name) || isAutoShopName(area?.name);
                  setForm((current) => ({
                    ...current,
                    areaId,
                    vehicleId: nextShowVehicle ? current.vehicleId : "",
                  }));
                }}
              >
                <SelectTrigger className={touchSelectClass} data-testid="select-field-job-department">
                  <SelectValue placeholder="Optional department" />
                </SelectTrigger>
                <SelectContent>
                  <NameSelectItems items={areas} noneLabel="No department" />
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className={`${sectionCard.summary} space-y-1`}>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-blue-600 dark:text-blue-400">
                Problem
              </p>
              <p className="font-semibold break-words text-blue-950 dark:text-blue-50">{form.name}</p>
            </div>

            <div className={`${sectionCard.details} space-y-1`}>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-400">
                What you saw
              </p>
              <p className="text-sm whitespace-pre-wrap break-words text-amber-950 dark:text-amber-50">
                {form.description}
              </p>
            </div>

            {pendingPhotos.length > 0 && (
              <div className={sectionCard.photo}>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-violet-600 dark:text-violet-400 mb-2">
                  Photos ({pendingPhotos.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {pendingPhotos.map((photo, index) => (
                    <img
                      key={`review-${photo.objectUrl}-${index}`}
                      src={photo.previewUrl}
                      alt={photo.fileName}
                      className="h-16 w-16 rounded-md object-cover border-2 border-violet-200 dark:border-violet-700"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className={sectionCard.location}>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                Location
              </p>
              <p className="font-medium break-words text-emerald-950 dark:text-emerald-50">{selectedProperty?.name}</p>
              {selectedVehicle && (
                <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80 break-words">
                  {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.vehicleId})
                </p>
              )}
              {selectedArea && (
                <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80 break-words">{selectedArea.name}</p>
              )}
            </div>

            <div className={`${sectionCard.urgency} flex items-center justify-between gap-3`}>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-rose-600 dark:text-rose-400">
                Urgency
              </p>
              <span
                className={`text-sm font-semibold capitalize px-2.5 py-1 rounded-full border ${
                  form.urgency === "high"
                    ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                    : form.urgency === "medium"
                    ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                    : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                }`}
              >
                {form.urgency}
              </span>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
              This job will be assigned to you and added to today&apos;s work.
            </div>
          </div>
        )}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-3 pt-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto flex max-w-lg gap-2">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
              disabled={createFieldJobMutation.isPending}
              data-testid="button-field-job-back"
            >
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              type="button"
              className="flex-1 h-11"
              onClick={handleNext}
              data-testid="button-field-job-next"
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 h-11"
              onClick={handleSubmit}
              disabled={createFieldJobMutation.isPending}
              data-testid="button-field-job-submit"
            >
              {createFieldJobMutation.isPending ? (
                "Adding..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Add to Today
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
