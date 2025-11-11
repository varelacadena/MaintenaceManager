
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTaskSchema } from "@shared/schema";
import type { Property, Equipment, User, Vendor, Task } from "@shared/schema";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";

const formSchema = insertTaskSchema.extend({
  initialDate: z.string().min(1, "Please select a start date"),
  estimatedCompletionDate: z.string().min(1, "Please select an estimated completion date"),
  propertyId: z.string().min(1, "Please select a property"),
  equipmentId: z.string().min(1, "Please select equipment"),
  contactType: z.enum(["requester", "staff", "other"]).optional(),
  contactStaffId: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditTask() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [taskType, setTaskType] = useState<"one_time" | "recurring" | "reminder">("one_time");
  const [assignmentType, setAssignmentType] = useState<"maintenance" | "vendor" | "">("");
  const [isTaskLoaded, setIsTaskLoaded] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");

  const { data: task, isLoading: taskLoading } = useQuery<Task>({
    queryKey: ["/api/tasks", id],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment", selectedPropertyId],
    enabled: !!selectedPropertyId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/equipment?propertyId=${selectedPropertyId}`);
      return response.json();
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin" || user?.role === "maintenance",
  });

  // Filter to only show maintenance and admin users (backend already filters for maintenance users)
  const maintenanceUsers = users.filter(u => u.role === "maintenance" || u.role === "admin");

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requestId: undefined,
      name: "",
      description: "",
      urgency: "medium",
      initialDate: new Date().toISOString().split("T")[0],
      estimatedCompletionDate: "",
      propertyId: "",
      equipmentId: "",
      assignedToId: undefined,
      assignedVendorId: undefined,
      taskType: "one_time",
      status: "not_started",
      onHoldReason: undefined,
      createdById: user?.id || "",
      recurringFrequency: undefined,
      recurringInterval: undefined,
      recurringEndDate: undefined,
      contactType: undefined,
      contactStaffId: undefined,
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  useEffect(() => {
    if (task && !isTaskLoaded) {
      form.setValue("requestId", task.requestId || undefined);
      form.setValue("name", task.name);
      form.setValue("description", task.description);
      form.setValue("urgency", task.urgency);
      form.setValue("taskType", task.taskType);
      setTaskType(task.taskType);
      form.setValue("status", task.status);
      form.setValue("onHoldReason", task.onHoldReason || undefined);
      if (task.recurringFrequency) {
        form.setValue("recurringFrequency", task.recurringFrequency);
      }
      if (task.recurringInterval) {
        form.setValue("recurringInterval", task.recurringInterval);
      }
      if (task.recurringEndDate) {
        form.setValue("recurringEndDate", task.recurringEndDate);
      }
      form.setValue("initialDate", new Date(task.initialDate).toISOString().split("T")[0]);
      if (task.estimatedCompletionDate) {
        form.setValue("estimatedCompletionDate", new Date(task.estimatedCompletionDate).toISOString().split("T")[0]);
      }
      if (task.propertyId) {
        form.setValue("propertyId", task.propertyId);
        setSelectedPropertyId(task.propertyId);
      }
      if (task.equipmentId) {
        form.setValue("equipmentId", task.equipmentId);
      }
      
      // Set assignment type based on what's assigned
      if (task.assignedToId) {
        form.setValue("assignedToId", task.assignedToId);
        setAssignmentType("maintenance");
      } else if (task.assignedVendorId) {
        form.setValue("assignedVendorId", task.assignedVendorId);
        setSelectedVendorId(task.assignedVendorId);
        setAssignmentType("vendor");
      } else {
        setAssignmentType("");
      }
      
      // Load contact information
      if (task.contactType) {
        form.setValue("contactType", task.contactType);
      }
      if (task.contactStaffId) {
        form.setValue("contactStaffId", task.contactStaffId);
      }
      if (task.contactName) {
        form.setValue("contactName", task.contactName);
      }
      if (task.contactEmail) {
        form.setValue("contactEmail", task.contactEmail);
      }
      if (task.contactPhone) {
        form.setValue("contactPhone", task.contactPhone);
      }
      
      form.setValue("createdById", task.createdById);
      setIsTaskLoaded(true);
    }
  }, [task, form, isTaskLoaded]);

  // Auto-populate contact info when vendor is selected
  useEffect(() => {
    if (selectedVendorId && vendors.length > 0) {
      const vendor = vendors.find(v => v.id === selectedVendorId);
      if (vendor) {
        form.setValue("contactType", "other");
        form.setValue("contactName", vendor.contactPerson || vendor.name);
        form.setValue("contactEmail", vendor.email || "");
        form.setValue("contactPhone", vendor.phoneNumber || "");
        form.setValue("contactStaffId", undefined);
      }
    }
  }, [selectedVendorId, vendors, form]);

  const updateTaskMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const taskData = {
        name: data.name,
        description: data.description,
        urgency: data.urgency,
        initialDate: new Date(data.initialDate).toISOString(),
        estimatedCompletionDate: data.estimatedCompletionDate 
          ? new Date(data.estimatedCompletionDate).toISOString()
          : undefined,
        propertyId: data.propertyId || undefined,
        equipmentId: data.equipmentId || undefined,
        assignedToId: data.assignedToId || undefined,
        assignedVendorId: data.assignedVendorId || undefined,
        taskType: data.taskType,
        status: data.status,
        onHoldReason: data.onHoldReason || undefined,
        recurringFrequency: data.recurringFrequency || undefined,
        recurringInterval: data.recurringInterval || undefined,
        recurringEndDate: data.recurringEndDate || undefined,
      };
      const response = await apiRequest("PATCH", `/api/tasks/${id}`, taskData);
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });

      toast({
        title: "Task Updated",
        description: "The task has been updated successfully.",
      });
      navigate(`/tasks/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FormData) => {
    updateTaskMutation.mutate(data);
  };

  if (taskLoading) {
    return (
      <div className="p-6 text-center">
        <div>Loading task...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-center">
        <div>Task not found</div>
      </div>
    );
  }

  if (user?.role !== "admin" && user?.role !== "maintenance") {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">You don't have permission to edit tasks.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/tasks/${id}`)}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Edit Task
          </h1>
          <p className="text-muted-foreground mt-1">
            Update task details and assignments
          </p>
        </div>
      </div>

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter task name" 
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
                      placeholder="Describe the task in detail"
                      className="min-h-[100px]"
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-urgency">
                          <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Type *</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setTaskType(value as "one_time" | "recurring" | "reminder");
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-task-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="one_time">One Time</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      One-time tasks are completed once, recurring tasks repeat, reminders are notifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {taskType === "recurring" && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold">Recurring Parameters</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="recurringFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-recurring-frequency">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurringInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repeat Every</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="e.g., 1" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            value={field.value || ""}
                            data-testid="input-recurring-interval"
                          />
                        </FormControl>
                        <FormDescription>
                          Number of periods between occurrences
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="recurringEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-recurring-end-date"
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty for tasks that never end
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedPropertyId(value);
                      form.setValue("equipmentId", "");
                    }} 
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-property">
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="equipmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ""}
                    disabled={!selectedPropertyId}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-equipment">
                        <SelectValue placeholder="Select equipment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {equipment.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="initialDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        data-testid="input-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedCompletionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Est. Completion Date *</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-completion-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormItem>
                <FormLabel>Assign To (Optional)</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    setAssignmentType(value as "maintenance" | "vendor" | "");
                    // Clear both assignment fields when changing type
                    if (value === "maintenance") {
                      form.setValue("assignedVendorId", undefined);
                    } else if (value === "vendor") {
                      form.setValue("assignedToId", undefined);
                    } else {
                      form.setValue("assignedToId", undefined);
                      form.setValue("assignedVendorId", undefined);
                    }
                  }} 
                  value={assignmentType}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-assignment-type">
                      <SelectValue placeholder="Select assignment type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance Team</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>

              {assignmentType === "maintenance" && (
                <FormField
                  control={form.control}
                  name="assignedToId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Maintenance Staff</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-assigned-user">
                            <SelectValue placeholder="Select maintenance staff member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {maintenanceUsers.map((user) => (
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

              {assignmentType === "vendor" && (
                <FormField
                  control={form.control}
                  name="assignedVendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Vendor</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedVendorId(value);
                        }} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-assigned-vendor">
                            <SelectValue placeholder="Select vendor" />
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

            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold">Contact Information</h3>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter contact name" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-contact-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="Enter contact email" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-contact-email"
                        />
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
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel"
                          placeholder="Enter contact phone" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-contact-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/tasks/${id}`)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateTaskMutation.isPending}
                data-testid="button-submit"
              >
                {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
