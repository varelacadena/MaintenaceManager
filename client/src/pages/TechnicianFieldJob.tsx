import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ClipboardList, MapPin, Plus, Send } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { invalidateTaskAfterMutation } from "@/lib/taskQueryInvalidation";
import { isAutoShopName } from "@/lib/autoShopUtils";
import { sortByName } from "@/lib/propertyDisplayUtils";

type FieldJobForm = {
  name: string;
  description: string;
  urgency: "low" | "medium" | "high";
  propertyId: string;
  vehicleId: string;
  areaId: string;
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

const touchInputClass = "h-11 text-base sm:text-sm";
const touchSelectClass = "h-11 text-base sm:text-sm";

export default function TechnicianFieldJob() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FieldJobForm>(defaultForm);

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
      return response.json() as Promise<Task>;
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

  const validateDetails = () => {
    if (!form.name.trim()) {
      toast({ title: "Job name required", description: "Add a short name for this job.", variant: "destructive" });
      return false;
    }
    if (!form.description.trim()) {
      toast({ title: "Description required", description: "Describe what needs to be done.", variant: "destructive" });
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
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : isComplete
                    ? "border-primary/40 bg-primary/5 text-primary"
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
            <div className="space-y-2">
              <Label htmlFor="field-job-name">Job name</Label>
              <Input
                id="field-job-name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Example: Broken handrail"
                className={touchInputClass}
                autoComplete="off"
                data-testid="input-field-job-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-job-description">What needs to be done?</Label>
              <Textarea
                id="field-job-description"
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                placeholder="Describe what you found and any details that will help later."
                className="min-h-[120px] sm:min-h-[140px] text-base sm:text-sm resize-y"
                data-testid="textarea-field-job-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Urgency</Label>
              <div className="grid grid-cols-3 gap-2 sm:hidden">
                {(["low", "medium", "high"] as const).map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant={form.urgency === level ? "default" : "outline"}
                    className="h-11 capitalize"
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
            <div className="space-y-2">
              <Label>Property</Label>
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
                      {property.name}
                      {property.address && (
                        <span className="text-muted-foreground ml-1">({property.address})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Property is required for technician-created jobs.</p>
            </div>

            {showVehicle && (
              <div className="space-y-2">
                <Label>Vehicle</Label>
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

            <div className="space-y-2">
              <Label>Department</Label>
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
                  <SelectItem value="__none__">No department</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ClipboardList className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold break-words">{form.name}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{form.description}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm min-w-0">
                  <p className="font-medium break-words">{selectedProperty?.name}</p>
                  {selectedVehicle && (
                    <p className="text-muted-foreground break-words">
                      {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.vehicleId})
                    </p>
                  )}
                  {selectedArea && <p className="text-muted-foreground break-words">{selectedArea.name}</p>}
                </div>
              </div>
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
