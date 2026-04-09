import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
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
import { FileText, MapPin, Calendar, Users } from "lucide-react";
import { TaskLocationFields } from "@/components/task-form/TaskLocationFields";
import { TaskDateFields } from "@/components/task-form/TaskDateFields";
import { TaskRecurringFields } from "@/components/task-form/TaskRecurringFields";
import type { NewTaskContext } from "./useNewTask";

interface NewTaskFormSectionsProps {
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

export function RightColumnSidebar({ ctx }: NewTaskFormSectionsProps) {
  const {
    form, assignmentOption, setAssignmentOption,
    contactType, setContactType,
    selectedVendorId, setSelectedVendorId,
    taskType, setTaskType,
    users, technicianUsers, studentUsers,
    vendors, projects,
    requestId, requester,
    selectedHelperIds, setSelectedHelperIds,
  } = ctx;

  return (
    <div className="bg-muted/30 border rounded-xl p-5 shadow-sm space-y-6">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</Label>
        <FormField
          control={form.control}
          name="urgency"
          render={({ field }) => (
            <FormItem>
              <div className="flex gap-2" data-testid="select-urgency">
                {[
                  { value: "low", label: "Low", active: "bg-emerald-500 text-white border-emerald-600 shadow-sm", inactive: "bg-background text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400" },
                  { value: "medium", label: "Medium", active: "bg-amber-500 text-white border-amber-600 shadow-sm", inactive: "bg-background text-amber-600 border-amber-200 dark:border-amber-800 dark:text-amber-400" },
                  { value: "high", label: "High", active: "bg-red-500 text-white border-red-600 shadow-sm", inactive: "bg-background text-red-600 border-red-200 dark:border-red-800 dark:text-red-400" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors border ${
                      field.value === opt.value ? opt.active : opt.inactive
                    }`}
                    data-testid={`priority-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-4 pt-2 border-t border-border/50">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Type</Label>
          <FormField
            control={form.control}
            name="taskType"
            render={({ field }) => (
              <FormItem>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setTaskType(value as "one_time" | "recurring" | "reminder" | "project");
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background" data-testid="select-task-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="one_time">One-Time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Link to Project</Label>
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <Select
                  onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                  value={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background" data-testid="select-project">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.filter(p => p.status === "in_progress" || p.status === "planning").map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-border/50">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Assignment
        </Label>

        <div className="flex bg-background border rounded-md p-0.5" data-testid="select-assignment-option">
          {([
            { value: "technician", label: "Tech", executorType: "technician" as "student" | "technician" | undefined, pool: "technician_pool" as string | undefined },
            { value: "student", label: "Student", executorType: "student" as "student" | "technician" | undefined, pool: "student_pool" as string | undefined },
            { value: "vendor", label: "Vendor", executorType: undefined as "student" | "technician" | undefined, pool: undefined as string | undefined },
          ]).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setAssignmentOption(tab.value as "student" | "technician" | "vendor");
                form.setValue("assignedToId", undefined);
                form.setValue("assignedVendorId", undefined);
                form.setValue("executorType", tab.executorType);
                form.setValue("assignedPool", tab.pool);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                assignmentOption === tab.value
                  ? "bg-muted shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`assignment-tab-${tab.value}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {assignmentOption === "student" && (
          <FormField
            control={form.control}
            name="assignedToId"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger className="bg-background" data-testid="select-assigned-student">
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {studentUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {assignmentOption === "technician" && (
          <>
            <FormField
              control={form.control}
              name="assignedToId"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="bg-background" data-testid="select-assigned-user">
                        <SelectValue placeholder="Select a technician" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {technicianUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="p-3 border rounded-md bg-muted/30 space-y-2">
              <p className="text-xs font-medium">Student Helpers</p>
              <div className="flex flex-wrap gap-1.5">
                {studentUsers
                  .filter(s => s.id !== form.watch("assignedToId"))
                  .map((student) => {
                    const isSelected = selectedHelperIds.includes(student.id);
                    return (
                      <button
                        key={student.id}
                        type="button"
                        data-testid={`helper-toggle-${student.id}`}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover-elevate"
                        }`}
                        onClick={() => {
                          setSelectedHelperIds(prev =>
                            isSelected
                              ? prev.filter(id => id !== student.id)
                              : [...prev, student.id]
                          );
                        }}
                      >
                        {student.firstName && student.lastName
                          ? `${student.firstName} ${student.lastName}`
                          : student.username}
                      </button>
                    );
                  })}
              </div>
              {selectedHelperIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedHelperIds.length} helper{selectedHelperIds.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </>
        )}

        {assignmentOption === "vendor" && (
          <FormField
            control={form.control}
            name="assignedVendorId"
            render={({ field }) => (
              <FormItem>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedVendorId(value);
                  }}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background" data-testid="select-assigned-vendor">
                      <SelectValue placeholder="Choose a vendor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

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
    </div>
  );
}
