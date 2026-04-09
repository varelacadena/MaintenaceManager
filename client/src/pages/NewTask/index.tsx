import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import type { User, Vendor, ServiceRequest, Property, Equipment, Space, ChecklistTemplate, Project, Vehicle } from "@shared/schema";
import { z } from "zod";
import { Plus, X, ListChecks, MapPin, Calendar, Users, ClipboardList, ChevronDown, FileText, Save, Upload, Paperclip, Trash2, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TaskLocationFields, type SelectedAsset } from "@/components/task-form/TaskLocationFields";
import { TaskDateFields } from "@/components/task-form/TaskDateFields";
import { TaskRecurringFields } from "@/components/task-form/TaskRecurringFields";
import { SpaceDialog } from "@/components/task-form/SpaceDialog";

const equipmentFormSchema = insertEquipmentSchema.omit({ propertyId: true }).extend({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
});

type EquipmentFormData = z.infer<typeof equipmentFormSchema>;


const formSchema = insertTaskSchema.extend({
  initialDate: z.string().min(1, "Please select a start date"),
  estimatedCompletionDate: z.string().min(1, "Please select an estimated completion date"),
  propertyId: z.string().optional(),
  spaceId: z.string().optional(),
  equipmentId: z.string().optional(),
  vehicleId: z.string().optional(),
  taskType: z.enum(["one_time", "recurring", "reminder", "project"]),
  executorType: z.enum(["student", "technician"]).optional(),
  assignedPool: z.string().optional(),
  instructions: z.string().optional(),
  requiresPhoto: z.boolean().optional(),
  requiresEstimate: z.boolean().optional(),
  projectId: z.string().optional(),
  scheduledStartTime: z.string().optional(),
  contactType: z.enum(["requester", "staff", "other"]).optional(),
  contactStaffId: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  isCampusWide: z.boolean().optional(),
  propertyIds: z.array(z.string()).optional(),
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
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [locationScope, setLocationScope] = useState<"single" | "multiple" | "campus">("single");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [taskType, setTaskType] = useState<"one_time" | "recurring" | "reminder" | "project">("one_time");
  const [assignmentOption, setAssignmentOption] = useState<"student" | "technician" | "vendor" | "">("");
  const [contactType, setContactType] = useState<"requester" | "staff" | "other" | "">("");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  const [isSpaceDialogOpen, setIsSpaceDialogOpen] = useState(false);
  const [pendingEquipmentFiles, setPendingEquipmentFiles] = useState<File[]>([]);
  const equipmentFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([]);
  const multiAssetMode = selectedAssets.length > 0;
  const [selectedHelperIds, setSelectedHelperIds] = useState<string[]>([]);

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

  const technicianUsers = users.filter(u => u.role === "technician");
  const studentUsers = users.filter(u => u.role === "student");

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: allVehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
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

  type PendingSubTask = {
    name: string;
    description: string;
    equipmentId: string;
    vehicleId: string;
  };
  const [pendingSubTasks, setPendingSubTasks] = useState<PendingSubTask[]>([]);

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
      let uploadedCount = 0;
      let failedCount = 0;
      const filesToUpload = [...pendingEquipmentFiles];
      
      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          try {
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
        
        queryClient.invalidateQueries({ queryKey: ["/api/equipment", newEquipment.id, "uploads"] });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/equipment", selectedPropertyId, selectedSpaceId] });
      queryClient.invalidateQueries({ queryKey: [`/api/equipment?propertyId=${selectedPropertyId}`] });
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
      vehicleId: "",
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
      scheduledStartTime: undefined,
      contactType: undefined,
      contactStaffId: undefined,
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      isCampusWide: false,
      propertyIds: [],
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
      const isSingleScope = !data.isCampusWide && (!data.propertyIds || data.propertyIds.length === 0);
      const isMultiAsset = isSingleScope && selectedAssets.length > 1;
      const isSingleAsset = isSingleScope && selectedAssets.length === 1;

      const taskData: any = {
        name: data.name,
        description: data.description,
        urgency: data.urgency,
        initialDate: new Date(data.initialDate).toISOString(),
        estimatedCompletionDate: data.estimatedCompletionDate
          ? new Date(data.estimatedCompletionDate).toISOString()
          : undefined,
        propertyId: (!data.isCampusWide && (!data.propertyIds || data.propertyIds.length === 0)) ? (data.propertyId || undefined) : undefined,
        spaceId: (!data.isCampusWide && (!data.propertyIds || data.propertyIds.length === 0)) ? (data.spaceId || undefined) : undefined,
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
        scheduledStartTime: data.scheduledStartTime || undefined,
        isCampusWide: data.isCampusWide || false,
        propertyIds: data.propertyIds && data.propertyIds.length > 0 ? data.propertyIds : undefined,
        helperUserIds: selectedHelperIds.length > 0 ? selectedHelperIds : undefined,
      };

      if (isSingleScope) {
        if (isSingleAsset) {
          const asset = selectedAssets[0];
          if (asset.type === "equipment") {
            taskData.equipmentId = asset.id;
          } else {
            taskData.vehicleId = asset.id;
          }
        } else if (!isMultiAsset) {
          taskData.equipmentId = data.equipmentId || undefined;
          taskData.vehicleId = data.vehicleId || undefined;
        }
      }

      const response = await apiRequest("POST", "/api/tasks", taskData);
      const parentTask = await response.json();

      if (isMultiAsset) {
        for (const asset of selectedAssets) {
          await apiRequest("POST", `/api/tasks/${parentTask.id}/subtasks`, {
            equipmentId: asset.type === "equipment" ? asset.id : undefined,
            vehicleId: asset.type === "vehicle" ? asset.id : undefined,
          });
        }
      }

      const validSubTasks = pendingSubTasks.filter(st => st.name.trim());
      if (validSubTasks.length > 0) {
        for (const subTask of validSubTasks) {
          await apiRequest("POST", `/api/tasks/${parentTask.id}/subtasks`, {
            name: subTask.name.trim(),
            description: subTask.description.trim() || undefined,
            equipmentId: subTask.equipmentId || undefined,
            vehicleId: subTask.vehicleId || undefined,
          });
        }
      }

      return parentTask;
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
        const assetCount = selectedAssets.length;
        const manualSubTaskCount = pendingSubTasks.filter(st => st.name.trim()).length;
        const totalSubTasks = (assetCount > 1 ? assetCount : 0) + manualSubTaskCount;
        toast({
          title: "Task Created",
          description: totalSubTasks > 0
            ? `Task created with ${totalSubTasks} sub-task${totalSubTasks !== 1 ? "s" : ""}.`
            : "The task has been created successfully.",
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
    const hasInvalidSubTasks = pendingSubTasks.some(st => st.name.length > 0 && !st.name.trim());
    if (hasInvalidSubTasks) {
      toast({
        title: "Invalid Sub-Tasks",
        description: "Please fix or remove sub-tasks with blank names before submitting.",
        variant: "destructive",
      });
      return;
    }
    createTaskMutation.mutate(data);
  };

  const handleAddAsset = (asset: SelectedAsset) => {
    if (selectedAssets.some((a) => a.type === asset.type && a.id === asset.id)) {
      return;
    }
    setSelectedAssets((prev) => [...prev, asset]);
    form.setValue("equipmentId", undefined);
    form.setValue("vehicleId", undefined);
  };

  const handleRemoveAsset = (index: number) => {
    setSelectedAssets((prev) => prev.filter((_, i) => i !== index));
  };

  if (user?.role !== "admin" && user?.role !== "technician") {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">You don't have permission to create tasks.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-3 md:p-6 pb-40">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">
          {requestId ? "Convert to Task" : "New Task"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {requestId ? "Create a task from this service request" : "Fill in the details below"}
        </p>
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
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* LEFT COLUMN: Main Form */}
            <div className="w-full lg:w-[65%] space-y-8 pb-12">

              {/* Details */}
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

              {/* Location */}
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

              {/* Schedule */}
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

              {/* Sub-tasks */}
              <section className="border-b border-border/50 pb-8 space-y-4" data-testid="section-subtasks">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">Sub-tasks</h2>
                    <Badge variant="secondary" className="text-xs">Optional</Badge>
                    {pendingSubTasks.length > 0 && (
                      <Badge variant="default" className="text-xs">{pendingSubTasks.length}</Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPendingSubTasks(prev => [...prev, { name: "", description: "", equipmentId: "", vehicleId: "" }]);
                    }}
                    data-testid="button-add-subtask"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Sub-Task
                  </Button>
                </div>
                {pendingSubTasks.length === 0 ? (
                  <div className="text-center py-6 bg-muted/10 rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">No sub-tasks added. Break down complex tasks into smaller steps.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingSubTasks.map((subTask, index) => {
                      const hasEmptyName = subTask.name.length > 0 && !subTask.name.trim();
                      return (
                      <div key={index} className="p-3 border rounded-md space-y-2" data-testid={`subtask-item-${index}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <div>
                              <Input
                                placeholder="Sub-task name *"
                                value={subTask.name}
                                onChange={(e) => {
                                  setPendingSubTasks(prev => prev.map((st, i) =>
                                    i === index ? { ...st, name: e.target.value } : st
                                  ));
                                }}
                                className={hasEmptyName ? "border-destructive" : ""}
                                data-testid={`input-subtask-name-${index}`}
                              />
                              {hasEmptyName && (
                                <p className="text-xs text-destructive mt-1">Sub-task name cannot be blank</p>
                              )}
                            </div>
                            <Textarea
                              placeholder="Description (optional)"
                              className="min-h-[60px] resize-none"
                              value={subTask.description}
                              onChange={(e) => {
                                setPendingSubTasks(prev => prev.map((st, i) =>
                                  i === index ? { ...st, description: e.target.value } : st
                                ));
                              }}
                              data-testid={`textarea-subtask-description-${index}`}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Equipment (optional)</Label>
                                <Select
                                  value={subTask.equipmentId || "none"}
                                  onValueChange={(value) => {
                                    setPendingSubTasks(prev => prev.map((st, i) =>
                                      i === index ? { ...st, equipmentId: value === "none" ? "" : value, vehicleId: value !== "none" ? "" : st.vehicleId } : st
                                    ));
                                  }}
                                >
                                  <SelectTrigger data-testid={`select-subtask-equipment-${index}`}>
                                    <SelectValue placeholder="None" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {equipment.map((eq) => (
                                      <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Vehicle (optional)</Label>
                                <Select
                                  value={subTask.vehicleId || "none"}
                                  onValueChange={(value) => {
                                    setPendingSubTasks(prev => prev.map((st, i) =>
                                      i === index ? { ...st, vehicleId: value === "none" ? "" : value, equipmentId: value !== "none" ? "" : st.equipmentId } : st
                                    ));
                                  }}
                                >
                                  <SelectTrigger data-testid={`select-subtask-vehicle-${index}`}>
                                    <SelectValue placeholder="None" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {allVehicles.map((v) => (
                                      <SelectItem key={v.id} value={v.id}>
                                        {v.make} {v.model} {v.vehicleId}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPendingSubTasks(prev => prev.filter((_, i) => i !== index));
                            }}
                            data-testid={`button-remove-subtask-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Checklists */}
              <section className="pb-4 space-y-4" data-testid="section-checklists">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">Checklists</h2>
                    <Badge variant="secondary" className="text-xs">Optional</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {checklistTemplates.length > 0 && (
                      <Popover open={isTemplatePopoverOpen} onOpenChange={setIsTemplatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" data-testid="button-template-popover">
                            <FileText className="h-4 w-4 mr-1" />
                            Templates
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-2" align="end">
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
                
                {checklistGroups.length > 0 ? (
                  <div className="space-y-3">
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
                ) : (
                  <div className="text-center py-6 bg-muted/10 rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">Add checklists for required inspections or procedures.</p>
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT COLUMN: Sidebar */}
            <div className="w-full lg:w-[35%]">
              <div className="lg:sticky lg:top-6 space-y-6">
                <div className="bg-muted/30 border rounded-xl p-5 shadow-sm space-y-6">

                  {/* Priority */}
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

                  {/* Task Type & Project */}
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

                  {/* Assignment */}
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

                  {/* Contact Info */}
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

                  {/* Options */}
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

                  {/* Instructions (student only) */}
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
              </div>
            </div>
          </div>

          <div className="h-24" aria-hidden="true" />

          {/* Sticky Footer */}
          <div className="fixed bottom-0 inset-x-0 p-4 bg-background/95 backdrop-blur border-t z-10 md:left-[var(--sidebar-width)]">
            <div className="max-w-[1200px] mx-auto flex gap-3 md:ml-0">
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

      <SpaceDialog
        open={isSpaceDialogOpen}
        onOpenChange={setIsSpaceDialogOpen}
        propertyName={selectedProperty?.name || "the building"}
        propertyId={selectedPropertyId}
        onSuccess={(newSpace) => {
          form.setValue("spaceId", newSpace.id);
          setSelectedSpaceId(newSpace.id);
        }}
      />

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
                          className="flex-1 cursor-pointer hover-elevate px-2 py-1 rounded"
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
