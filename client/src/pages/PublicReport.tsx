import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, CheckCircle2, ClipboardList, FileText, MapPin, Send, AlertTriangle, User, Phone, X, ArrowLeft } from "lucide-react";
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
import { PropertySelectLabel, SpaceSelectItems } from "@/components/PropertySelectItems";
import { parseApiError } from "@/lib/queryClient";
import { sortByName } from "@/lib/propertyDisplayUtils";
import {
  getSignedPublicUploadParameters,
  mapUploaderResultForRegistration,
  mapUploaderResultToPending,
} from "@/lib/uploadUtils";
import { PUBLIC_REQUEST_SUMMARY_MAX } from "@shared/publicServiceRequest";
import { getServiceRequestNumber } from "@shared/recordNumbers";

type PublicProperty = { id: string; name: string; type: string; address?: string | null };
type PublicSpace = { id: string; name: string; floor?: string | null; propertyId: string };

type ReportForm = {
  name: string;
  description: string;
  urgency: "low" | "medium" | "high";
  propertyId: string;
  spaceId: string;
  requesterName: string;
  requesterPhone: string;
  website: string;
};

type PendingPhoto = {
  fileName: string;
  objectUrl: string;
  objectPath?: string;
  type: string;
  previewUrl: string;
};

const steps = [
  { title: "Details", mobileTitle: "Details", description: "What needs attention?" },
  { title: "Location", mobileTitle: "Location", description: "Where is it?" },
  { title: "Submit", mobileTitle: "Submit", description: "Add your name and send it in." },
];

const defaultForm: ReportForm = {
  name: "",
  description: "",
  urgency: "medium",
  propertyId: "",
  spaceId: "",
  requesterName: "",
  requesterPhone: "",
  website: "",
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
  contact:
    "rounded-lg border border-sky-200 dark:border-sky-800/80 bg-sky-50/80 dark:bg-sky-950/30 p-4 space-y-2 border-l-4 border-l-sky-500",
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

export default function PublicReport() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ReportForm>(defaultForm);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const pendingPhotosRef = useRef(pendingPhotos);
  pendingPhotosRef.current = pendingPhotos;
  const [submittedNumber, setSubmittedNumber] = useState<string | null>(null);

  const {
    data: properties = [],
    isLoading: isPropertiesLoading,
    isError: isPropertiesError,
  } = useQuery<PublicProperty[]>({
    queryKey: ["/api/public/properties"],
  });

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === form.propertyId),
    [form.propertyId, properties],
  );
  const isBuilding = selectedProperty?.type === "building";

  const { data: spaces = [] } = useQuery<PublicSpace[]>({
    queryKey: ["/api/public/spaces", form.propertyId],
    enabled: isBuilding && !!form.propertyId,
    queryFn: async () => {
      const response = await fetch(`/api/public/spaces?propertyId=${encodeURIComponent(form.propertyId)}`);
      if (!response.ok) throw new Error(await parseApiError(response, "Could not load rooms"));
      return response.json();
    },
  });

  const sortedProperties = useMemo(() => sortByName(properties), [properties]);
  const selectedSpace = spaces.find((space) => space.id === form.spaceId);
  const progressValue = ((step + 1) / steps.length) * 100;
  const currentStep = steps[step];
  const summaryLength = form.name.length;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/public/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.name.trim(),
          description: form.description.trim(),
          urgency: form.urgency,
          propertyId: form.propertyId,
          spaceId: form.spaceId || undefined,
          requesterName: form.requesterName.trim(),
          requesterPhone: form.requesterPhone.trim() || undefined,
          website: form.website,
          photos: attachedPhotos.map((photo) => ({
            fileName: photo.fileName,
            fileType: photo.type,
            objectUrl: photo.objectUrl,
            objectPath: photo.objectPath,
          })),
        }),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response, "Could not submit report"));
      }
      return response.json() as Promise<{ id: string; requestNumber?: number; failedPhotos?: number }>;
    },
    onSuccess: (request) => {
      if (request.failedPhotos && request.failedPhotos > 0) {
        toast({
          title: "Report sent, some photos did not attach",
          description: "Maintenance still received your report.",
        });
      }
      setSubmittedNumber(getServiceRequestNumber(request));
    },
    onError: (error: Error) => {
      toast({
        title: "Could not send report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    return () => {
      pendingPhotosRef.current.forEach((photo) => {
        if (photo.previewUrl.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
      });
    };
  }, []);

  const updateForm = <K extends keyof ReportForm>(key: K, value: ReportForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handlePhotoUpload = (result: { successful?: Array<Record<string, unknown>> }) => {
    if (!result.successful?.length) return;

    const newPhotos = result.successful.map((file) => {
      const uploaderFile = file as Parameters<typeof mapUploaderResultToPending>[0] & { file?: File };
      const pending = mapUploaderResultToPending(uploaderFile);
      const registration = mapUploaderResultForRegistration(uploaderFile);
      const rawFile = uploaderFile.file;
      return {
        fileName: registration.fileName,
        objectUrl: registration.objectUrl,
        objectPath: registration.objectPath,
        type: registration.fileType,
        previewUrl: rawFile instanceof File ? URL.createObjectURL(rawFile) : pending.objectUrl,
      };
    });

    setPendingPhotos((current) => [...current, ...newPhotos]);
    toast({
      title: "Photo added",
      description: `${newPhotos.length} photo${newPhotos.length === 1 ? "" : "s"} ready to submit`,
    });
  };

  const removePendingPhoto = (index: number) => {
    setPendingPhotos((current) => {
      const photo = current[index];
      if (photo?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  };

  const attachedPhotos = pendingPhotos.filter(
    (photo): photo is PendingPhoto & { objectPath: string } => Boolean(photo.objectPath),
  );

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
    if (!form.description.trim()) {
      toast({
        title: "Description required",
        description: "Tell us what you saw so maintenance can find it.",
        variant: "destructive",
      });
      return false;
    }
    if (attachedPhotos.length === 0) {
      toast({
        title: "Photo required",
        description: "Add a photo of the problem so maintenance can see it.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateLocation = () => {
    if (!form.propertyId) {
      toast({ title: "Location required", description: "Select the building or property.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateContact = () => {
    if (!form.requesterName.trim()) {
      toast({ title: "Name required", description: "Add your name so we know who reported this.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateCurrentStep = () => {
    if (step === 0) return validateDetails();
    if (step === 1) return validateLocation();
    return validateDetails() && validateLocation() && validateContact();
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleSubmit = () => {
    if (!validateCurrentStep()) return;
    submitMutation.mutate();
  };

  if (submittedNumber) {
    return (
      <div className="min-h-dvh bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto" />
            <div className="space-y-1">
              <h1 className="text-xl font-semibold" data-testid="text-report-submitted">
                Report sent
              </h1>
              <p className="text-sm text-muted-foreground">
                Maintenance has your request{" "}
                <span className="font-medium text-foreground">{submittedNumber}</span>
                . You do not need an account to follow up — someone will take it from here.
              </p>
            </div>
            <Button className="w-full h-11" onClick={() => (window.location.href = "/login")} data-testid="button-back-to-login">
              Back to sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b px-3 sm:px-4 py-3 space-y-3">
        <div className="mx-auto w-full max-w-lg space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary shrink-0" />
                <h1 className="text-lg font-semibold tracking-tight truncate">Report a problem</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{currentStep.description}</p>
            </div>
            <a
              href="/login"
              className="inline-flex items-center gap-1 shrink-0 min-h-9 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              data-testid="link-report-sign-in"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Sign in</span>
              <span className="sm:hidden">Sign in</span>
            </a>
          </div>

          <Progress value={progressValue} className="h-1.5" />

          <div className="flex items-center gap-2" aria-label="Report progress">
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
      </div>

      <div
        className="flex-1 overflow-y-auto px-3 sm:px-4 pt-4"
        style={{ paddingBottom: "calc(8.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto w-full max-w-lg space-y-4">
          <div className="sr-only" aria-hidden="true">
            <Label htmlFor="report-website">Website</Label>
            <Input
              id="report-website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(event) => updateForm("website", event.target.value)}
              data-testid="input-report-honeypot"
            />
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <div className={sectionCard.summary}>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="public-report-name" className="flex items-center gap-1.5 text-blue-800 dark:text-blue-200">
                    <ClipboardList className="w-4 h-4 shrink-0" />
                    What&apos;s the problem?
                  </Label>
                  <span
                    className={`text-xs tabular-nums font-medium ${
                      summaryLength > PUBLIC_REQUEST_SUMMARY_MAX
                        ? "text-destructive"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {summaryLength}/{PUBLIC_REQUEST_SUMMARY_MAX}
                  </span>
                </div>
                <Input
                  id="public-report-name"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value.slice(0, PUBLIC_REQUEST_SUMMARY_MAX))}
                  placeholder="e.g. Leaking pipe, No heat in room 204"
                  className={touchInputClass}
                  autoComplete="off"
                  maxLength={PUBLIC_REQUEST_SUMMARY_MAX}
                  data-testid="input-report-title"
                />
                <p className="text-xs text-blue-700/80 dark:text-blue-300/80">
                  Short headline only — not the full description.
                </p>
              </div>

              <div className={sectionCard.details}>
                <Label htmlFor="public-report-description" className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                  <FileText className="w-4 h-4 shrink-0" />
                  What did you see?
                </Label>
                <Textarea
                  id="public-report-description"
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                  placeholder="Where exactly? What does it look, sound, or smell like? When did you notice it? Any safety concerns?"
                  className="min-h-[120px] sm:min-h-[140px] text-base sm:text-sm resize-y bg-background"
                  data-testid="textarea-report-description"
                />
              </div>

              <div className={sectionCard.photo}>
                <Label className="flex items-center gap-1.5 text-violet-800 dark:text-violet-200">
                  <Camera className="w-4 h-4 shrink-0" />
                  Photo of the problem
                </Label>
                <p className="text-xs text-violet-700/80 dark:text-violet-300/80">
                  Required — take a picture so maintenance can see the issue.
                </p>
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={10485760}
                  accept="image/*"
                  onGetUploadParameters={getSignedPublicUploadParameters}
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
                  buttonTestId="button-report-upload"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {pendingPhotos.length === 0 ? "Take or upload a photo" : "Add another photo"}
                </ObjectUploader>

                {pendingPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {pendingPhotos.map((photo, index) => (
                      <div
                        key={`${photo.objectPath || photo.objectUrl}-${index}`}
                        className="relative aspect-square rounded-md overflow-hidden border-2 border-violet-200 dark:border-violet-700 bg-background"
                        data-testid={`report-photo-${index}`}
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
                          data-testid={`button-remove-report-photo-${index}`}
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
                <div className="grid grid-cols-3 gap-2">
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
                      data-testid={`button-report-urgency-${level}`}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
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
                    setForm((current) => ({
                      ...current,
                      propertyId: value,
                      spaceId: "",
                    }));
                  }}
                  disabled={isPropertiesLoading || isPropertiesError}
                >
                  <SelectTrigger className={touchSelectClass} data-testid="select-report-property">
                    <SelectValue
                      placeholder={
                        isPropertiesLoading
                          ? "Loading locations..."
                          : isPropertiesError
                            ? "Could not load locations"
                            : "Select building or property"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedProperties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        <PropertySelectLabel property={property} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isBuilding && spaces.length > 0 && (
                <div className={sectionCard.location}>
                  <Label className="text-emerald-800 dark:text-emerald-200">
                    Room or area <span className="font-normal text-emerald-700/80 dark:text-emerald-300/80">(optional)</span>
                  </Label>
                  <Select
                    value={form.spaceId || "__none__"}
                    onValueChange={(value) => updateForm("spaceId", value === "__none__" ? "" : value)}
                  >
                    <SelectTrigger className={touchSelectClass} data-testid="select-report-space">
                      <SelectValue placeholder="Not sure — leave blank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SpaceSelectItems spaces={spaces} noneLabel="Not sure / whole building" />
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className={sectionCard.contact}>
                <Label htmlFor="public-report-requester" className="flex items-center gap-1.5 text-sky-800 dark:text-sky-200">
                  <User className="w-4 h-4 shrink-0" />
                  Your name
                </Label>
                <p className="text-xs text-sky-700/80 dark:text-sky-300/80">
                  Required — so we know who reported this.
                </p>
                <Input
                  id="public-report-requester"
                  value={form.requesterName}
                  onChange={(event) => updateForm("requesterName", event.target.value)}
                  placeholder="So we know who reported this"
                  className={touchInputClass}
                  autoComplete="name"
                  data-testid="input-report-name"
                />
                <Label htmlFor="public-report-phone" className="flex items-center gap-1.5 text-sky-800 dark:text-sky-200 pt-2">
                  <Phone className="w-4 h-4 shrink-0" />
                  Phone <span className="font-normal text-sky-700/80 dark:text-sky-300/80">(optional)</span>
                </Label>
                <Input
                  id="public-report-phone"
                  type="tel"
                  value={form.requesterPhone}
                  onChange={(event) => updateForm("requesterPhone", event.target.value)}
                  placeholder="If we need to follow up"
                  className={touchInputClass}
                  autoComplete="tel"
                  data-testid="input-report-phone"
                />
              </div>

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
                        key={`review-${photo.objectPath || photo.objectUrl}-${index}`}
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
                <p className="font-medium break-words text-emerald-950 dark:text-emerald-50">
                  {selectedProperty?.name}
                  {selectedSpace ? ` / ${selectedSpace.name}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background px-3 pt-3 shadow-lg sm:px-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto flex max-w-lg gap-2">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
              disabled={submitMutation.isPending}
              data-testid="button-report-back"
            >
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              type="button"
              className="flex-1 h-11"
              onClick={handleNext}
              data-testid="button-report-next"
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 h-11"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              data-testid="button-report-submit"
            >
              {submitMutation.isPending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send report
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
