import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PropertyMap from "@/components/PropertyMap";
import type { Property, Equipment, Task, InsertEquipment, InsertProperty, Space, InsertSpace } from "@shared/schema";
import { insertEquipmentSchema, insertSpaceSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = insertEquipmentSchema.extend({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["appliances", "hvac", "electric", "plumbing", "structure", "landscaping", "diagrams", "other"]),
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
  appliances: Wrench,
  hvac: Wind,
  electric: Zap,
  plumbing: Droplets,
  structure: Home,
  landscaping: Trees,
  diagrams: FileText,
  other: Wrench,
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

  // Only fetch spaces for building properties
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
      category: "other",
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
      toast({
        title: "Success",
        description: "Room/space added successfully",
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

  const updateSpaceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertSpace> }) => {
      return await apiRequest("PATCH", `/api/spaces/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spaces", id] });
      toast({
        title: "Success",
        description: "Room/space updated successfully",
      });
      setEditingSpace(null);
      setIsSpaceDialogOpen(false);
      spaceForm.reset({ propertyId: id || "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update room/space",
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: "Room/space deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete room/space",
        variant: "destructive",
      });
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
      // Invalidate both equipment queries to ensure the list refreshes
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", id] });
      setIsCreateDialogOpen(false);
      setEditingEquipment(null);
      toast({
        title: "Success",
        description: "Equipment added successfully",
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

  const updateEquipmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEquipment> }) => {
      return await apiRequest("PATCH", `/api/equipment/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Success",
        description: "Equipment updated successfully",
      });
      setEditingEquipment(null);
      form.reset({ propertyId: id });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update equipment",
        variant: "destructive",
      });
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (equipmentId: string) => {
      return await apiRequest("DELETE", `/api/equipment/${equipmentId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Success",
        description: "Equipment deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete equipment",
        variant: "destructive",
      });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProperty> }) => {
      return await apiRequest("PATCH", `/api/properties/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
      setIsEditPropertyDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update property",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (editingEquipment) {
      updateEquipmentMutation.mutate({
        id: editingEquipment.id,
        data,
      });
    } else {
      createEquipmentMutation.mutate(data);
    }
  };

  const onPropertySubmit = (data: PropertyFormData) => {
    updatePropertyMutation.mutate({
      id: id!,
      data,
    });
  };

  const onSpaceSubmit = (data: SpaceFormData) => {
    if (editingSpace) {
      updateSpaceMutation.mutate({
        id: editingSpace.id,
        data,
      });
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
    if (confirm("Are you sure you want to delete this room/space? This will also affect any equipment assigned to it.")) {
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

  const categories = [
    "appliances",
    "hvac",
    "structure",
    "plumbing",
    "electric",
    "landscaping",
    "diagrams",
    "other",
  ];

  // Filter equipment by space first (if building), then by category
  const spaceFilteredEquipment = selectedSpaceId 
    ? equipment.filter(e => e.spaceId === selectedSpaceId)
    : equipment;
  
  const filteredEquipment = selectedCategory
    ? spaceFilteredEquipment.filter((e) => e.category === selectedCategory)
    : spaceFilteredEquipment;

  const groupedEquipment = spaceFilteredEquipment.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, Equipment[]>);

  const canEdit = user?.role === "admin" || user?.role === "technician";

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
    <div className="h-full flex flex-col gap-4 md:gap-6 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {canEdit && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleEditProperty}
              data-testid="button-edit-property"
              className="flex-1 sm:flex-none h-9 text-xs md:text-sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Property
            </Button>
            {/* The delete property button is removed as it's not in scope of this change */}
          </div>
        )}
      </div>

      {/* Property Details */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0 p-4 md:p-6">
          <div className="space-y-1">
            <CardTitle className="text-2xl md:text-3xl font-bold" data-testid="heading-property-name">{property.name}</CardTitle>
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground flex-wrap">
              <Badge variant="secondary">{property.type}</Badge>
              {property.address && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {property.address}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last Work Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {property.lastWorkDate
                ? new Date(property.lastWorkDate).toLocaleDateString()
                : "No work recorded"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Open Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.filter((t) => t.status !== "completed").length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={isBuilding ? "spaces" : "equipment"} className="flex-1">
        <TabsList>
          {isBuilding && (
            <TabsTrigger value="spaces" data-testid="tab-spaces">
              <DoorOpen className="w-4 h-4 mr-1" />
              Rooms ({spaces.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="equipment" data-testid="tab-equipment">Equipment</TabsTrigger>
          <TabsTrigger value="work-history" data-testid="tab-work-history">Work History</TabsTrigger>
        </TabsList>

        {/* Spaces Tab for Buildings */}
        {isBuilding && (
          <TabsContent value="spaces" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Manage rooms, offices, bathrooms and other spaces within this building
              </p>
              {canEdit && (
                <Button
                  onClick={() => {
                    setEditingSpace(null);
                    spaceForm.reset({ propertyId: id || "", name: "", description: "", floor: "" });
                    setIsSpaceDialogOpen(true);
                  }}
                  data-testid="button-add-space"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Room/Space
                </Button>
              )}
            </div>
            
            {spaces.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <DoorOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No rooms or spaces defined yet</p>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingSpace(null);
                        spaceForm.reset({ propertyId: id || "" });
                        setIsSpaceDialogOpen(true);
                      }}
                      data-testid="button-add-first-space"
                    >
                      Add your first room or space
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {spaces.map((space) => (
                  <Card key={space.id} data-testid={`card-space-${space.id}`} className="hover-elevate cursor-pointer" onClick={() => setSelectedSpaceId(space.id)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <DoorOpen className="w-5 h-5 text-primary" />
                          <CardTitle className="text-base">{space.name}</CardTitle>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSpace(space);
                              }}
                              data-testid={`button-edit-space-${space.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSpace(space.id);
                              }}
                              data-testid={`button-delete-space-${space.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {space.floor && (
                        <Badge variant="outline" className="mb-2">{space.floor}</Badge>
                      )}
                      {space.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{space.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {equipment.filter(e => e.spaceId === space.id).length} equipment items
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="equipment" className="space-y-4">
          {/* Space filter for buildings */}
          {isBuilding && spaces.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Filter by room:</span>
              <Select value={selectedSpaceId || "__all__"} onValueChange={(v) => setSelectedSpaceId(v === "__all__" ? null : v)}>
                <SelectTrigger className="w-48" data-testid="select-space-filter">
                  <SelectValue placeholder="All rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All rooms</SelectItem>
                  {spaces.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                data-testid="filter-all"
                className="whitespace-nowrap h-8 text-xs md:text-sm"
              >
                All ({equipment.length})
              </Button>
              {categories.map((cat) => {
                const count = groupedEquipment[cat]?.length || 0;
                const Icon = categoryIcons[cat];
                return (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    data-testid={`filter-${cat}`}
                    className="whitespace-nowrap h-8 text-xs md:text-sm"
                  >
                    <Icon className="w-4 h-4 mr-1 shrink-0" />
                    <span className="hidden sm:inline">{cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})</span>
                    <span className="sm:hidden">{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                  </Button>
                );
              })}
            </div>
            {canEdit && (
              <Button
                onClick={() => {
                  setEditingEquipment(null);
                  form.reset({
                    propertyId: id || "",
                    name: "",
                    category: "other",
                    description: "",
                    serialNumber: "",
                    condition: "",
                    notes: "",
                    imageUrl: "",
                  });
                  setIsCreateDialogOpen(true);
                }}
                data-testid="button-add-equipment"
                className="w-full sm:w-auto h-9 text-xs md:text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Equipment
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredEquipment.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 md:py-12 text-center text-muted-foreground">
                  <Wrench className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm md:text-base">No equipment in this category</p>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingEquipment(null);
                        form.reset({
                          propertyId: id || "",
                          name: "",
                          category: (selectedCategory as FormData["category"]) || "other",
                          description: "",
                          serialNumber: "",
                          condition: "",
                          notes: "",
                          imageUrl: "",
                        });
                        setIsCreateDialogOpen(true);
                      }}
                      data-testid="button-add-first-equipment"
                      className="text-xs md:text-sm"
                    >
                      Add your first equipment
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredEquipment.map((item) => {
                const Icon = categoryIcons[item.category];
                return (
                  <Card key={item.id} data-testid={`card-equipment-${item.id}`}>
                    <CardContent className="p-3 md:p-4">
                      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                        <div className="flex sm:flex-col gap-2 order-2 sm:order-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/equipment/${item.id}/work-history`)}
                            data-testid={`button-work-history-${item.id}`}
                            className="text-xs whitespace-nowrap flex-1 sm:flex-none h-8"
                          >
                            Work History
                          </Button>
                          {canEdit && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditEquipment(item)}
                                data-testid={`button-edit-${item.id}`}
                                className="justify-start flex-1 sm:flex-none h-8"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteEquipment(item.id)}
                                data-testid={`button-delete-${item.id}`}
                                className="justify-start text-destructive hover:text-destructive flex-1 sm:flex-none h-8"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 order-1 sm:order-2">
                          <h3 className="text-xl md:text-2xl font-bold mb-2">{item.name}</h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <Badge variant="secondary" className="text-xs">
                                {item.category}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            {item.serialNumber && (
                              <div className="text-xs">
                                <span className="font-semibold">Serial:</span> {item.serialNumber}
                              </div>
                            )}
                            {item.condition && (
                              <div className="text-xs">
                                <span className="font-semibold">Condition:</span> {item.condition}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="work-history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Task History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No tasks assigned to this property yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <Card key={task.id} className="hover-elevate cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{task.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant={task.status === "completed" ? "default" : "secondary"} className="text-xs">
                                {task.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {task.urgency}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(task.initialDate).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Map - Now at the bottom */}
      <Card className="relative z-0" style={{ height: "400px" }}>
        <CardHeader>
          <CardTitle className="text-lg">Location</CardTitle>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-4rem)]">
          <PropertyMap
            properties={[property]}
            selectedPropertyId={property.id}
            editable={false}
          />
        </CardContent>
      </Card>

      <Dialog open={isEditPropertyDialogOpen} onOpenChange={setIsEditPropertyDialogOpen}>
        <DialogContent className="z-50">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update property information
            </DialogDescription>
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
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="123 Main St"
                        data-testid="input-property-address"
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
                  onClick={() => {
                    setIsEditPropertyDialogOpen(false);
                    propertyForm.reset();
                  }}
                  data-testid="button-cancel-property"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatePropertyMutation.isPending}
                  data-testid="button-submit-property"
                >
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
            <DialogTitle>
              {editingEquipment ? "Edit Equipment" : "Add Equipment"}
            </DialogTitle>
            <DialogDescription>
              {editingEquipment
                ? "Update equipment information"
                : "Add new equipment to this property"}
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
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Detailed description of the equipment"
                        data-testid="input-equipment-description"
                      />
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
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="SN-12345"
                          data-testid="input-serial-number"
                        />
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
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="Good, Fair, Poor"
                          data-testid="input-condition"
                        />
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
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Additional notes"
                        data-testid="input-notes"
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
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingEquipment(null);
                    form.reset({
                      propertyId: id || "",
                      name: "",
                      category: "other",
                      description: "",
                      serialNumber: "",
                      condition: "",
                      notes: "",
                      imageUrl: "",
                    });
                  }}
                  data-testid="button-cancel-equipment"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createEquipmentMutation.isPending || updateEquipmentMutation.isPending}
                  data-testid="button-submit-equipment"
                >
                  {editingEquipment ? "Update Equipment" : "Add Equipment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Space Dialog for Buildings */}
      <Dialog open={isSpaceDialogOpen} onOpenChange={(open) => {
        setIsSpaceDialogOpen(open);
        if (!open) {
          setEditingSpace(null);
          spaceForm.reset({ propertyId: id || "" });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSpace ? "Edit Room/Space" : "Add Room/Space"}</DialogTitle>
            <DialogDescription>
              Add rooms, offices, classrooms, or other spaces within this building.
            </DialogDescription>
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
                      <Input placeholder="e.g., Room 101, Men's Bathroom, Main Office" {...field} data-testid="input-space-name" />
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsSpaceDialogOpen(false);
                    setEditingSpace(null);
                    spaceForm.reset({ propertyId: id || "" });
                  }}
                  data-testid="button-cancel-space"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSpaceMutation.isPending || updateSpaceMutation.isPending}
                  data-testid="button-submit-space"
                >
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