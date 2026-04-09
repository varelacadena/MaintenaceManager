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
    form, selectedPropertyId, setSelectedPropertyId,
    selectedSpaceId, setSelectedSpaceId,
    selectedProperty, isBuilding,
    properties, spaces, equipment, allVehicles,
    selectedAssets, handleAddAsset, handleRemoveAsset, multiAssetMode,
    locationScope, setLocationScope, setSelectedAssets,
    selectedPropertyIds, setSelectedPropertyIds,
    equipmentForm, setPendingEquipmentFiles,
    setIsEquipmentDialogOpen, setIsSpaceDialogOpen,
    taskType,
  } = ctx;

  return (
    <>
      <section className="border-b border-border/50 pb-8 space-y-4" data-testid="section-details">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Details</h2>
        </div>
        <div className="space-y-4">
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
          <h2 className="text-lg font-semibold">Location & Equipment</h2>
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
          showEquipmentCreate
          onAddEquipment={() => {
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
        />
      </section>

      <section className="border-b border-border/50 pb-8 space-y-4" data-testid="section-schedule">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Schedule</h2>
        </div>
        <div className="space-y-4">
          <TaskDateFields form={form} />
          <TaskRecurringFields form={form} taskType={taskType} />
        </div>
      </section>
    </>
  );
}

export function ContactOptionsSection({ ctx }: NewTaskFormSectionsProps) {
  const {
    form, assignmentOption,
    contactType, setContactType,
    users, requestId, requester,
  } = ctx;

  return (
    <>
      <div className="space-y-3 pt-4 border-t border-border/50">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</Label>
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {requestId && requester && (
              <Button
                type="button"
                variant={contactType === "requester" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setContactType("requester");
                  form.setValue("contactType", "requester");
                  form.setValue("contactStaffId", undefined);
                  form.setValue("contactName", `${requester.firstName || ""} ${requester.lastName || ""}`.trim());
                  form.setValue("contactEmail", requester.email || "");
                  form.setValue("contactPhone", requester.phoneNumber || "");
                }}
                data-testid="button-contact-requester"
              >
                Requester
              </Button>
            )}
            <Button
              type="button"
              variant={contactType === "staff" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setContactType("staff");
                form.setValue("contactType", "staff");
                form.setValue("contactName", "");
                form.setValue("contactEmail", "");
                form.setValue("contactPhone", "");
              }}
              data-testid="button-contact-staff"
            >
              Staff
            </Button>
            <Button
              type="button"
              variant={contactType === "other" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setContactType("other");
                form.setValue("contactType", "other");
                form.setValue("contactStaffId", undefined);
              }}
              data-testid="button-contact-other"
            >
              Other
            </Button>
          </div>
          {contactType === "requester" && requester && (
            <div className="p-3 rounded-md border bg-muted/30 text-sm space-y-1" data-testid="contact-requester-info">
              <p><span className="text-muted-foreground">Contact:</span> {requester.firstName} {requester.lastName}</p>
              {requester.email && <p><span className="text-muted-foreground">Email:</span> {requester.email}</p>}
              {requester.phoneNumber && <p><span className="text-muted-foreground">Phone:</span> {requester.phoneNumber}</p>}
            </div>
          )}
          {contactType === "staff" && (
              <FormField
                control={form.control}
                name="contactStaffId"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="bg-background" data-testid="select-contact-staff">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
