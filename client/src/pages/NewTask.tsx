import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTaskSchema, insertEquipmentSchema } from "@shared/schema";
import type { Area, Subdivision, User, Vendor, ServiceRequest, Property, Equipment } from "@shared/schema";
import { z } from "zod";
import { ArrowLeft, Plus, X, ListChecks } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const equipmentFormSchema = insertEquipmentSchema.omit({ propertyId: true }).extend({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
});

type EquipmentFormData = z.infer<typeof equipmentFormSchema>;

const formSchema = insertTaskSchema.extend({
  initialDate: z.string().min(1, "Please select a start date"),
  estimatedCompletionDate: z.string().min(1, "Please select an estimated completion date"),
  propertyId: z.string().min(1, "Please select a property"),
  equipmentId: z.string().min(1, "Please select equipment"),
  taskType: z.enum(["one_time", "recurring", "reminder"]),
  contactType: z.enum(["requester", "staff", "other"]).optional(),
  contactStaffId: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
}).refine((data) => {
  if (data.contactType === "staff" && !data.contactStaffId) {
    return false;
  }
  if (data.contactType === "other" && !data.contactName) {
    return false;
  }
  return true;
}, {
  message: "Please provide the required contact information",
  path: ["contactType"],
});

type FormData = z.infer<typeof formSchema>;

export default function NewTask() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  const searchParams = new URLSearchParams(window.location.search);
  const requestId = searchParams.get('requestId');

  const { data: request } = useQuery<ServiceRequest>({
    queryKey: ["/api/service-requests", requestId],
    enabled: !!requestId,
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
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

  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment", selectedPropertyId],
    enabled: !!selectedPropertyId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/equipment?propertyId=${selectedPropertyId}`);
      return response.json();
    },
  });

  const [taskType, setTaskType] = useState<"one_time" | "recurring" | "reminder">("one_time");
  const [assignmentType, setAssignmentType] = useState<"maintenance" | "vendor" | "">("");
  const [contactType, setContactType] = useState<"requester" | "staff" | "other">("staff");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  const [checklistItems, setChecklistItems] = useState<{ text: string; isCompleted: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const equipmentForm = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: "",
      category: "other",
      description: "",
      serialNumber: "",
      condition: "",
      notes: "",
      imageUrl: "",
    },
  });

  const createEquipmentMutation = useMutation({
    mutationFn: async (data: EquipmentFormData) => {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, propertyId: selectedPropertyId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (newEquipment: Equipment) => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment", selectedPropertyId] });
      form.setValue("equipmentId", newEquipment.id);
      setIsEquipmentDialogOpen(false);
      equipmentForm.reset({
        name: "",
        category: "other",
        description: "",
        serialNumber: "",
        condition: "",
        notes: "",
        imageUrl: "",
      });
      toast({
        title: "Equipment Created",
        description: "The new equipment has been added and selected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create equipment",
        variant: "destructive",
      });
    },
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
      contactType: "staff",
      contactStaffId: undefined,
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  const { data: requester } = useQuery<User>({
    queryKey: ["/api/users", request?.requesterId],
    enabled: !!request?.requesterId,
  });

  useEffect(() => {
    if (request) {
      form.setValue("requestId", request.id);
      form.setValue("name", request.title);
      form.setValue("description", request.description);
      form.setValue("urgency", request.urgency);
      if (request.propertyId) {
        form.setValue("propertyId", request.propertyId);
        setSelectedPropertyId(request.propertyId);
      }
      form.setValue("contactType", "requester");
      setContactType("requester");
    }
  }, [request, form]);

  // Set assignment type based on form values
  useEffect(() => {
    const assignedToId = form.watch("assignedToId");
    const assignedVendorId = form.watch("assignedVendorId");

    if (assignedToId) {
      setAssignmentType("maintenance");
    } else if (assignedVendorId) {
      setAssignmentType("vendor");
    }
  }, [form]);

  // Auto-populate contact info when vendor is selected
  useEffect(() => {
    if (selectedVendorId && vendors.length > 0) {
      const vendor = vendors.find(v => v.id === selectedVendorId);
      if (vendor) {
        setContactType("other");
        form.setValue("contactType", "other");
        form.setValue("contactName", vendor.contactPerson || vendor.name);
        form.setValue("contactEmail", vendor.email || "");
        form.setValue("contactPhone", vendor.phoneNumber || "");
        form.setValue("contactStaffId", undefined);
      }
    }
  }, [selectedVendorId, vendors, form]);

  const createTaskMutation = useMutation({
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
        requestId: data.requestId || undefined,
        createdById: data.createdById,
        recurringFrequency: data.recurringFrequency || undefined,
        recurringInterval: data.recurringInterval || undefined,
        recurringEndDate: data.recurringEndDate || undefined,
        contactType: data.contactType || undefined,
        contactStaffId: data.contactStaffId || undefined,
        contactName: data.contactName || undefined,
        contactEmail: data.contactEmail || undefined,
        contactPhone: data.contactPhone || undefined,
        // Include checklists in the task creation payload for atomic creation
        checklists: checklistItems.length > 0 ? checklistItems : undefined,
      };
      const response = await apiRequest("POST", "/api/tasks", taskData);
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });

      if (requestId) {
        await apiRequest("PATCH", `/api/service-requests/${requestId}/status`, {
          status: "converted_to_task",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      }

      toast({
        title: "Task Created",
        description: "The task has been created successfully.",
      });
      navigate(`/tasks/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FormData) => {
    createTaskMutation.mutate(data);
  };

  if (user?.role !== "admin" && user?.role !== "maintenance") {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">You don't have permission to create tasks.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(requestId ? `/requests/${requestId}` : "/tasks")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            {requestId ? "Convert Request to Task" : "Create New Task"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {requestId
              ? "Review the request details and set up the task"
              : "Create a new maintenance task"}
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

            {/* Task Checklist Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Task Checklist</span>
                <span className="text-xs text-muted-foreground">(Optional)</span>
              </div>
              
              {checklistItems.length > 0 && (
                <div className="space-y-2 border rounded-md p-3">
                  {checklistItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 group">
                      <Checkbox
                        checked={item.isCompleted}
                        onCheckedChange={(checked) => {
                          const updated = [...checklistItems];
                          updated[index].isCompleted = checked === true;
                          setChecklistItems(updated);
                        }}
                        data-testid={`checkbox-checklist-item-${index}`}
                      />
                      <span className={cn(
                        "flex-1 text-sm",
                        item.isCompleted && "line-through text-muted-foreground"
                      )}>
                        {item.text}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setChecklistItems(checklistItems.filter((_, i) => i !== index));
                        }}
                        data-testid={`button-remove-checklist-item-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add a checklist item..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newChecklistItem.trim()) {
                      e.preventDefault();
                      setChecklistItems([...checklistItems, { text: newChecklistItem.trim(), isCompleted: false }]);
                      setNewChecklistItem("");
                    }
                  }}
                  data-testid="input-new-checklist-item"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newChecklistItem.trim()) {
                      setChecklistItems([...checklistItems, { text: newChecklistItem.trim(), isCompleted: false }]);
                      setNewChecklistItem("");
                    }
                  }}
                  disabled={!newChecklistItem.trim()}
                  data-testid="button-add-checklist-item"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

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
                  <div className="flex gap-2">
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      disabled={!selectedPropertyId}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-equipment" className="flex-1">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={!selectedPropertyId}
                      onClick={() => {
                        equipmentForm.reset({
                          name: "",
                          category: "other",
                          description: "",
                          serialNumber: "",
                          condition: "",
                          notes: "",
                          imageUrl: "",
                        });
                        setIsEquipmentDialogOpen(true);
                      }}
                      data-testid="button-add-equipment"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {!selectedPropertyId && (
                    <FormDescription>Select a property first to add equipment</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="initialDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            type="button"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value + 'T12:00:00'), "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value + 'T12:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              field.onChange(`${year}-${month}-${day}`);
                            } else {
                              field.onChange(undefined);
                            }
                          }}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedCompletionDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Est. Completion Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            type="button"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value + 'T12:00:00'), "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value + 'T12:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              field.onChange(`${year}-${month}-${day}`);
                            } else {
                              field.onChange(undefined);
                            }
                          }}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </PopoverContent>
                    </Popover>
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
                    form.setValue("assignedToId", undefined);
                    form.setValue("assignedVendorId", undefined);
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

              {requestId && requester ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Contact information from service request
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Name</p>
                      <p className="text-sm text-muted-foreground">
                        {requester.firstName} {requester.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        {requester.email || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">
                        {requester.phoneNumber || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={contactType === "staff" ? "default" : "outline"}
                      onClick={() => {
                        setContactType("staff");
                        form.setValue("contactType", "staff");
                        form.setValue("contactName", "");
                        form.setValue("contactEmail", "");
                        form.setValue("contactPhone", "");
                      }}
                      data-testid="button-contact-staff"
                    >
                      College Staff
                    </Button>
                    <Button
                      type="button"
                      variant={contactType === "other" ? "default" : "outline"}
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

                  {contactType === "staff" && (
                    <FormField
                      control={form.control}
                      name="contactStaffId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Staff Member</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-contact-staff">
                                <SelectValue placeholder="Select staff member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName} - {user.email}
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
                                data-testid="input-contact-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(requestId ? `/requests/${requestId}` : "/tasks")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTaskMutation.isPending}
                data-testid="button-submit"
              >
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>

      <Dialog open={isEquipmentDialogOpen} onOpenChange={setIsEquipmentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Equipment</DialogTitle>
            <DialogDescription>
              Add new equipment to the selected property
            </DialogDescription>
          </DialogHeader>
          <Form {...equipmentForm}>
            <form
              onSubmit={equipmentForm.handleSubmit((data) => createEquipmentMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={equipmentForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="HVAC Unit #1" data-testid="input-new-equipment-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={equipmentForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-new-equipment-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="appliances">Appliances</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="structure">Structure</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                        <SelectItem value="landscaping">Landscaping</SelectItem>
                        <SelectItem value="diagrams">Diagrams</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={equipmentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Equipment description"
                        data-testid="textarea-new-equipment-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={equipmentForm.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="SN-12345"
                          data-testid="input-new-equipment-serial"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={equipmentForm.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-new-equipment-condition">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                          <SelectItem value="needs_repair">Needs Repair</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={equipmentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Additional notes about this equipment"
                        data-testid="textarea-new-equipment-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEquipmentDialogOpen(false)}
                  data-testid="button-cancel-equipment"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createEquipmentMutation.isPending}
                  data-testid="button-submit-equipment"
                >
                  {createEquipmentMutation.isPending ? "Adding..." : "Add Equipment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}