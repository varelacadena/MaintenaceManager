import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Plus,
  Edit,
  Trash2,
  Wrench,
  Wind,
  Zap,
  Droplets,
  Home,
  Trees,
  FileText,
  Calendar,
  MapPin,
  DoorOpen,
  Search,
  ChevronRight,
  ClipboardList,
  Map,
  Building2,
  Waves,
  Sparkles,
  HelpCircle,
  Settings,
  BookOpen,
} from "lucide-react";
import ResourceCard from "@/components/ResourceCard";
import { getCategoryStyle } from "@/lib/categoryColors";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PropertyMap from "@/components/PropertyMap";
import type { Property, Equipment, Task, InsertEquipment, InsertProperty, Space, InsertSpace } from "@shared/schema";
import { insertEquipmentSchema, insertSpaceSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const EQUIPMENT_CATEGORIES = [
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

type EquipmentCategorySlug = typeof EQUIPMENT_CATEGORIES[number]["slug"];

const formSchema = insertEquipmentSchema.extend({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
});

type FormData = z.infer<typeof formSchema>;

const propertyFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["building", "lawn", "parking", "recreation", "utility", "road", "other"]),
  address: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

const spaceFormSchema = insertSpaceSchema.extend({
  name: z.string().min(1, "Name is required"),
});

type SpaceFormData = z.infer<typeof spaceFormSchema>;

const categoryIcons: Record<string, any> = {
  hvac: Wind,
  electrical: Zap,
  plumbing: Droplets,
  mechanical: Settings,
  appliances: Wrench,
  grounds: Trees,
  janitorial: Sparkles,
  structural: Building2,
  water_treatment: Waves,
  general: HelpCircle,
  // legacy aliases
  electric: Zap,
  structure: Building2,
  landscaping: Trees,
  diagrams: FileText,
  other: HelpCircle,
};

export default function PropertyDetail() {
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
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", id] });
      setIsCreateDialogOpen(false);
      setEditingEquipment(null);
      toast({ title: "Success", description: "Equipment added successfully" });
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
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
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
    if (editingEquipment) {
      updateEquipmentMutation.mutate({ id: editingEquipment.id, data });
    } else {
      createEquipmentMutation.mutate(data);
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
    form.reset({
      propertyId: item.propertyId,
      name: item.name,
      category: item.category,
      description: item.description || "",
      serialNumber: item.serialNumber || "",
      condition: item.condition || "",
      notes: item.notes || "",
      imageUrl: item.imageUrl || "",
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
    ? spaceFilteredEquipment.filter((e) => e.category === selectedCategory)
    : spaceFilteredEquipment;

  const filteredEquipment = equipmentSearch.trim()
    ? categoryFilteredEquipment.filter(e =>
        e.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
        (e.serialNumber && e.serialNumber.toLowerCase().includes(equipmentSearch.toLowerCase())) ||
        (e.description && e.description.toLowerCase().includes(equipmentSearch.toLowerCase()))
      )
    : categoryFilteredEquipment;

  const groupedEquipment = spaceFilteredEquipment.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading property...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-muted-foreground">Property not found</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2 p-3 md:p-0">
      <div className="flex flex-col gap-1 border-b pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h1 className="text-lg md:text-xl font-bold" data-testid="heading-property-name">{property.name}</h1>
            <Badge variant="secondary">{property.type}</Badge>
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditProperty}
              data-testid="button-edit-property"
              className="flex-shrink-0"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {property.address && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {property.address}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            Last work: {property.lastWorkDate ? new Date(property.lastWorkDate).toLocaleDateString() : "None"}
          </span>
          <span className="flex items-center gap-1">
            <ClipboardList className="w-3 h-3 flex-shrink-0" />
            {openTaskCount} open {openTaskCount === 1 ? "task" : "tasks"}
          </span>
        </div>
      </div>

      <Tabs defaultValue={isBuilding ? "spaces" : "equipment"} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full overflow-x-auto flex-shrink-0">
          {isBuilding && (
            <TabsTrigger value="spaces" data-testid="tab-spaces" className="text-xs md:text-sm">
              <DoorOpen className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              <span className="whitespace-nowrap">Spaces ({spaces.length})</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="equipment" data-testid="tab-equipment" className="text-xs md:text-sm">
            <Wrench className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
            <span className="whitespace-nowrap">Equipment ({equipment.length})</span>
          </TabsTrigger>
          <TabsTrigger value="work-history" data-testid="tab-work-history" className="text-xs md:text-sm">
            <Calendar className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
            <span className="whitespace-nowrap">History ({tasks.length})</span>
          </TabsTrigger>
          <TabsTrigger value="location" data-testid="tab-location" className="text-xs md:text-sm">
            <Map className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
            <span className="whitespace-nowrap">Location</span>
          </TabsTrigger>
          <TabsTrigger value="resources" data-testid="tab-resources" className="text-xs md:text-sm">
            <BookOpen className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
            <span className="whitespace-nowrap">Resources</span>
          </TabsTrigger>
        </TabsList>

        {isBuilding && (
          <TabsContent value="spaces" className="flex flex-col min-h-0 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search spaces..."
                  value={spaceSearch}
                  onChange={(e) => setSpaceSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-spaces"
                />
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingSpace(null);
                    spaceForm.reset({ propertyId: id || "", name: "", description: "", floor: "" });
                    setIsSpaceDialogOpen(true);
                  }}
                  data-testid="button-add-space"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Space
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredSpaces.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DoorOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{spaceSearch ? "No spaces match your search" : "No spaces defined yet"}</p>
                  {canEdit && !spaceSearch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSpace(null);
                        spaceForm.reset({ propertyId: id || "" });
                        setIsSpaceDialogOpen(true);
                      }}
                      data-testid="button-add-first-space"
                    >
                      Add your first space
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredSpaces.map((space) => {
                    const spaceEquipCount = equipment.filter(e => e.spaceId === space.id).length;
                    return (
                      <div
                        key={space.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-md border hover-elevate cursor-pointer"
                        onClick={() => {
                          setSelectedSpaceId(space.id);
                        }}
                        data-testid={`card-space-${space.id}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <DoorOpen className="w-4 h-4 text-primary flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">{space.name}</span>
                              {space.floor && <Badge variant="outline">{space.floor}</Badge>}
                            </div>
                            {space.description && (
                              <p className="text-xs text-muted-foreground truncate">{space.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{spaceEquipCount} items</span>
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleEditSpace(space); }}
                                data-testid={`button-edit-space-${space.id}`}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleDeleteSpace(space.id); }}
                                data-testid={`button-delete-space-${space.id}`}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="equipment" className="flex flex-col min-h-0 mt-2">
          <div className="flex flex-col gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search equipment..."
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-equipment"
                />
              </div>
              <div className="flex items-center gap-2">
                {isBuilding && spaces.length > 0 && (
                  <Select value={selectedSpaceId || "__all__"} onValueChange={(v) => setSelectedSpaceId(v === "__all__" ? null : v)}>
                    <SelectTrigger className="w-28 md:w-36" data-testid="select-space-filter">
                      <SelectValue placeholder="All spaces" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All spaces</SelectItem>
                      {spaces.map((space) => (
                        <SelectItem key={space.id} value={space.id}>{space.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {canEdit && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingEquipment(null);
                      form.reset({
                        propertyId: id || "", name: "", category: "general",
                        description: "", serialNumber: "", condition: "", notes: "", imageUrl: "",
                      });
                      setIsCreateDialogOpen(true);
                    }}
                    data-testid="button-add-equipment"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 flex-wrap">
              <Badge
                variant={selectedCategory === null ? "default" : "secondary"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setSelectedCategory(null)}
                data-testid="filter-all"
              >
                All ({spaceFilteredEquipment.length})
              </Badge>
              {categories.map((cat) => {
                const count = groupedEquipment[cat]?.length || 0;
                if (count === 0) return null;
                const Icon = categoryIcons[cat];
                return (
                  <Badge
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "secondary"}
                    className="cursor-pointer whitespace-nowrap gap-1"
                    onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                    data-testid={`filter-${cat}`}
                  >
                    <Icon className="w-3 h-3" />
                    {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredEquipment.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{equipmentSearch ? "No equipment matches your search" : "No equipment in this category"}</p>
                {canEdit && !equipmentSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingEquipment(null);
                      form.reset({
                        propertyId: id || "", name: "",
                        category: (selectedCategory as FormData["category"]) || "general",
                        description: "", serialNumber: "", condition: "", notes: "", imageUrl: "",
                      });
                      setIsCreateDialogOpen(true);
                    }}
                    data-testid="button-add-first-equipment"
                  >
                    Add your first equipment
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredEquipment.map((item) => {
                  const Icon = categoryIcons[item.category];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-md border hover-elevate"
                      data-testid={`card-equipment-${item.id}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{item.name}</span>
                            <Badge variant="secondary">{EQUIPMENT_CATEGORIES.find(c => c.slug === item.category)?.label ?? item.category}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {item.serialNumber && <span>SN: {item.serialNumber}</span>}
                            {item.condition && <span>Condition: {item.condition}</span>}
                            {item.description && <span className="truncate">{item.description}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/equipment/${item.id}/work-history`)}
                          data-testid={`button-work-history-${item.id}`}
                        >
                          <Calendar className="w-3 h-3" />
                        </Button>
                        {canEdit && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditEquipment(item)}
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteEquipment(item.id)}
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="work-history" className="flex flex-col min-h-0 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-tasks"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{taskSearch ? "No tasks match your search" : "No tasks assigned to this property yet"}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md border hover-elevate cursor-pointer"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    data-testid={`row-task-${task.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm block truncate">{task.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                          {task.status}
                        </Badge>
                        <Badge variant="outline">
                          {task.urgency}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(task.initialDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="location" className="min-h-0 mt-2">
          <Card className="relative z-0 h-full" style={{ minHeight: "400px" }}>
            <CardContent className="p-0 h-full">
              <PropertyMap
                properties={[property]}
                selectedPropertyId={property.id}
                editable={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="flex flex-col min-h-0 mt-2">
          <PropertyResourcesTab propertyId={id!} propertyName={property.name} />
        </TabsContent>
      </Tabs>

      <Dialog open={isEditPropertyDialogOpen} onOpenChange={setIsEditPropertyDialogOpen}>
        <DialogContent className="z-50">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>Update property information</DialogDescription>
          </DialogHeader>
          <Form {...propertyForm}>
            <form onSubmit={propertyForm.handleSubmit(onPropertySubmit)} className="space-y-4">
              <FormField
                control={propertyForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Building A" data-testid="input-property-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={propertyForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-property-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="building">Building</SelectItem>
                        <SelectItem value="lawn">Lawn</SelectItem>
                        <SelectItem value="parking">Parking</SelectItem>
                        <SelectItem value="recreation">Recreation</SelectItem>
                        <SelectItem value="utility">Utility</SelectItem>
                        <SelectItem value="road">Road</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={propertyForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="123 Main St" data-testid="input-property-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsEditPropertyDialogOpen(false); propertyForm.reset(); }} data-testid="button-cancel-property">Cancel</Button>
                <Button type="submit" disabled={updatePropertyMutation.isPending} data-testid="button-submit-property">
                  {updatePropertyMutation.isPending ? "Updating..." : "Update Property"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEquipment ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
            <DialogDescription>
              {editingEquipment ? "Update equipment information" : "Add new equipment to this property"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="HVAC Unit #1" data-testid="input-equipment-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-equipment-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EQUIPMENT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.slug} value={cat.slug}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Detailed description of the equipment" data-testid="input-equipment-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="SN-12345" data-testid="input-serial-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Good, Fair, Poor" data-testid="input-condition" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Additional notes" data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingEquipment(null);
                    form.reset({
                      propertyId: id || "", name: "", category: "general",
                      description: "", serialNumber: "", condition: "", notes: "", imageUrl: "",
                    });
                  }}
                  data-testid="button-cancel-equipment"
                >Cancel</Button>
                <Button type="submit" disabled={createEquipmentMutation.isPending || updateEquipmentMutation.isPending} data-testid="button-submit-equipment">
                  {editingEquipment ? "Update Equipment" : "Add Equipment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSpaceDialogOpen} onOpenChange={(open) => {
        setIsSpaceDialogOpen(open);
        if (!open) {
          setEditingSpace(null);
          spaceForm.reset({ propertyId: id || "" });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSpace ? "Edit Space" : "Add Space"}</DialogTitle>
            <DialogDescription>Add offices, classrooms, grounds, or other spaces within this property.</DialogDescription>
          </DialogHeader>
          <Form {...spaceForm}>
            <form onSubmit={spaceForm.handleSubmit(onSpaceSubmit)} className="space-y-4">
              <FormField
                control={spaceForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Office, Grounds, Classroom 101" {...field} data-testid="input-space-name" />
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
                      <Input placeholder="e.g., 1st Floor, Basement, 2nd Floor" {...field} value={field.value || ""} data-testid="input-space-floor" />
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
                      <Textarea placeholder="Optional description of this space" {...field} value={field.value || ""} data-testid="input-space-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsSpaceDialogOpen(false); setEditingSpace(null); spaceForm.reset({ propertyId: id || "" }); }} data-testid="button-cancel-space">Cancel</Button>
                <Button type="submit" disabled={createSpaceMutation.isPending || updateSpaceMutation.isPending} data-testid="button-submit-space">
                  {editingSpace ? "Update" : "Add Space"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PropertyResourcesTab({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: propertyResources = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/properties", propertyId, "resources"],
    queryFn: () => fetch(`/api/properties/${propertyId}/resources`).then(r => r.json()),
  });

  const grouped = propertyResources.reduce((acc: Record<string, any[]>, r: any) => {
    const key = r.category?.name || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (propertyResources.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="empty-resources">
        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No resources linked to this property</p>
        {isAdmin ? (
          <p className="text-sm mt-1">
            Go to the{" "}
            <Link href="/resources" className="underline text-primary">Resource Library</Link>
            {" "}to add resources and link them here.
          </p>
        ) : (
          <p className="text-sm mt-1">Resources can be added from the Resource Library.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-y-auto">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{category}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(items as any[]).map((resource: any) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
