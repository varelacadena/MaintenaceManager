import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Building2, MapPin, Trees, Car, Gamepad2, Wrench, Route, HelpCircle,
  Search, Map, ChevronRight, ArrowUpDown, Calendar, Settings2,
  Plus, ChevronDown, X, MousePointerClick,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PropertyMap from "@/components/PropertyMap";
import type { Property, InsertProperty, Equipment } from "@shared/schema";
import { insertPropertySchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type PropertyType = "building" | "lawn" | "parking" | "recreation" | "utility" | "road" | "other";

const propertyTypeValues = ["building", "lawn", "parking", "recreation", "utility", "road", "other"] as const;

const typeConfig: Record<PropertyType, { icon: typeof Building2; label: string; colorClass: string }> = {
  building: { icon: Building2, label: "Building", colorClass: "text-blue-500" },
  lawn: { icon: Trees, label: "Lawn", colorClass: "text-green-500" },
  parking: { icon: Car, label: "Parking", colorClass: "text-slate-500" },
  recreation: { icon: Gamepad2, label: "Recreation", colorClass: "text-orange-500" },
  utility: { icon: Wrench, label: "Utility", colorClass: "text-yellow-600" },
  road: { icon: Route, label: "Road", colorClass: "text-zinc-500" },
  other: { icon: HelpCircle, label: "Other", colorClass: "text-purple-500" },
};

const allTypes = Object.keys(typeConfig) as PropertyType[];

type SortKey = "name" | "type" | "lastWorkDate" | "equipmentCount";

const formSchema = insertPropertySchema.extend({
  name: z.string().min(1, "Name is required"),
  type: z.enum(propertyTypeValues),
});

type FormData = z.infer<typeof formSchema>;

export default function PropertyMapPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<PropertyType | "all">("all");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<PropertyType | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [pendingCoordinates, setPendingCoordinates] = useState<any>(null);

  const canEdit = user?.role === "admin" || user?.role === "technician";

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: allEquipment = [] } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const equipmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allEquipment.forEach((eq) => {
      counts[eq.propertyId] = (counts[eq.propertyId] || 0) + 1;
    });
    return counts;
  }, [allEquipment]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filteredProperties = useMemo(() => {
    let result = properties.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.address && p.address.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTab = activeTab === "all" || p.type === activeTab;
      return matchesSearch && matchesTab;
    });
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "type") cmp = a.type.localeCompare(b.type);
      else if (sortKey === "lastWorkDate") {
        const da = a.lastWorkDate ? new Date(a.lastWorkDate).getTime() : 0;
        const db = b.lastWorkDate ? new Date(b.lastWorkDate).getTime() : 0;
        cmp = da - db;
      } else if (sortKey === "equipmentCount") {
        cmp = (equipmentCounts[a.id] || 0) - (equipmentCounts[b.id] || 0);
      }
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [properties, searchQuery, activeTab, sortKey, sortAsc, equipmentCounts]);

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
      setIsCreateDialogOpen(false);
      setPendingCoordinates(null);
      setCreationMode(null);
      form.reset();
      toast({ title: "Success", description: "Property created successfully" });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      }, 300);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create property", variant: "destructive" });
    },
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/properties/${id}`, {});
    },
    onSuccess: () => {
      setSelectedPropertyId(null);
      toast({ title: "Success", description: "Property deleted successfully" });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      }, 300);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete property", variant: "destructive" });
    },
  });

  const handleOpenViewMap = () => {
    setCreationMode(null);
    setMapDialogOpen(true);
  };

  const handleAddPropertyType = (type: PropertyType) => {
    setCreationMode(type);
    form.setValue("type", type);
    setMapDialogOpen(true);
  };

  const handleMapDialogClose = (open: boolean) => {
    if (!open) {
      setMapDialogOpen(false);
      setCreationMode(null);
    }
  };

  const handleShapeCreated = (coordinates: any) => {
    setPendingCoordinates(coordinates);
    setMapDialogOpen(false);
    setIsCreateDialogOpen(true);
  };

  const handlePropertySelect = (property: Property) => {
    navigate(`/properties/${property.id}`);
  };

  const onSubmit = (data: FormData) => {
    if (!pendingCoordinates) {
      toast({ title: "Error", description: "Please draw a shape on the map first", variant: "destructive" });
      return;
    }
    createPropertyMutation.mutate({ ...data, coordinates: pendingCoordinates });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const creationCfg = creationMode ? typeConfig[creationMode] : null;

  const renderSortHeader = (label: string, field: SortKey, className = "") => (
    <div
      role="button"
      tabIndex={0}
      onClick={() => toggleSort(field)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleSort(field); }}
      className={`inline-flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider gap-1 cursor-pointer select-none hover-elevate rounded px-1 py-0.5 ${className}`}
      data-testid={`button-sort-${field}`}
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-primary" : "opacity-40"}`} />
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-state">
        <div className="text-muted-foreground">Loading properties...</div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="p-4 pb-0 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight" data-testid="heading-properties">Properties</h1>
              <Badge variant="secondary" data-testid="badge-count">
                {filteredProperties.length} of {properties.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" data-testid="button-add-property">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Property
                      <ChevronDown className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {allTypes.map((type) => {
                      const cfg = typeConfig[type];
                      const Icon = cfg.icon;
                      return (
                        <DropdownMenuItem
                          key={type}
                          onClick={() => handleAddPropertyType(type)}
                          className="gap-2 cursor-pointer"
                          data-testid={`menu-add-${type}`}
                        >
                          <Icon className={`w-4 h-4 ${cfg.colorClass}`} />
                          <span>{cfg.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenViewMap}
                data-testid="button-show-map"
              >
                <Map className="w-4 h-4 mr-1.5" />
                Show Map
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or address..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PropertyType | "all")}>
            <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-sm"
                data-testid="tab-type-all"
              >
                All ({properties.length})
              </TabsTrigger>
              {allTypes.map((type) => {
                const cfg = typeConfig[type];
                const Icon = cfg.icon;
                const count = properties.filter((p) => p.type === type).length;
                if (count === 0) return null;
                return (
                  <TabsTrigger
                    key={type}
                    value={type}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-sm gap-1.5"
                    data-testid={`tab-type-${type}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cfg.label} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        <div className="hidden md:grid px-4 pt-3 grid-cols-[2rem_1fr_1fr_7rem_5rem_2rem] gap-2 items-center border-b pb-2">
          <span />
          {renderSortHeader("Name", "name")}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</span>
          {renderSortHeader("Last Work", "lastWorkDate")}
          {renderSortHeader("Assets", "equipmentCount", "justify-end")}
          <span />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground" data-testid="empty-state">
              <MapPin className="w-10 h-10 mb-3 opacity-20" />
              <p className="font-medium">{searchQuery ? "No properties match your search" : "No properties yet"}</p>
              <p className="text-sm mt-1">
                {searchQuery ? "Try adjusting your search or filters." : "Use the Add Property button to get started."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredProperties.map((property) => {
                const cfg = typeConfig[property.type as PropertyType];
                if (!cfg) return null;
                const Icon = cfg.icon;
                const isSelected = selectedPropertyId === property.id;
                const eqCount = equipmentCounts[property.id] || 0;

                return (
                  <div
                    key={property.id}
                    onClick={() => navigate(`/properties/${property.id}`)}
                    className={`cursor-pointer hover-elevate ${isSelected ? "bg-primary/5" : ""}`}
                    data-testid={`row-property-${property.id}`}
                  >
                    <div className="hidden md:grid grid-cols-[2rem_1fr_1fr_7rem_5rem_2rem] gap-2 items-center px-4 py-2.5">
                      <div className={`flex items-center justify-center ${cfg.colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium truncate">{property.name}</span>
                      <span className="text-sm text-muted-foreground truncate">{property.address || "—"}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span className="truncate">{formatDate(property.lastWorkDate)}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Settings2 className="w-3 h-3 shrink-0" />
                        <span>{eqCount}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground/30"}`} />
                    </div>

                    <div className="flex md:hidden items-center gap-3 px-4 py-3">
                      <div className={`flex items-center justify-center shrink-0 ${cfg.colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{property.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{property.address || "No address"}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {formatDate(property.lastWorkDate)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Settings2 className="w-3 h-3" />
                            {eqCount} assets
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={mapDialogOpen} onOpenChange={handleMapDialogClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2">
                {creationMode && creationCfg ? (
                  <>
                    {(() => { const CIcon = creationCfg.icon; return <CIcon className={`w-5 h-5 ${creationCfg.colorClass}`} />; })()}
                    <span>Add New {creationCfg.label}</span>
                  </>
                ) : (
                  <>
                    <Map className="w-5 h-5 text-muted-foreground" />
                    <span>Campus Map</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {creationMode ? "Draw on the map to place a new property" : "View all properties on the campus map"}
              </DialogDescription>
            </div>
          </DialogHeader>

          {creationMode && creationCfg && (
            <div className="mx-6 mt-4 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border bg-muted/30">
              <MousePointerClick className={`w-4 h-4 shrink-0 ${creationCfg.colorClass}`} />
              <p className="text-sm">
                <span className="font-medium">Draw on the map</span>
                <span className="text-muted-foreground"> to place your new </span>
                <Badge variant="outline" className="mx-0.5 align-middle">
                  {(() => { const CIcon = creationCfg.icon; return <CIcon className={`w-3 h-3 mr-1 ${creationCfg.colorClass}`} />; })()}
                  {creationCfg.label}
                </Badge>
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto shrink-0"
                onClick={() => setCreationMode(null)}
                data-testid="button-exit-creation-mode"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex-1 m-4 rounded-lg overflow-hidden border" data-testid="map-dialog-content">
            <PropertyMap
              properties={properties}
              onPropertySelect={handlePropertySelect}
              onShapeCreated={creationMode ? handleShapeCreated : undefined}
              onPropertyDelete={canEdit ? (id: string) => { deletePropertyMutation.mutate(id); } : undefined}
              selectedPropertyId={selectedPropertyId}
              editable={!!creationMode}
            />
          </div>
        </DialogContent>
      </Dialog>

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
