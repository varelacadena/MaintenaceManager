import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, Plus, Send, X } from "lucide-react";
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

const MIN_NOTE_LENGTH = 20;

type FieldJobForm = {
  name: string;
  locationDetail: string;
  description: string;
  urgency: "low" | "medium" | "high";
  propertyId: string;
  vehicleId: string;
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
};

const fieldCard = "rounded-lg border bg-card p-4 space-y-2";
const touchControl = "h-11 text-base sm:text-sm bg-background";

export default function TechnicianFieldJob() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<FieldJobForm>(defaultForm);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);

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
        description: "The office can see the location, notes, and photo on this job.",
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
    const notes = form.description.trim();

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
    if (notes.length < MIN_NOTE_LENGTH) {
      toast({
        title: "Work notes required",
        description: "Write what you found and what needs to be done. A few words is not enough.",
        variant: "destructive",
      });
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
    if (pendingPhotos.length === 0) {
      toast({
        title: "Photo required",
        description: "Add a photo so the office can see the problem.",
        variant: "destructive",
      });
      return;
    }

    createFieldJobMutation.mutate();
  };

  return (
    <div className="min-h-full flex flex-col max-w-lg mx-auto w-full">
      <div className="border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-muted-foreground shrink-0" />
          <h1 className="text-lg font-semibold tracking-tight">Add job</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Record the work so the office can identify it later.
        </p>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 0px))" }}
      >
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
          <Label htmlFor="field-job-description">Work notes</Label>
          <Textarea
            id="field-job-description"
            value={form.description}
            onChange={(event) => updateForm("description", event.target.value)}
            placeholder="What is wrong, what you already checked, and what still needs to be done."
            className="min-h-[120px] text-base sm:text-sm resize-y bg-background"
            data-testid="textarea-field-job-description"
          />
          <p className="text-xs text-muted-foreground">
            Required. This is the record the office uses to track the job.
          </p>
        </div>

        <div className={fieldCard}>
          <Label>Photo</Label>
          <p className="text-xs text-muted-foreground">Required. Show the problem.</p>
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
            buttonClassName="w-full h-11"
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
                className={`h-11 ${form.urgency === level ? "bg-foreground text-background border-foreground hover:bg-foreground hover:text-background" : ""}`}
                onClick={() => updateForm("urgency", level)}
                data-testid={`button-field-job-urgency-${level}`}
              >
                {label}
              </Button>
            ))}
          </div>
          <Select
            value={form.urgency}
            onValueChange={(value) => updateForm("urgency", value as FieldJobForm["urgency"])}
          >
            <SelectTrigger className={`${touchControl} hidden`} data-testid="select-field-job-urgency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Normal</SelectItem>
              <SelectItem value="high">Urgent</SelectItem>
            </SelectContent>
          </Select>
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
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background px-4 pt-3"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto max-w-lg">
          <Button
            type="button"
            className="w-full h-11"
            onClick={handleSubmit}
            disabled={createFieldJobMutation.isPending}
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
