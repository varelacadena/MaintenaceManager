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
import { Building2, MapPin, Edit, Trash2, ChevronDown, Trees, Car, Gamepad2, Wrench, Route, HelpCircle, Search, Map, List, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PropertyMap from "@/components/PropertyMap";
import type { Property, InsertProperty } from "@shared/schema";
import { insertPropertySchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const propertyTypeValues = ["building", "lawn", "parking", "recreation", "utility", "road", "other"] as const;

const formSchema = insertPropertySchema.extend({
  name: z.string().min(1, "Name is required"),
  type: z.enum(propertyTypeValues),
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
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showMap, setShowMap] = useState(true);

  const propertyTypes = [
    { value: "building", label: "Buildings", icon: Building2 },
    { value: "lawn", label: "Lawns", icon: Trees },
    { value: "parking", label: "Parking", icon: Car },
    { value: "recreation", label: "Recreation", icon: Gamepad2 },
    { value: "utility", label: "Utilities", icon: Wrench },
    { value: "road", label: "Roads", icon: Route },
    { value: "other", label: "Other", icon: HelpCircle },
  ];

  const toggleSection = (type: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const filteredProperties = properties.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.address && p.address.toLowerCase().includes(q));
  });

  const groupedProperties = propertyTypes.reduce((acc, type) => {
    acc[type.value] = filteredProperties.filter(p => p.type === type.value);
    return acc;
  }, {} as Record<string, Property[]>);

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

  const canEdit = user?.role === "admin" || user?.role === "technician";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading properties...</div>
      </div>
    );
  }

  const propertyListContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 pb-3 border-b">
        <div className="flex items-center gap-2 flex-1">
          <h2 className="text-lg font-semibold whitespace-nowrap" data-testid="heading-properties">Properties</h2>
          <Badge variant="secondary">{filteredProperties.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showMap ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMap(!showMap)}
            data-testid="button-toggle-map"
            className="md:hidden"
          >
            {showMap ? <><List className="w-4 h-4 mr-1" /> List</> : <><Map className="w-4 h-4 mr-1" /> Map</>}
          </Button>
          {canEdit && (
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              onClick={() => setEditMode(!editMode)}
              data-testid="button-toggle-edit"
            >
              <Edit className="w-4 h-4 mr-1" />
              Add new
            </Button>
          )}
        </div>
      </div>

      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search properties..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-properties"
        />
      </div>

      <div className="flex flex-wrap gap-2 mt-3 pb-2">
        {propertyTypes.map((type) => {
          const count = groupedProperties[type.value]?.length || 0;
          if (count === 0) return null;
          const Icon = type.icon;
          return (
            <Badge
              key={type.value}
              variant="secondary"
              className="cursor-pointer gap-1"
              onClick={() => {
                const element = document.getElementById(`section-${type.value}`);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "start" });
                  if (collapsedSections[type.value]) {
                    toggleSection(type.value);
                  }
                }
              }}
              data-testid={`button-nav-${type.value}`}
            >
              <Icon className="w-3 h-3" />
              {type.label} ({count})
            </Badge>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto mt-2 space-y-2">
        {filteredProperties.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{searchQuery ? "No properties match your search" : "No properties yet"}</p>
            {canEdit && editMode && !searchQuery && (
              <p className="text-xs mt-1">Draw shapes on the map to add properties</p>
            )}
          </div>
        ) : (
          propertyTypes.map((type) => {
            const typeProperties = groupedProperties[type.value] || [];
            if (typeProperties.length === 0) return null;
            const Icon = type.icon;
            const isCollapsed = collapsedSections[type.value];

            return (
              <Collapsible
                key={type.value}
                open={!isCollapsed}
                onOpenChange={() => toggleSection(type.value)}
              >
                <div id={`section-${type.value}`} className="scroll-mt-4">
                  <CollapsibleTrigger asChild>
                    <div
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 cursor-pointer hover-elevate"
                      data-testid={`section-header-${type.value}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">{type.label}</span>
                        <Badge variant="secondary">{typeProperties.length}</Badge>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          !isCollapsed ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="mt-1 space-y-1">
                      {typeProperties.map((property) => (
                        <div
                          key={property.id}
                          className={`flex items-center justify-between gap-2 p-2 rounded-md border cursor-pointer hover-elevate ${
                            selectedPropertyId === property.id ? "border-primary bg-primary/5" : ""
                          }`}
                          onClick={() => navigate(`/properties/${property.id}`)}
                          data-testid={`card-property-${property.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-sm truncate">{property.name}</h4>
                            {property.address && (
                              <p className="text-xs text-muted-foreground truncate">
                                {property.address}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {canEdit && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePropertyDelete(property.id);
                                }}
                                data-testid={`button-delete-${property.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between pb-3">
          <div>
            <h1 className="text-xl font-bold" data-testid="heading-property-map">Properties</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage all facility properties and buildings
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
          <div className={`${showMap ? 'hidden' : 'flex'} md:flex w-full md:w-[360px] lg:w-[400px] flex-shrink-0 overflow-hidden flex-col flex-1 md:flex-initial`}>
            <Card className="flex-1 overflow-hidden">
              <CardContent className="p-3 h-full">
                {propertyListContent}
              </CardContent>
            </Card>
          </div>

          <div className={`${showMap ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 min-h-[300px]`}>
            <Card className="relative z-0 w-full">
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
          </div>
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
    </>
  );
}
