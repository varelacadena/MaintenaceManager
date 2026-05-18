import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Car, Search, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { Vehicle } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleSchema, type InsertVehicle } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleReservationsContent } from "@/pages/VehicleReservations";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import CodeHub from "@/components/CodeHub";
import { ObjectUploader } from "@/components/ObjectUploader";
import { toDisplayUrl } from "@/lib/imageUtils";
import { WorkLoadError } from "@/pages/Work/WorkLoadError";
import {
  FLEET_PAGE_SIZE,
  isPaginatedResponse,
  type PaginatedResponse,
  parseOptionalInt,
  vehiclesListUrl,
} from "@/lib/fleetUtils";
import { FleetListPagination } from "@/components/fleet/FleetListPagination";

const statusColors = {
  available: "default",
  reserved: "secondary",
  in_use: "default",
  needs_maintenance: "destructive",
  needs_cleaning: "secondary",
  out_of_service: "destructive",
} as const;

function FleetContent() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fleetPage, setFleetPage] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isUploadingVehicleImage, setIsUploadingVehicleImage] = useState(false);
  const vehicleImageObjectPathRef = useRef("");
  const { toast } = useToast();

  const useFleetPagination = !searchTerm.trim();
  const vehiclesQueryUrl = vehiclesListUrl(
    statusFilter,
    fleetPage,
    FLEET_PAGE_SIZE,
    useFleetPagination,
  );

  useEffect(() => {
    setFleetPage(0);
  }, [statusFilter, searchTerm]);

  const { data: vehiclesData, isLoading, isError, error, refetch } = useQuery<
    Vehicle[] | PaginatedResponse<Vehicle>
  >({
    queryKey: [vehiclesQueryUrl],
  });

  const vehicles = isPaginatedResponse(vehiclesData)
    ? vehiclesData.items
    : vehiclesData ?? [];
  const fleetTotal = isPaginatedResponse(vehiclesData)
    ? vehiclesData.total
    : vehicles.length;

  const form = useForm<InsertVehicle>({
    resolver: zodResolver(insertVehicleSchema),
    defaultValues: {
      vehicleId: "",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      vin: "",
      licensePlate: "",
      category: "sedan",
      status: "available",
      currentMileage: 0,
      fuelType: "gasoline",
      passengerCapacity: 5,
      imageUrl: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      return await apiRequest("POST", "/api/vehicles", data);
    },
    onSuccess: () => {
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Vehicle created successfully",
      });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && key.startsWith('/api/vehicles');
          }
        });
      }, 300);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredVehicles = useFleetPagination
    ? vehicles
    : vehicles.filter((vehicle) => {
        const term = searchTerm.toLowerCase();
        return (
          vehicle.make.toLowerCase().includes(term) ||
          vehicle.model.toLowerCase().includes(term) ||
          vehicle.vehicleId.toLowerCase().includes(term) ||
          vehicle.licensePlate?.toLowerCase().includes(term)
        );
      });

  const syncStatusesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/vehicles/sync-statuses");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/vehicles');
        }
      });
      toast({
        title: "Success",
        description: data.message || "Vehicle statuses synchronized",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const canManageVehicles = user?.role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        <div className="flex gap-2 flex-wrap">
          {user?.role === "admin" && (
            <Button 
              variant="outline" 
              onClick={() => syncStatusesMutation.mutate()}
              disabled={syncStatusesMutation.isPending}
            >
              {syncStatusesMutation.isPending ? "Syncing..." : "Sync Statuses"}
            </Button>
          )}
          {canManageVehicles && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-vehicle">
                <Plus className="mr-2 h-4 w-4" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
                <DialogDescription>
                  Enter the vehicle details below
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vehicleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle ID</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-vehicle-id" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="licensePlate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Plate</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-license-plate" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="make"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-make" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-model" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseOptionalInt(e.target.value, new Date().getFullYear()))}
                              data-testid="input-year" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VIN</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-vin" />
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sedan">Sedan</SelectItem>
                              <SelectItem value="suv">SUV</SelectItem>
                              <SelectItem value="truck">Truck</SelectItem>
                              <SelectItem value="van">Van</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fuelType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuel Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-fuel-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="gasoline">Gasoline</SelectItem>
                              <SelectItem value="diesel">Diesel</SelectItem>
                              <SelectItem value="electric">Electric</SelectItem>
                              <SelectItem value="hybrid">Hybrid</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currentMileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Mileage</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              value={field.value ?? ""} 
                              onChange={(e) => field.onChange(parseOptionalInt(e.target.value, 0))}
                              data-testid="input-mileage" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="passengerCapacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passenger Capacity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              value={field.value ?? ""} 
                              onChange={(e) => field.onChange(parseOptionalInt(e.target.value, 5))}
                              data-testid="input-passenger-capacity" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Vehicle Photo (optional)</FormLabel>
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                              <ObjectUploader
                                maxNumberOfFiles={1}
                                maxFileSize={10 * 1024 * 1024}
                                accept="image/*"
                                isLoading={isUploadingVehicleImage}
                                buttonVariant="outline"
                                buttonTestId="button-upload-vehicle-photo"
                                onGetUploadParameters={async () => {
                                  setIsUploadingVehicleImage(true);
                                  const response = await fetch("/api/objects/upload", {
                                    method: "POST",
                                    credentials: "include",
                                  });
                                  if (!response.ok) {
                                    throw new Error("Failed to get upload URL");
                                  }
                                  const data = await response.json();
                                  vehicleImageObjectPathRef.current = data.objectPath || "";
                                  return { method: "PUT" as const, url: data.uploadURL, objectPath: data.objectPath };
                                }}
                                onComplete={(result) => {
                                  setIsUploadingVehicleImage(false);
                                  const uploadedFile = result?.successful?.[0];
                                  if (!uploadedFile) {
                                    if (result?.failed?.length) {
                                      toast({
                                        title: "Upload failed",
                                        description: result.failed[0].error || "Could not upload image",
                                        variant: "destructive",
                                      });
                                    }
                                    return;
                                  }
                                  const objectPath = vehicleImageObjectPathRef.current || uploadedFile.objectPath || uploadedFile.objectUrl;
                                  const displayUrl = objectPath
                                    ? `/api/objects/image?path=${encodeURIComponent(objectPath)}`
                                    : uploadedFile.objectUrl;
                                  form.setValue("imageUrl", displayUrl, { shouldValidate: true, shouldDirty: true });
                                  toast({ title: "Image uploaded", description: "Vehicle photo is ready to save" });
                                }}
                                onError={(error) => {
                                  setIsUploadingVehicleImage(false);
                                  toast({
                                    title: "Upload failed",
                                    description: error.message || "Could not upload image",
                                    variant: "destructive",
                                  });
                                }}
                              >
                                <ImagePlus className="mr-2 h-4 w-4" />
                                {isUploadingVehicleImage ? "Uploading..." : "Upload Photo"}
                              </ObjectUploader>
                              {field.value ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => form.setValue("imageUrl", "", { shouldValidate: true, shouldDirty: true })}
                                  data-testid="button-clear-vehicle-photo"
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Remove
                                </Button>
                              ) : null}
                            </div>
                            {field.value ? (
                              <div className="h-40 w-full overflow-hidden rounded-md border bg-muted/20">
                                <img
                                  src={toDisplayUrl(field.value)}
                                  alt="Vehicle preview"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No image selected.</p>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-vehicle">
                      {createMutation.isPending ? "Creating..." : "Create Vehicle"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vehicles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            data-testid="input-search-vehicles"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setFleetPage(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="in_use">In Use</SelectItem>
            <SelectItem value="needs_maintenance">Needs Maintenance</SelectItem>
            <SelectItem value="needs_cleaning">Needs Cleaning</SelectItem>
            <SelectItem value="out_of_service">Out of Service</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <WorkLoadError
          title="Could not load fleet"
          message={error instanceof Error ? error.message : "Failed to load vehicles"}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent className="animate-pulse space-y-2">
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredVehicles && filteredVehicles.length > 0 ? (
        <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filteredVehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={`/vehicles/${vehicle.id}`}
              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${vehicle.make} ${vehicle.model}, ${vehicle.vehicleId}`}
            >
              <Card className="hover-elevate cursor-pointer overflow-hidden h-full" data-testid={`card-vehicle-${vehicle.id}`}>
                <div className="h-24 w-full bg-muted/20">
                  {vehicle.imageUrl ? (
                    <img
                      src={toDisplayUrl(vehicle.imageUrl)}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-1">
                        <Car className="h-5 w-5" />
                        <span className="text-xs">No Photo</span>
                      </div>
                    </div>
                  )}
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2.5">
                  <CardTitle className="text-sm font-semibold leading-tight">
                    {vehicle.make} {vehicle.model}
                  </CardTitle>
                  <Car className="h-3.5 w-3.5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">ID:</span>
                      <span className="text-[11px] font-medium" data-testid={`text-vehicle-id-${vehicle.id}`}>{vehicle.vehicleId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Year:</span>
                      <span className="text-[11px]">{vehicle.year}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Mileage:</span>
                      <span className="text-[11px]">{vehicle.currentMileage?.toLocaleString()} mi</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Status:</span>
                      <Badge className="h-5 px-1.5 text-[10px]" variant={statusColors[vehicle.status]} data-testid={`badge-status-${vehicle.id}`}>
                        {vehicle.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No vehicles found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first vehicle to get started"}
            </p>
          </CardContent>
        </Card>
      )}

      {useFleetPagination && !isLoading && !isError ? (
        <FleetListPagination
          page={fleetPage}
          pageSize={FLEET_PAGE_SIZE}
          total={fleetTotal}
          onPageChange={setFleetPage}
          itemLabel="vehicles"
          testIdPrefix="fleet"
        />
      ) : null}
    </div>
  );
}

export default function Vehicles() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const notificationCounts = useNotificationCounts();
  const isAdmin = user?.role === "admin";
  const isTechnician = user?.role === "technician";

  const urlParams = new URLSearchParams(searchString);
  const tabParam = urlParams.get("tab");
  const requestedTab =
    tabParam === "reservations" ? "reservations" : tabParam === "codehub" ? "codehub" : "fleet";
  const activeTab =
    !isAdmin && (requestedTab === "fleet" || requestedTab === "codehub")
      ? "reservations"
      : requestedTab;
  const pendingCount =
    isAdmin || isTechnician ? notificationCounts.pendingVehicleReservations : 0;

  const setActiveTab = (tab: string) => {
    const nextTab = !isAdmin && (tab === "fleet" || tab === "codehub") ? "reservations" : tab;
    const params = new URLSearchParams();
    if (nextTab !== "fleet") {
      params.set("tab", nextTab);
    }
    const qs = params.toString();
    setLocation(qs ? `/vehicles?${qs}` : "/vehicles");
  };

  return (
    <div className="flex-1 space-y-4 p-4">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-page-title">Vehicle Management</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage fleet and reservations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-vehicles">
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="fleet" data-testid="tab-fleet">Fleet</TabsTrigger>
          )}
          <TabsTrigger value="reservations" data-testid="tab-reservations" className="flex items-center gap-2">
            Reservations
            {pendingCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs flex items-center justify-center no-default-active-elevate" data-testid="badge-pending-reservations-count">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="codehub" data-testid="tab-codehub">
              Code Hub
            </TabsTrigger>
          )}
        </TabsList>
        {isAdmin && (
          <TabsContent value="fleet">
            <FleetContent />
          </TabsContent>
        )}
        <TabsContent value="reservations">
          <VehicleReservationsContent />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="codehub">
            <CodeHub />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

