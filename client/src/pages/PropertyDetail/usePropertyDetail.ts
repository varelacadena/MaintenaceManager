import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { toDisplayUrl } from "@/lib/imageUtils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getUserDisplayName } from "@/utils/taskUtils";
import type { Property, Equipment, Task, InsertEquipment, InsertProperty, Space, InsertSpace, User as UserType } from "@shared/schema";
import { insertEquipmentSchema, insertSpaceSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export const EQUIPMENT_CATEGORIES = [
  { slug: "hvac", label: "HVAC" },
  { slug: "electrical", label: "Electrical" },
  { slug: "plumbing", label: "Plumbing" },
  { slug: "mechanical", label: "Mechanical / Fleet" },
  { slug: "appliances", label: "Appliances" },
  { slug: "grounds", label: "Grounds / Landscaping" },
  { slug: "janitorial", label: "Janitorial" },
  { slug: "structural", label: "Structural" },
  { slug: "water_treatment", label: "Water Treatment" },
  { slug: "general", label: "General" },
] as const;

export type EquipmentCategorySlug = typeof EQUIPMENT_CATEGORIES[number]["slug"];

export const formSchema = insertEquipmentSchema.extend({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  manufacturerImageUrl: z.string().optional(),
});

export type FormData = z.infer<typeof formSchema>;

export const propertyFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["building", "lawn", "parking", "recreation", "utility", "road", "other"]),
  address: z.string().optional(),
});

export type PropertyFormData = z.infer<typeof propertyFormSchema>;

export const spaceFormSchema = insertSpaceSchema.extend({
  name: z.string().min(1, "Name is required"),
});

export type SpaceFormData = z.infer<typeof spaceFormSchema>;

export const categoryIcons: Record<string, any> = {
  hvac: "Wind",
  electrical: "Zap",
  plumbing: "Droplets",
  mechanical: "Settings",
  appliances: "Wrench",
  grounds: "Trees",
  janitorial: "Sparkles",
  structural: "Building2",
  water_treatment: "Waves",
  general: "HelpCircle",
  electric: "Zap",
  structure: "Building2",
  landscaping: "Trees",
  diagrams: "FileText",
  other: "HelpCircle",
};

export function usePropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditPropertyDialogOpen, setIsEditPropertyDialogOpen] = useState(false);
  const [isSpaceDialogOpen, setIsSpaceDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [spaceSearch, setSpaceSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [summaryTaskId, setSummaryTaskId] = useState<string | null>(null);
  const [qrEquipment, setQrEquipment] = useState<Equipment | null>(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [manufacturerImageUrl, setManufacturerImageUrl] = useState("");
  const uploadObjectPathRef = useRef<string>("");

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ["/api/properties", id],
  });

  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: [`/api/equipment?propertyId=${id}`],
    enabled: !!id,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/properties", id, "tasks"],
    enabled: !!id,
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const getAssigneeName = (userId: string) => {
    const u = users.find((usr) => usr.id === userId);
    if (!u) return "Unassigned";
    return getUserDisplayName(u);
  };

  const isBuilding = property?.type === "building";

  const { data: spaces = [] } = useQuery<Space[]>({
    queryKey: ["/api/spaces", id],
    enabled: !!id && isBuilding,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/spaces?propertyId=${id}`);
      return response.json();
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      propertyId: id || "",
      name: "",
      category: "general",
      description: "",
      serialNumber: "",
      condition: "",
      notes: "",
      imageUrl: "",
    },
  });

  const propertyForm = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      name: "",
      type: "building",
      address: "",
    },
  });

  const spaceForm = useForm<SpaceFormData>({
    resolver: zodResolver(spaceFormSchema),
    defaultValues: {
      propertyId: id || "",
      name: "",
      description: "",
      floor: "",
    },
  });

  const createSpaceMutation = useMutation({
    mutationFn: async (data: SpaceFormData) => {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spaces", id] });
      setIsSpaceDialogOpen(false);
      setEditingSpace(null);
      spaceForm.reset({ propertyId: id || "" });
      toast({ title: "Success", description: "Space added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create space", variant: "destructive" });
    },
  });

  const updateSpaceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertSpace> }) => {
      return await apiRequest("PATCH", `/api/spaces/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spaces", id] });
      toast({ title: "Success", description: "Space updated successfully" });
      setEditingSpace(null);
      setIsSpaceDialogOpen(false);
      spaceForm.reset({ propertyId: id || "" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update space", variant: "destructive" });
    },
  });

  const deleteSpaceMutation = useMutation({
    mutationFn: async (spaceId: string) => {
      return await apiRequest("DELETE", `/api/spaces/${spaceId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spaces", id] });
      queryClient.invalidateQueries({ queryKey: [`/api/equipment?propertyId=${id}`] });
      if (selectedSpaceId) setSelectedSpaceId(null);
      toast({ title: "Success", description: "Space deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete space", variant: "destructive" });
    },
  });

  const createEquipmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (newEquipment: Equipment) => {
      queryClient.invalidateQueries({ queryKey: [`/api/equipment?propertyId=${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", id] });
      setIsCreateDialogOpen(false);
      setEditingEquipment(null);
      setManufacturerImageUrl("");
      toast({ title: "Success", description: "Equipment added successfully" });
      setQrEquipment(newEquipment);
      setIsQrDialogOpen(true);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create equipment", variant: "destructive" });
    },
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEquipment> }) => {
      return await apiRequest("PATCH", `/api/equipment/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/equipment?propertyId=${id}`] });
      toast({ title: "Success", description: "Equipment updated successfully" });
      setEditingEquipment(null);
      form.reset({ propertyId: id });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update equipment", variant: "destructive" });
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (equipmentId: string) => {
      return await apiRequest("DELETE", `/api/equipment/${equipmentId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/equipment?propertyId=${id}`] });
      toast({ title: "Success", description: "Equipment deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete equipment", variant: "destructive" });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProperty> }) => {
      return await apiRequest("PATCH", `/api/properties/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Success", description: "Property updated successfully" });
      setIsEditPropertyDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update property", variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData = { ...data, manufacturerImageUrl: manufacturerImageUrl || undefined };
    if (editingEquipment) {
      updateEquipmentMutation.mutate({ id: editingEquipment.id, data: submitData });
    } else {
      createEquipmentMutation.mutate(submitData);
    }
  };

  const onPropertySubmit = (data: PropertyFormData) => {
    updatePropertyMutation.mutate({ id: id!, data });
  };

  const onSpaceSubmit = (data: SpaceFormData) => {
    if (editingSpace) {
      updateSpaceMutation.mutate({ id: editingSpace.id, data });
    } else {
      createSpaceMutation.mutate(data);
    }
  };

  const handleEditSpace = (space: Space) => {
    setEditingSpace(space);
    spaceForm.reset({
      propertyId: space.propertyId,
      name: space.name,
      description: space.description || "",
      floor: space.floor || "",
    });
    setIsSpaceDialogOpen(true);
  };

  const handleDeleteSpace = (spaceId: string) => {
    if (confirm("Are you sure you want to delete this space? This will also affect any equipment assigned to it.")) {
      deleteSpaceMutation.mutate(spaceId);
    }
  };

  const handleEditProperty = () => {
    if (property) {
      propertyForm.reset({
        name: property.name,
        type: property.type,
        address: property.address || "",
      });
      setIsEditPropertyDialogOpen(true);
    }
  };

  const handleEditEquipment = (item: Equipment) => {
    setEditingEquipment(item);
    setManufacturerImageUrl(toDisplayUrl((item as any).manufacturerImageUrl));
    form.reset({
      propertyId: item.propertyId,
      name: item.name,
      category: item.category,
      description: item.description || "",
      serialNumber: item.serialNumber || "",
      condition: item.condition || "",
      notes: item.notes || "",
      imageUrl: item.imageUrl || "",
      manufacturerImageUrl: (item as any).manufacturerImageUrl || "",
    });
    setIsCreateDialogOpen(true);
  };

  const handleDeleteEquipment = (equipmentId: string) => {
    if (confirm("Are you sure you want to delete this equipment?")) {
      deleteEquipmentMutation.mutate(equipmentId);
    }
  };

  const categories = EQUIPMENT_CATEGORIES.map((c) => c.slug);

  const spaceFilteredEquipment = selectedSpaceId
    ? equipment.filter(e => e.spaceId === selectedSpaceId)
    : equipment;

  const categoryFilteredEquipment = selectedCategory
    ? spaceFilteredEquipment.filter((e) => e.category.toLowerCase() === selectedCategory)
    : spaceFilteredEquipment;

  const filteredEquipment = equipmentSearch.trim()
    ? categoryFilteredEquipment.filter(e =>
        e.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
        (e.serialNumber && e.serialNumber.toLowerCase().includes(equipmentSearch.toLowerCase())) ||
        (e.description && e.description.toLowerCase().includes(equipmentSearch.toLowerCase()))
      )
    : categoryFilteredEquipment;

  const groupedEquipment = spaceFilteredEquipment.reduce((acc, item) => {
    const cat = item.category.toLowerCase();
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, Equipment[]>);

  const filteredSpaces = spaceSearch.trim()
    ? spaces.filter(s =>
        s.name.toLowerCase().includes(spaceSearch.toLowerCase()) ||
        (s.floor && s.floor.toLowerCase().includes(spaceSearch.toLowerCase())) ||
        (s.description && s.description.toLowerCase().includes(spaceSearch.toLowerCase()))
      )
    : spaces;

  const filteredTasks = taskSearch.trim()
    ? tasks.filter(t =>
        t.name.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(taskSearch.toLowerCase()))
      )
    : tasks;

  const canEdit = user?.role === "admin" || user?.role === "technician";
  const openTaskCount = tasks.filter((t) => t.status !== "completed").length;

  return {
    id, navigate, user, toast,
    isCreateDialogOpen, setIsCreateDialogOpen,
    isEditPropertyDialogOpen, setIsEditPropertyDialogOpen,
    isSpaceDialogOpen, setIsSpaceDialogOpen,
    editingEquipment, setEditingEquipment,
    editingSpace, setEditingSpace,
    selectedCategory, setSelectedCategory,
    selectedSpaceId, setSelectedSpaceId,
    equipmentSearch, setEquipmentSearch,
    spaceSearch, setSpaceSearch,
    taskSearch, setTaskSearch,
    summaryTaskId, setSummaryTaskId,
    qrEquipment, setQrEquipment,
    isQrDialogOpen, setIsQrDialogOpen,
    manufacturerImageUrl, setManufacturerImageUrl,
    uploadObjectPathRef,
    property, isLoading,
    equipment, tasks, users, spaces,
    isBuilding, canEdit, openTaskCount,
    form, propertyForm, spaceForm,
    createSpaceMutation, updateSpaceMutation, deleteSpaceMutation,
    createEquipmentMutation, updateEquipmentMutation, deleteEquipmentMutation,
    updatePropertyMutation,
    onSubmit, onPropertySubmit, onSpaceSubmit,
    handleEditSpace, handleDeleteSpace, handleEditProperty,
    handleEditEquipment, handleDeleteEquipment,
    categories, spaceFilteredEquipment, categoryFilteredEquipment,
    filteredEquipment, groupedEquipment, filteredSpaces, filteredTasks,
    getAssigneeName,
  };
}

export type PropertyDetailContext = ReturnType<typeof usePropertyDetail>;
