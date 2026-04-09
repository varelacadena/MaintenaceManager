import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTaskSchema, insertEquipmentSchema } from "@shared/schema";
import type { User, Vendor, ServiceRequest, Property, Equipment, Space, ChecklistTemplate, Project, Vehicle } from "@shared/schema";
import { z } from "zod";
import type { SelectedAsset } from "@/components/task-form/TaskLocationFields";

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

export type FormData = z.infer<typeof formSchema>;

export type ChecklistGroup = {
  name: string;
  items: { text: string; isCompleted: boolean }[];
};

export type PendingSubTask = {
  name: string;
  description: string;
  equipmentId: string;
  vehicleId: string;
};

export function useNewTask() {
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

  return {
    user,
    navigate,
    toast,
    selectedPropertyId, setSelectedPropertyId,
    selectedSpaceId, setSelectedSpaceId,
    locationScope, setLocationScope,
    selectedPropertyIds, setSelectedPropertyIds,
    taskType, setTaskType,
    assignmentOption, setAssignmentOption,
    contactType, setContactType,
    selectedVendorId, setSelectedVendorId,
    isEquipmentDialogOpen, setIsEquipmentDialogOpen,
    isSpaceDialogOpen, setIsSpaceDialogOpen,
    pendingEquipmentFiles, setPendingEquipmentFiles,
    equipmentFileInputRef,
    selectedAssets, setSelectedAssets,
    multiAssetMode,
    selectedHelperIds, setSelectedHelperIds,
    requestId,
    projectId,
    request,
    project,
    properties,
    users,
    technicianUsers,
    studentUsers,
    vendors,
    projects,
    allVehicles,
    selectedProperty,
    isBuilding,
    spaces,
    equipment,
    checklistGroups, setChecklistGroups,
    isChecklistDialogOpen, setIsChecklistDialogOpen,
    editingChecklistIndex, setEditingChecklistIndex,
    dialogChecklistName, setDialogChecklistName,
    dialogChecklistItems, setDialogChecklistItems,
    newDialogChecklistItem, setNewDialogChecklistItem,
    editingItemIndex, setEditingItemIndex,
    isTemplateDialogOpen, setIsTemplateDialogOpen,
    saveTemplateName, setSaveTemplateName,
    saveTemplateDescription, setSaveTemplateDescription,
    isTemplatePopoverOpen, setIsTemplatePopoverOpen,
    pendingSubTasks, setPendingSubTasks,
    checklistTemplates,
    saveTemplateMutation,
    applyTemplate,
    handleSaveAsTemplate,
    confirmSaveTemplate,
    equipmentForm,
    createEquipmentMutation,
    form,
    requester,
    createTaskMutation,
    handleSubmit,
    handleAddAsset,
    handleRemoveAsset,
  };
}

export type NewTaskContext = ReturnType<typeof useNewTask>;
