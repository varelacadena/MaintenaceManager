import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Building2, MapPin, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PropertyMap from "@/components/PropertyMap";
import type { Property, InsertProperty } from "@shared/schema";
import { insertPropertySchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = insertPropertySchema.extend({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function PropertyMapPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [pendingCoordinates, setPendingCoordinates] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "building",
      address: "",
      imageUrl: "",
      coordinates: null,
      lastWorkDate: null,
    },
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      return await apiRequest("POST", "/api/properties", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property created successfully",
      });
      setIsCreateDialogOpen(false);
      setPendingCoordinates(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create property",
        variant: "destructive",
      });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProperty> }) => {
      return await apiRequest("PATCH", `/api/properties/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update property",
        variant: "destructive",
      });
    },
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/properties/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
      setSelectedPropertyId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete property",
        variant: "destructive",
      });
    },
  });

  const handleShapeCreated = (coordinates: any, type: string) => {
    setPendingCoordinates(coordinates);
    setIsCreateDialogOpen(true);
  };

  const handleShapeEdited = (propertyId: string, coordinates: any) => {
    updatePropertyMutation.mutate({
      id: propertyId,
      data: { coordinates },
    });
  };

  const handlePropertyDelete = (propertyId: string) => {
    deletePropertyMutation.mutate(propertyId);
  };

  const handlePropertySelect = (property: Property) => {
    navigate(`/properties/${property.id}`);
  };

  const onSubmit = (data: FormData) => {
    if (!pendingCoordinates) {
      toast({
        title: "Error",
        description: "Please draw a shape on the map first",
        variant: "destructive",
      });
      return;
    }

    createPropertyMutation.mutate({
      ...data,
      coordinates: pendingCoordinates,
    });
  };

  const canEdit = user?.role === "admin" || user?.role === "maintenance";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-property-map">Property Map</h1>
          <p className="text-muted-foreground mt-1">
            Interactive map of all facility properties and buildings
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant={editMode ? "default" : "outline"}
              onClick={() => setEditMode(!editMode)}
              data-testid="button-toggle-edit"
            >
              <Edit className="w-4 h-4 mr-2" />
              Add new
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <Card className="relative z-0 flex-1">
          <CardContent className="p-0 h-full">
            <PropertyMap
              properties={properties}
              onPropertySelect={handlePropertySelect}
              onShapeCreated={canEdit && editMode ? handleShapeCreated : undefined}
              onPropertyDelete={canEdit && editMode ? handlePropertyDelete : undefined}
              selectedPropertyId={selectedPropertyId}
              editable={canEdit && editMode}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Properties</CardTitle>
            <Badge variant="secondary">{properties.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {properties.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground col-span-full">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No properties yet</p>
                    {canEdit && editMode && (
                      <p className="text-xs mt-1">Draw shapes on the map to add properties</p>
                    )}
                  </div>
                ) : (
                  properties.map((property) => (
                    <Card
                      key={property.id}
                      className={`cursor-pointer hover-elevate ${
                        selectedPropertyId === property.id ? "border-primary" : ""
                      }`}
                      onClick={() => setSelectedPropertyId(property.id)}
                      data-testid={`card-property-${property.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base mb-1">{property.name}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {property.type}
                              </Badge>
                            </div>
                          </div>
                          {property.address && (
                            <p className="text-sm text-muted-foreground">
                              {property.address}
                            </p>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/properties/${property.id}`);
                              }}
                              data-testid={`button-view-${property.id}`}
                            >
                              View
                            </Button>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePropertyDelete(property.id);
                                }}
                                data-testid={`button-delete-${property.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Property</DialogTitle>
            <DialogDescription>
              Add details for the property you just drew on the map
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
                      <Input {...field} placeholder="Building A" data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-type">
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
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="123 Main St"
                        data-testid="input-address"
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
                    setPendingCoordinates(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPropertyMutation.isPending}
                  data-testid="button-submit"
                >
                  {createPropertyMutation.isPending ? "Creating..." : "Create Property"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}