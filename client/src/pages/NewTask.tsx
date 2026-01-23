import { useState, useEffect, useRef } from "react";
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
import { Label } from "@/components/ui/label";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTaskSchema, insertEquipmentSchema, insertSpaceSchema } from "@shared/schema";
import type { Area, Subdivision, User, Vendor, ServiceRequest, Property, Equipment, Space, ChecklistTemplate, Project } from "@shared/schema";
import { z } from "zod";
import { Plus, X, ListChecks, MapPin, Calendar, Users, ClipboardList, ChevronDown, AlertCircle, FileText, Save, Upload, Paperclip, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const equipmentFormSchema = insertEquipmentSchema.omit({ propertyId: true }).extend({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
});

type EquipmentFormData = z.infer<typeof equipmentFormSchema>;

const spaceFormSchema = insertSpaceSchema.omit({ propertyId: true }).extend({
  name: z.string().min(1, "Name is required"),
});

type SpaceFormData = z.infer<typeof spaceFormSchema>;

const formSchema = insertTaskSchema.extend({
  initialDate: z.string().min(1, "Please select a start date"),
  estimatedCompletionDate: z.string().min(1, "Please select an estimated completion date"),
  propertyId: z.string().min(1, "Please select a property"),
  spaceId: z.string().optional(),
  equipmentId: z.string().optional(),
  taskType: z.enum(["one_time", "recurring", "reminder", "project"]),
  executorType: z.enum(["student", "technician"]).optional(),
  assignedPool: z.string().optional(),
  instructions: z.string().optional(),
  requiresPhoto: z.boolean().optional(),
  requiresEstimate: z.boolean().optional(),
  projectId: z.string().optional(),
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

function SectionHeader({ number, icon: Icon, title, description }: { number: number; icon: any; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

export default function NewTask() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [taskType, setTaskType] = useState<"one_time" | "recurring" | "reminder" | "project">("one_time");
  const [assignmentOption, setAssignmentOption] = useState<"student" | "technician" | "vendor" | "">("");
  const [contactType, setContactType] = useState<"requester" | "staff" | "other" | "">("");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  const [isSpaceDialogOpen, setIsSpaceDialogOpen] = useState(false);
  const [pendingEquipmentFiles, setPendingEquipmentFiles] = useState<File[]>([]);
  const equipmentFileInputRef = useRef<HTMLInputElement>(null);
  const [isContactOpen, setIsContactOpen] = useState(true);

  const searchParams = new URLSearchParams(window.location.search);
  const requestId = searchParams.get('requestId');
  const projectId = searchParams.get('projectId');

  const { data: request } = useQuery<ServiceRequest>({
    queryKey: ["/api/service-requests", requestId],
    enabled: !!requestId,
  });

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin" || user?.role === "technician",
  });

  const technicianUsers = users.filter(u => u.role === "technician" || u.role === "admin");
  const studentUsers = users.filter(u => u.role === "student");

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const isBuilding = selectedProperty?.type === "building";

  const { data: spaces = [] } = useQuery<Space[]>({
    queryKey: ["/api/spaces", selectedPropertyId],
    enabled: !!selectedPropertyId && isBuilding,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/spaces?propertyId=${selectedPropertyId}`);
      return response.json();
    },
  });

  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment", selectedPropertyId, selectedSpaceId],
    enabled: !!selectedPropertyId,
    queryFn: async () => {
      let url = `/api/equipment?propertyId=${selectedPropertyId}`;
      if (selectedSpaceId) {
        url += `&spaceId=${selectedSpaceId}`;
      }
      const response = await apiRequest("GET", url);
      return response.json();
    },
  });

  type ChecklistGroup = {
    name: string;
    items: { text: string; isCompleted: boolean }[];
  };
  const [checklistGroups, setChecklistGroups] = useState<ChecklistGroup[]>([]);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [editingChecklistIndex, setEditingChecklistIndex] = useState<number | null>(null);
  const [dialogChecklistName, setDialogChecklistName] = useState("");
  const [dialogChecklistItems, setDialogChecklistItems] = useState<{ text: string; isCompleted: boolean }[]>([]);
  const [newDialogChecklistItem, setNewDialogChecklistItem] = useState("");
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [saveTemplateDescription, setSaveTemplateDescription] = useState("");
  const [isTemplatePopoverOpen, setIsTemplatePopoverOpen] = useState(false);

  const { data: checklistTemplates = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ["/api/checklist-templates"],
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; items: { text: string; sortOrder: number }[] }) => {
      const response = await apiRequest("POST", "/api/checklist-templates", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      setIsTemplateDialogOpen(false);
      setSaveTemplateName("");
      setSaveTemplateDescription("");
      toast({
        title: "Template Saved",
        description: "The checklist template has been saved for future use.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    },
  });

  const applyTemplate = (template: ChecklistTemplate) => {
    const rawItems = template.items;
    let validItems: { text: string; isCompleted: boolean }[] = [];
    
    if (Array.isArray(rawItems)) {
      validItems = rawItems
        .filter((item: any) => item && typeof item.text === 'string' && item.text.trim())
        .map((item: any) => ({ text: item.text.trim(), isCompleted: false }));
    }
    
    const newGroup: ChecklistGroup = {
      name: template.name,
      items: validItems,
    };
    setChecklistGroups(prev => [...prev, newGroup]);
    setIsTemplatePopoverOpen(false);
    toast({
      title: "Template Applied",
      description: `Checklist "${template.name}" has been added.`,
    });
  };

  const handleSaveAsTemplate = () => {
    if (!dialogChecklistName.trim() || dialogChecklistItems.length === 0) {
      toast({
        title: "Cannot Save Template",
        description: "Please add a name and at least one item to save as template.",
        variant: "destructive",
      });
      return;
    }
    setSaveTemplateName(dialogChecklistName);
    setIsTemplateDialogOpen(true);
  };

  const confirmSaveTemplate = () => {
    if (!saveTemplateName.trim()) return;
    saveTemplateMutation.mutate({
      name: saveTemplateName.trim(),
      description: saveTemplateDescription.trim() || undefined,
      items: dialogChecklistItems.map((item, idx) => ({ text: item.text, sortOrder: idx })),
    });
  };

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
        body: JSON.stringify({ 
          ...data, 
          propertyId: selectedPropertyId,
          spaceId: selectedSpaceId || undefined 
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async (newEquipment: Equipment) => {
      // Upload pending files if any
      let uploadedCount = 0;
      let failedCount = 0;
      const filesToUpload = [...pendingEquipmentFiles];
      
      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          try {
            // Get upload URL
            const uploadUrlRes = await fetch("/api/objects/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fileName: file.name }),
              credentials: "include",
            });
            if (!uploadUrlRes.ok) {
              console.error("Failed to get upload URL for", file.name);
              failedCount++;
              continue;
            }
            const { url, objectPath } = await uploadUrlRes.json();
            
            // Upload file to object storage
            const uploadRes = await fetch(url, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": file.type || "application/octet-stream" },
            });
            
            if (!uploadRes.ok) {
              console.error("Failed to upload file to storage:", file.name);
              failedCount++;
              continue;
            }
            
            // Register the upload in database with equipment ID
            const registerRes = await fetch("/api/uploads", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                fileType: file.type || "application/octet-stream",
                objectUrl: url.split("?")[0],
                objectPath: objectPath,
                equipmentId: newEquipment.id,
              }),
              credentials: "include",
            });
            
            if (!registerRes.ok) {
              console.error("Failed to register upload in database:", file.name);
              failedCount++;
              continue;
            }
            
            uploadedCount++;
          } catch (error) {
            console.error("Error uploading file:", error);
            failedCount++;
          }
        }
        setPendingEquipmentFiles([]);
        
        // Invalidate equipment uploads cache
        queryClient.invalidateQueries({ queryKey: ["/api/equipment", newEquipment.id, "uploads"] });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/equipment", selectedPropertyId, selectedSpaceId] });
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
      let toastMessage = "The new equipment has been added and selected.";
      if (filesToUpload.length > 0) {
        if (failedCount === 0) {
          toastMessage = `Equipment created with ${uploadedCount} attached file${uploadedCount > 1 ? 's' : ''}.`;
        } else if (uploadedCount > 0) {
          toastMessage = `Equipment created. ${uploadedCount} file${uploadedCount > 1 ? 's' : ''} uploaded, ${failedCount} failed.`;
        } else {
          toastMessage = "Equipment created, but file uploads failed.";
        }
      }
      toast({
        title: "Equipment Created",
        description: toastMessage,
        variant: failedCount > 0 ? "destructive" : undefined,
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

  const spaceForm = useForm<SpaceFormData>({
    resolver: zodResolver(spaceFormSchema),
    defaultValues: {
      name: "",
      floor: "",
      description: "",
    },
  });

  const createSpaceMutation = useMutation({
    mutationFn: async (data: SpaceFormData) => {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, propertyId: selectedPropertyId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (newSpace: Space) => {
      queryClient.invalidateQueries({ queryKey: ["/api/spaces", selectedPropertyId] });
      form.setValue("spaceId", newSpace.id);
      setSelectedSpaceId(newSpace.id);
      setIsSpaceDialogOpen(false);
      spaceForm.reset({
        name: "",
        floor: "",
        description: "",
      });
      toast({
        title: "Room/Space Created",
        description: "The new room/space has been added and selected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create room/space",
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
      spaceId: "",
      equipmentId: "",
      assignedToId: undefined,
      assignedVendorId: undefined,
      taskType: "one_time",
      executorType: undefined,
      assignedPool: undefined,
      instructions: "",
      requiresPhoto: false,
      requiresEstimate: false,
      projectId: projectId || undefined,
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

  useEffect(() => {
    const assignedVendorId = form.watch("assignedVendorId");
    const executorType = form.watch("executorType");

    if (assignedVendorId) {
      setAssignmentOption("vendor");
    } else if (executorType === "student") {
      setAssignmentOption("student");
    } else if (executorType === "technician") {
      setAssignmentOption("technician");
    }
  }, [form]);

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
        spaceId: data.spaceId || undefined,
        equipmentId: data.equipmentId || undefined,
        assignedToId: data.assignedToId || undefined,
        assignedVendorId: data.assignedVendorId || undefined,
        taskType: data.taskType,
        executorType: data.executorType || undefined,
        assignedPool: (!data.assignedToId && !data.assignedVendorId && data.assignedPool) 
          ? data.assignedPool 
          : undefined,
        instructions: data.instructions || undefined,
        requiresPhoto: data.requiresPhoto || false,
        requiresEstimate: data.requiresEstimate || false,
        estimateStatus: data.requiresEstimate ? "needs_estimate" : null,
        status: data.requiresEstimate ? "needs_estimate" : data.status,
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
        checklistGroups: checklistGroups.length > 0 ? checklistGroups : undefined,
        projectId: data.projectId || projectId || undefined,
      };
      const response = await apiRequest("POST", "/api/tasks", taskData);
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });

      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "analytics"] });
      }

      if (requestId) {
        queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
        queryClient.invalidateQueries({ queryKey: ["/api/service-requests", requestId] });
        toast({
          title: "Request Approved",
          description: "Task created successfully. The service request has been marked as approved.",
        });
      } else {
        toast({
          title: "Task Created",
          description: "The task has been created successfully.",
        });
      }
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

  if (user?.role !== "admin" && user?.role !== "technician") {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">You don't have permission to create tasks.</p>
      </div>
    );
  }

  const urgencyColors: Record<string, string> = {
    low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pb-40">
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">
            {requestId ? "Convert to Task" : "New Task"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {requestId ? "Create a task from this service request" : "Fill in the details below"}
          </p>
        </div>
      </div>

      {project && (
        <Card className="p-4 mb-6 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Creating task for project:</p>
              <p className="text-foreground font-semibold" data-testid="text-project-name">{project.name}</p>
            </div>
          </div>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          
          {/* Section 1: Task Details */}
          <Card className="p-5">
            <SectionHeader 
              number={1} 
              icon={ClipboardList} 
              title="Task Details" 
              description="What needs to be done?"
            />
            
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Fix leaking faucet in Room 101"
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
                        placeholder="Describe what needs to be done..."
                        className="min-h-[80px] resize-none"
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
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-urgency">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              Low
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              Medium
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              High
                            </div>
                          </SelectItem>
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
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setTaskType(value as "one_time" | "recurring" | "reminder" | "project");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-task-type">
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

              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-project">
                          <SelectValue placeholder="Assign to a project (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No Project</SelectItem>
                        {projects.filter(p => p.status === "active" || p.status === "planning").map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Link this task to an existing project for organization
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* Section 2: Location */}
          <Card className="p-5">
            <SectionHeader 
              number={2} 
              icon={MapPin} 
              title="Location" 
              description="Where is this task?"
            />
            
            <div className="space-y-4">
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
                        setSelectedSpaceId("");
                        form.setValue("spaceId", "");
                        form.setValue("equipmentId", "");
                      }}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-property">
                          <SelectValue placeholder="Select a property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                            <span className="text-muted-foreground ml-1">({property.type})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isBuilding && (
                <FormField
                  control={form.control}
                  name="spaceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room / Space</FormLabel>
                      {spaces.length > 0 ? (
                        <Select
                          onValueChange={(value) => {
                            const actualValue = value === "__none__" ? "" : value;
                            field.onChange(actualValue);
                            setSelectedSpaceId(actualValue);
                            form.setValue("equipmentId", "");
                          }}
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-space">
                              <SelectValue placeholder="Select room (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">All spaces</SelectItem>
                            {spaces.map((space) => (
                              <SelectItem key={space.id} value={space.id}>
                                {space.name}{space.floor ? ` (${space.floor})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30" data-testid="text-no-spaces">
                          <span className="text-sm text-muted-foreground">No rooms defined.</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsSpaceDialogOpen(true)}
                            data-testid="button-add-space-inline"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Room
                          </Button>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="equipmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        if (value === "create_new") {
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
                        } else {
                          field.onChange(value);
                        }
                      }}
                      value={field.value || ""}
                      disabled={!selectedPropertyId}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-equipment">
                          <SelectValue placeholder={selectedPropertyId ? "Select equipment (optional)" : "Select property first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="create_new" className="font-medium text-primary">
                          <Plus className="w-3 h-3 inline mr-1" />
                          Add New Equipment
                        </SelectItem>
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
            </div>
          </Card>

          {/* Section 3: Schedule */}
          <Card className="p-5">
            <SectionHeader 
              number={3} 
              icon={Calendar} 
              title="Schedule" 
              description="When should this be done?"
            />
            
            <div className="space-y-4">
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
                              {field.value ? format(new Date(field.value + 'T12:00:00'), "MMM d, yyyy") : "Pick date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
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
                      <FormLabel>Due Date *</FormLabel>
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
                              {field.value ? format(new Date(field.value + 'T12:00:00'), "MMM d, yyyy") : "Pick date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
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

              {taskType === "recurring" && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <p className="text-sm font-medium">Recurring Settings</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="recurringFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repeat</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-recurring-frequency">
                                <SelectValue placeholder="Select..." />
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
                          <FormLabel>Every</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              value={field.value || ""}
                              data-testid="input-recurring-interval"
                            />
                          </FormControl>
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
                        <FormLabel>End Date (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-recurring-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Section 4: Assignment */}
          <Card className="p-5">
            <SectionHeader 
              number={4} 
              icon={Users} 
              title="Assignment" 
              description="Who will work on this?"
            />
            
            <div className="space-y-4">
              <FormItem>
                <FormLabel>Assign To</FormLabel>
                <Select
                  onValueChange={(value: string) => {
                    const option = value as "student" | "technician" | "vendor" | "";
                    setAssignmentOption(option);
                    form.setValue("assignedToId", undefined);
                    form.setValue("assignedVendorId", undefined);
                    form.setValue("assignedPool", undefined);
                    
                    if (option === "student") {
                      form.setValue("executorType", "student");
                    } else if (option === "technician") {
                      form.setValue("executorType", "technician");
                    } else {
                      form.setValue("executorType", undefined);
                    }
                  }}
                  value={assignmentOption}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-assignment-option">
                      <SelectValue placeholder="Select who should do this (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="student">Student Worker</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="vendor">External Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>

              {assignmentOption === "student" && (
                <>
                  <FormField
                    control={form.control}
                    name="assignedToId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Student</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-assigned-student">
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

                  <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                    <p className="text-sm font-medium">Student Instructions</p>
                    <FormField
                      control={form.control}
                      name="instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Step-by-step instructions for the student..."
                              className="min-h-[80px] resize-none"
                              data-testid="input-instructions"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="requiresPhoto"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-requires-photo"
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Require photo when completed
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="requiresEstimate"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-requires-estimate"
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Requires estimate/quote approval before work begins
                          </FormLabel>
                          <FormDescription className="sr-only">
                            When enabled, the task will start in "needs estimate" status and require quote approval
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {assignmentOption === "technician" && (
                <FormField
                  control={form.control}
                  name="assignedToId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Technician</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-assigned-user">
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
              )}

              {assignmentOption === "vendor" && (
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

              {/* Contact Information */}
              <Collapsible open={isContactOpen} onOpenChange={setIsContactOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" type="button" className="w-full justify-between p-0 h-auto hover:bg-transparent" data-testid="button-toggle-contact">
                    <span className="text-sm font-medium">Point of Contact (Optional)</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isContactOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  {requestId && requester ? (
                    <div className="p-3 rounded-md border bg-muted/30 text-sm space-y-1">
                      <p><span className="text-muted-foreground">Contact:</span> {requester.firstName} {requester.lastName}</p>
                      {requester.email && <p><span className="text-muted-foreground">Email:</span> {requester.email}</p>}
                      {requester.phoneNumber && <p><span className="text-muted-foreground">Phone:</span> {requester.phoneNumber}</p>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
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

                      {contactType === "staff" && (
                        <FormField
                          control={form.control}
                          name="contactStaffId"
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-contact-staff">
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
                        <div className="grid gap-3">
                          <FormField
                            control={form.control}
                            name="contactName"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Contact name" {...field} data-testid="input-contact-name" />
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
                                    <Input type="email" placeholder="Email" {...field} data-testid="input-contact-email" />
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
                                    <Input type="tel" placeholder="Phone" {...field} data-testid="input-contact-phone" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </Card>

          {/* Section 5: Checklists - Optional */}
          <Card className="p-5 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Checklists</span>
                <Badge variant="secondary" className="text-xs">Optional</Badge>
              </div>
              <div className="flex items-center gap-2">
                {checklistTemplates.length > 0 && (
                  <Popover open={isTemplatePopoverOpen} onOpenChange={setIsTemplatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="gap-1"
                        data-testid="button-use-template"
                      >
                        <FileText className="h-3 w-3" />
                        Use Template
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-1" align="end">
                      <div className="space-y-1">
                        {checklistTemplates.map((template) => (
                          <Button
                            key={template.id}
                            type="button"
                            variant="ghost"
                            className="w-full justify-start h-auto py-2 px-2"
                            onClick={() => applyTemplate(template)}
                            data-testid={`button-template-${template.id}`}
                          >
                            <div className="flex flex-col items-start text-left">
                              <span className="text-sm font-medium">{template.name}</span>
                              {template.description && (
                                <span className="text-xs text-muted-foreground">{template.description}</span>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingChecklistIndex(null);
                    setDialogChecklistName("");
                    setDialogChecklistItems([]);
                    setNewDialogChecklistItem("");
                    setIsChecklistDialogOpen(true);
                  }}
                  data-testid="button-add-checklist"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
            
            {checklistGroups.length > 0 && (
              <div className="mt-4 space-y-3">
                {checklistGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="p-3 border rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{group.name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingChecklistIndex(groupIndex);
                            setDialogChecklistName(group.name);
                            setDialogChecklistItems(group.items.map(item => ({ ...item })));
                            setNewDialogChecklistItem("");
                            setIsChecklistDialogOpen(true);
                          }}
                          data-testid={`button-edit-checklist-${groupIndex}`}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setChecklistGroups(checklistGroups.filter((_, i) => i !== groupIndex));
                          }}
                          data-testid={`button-remove-checklist-${groupIndex}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {group.items.length > 0 && (
                      <div className="space-y-1 pl-1">
                        {group.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Checkbox
                              checked={item.isCompleted}
                              onCheckedChange={(checked) => {
                                setChecklistGroups(prev => prev.map((g, gIdx) =>
                                  gIdx === groupIndex
                                    ? {
                                        ...g,
                                        items: g.items.map((it, iIdx) =>
                                          iIdx === itemIndex
                                            ? { ...it, isCompleted: checked === true }
                                            : it
                                        )
                                      }
                                    : g
                                ));
                              }}
                              className="h-3 w-3"
                              data-testid={`checkbox-checklist-${groupIndex}-item-${itemIndex}`}
                            />
                            <span className={item.isCompleted ? "line-through" : ""}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {group.items.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No items yet</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Spacer for fixed footer */}
          <div className="h-24" aria-hidden="true" />

          {/* Sticky Footer */}
          <div className="fixed bottom-0 inset-x-0 p-4 bg-background/95 backdrop-blur border-t z-10 md:left-[var(--sidebar-width)]">
            <div className="max-w-2xl mx-auto flex gap-3 md:ml-0">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(requestId ? `/requests/${requestId}` : "/tasks")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createTaskMutation.isPending}
                data-testid="button-submit"
              >
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* Equipment Dialog */}
      <Dialog open={isEquipmentDialogOpen} onOpenChange={setIsEquipmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
            <DialogDescription>
              Add new equipment to {selectedProperty?.name || "the property"}
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
                      <Input {...field} placeholder="e.g., HVAC Unit #1" data-testid="input-new-equipment-name" />
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
                        placeholder="Brief description"
                        className="resize-none"
                        data-testid="textarea-new-equipment-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={equipmentForm.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial #</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="SN-12345" data-testid="input-new-equipment-serial" />
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
                            <SelectValue placeholder="Select" />
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

              {/* File Upload Section */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Attachments</Label>
                <p className="text-xs text-muted-foreground">Add manuals, pictures, or other documents</p>
                <input
                  ref={equipmentFileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      setPendingEquipmentFiles(prev => [...prev, ...Array.from(files)]);
                    }
                    if (equipmentFileInputRef.current) {
                      equipmentFileInputRef.current.value = "";
                    }
                  }}
                  className="hidden"
                  data-testid="input-equipment-files"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => equipmentFileInputRef.current?.click()}
                  className="w-full"
                  data-testid="button-add-equipment-files"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Files
                </Button>
                {pendingEquipmentFiles.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {pendingEquipmentFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-2 py-1"
                        data-testid={`file-item-${index}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPendingEquipmentFiles(prev => prev.filter((_, i) => i !== index));
                          }}
                          data-testid={`button-remove-file-${index}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsEquipmentDialogOpen(false);
                  setPendingEquipmentFiles([]);
                }} data-testid="button-cancel-equipment">
                  Cancel
                </Button>
                <Button type="submit" disabled={createEquipmentMutation.isPending} data-testid="button-submit-equipment">
                  {createEquipmentMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Space Dialog */}
      <Dialog open={isSpaceDialogOpen} onOpenChange={setIsSpaceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Room/Space</DialogTitle>
            <DialogDescription>
              Add a room to {selectedProperty?.name || "the building"}
            </DialogDescription>
          </DialogHeader>
          <Form {...spaceForm}>
            <form
              onSubmit={spaceForm.handleSubmit((data) => createSpaceMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={spaceForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Room 101" data-testid="input-new-space-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={spaceForm.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="e.g., 1st Floor" data-testid="input-new-space-floor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={spaceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Brief description"
                        className="resize-none"
                        data-testid="textarea-new-space-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSpaceDialogOpen(false)} data-testid="button-cancel-space">
                  Cancel
                </Button>
                <Button type="submit" disabled={createSpaceMutation.isPending} data-testid="button-submit-space">
                  {createSpaceMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Checklist Dialog */}
      <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingChecklistIndex !== null ? "Edit Checklist" : "Add Checklist"}</DialogTitle>
            <DialogDescription>
              Create a checklist with items to complete
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Checklist Name *</Label>
              <Input
                placeholder="e.g., Safety Checks"
                value={dialogChecklistName}
                onChange={(e) => setDialogChecklistName(e.target.value)}
                data-testid="input-checklist-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Items</Label>
              {dialogChecklistItems.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {dialogChecklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {editingItemIndex === idx ? (
                        <Input
                          autoFocus
                          className="flex-1 h-8"
                          value={item.text}
                          onChange={(e) => {
                            setDialogChecklistItems(prev => prev.map((it, i) =>
                              i === idx ? { ...it, text: e.target.value } : it
                            ));
                          }}
                          onBlur={() => setEditingItemIndex(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setEditingItemIndex(null);
                            }
                            if (e.key === "Escape") {
                              setEditingItemIndex(null);
                            }
                          }}
                          data-testid={`input-edit-item-${idx}`}
                        />
                      ) : (
                        <span
                          className="flex-1 cursor-pointer hover:bg-muted px-2 py-1 rounded"
                          onClick={() => setEditingItemIndex(idx)}
                          data-testid={`text-checklist-item-${idx}`}
                        >
                          {item.text}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setDialogChecklistItems(dialogChecklistItems.filter((_, i) => i !== idx));
                          if (editingItemIndex === idx) setEditingItemIndex(null);
                        }}
                        data-testid={`button-remove-dialog-item-${idx}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Add an item..."
                  value={newDialogChecklistItem}
                  onChange={(e) => setNewDialogChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newDialogChecklistItem.trim()) {
                      e.preventDefault();
                      setDialogChecklistItems([...dialogChecklistItems, { text: newDialogChecklistItem.trim(), isCompleted: false }]);
                      setNewDialogChecklistItem("");
                    }
                  }}
                  data-testid="input-new-checklist-item"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (newDialogChecklistItem.trim()) {
                      setDialogChecklistItems([...dialogChecklistItems, { text: newDialogChecklistItem.trim(), isCompleted: false }]);
                      setNewDialogChecklistItem("");
                    }
                  }}
                  data-testid="button-add-checklist-item"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!dialogChecklistName.trim() || dialogChecklistItems.length === 0}
              onClick={handleSaveAsTemplate}
              className="mr-auto"
              data-testid="button-save-as-template"
            >
              <Save className="h-4 w-4 mr-1" />
              Save as Template
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => { setIsChecklistDialogOpen(false); setEditingItemIndex(null); }} data-testid="button-cancel-checklist">
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!dialogChecklistName.trim()}
                onClick={() => {
                  if (dialogChecklistName.trim()) {
                    if (editingChecklistIndex !== null) {
                      setChecklistGroups(prev => prev.map((g, i) =>
                        i === editingChecklistIndex
                          ? { name: dialogChecklistName.trim(), items: dialogChecklistItems }
                          : g
                      ));
                    } else {
                      setChecklistGroups(prev => [...prev, { name: dialogChecklistName.trim(), items: dialogChecklistItems }]);
                    }
                    setIsChecklistDialogOpen(false);
                    setDialogChecklistName("");
                    setDialogChecklistItems([]);
                    setNewDialogChecklistItem("");
                    setEditingChecklistIndex(null);
                    setEditingItemIndex(null);
                  }
                }}
                data-testid="button-save-checklist"
              >
                {editingChecklistIndex !== null ? "Save" : "Add"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save this checklist as a reusable template for future tasks
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g., Safety Inspection Checklist"
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Brief description of when to use this template..."
                value={saveTemplateDescription}
                onChange={(e) => setSaveTemplateDescription(e.target.value)}
                className="resize-none"
                data-testid="textarea-template-description"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              This template will include {dialogChecklistItems.length} item{dialogChecklistItems.length !== 1 ? "s" : ""}.
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)} data-testid="button-cancel-template">
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!saveTemplateName.trim() || saveTemplateMutation.isPending}
              onClick={confirmSaveTemplate}
              data-testid="button-confirm-save-template"
            >
              {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
