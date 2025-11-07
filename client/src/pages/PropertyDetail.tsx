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
  ArrowLeft,
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PropertyMap from "@/components/PropertyMap";
import type { Property, Equipment, Task, InsertEquipment, InsertProperty } from "@shared/schema";
import { insertEquipmentSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = insertEquipmentSchema.extend({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
});

type FormData = z.infer<typeof formSchema>;

const propertyFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  address: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

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
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ["/api/properties", id],
  });

  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment", { propertyId: id }],
    enabled: !!id,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/properties", id, "tasks"],
    enabled: !!id,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      propertyId: id,
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
      type: "",
      address: "",
    },
  });

  const createEquipmentMutation = useMutation({
    mutationFn: async (data: InsertEquipment) => {
      return await apiRequest("POST", "/api/equipment", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Success",
        description: "Equipment created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset({ propertyId: id });
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

  const filteredEquipment = selectedCategory
    ? equipment.filter((e) => e.category === selectedCategory)
    : equipment;

  const groupedEquipment = equipment.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, Equipment[]>);

  const canEdit = user?.role === "admin" || user?.role === "maintenance";

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
        <Button onClick={() => navigate("/properties")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Properties
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <Card className="w-full">
        <CardContent className="p-0 h-[300px] relative z-0">
          <PropertyMap
            properties={[property]}
            selectedPropertyId={property.id}
            editable={false}
          />
        </CardContent>
      </Card>

      <div>
        <Button
          variant="ghost"
          onClick={() => navigate("/properties")}
          className="mb-4"
          data-testid="button-back-to-map"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Map
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-property-name">{property.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{property.type}</Badge>
              {property.address && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {property.address}
                </div>
              )}
            </div>
          </div>
          {canEdit && (
            <Button onClick={handleEditProperty} data-testid="button-edit-property">
              <Edit className="w-4 h-4 mr-2" />
              Edit Property
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipment.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="equipment" className="flex-1">
        <TabsList>
          <TabsTrigger value="equipment" data-testid="tab-equipment">Equipment</TabsTrigger>
          <TabsTrigger value="work-history" data-testid="tab-work-history">Work History</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                data-testid="filter-all"
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
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
                  </Button>
                );
              })}
            </div>
            {canEdit && (
              <Button
                onClick={() => {
                  setEditingEquipment(null);
                  form.reset({ propertyId: id });
                  setIsCreateDialogOpen(true);
                }}
                data-testid="button-add-equipment"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Equipment
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEquipment.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No equipment in this category</p>
                  {canEdit && (
                    <Button
                      variant="link"
                      onClick={() => {
                        setEditingEquipment(null);
                        form.reset({ propertyId: id, category: selectedCategory || "other" });
                        setIsCreateDialogOpen(true);
                      }}
                      data-testid="button-add-first-equipment"
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
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-semibold truncate">{item.name}</CardTitle>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditEquipment(item)}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteEquipment(item.id)}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
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
                    form.reset({ propertyId: id });
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
    </div>
  );
}