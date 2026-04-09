import { Label } from "@/components/ui/label";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";
import type { NewTaskFormSectionsProps } from "./NewTaskFormSections";
import { ContactOptionsSection } from "./NewTaskFormSections";

export function RightColumnSidebar({ ctx }: NewTaskFormSectionsProps) {
  const {
    form, assignmentOption, setAssignmentOption,
    selectedVendorId, setSelectedVendorId,
    taskType, setTaskType,
    technicianUsers, studentUsers,
    vendors, projects,
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

      <ContactOptionsSection ctx={ctx} />
    </div>
  );
}
