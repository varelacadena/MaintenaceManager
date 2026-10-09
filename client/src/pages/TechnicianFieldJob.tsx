import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, Send, X } from "lucide-react";
import type { Property, Task, Vehicle } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { PropertySelectLabel } from "@/components/PropertySelectItems";
import {
  getSignedUploadParameters,
  mapUploaderResultForRegistration,
  mapUploaderResultToPending,
} from "@/lib/uploadUtils";
import { toDisplayUrl } from "@/lib/imageUtils";
import { addCalendarDays, localDayKey, rollingTechDays } from "@/pages/Work/techWorkSchedule";

const MIN_DESCRIPTION_LENGTH = 20;

type FieldJobForm = {
  name: string;
  locationDetail: string;
  description: string;
  urgency: "low" | "medium" | "high";
  propertyId: string;
  vehicleId: string;
  workDate: string;
};

type PendingPhoto = {
  fileName: string;
  fileType: string;
  objectUrl: string;
  objectPath?: string;
  previewUrl: string;
};

const defaultForm: FieldJobForm = {
  name: "",
  locationDetail: "",
  description: "",
  urgency: "medium",
  propertyId: "",
  vehicleId: "",
  workDate: "",
};

const fieldCard = "rounded-lg border bg-card p-4 space-y-2";
const touchControl = "h-11 text-base sm:text-sm bg-background";

export default function TechnicianFieldJob() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<FieldJobForm>(() => ({ ...defaultForm, workDate: localDayKey(new Date()) }));
  const [laterDay, setLaterDay] = useState(false);
  const workDays = useMemo(() => rollingTechDays(new Date()), []);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [photoUploadBusy, setPhotoUploadBusy] = useState(false);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles/for-task-selection"],
  });

  const sortedProperties = useMemo(() => sortByName(properties), [properties]);
  const selectedProperty = properties.find((property) => property.id === form.propertyId);
  const showVehicle = isAutoShopName(selectedProperty?.name);

  const createFieldJobMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/tasks/field-job", {
        name: form.name.trim(),
        locationDetail: form.locationDetail.trim(),
        description: form.description.trim(),
        urgency: form.urgency,
        workDate: form.workDate,
        propertyId: form.propertyId,
        vehicleId: form.vehicleId || undefined,
        photos: pendingPhotos.map((photo) => ({
          fileName: photo.fileName,
          fileType: photo.fileType,
          objectUrl: photo.objectUrl,
          objectPath: photo.objectPath,
        })),
      });
      return (await response.json()) as Task;
    },
    onSuccess: (task) => {
      invalidateTaskAfterMutation(task.id, { broad: true });
      toast({
        title: "Job added",
        description: "The office can see the location and description on this job.",
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
      const registered = mapUploaderResultForRegistration(file as Parameters<typeof mapUploaderResultForRegistration>[0]);
      return {
        fileName: registered.fileName,
        fileType: registered.fileType,
        objectUrl: registered.objectUrl,
        objectPath: registered.objectPath,
        previewUrl: toDisplayUrl(pending.objectUrl),
      };
    });

    setPendingPhotos((current) => [...current, ...newPhotos]);
  };

  const handleSubmit = () => {
    const title = form.name.trim();
    const spot = form.locationDetail.trim();
    const description = form.description.trim();

    if (title.length < 3) {
      toast({
        title: "Job title required",
        description: "Name the work so it can be found later. Example: Replace rear door seal.",
        variant: "destructive",
      });
      return;
    }
    if (spot.length < 2) {
      toast({
        title: "Exact location required",
        description: "Add the room, door, vehicle, or spot. Example: Vehicle 26, rear door.",
        variant: "destructive",
      });
      return;
    }
    if (description.length < MIN_DESCRIPTION_LENGTH) {
      toast({
        title: "Description required",
        description: "Write what you found and what needs to be done. A few words is not enough.",
        variant: "destructive",
      });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.workDate)) {
      toast({ title: "Work day required", description: "Choose the day you will do this job.", variant: "destructive" });
      return;
    }
    if (!form.propertyId) {
      toast({ title: "Building required", description: "Select where this job is.", variant: "destructive" });
      return;
    }
    if (showVehicle && !form.vehicleId) {
      toast({ title: "Vehicle required", description: "Select the vehicle this work is for.", variant: "destructive" });
      return;
    }

    createFieldJobMutation.mutate();
  };

  return (
    <div className="flex h-full min-h-0 flex-col max-w-lg mx-auto w-full min-w-0 overflow-hidden">
      <div className="border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/work")}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Back to My Tasks"
            data-testid="button-back-field-job"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight">Add job</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Record the work so the office can identify it later.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        <div className={fieldCard}>
          <Label htmlFor="field-job-name">Job title</Label>
          <Input
            id="field-job-name"
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
            placeholder="Replace rear door seal"
            className={touchControl}
            autoComplete="off"
            maxLength={120}
            data-testid="input-field-job-name"
          />
          <p className="text-xs text-muted-foreground">
            A specific name. Put the room or vehicle in the location field, not the title.
          </p>
        </div>

        <div className={fieldCard}>
          <Label htmlFor="field-job-location">Exact location</Label>
          <Input
            id="field-job-location"
            value={form.locationDetail}
            onChange={(event) => updateForm("locationDetail", event.target.value)}
            placeholder="Vehicle 26, rear door"
            className={touchControl}
            autoComplete="off"
            maxLength={160}
            data-testid="input-field-job-location"
          />
          <p className="text-xs text-muted-foreground">
            Room, door, vehicle number, or the spot on site.
          </p>
        </div>

        <div className={fieldCard}>
          <Label htmlFor="field-job-description">Description</Label>
          <Textarea
            id="field-job-description"
            value={form.description}
            onChange={(event) => updateForm("description", event.target.value)}
            placeholder="What is wrong and what needs to be done."
            className="min-h-[120px] text-base sm:text-sm resize-y bg-background"
            data-testid="textarea-field-job-description"
          />
          <p className="text-xs text-muted-foreground">
            Required. This stays on the job as the description.
          </p>
        </div>

        <div className={fieldCard}>
          <Label>Photo <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <p className="text-xs text-muted-foreground">A picture helps the office see the problem. You can add one later.</p>
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
            wrapperClassName="w-full sm:w-full"
            buttonClassName="h-auto min-h-11 w-full sm:w-full whitespace-normal px-3"
            onBusyChange={setPhotoUploadBusy}
          >
            <Camera className="w-4 h-4 mr-2" />
            {pendingPhotos.length === 0 ? "Take or upload a photo" : "Add another photo"}
          </ObjectUploader>
          {pendingPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {pendingPhotos.map((photo, index) => (
                <div
                  key={`${photo.objectUrl}-${index}`}
                  className="relative aspect-square rounded-md overflow-hidden border bg-background"
                  data-testid={`field-job-photo-${index}`}
                >
                  <img src={photo.previewUrl} alt={photo.fileName} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 rounded-full bg-background/90 p-1"
                    onClick={() => setPendingPhotos((current) => current.filter((_, i) => i !== index))}
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

        <div className={fieldCard}>
          <Label>Priority</Label>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["low", "Low"],
              ["medium", "Normal"],
              ["high", "Urgent"],
            ] as const).map(([level, label]) => (
              <Button
                key={level}
                type="button"
                variant="outline"
                className={`h-11 px-2 ${form.urgency === level ? "bg-foreground text-background border-foreground hover:bg-foreground hover:text-background" : ""}`}
                onClick={() => updateForm("urgency", level)}
                data-testid={`button-field-job-urgency-${level}`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className={fieldCard}>
          <Label>Work day</Label>
          <div className="grid grid-cols-7 gap-1">
            {workDays.map((day) => {
              const selected = !laterDay && form.workDate === day.key;
              return (
                <Button
                  key={day.key}
                  type="button"
                  variant="outline"
                  className={`h-14 w-full min-w-0 px-0 flex-col gap-0.5 whitespace-normal ${selected ? "bg-foreground text-background border-foreground hover:bg-foreground hover:text-background" : ""}`}
                  onClick={() => {
                    setLaterDay(false);
                    updateForm("workDate", day.key);
                  }}
                  data-testid={`button-field-job-day-${day.key}`}
                >
                  <span className="text-[10px] leading-none">{day.short}</span>
                  <span className="text-sm leading-none font-semibold">{day.dateNum}</span>
                </Button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            className={`h-11 w-full ${laterDay ? "bg-foreground text-background border-foreground hover:bg-foreground hover:text-background" : ""}`}
            onClick={() => {
              setLaterDay(true);
              updateForm("workDate", addCalendarDays(workDays[0].key, 7));
            }}
            data-testid="button-field-job-day-later"
          >
            Later
          </Button>
          {laterDay && (
            <Input
              type="date"
              min={addCalendarDays(workDays[0].key, 7)}
              value={form.workDate}
              onChange={(event) => updateForm("workDate", event.target.value)}
              className={`${touchControl} w-full min-w-0 max-w-full`}
              data-testid="input-field-job-work-date"
            />
          )}
          <p className="text-xs text-muted-foreground">This is the day the job shows on My Tasks. If it is still open the next morning, it moves to that day.</p>
        </div>

        <div className={fieldCard}>
          <Label>Building</Label>
          <Select
            value={form.propertyId}
            onValueChange={(value) => {
              const property = sortedProperties.find((item) => item.id === value);
              setForm((current) => ({
                ...current,
                propertyId: value,
                vehicleId: isAutoShopName(property?.name) ? current.vehicleId : "",
              }));
            }}
          >
            <SelectTrigger className={touchControl} data-testid="select-field-job-property">
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
        </div>

        {showVehicle && (
          <div className={fieldCard}>
            <Label>Vehicle</Label>
            <Select
              value={form.vehicleId || "__none__"}
              onValueChange={(value) => updateForm("vehicleId", value === "__none__" ? "" : value)}
            >
              <SelectTrigger className={touchControl} data-testid="select-field-job-vehicle">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select a vehicle</SelectItem>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} {vehicle.year} — {vehicle.vehicleId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Required for autoshop work.</p>
          </div>
        )}
      </div>

      <div
        className="shrink-0 border-t bg-background px-4 pt-3"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto w-full">
          <Button
            type="button"
            className="w-full h-11"
            onClick={handleSubmit}
            disabled={createFieldJobMutation.isPending || photoUploadBusy}
            data-testid="button-field-job-submit"
          >
            {createFieldJobMutation.isPending ? (
              "Adding..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Add job
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
