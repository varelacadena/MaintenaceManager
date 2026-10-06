import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, MapPin, Calendar } from "lucide-react";
import { TaskLocationFields } from "@/components/task-form/TaskLocationFields";
import { TaskDateFields } from "@/components/task-form/TaskDateFields";
import { TaskRecurringFields } from "@/components/task-form/TaskRecurringFields";
import type { NewTaskContext } from "./useNewTask";

export interface NewTaskFormSectionsProps {
  ctx: NewTaskContext;
}

export function LeftColumnSections({ ctx }: NewTaskFormSectionsProps) {
  const {
    user,
    form, selectedPropertyId, setSelectedPropertyId,
    selectedSpaceId, setSelectedSpaceId,
    selectedProperty, isBuilding,
    properties, spaces, equipment, allVehicles,
    showVehicle,
    selectedAssets, handleAddAsset, handleRemoveAsset, multiAssetMode,
    locationScope, setLocationScope, setSelectedAssets,
    selectedPropertyIds, setSelectedPropertyIds,
    equipmentForm, setPendingEquipmentFiles,
    setIsEquipmentDialogOpen, setIsSpaceDialogOpen,
    taskType,
    lifeSafetyRound, lifeSafetyDetectors, lifeSafetySigns, enableLifeSafetyRound,
  } = ctx;

  const hideSpaceAndEquipment = user?.role === "technician" || lifeSafetyRound;

  return (
    <>
      <section className="border-b border-border/50 pb-8 space-y-4" data-testid="section-details">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Details</h2>
        </div>
        <div className="space-y-4">
          <div
            role="checkbox"
            aria-checked={lifeSafetyRound}
            tabIndex={0}
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left min-h-12 cursor-pointer ${lifeSafetyRound ? "border-primary bg-primary/5" : "border-border"}`}
            data-testid="button-life-safety-round"
            onClick={() => enableLifeSafetyRound(!lifeSafetyRound)}
            onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                enableLifeSafetyRound(!lifeSafetyRound);
              }
            }}
          >
            <Checkbox
              checked={lifeSafetyRound}
              tabIndex={-1}
              className="mt-1 pointer-events-none"
            />
            <span>
              <span className="block text-base font-medium">Life safety round</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                Weekly smoke detector and exit sign check. The list comes from the property.
              </span>
            </span>
          </div>
          {lifeSafetyRound && locationScope === "single" && selectedPropertyId && (
            <p className="text-sm text-muted-foreground" data-testid="text-life-safety-count">
              {lifeSafetyDetectors} smoke detector{lifeSafetyDetectors === 1 ? "" : "s"} and {lifeSafetySigns} exit sign{lifeSafetySigns === 1 ? "" : "s"} will be on this list.
            </p>
          )}
          {lifeSafetyRound && locationScope === "multiple" && (
            <p className="text-sm text-muted-foreground">
              Each property gets its own weekly job. The list is the smoke detectors and exit signs on that property.
            </p>
          )}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Task Name (e.g. Fix leaking pipe in Science Lab)"
                    className="text-lg py-6 placeholder:text-muted-foreground/60"
                    {...field}
                    data-testid="input-task-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide detailed information about the issue..."
                    className="min-h-[120px] resize-y"
                    {...field}
                    data-testid="textarea-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </section>

      <section className="border-b border-border/50 pb-8 space-y-4" data-testid="section-location">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{hideSpaceAndEquipment ? "Location" : "Location & Equipment"}</h2>
        </div>
        <TaskLocationFields
          form={form}
          properties={properties}
          spaces={spaces}
          equipment={equipment}
          vehicles={allVehicles}
          selectedPropertyId={selectedPropertyId}
          setSelectedPropertyId={setSelectedPropertyId}
          selectedSpaceId={selectedSpaceId}
          setSelectedSpaceId={setSelectedSpaceId}
          isBuilding={isBuilding}
          selectedProperty={selectedProperty}
          onAddSpace={() => setIsSpaceDialogOpen(true)}
          showEquipmentCreate={!hideSpaceAndEquipment}
          onAddEquipment={hideSpaceAndEquipment ? undefined : () => {
            equipmentForm.reset({
              name: "",
              category: "other",
              description: "",
              serialNumber: "",
              condition: "",
              notes: "",
              imageUrl: "",
            });
            setPendingEquipmentFiles([]);
            setIsEquipmentDialogOpen(true);
          }}
          selectedAssets={selectedAssets}
          onAddAsset={handleAddAsset}
          onRemoveAsset={handleRemoveAsset}
          multiAssetMode={multiAssetMode}
          locationScope={locationScope}
          onLocationScopeChange={(scope) => {
            setLocationScope(scope);
            if (scope !== "single") {
              setSelectedAssets([]);
              form.setValue("equipmentId", undefined);
              form.setValue("vehicleId", undefined);
            }
          }}
          selectedPropertyIds={selectedPropertyIds}
          onSelectedPropertyIdsChange={setSelectedPropertyIds}
          showVehicle={showVehicle}
          hideSpaceAndEquipment={hideSpaceAndEquipment}
          hideCampusScope={lifeSafetyRound}
        />
      </section>

      <section className="border-b border-border/50 pb-8 space-y-4" data-testid="section-schedule">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Schedule</h2>
        </div>
        <div className="space-y-4">
          <TaskDateFields form={form} />
          {lifeSafetyRound ? (
            <p className="text-sm text-muted-foreground rounded-lg border bg-muted/50 p-4">
              This repeats every week. The next week is created even if this round is still open. Change who it is assigned to on the open job when the usual person should change.
            </p>
          ) : (
            <TaskRecurringFields form={form} taskType={taskType} />
          )}
        </div>
      </section>
    </>
  );
}

export function ContactOptionsSection({ ctx }: NewTaskFormSectionsProps) {
  const {
    form, assignmentOption,
    contactType, setContactType,
    requestId, request, requester,
  } = ctx;

  const guestReporter = !requester && request?.requesterName
    ? {
        name: request.requesterName,
        email: request.requesterEmail,
        phone: request.requesterPhone,
      }
    : null;
  const reporter = requester
    ? {
        name: `${requester.firstName || ""} ${requester.lastName || ""}`.trim(),
        email: requester.email,
        phone: requester.phoneNumber,
      }
    : guestReporter;

  return (
    <>
      <div className="space-y-3 pt-4 border-t border-border/50">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</Label>
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {requestId && reporter && (
              <Button
                type="button"
                variant={contactType === "requester" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setContactType("requester");
                  form.setValue("contactType", "requester");
                  form.setValue("contactName", reporter.name);
                  form.setValue("contactEmail", reporter.email || "");
                  form.setValue("contactPhone", reporter.phone || "");
                }}
                data-testid="button-contact-requester"
              >
                Requester
              </Button>
            )}
            <Button
              type="button"
              variant={contactType === "other" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setContactType("other");
                form.setValue("contactType", "other");
              }}
              data-testid="button-contact-other"
            >
              Other
            </Button>
          </div>
          {contactType === "requester" && reporter && (
            <div className="p-3 rounded-md border bg-muted/30 text-sm space-y-1" data-testid="contact-requester-info">
              <p><span className="text-muted-foreground">Contact:</span> {reporter.name}</p>
              {reporter.email && <p><span className="text-muted-foreground">Email:</span> {reporter.email}</p>}
              {reporter.phone && <p><span className="text-muted-foreground">Phone:</span> {reporter.phone}</p>}
            </div>
          )}
            {contactType === "other" && (
              <div className="grid gap-2">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Contact name" className="bg-background" {...field} data-testid="input-contact-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="email" placeholder="Email" className="bg-background" {...field} data-testid="input-contact-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="tel" placeholder="Phone" className="bg-background" {...field} data-testid="input-contact-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-border/50">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Options</Label>
        <div className="space-y-2.5">
          <FormField
            control={form.control}
            name="requiresEstimate"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-requires-estimate"
                  />
                </FormControl>
                <FormLabel className="text-sm font-medium leading-none cursor-pointer">
                  Require cost estimate before work
                </FormLabel>
              </FormItem>
            )}
          />
          {assignmentOption === "student" && (
            <FormField
              control={form.control}
              name="requiresPhoto"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-requires-photo"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium leading-none cursor-pointer">
                    Require completion photo
                  </FormLabel>
                </FormItem>
              )}
            />
          )}
        </div>
      </div>

      {assignmentOption === "student" && (
        <div className="space-y-1.5 pt-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Instructions</Label>
          <FormField
            control={form.control}
            name="instructions"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Step-by-step instructions for the student..."
                    className="min-h-[80px] resize-none bg-background text-sm"
                    data-testid="input-instructions"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </>
  );
}
