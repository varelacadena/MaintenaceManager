import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Car, Search, ImagePlus, X, Pencil, ChevronDown, Eye, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation, useSearch } from "wouter";
import { isFleetPrivilegedRole } from "@/lib/fleetUtils";
import { canManageFleet } from "@shared/techPermissions";
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
  type PaginatedResponse,
  parseFleetUrlState,
  buildFleetLocationSearch,
  vehiclesListUrl,
  clampPageIndex,
} from "@/lib/fleetUtils";
import { parseIntInput } from "@/lib/formInputUtils";
import { FleetListPagination } from "@/components/fleet/FleetListPagination";
import { ResponsiveTableScroll } from "@/components/ResponsiveTableScroll";
import { DestructiveDeleteDialog } from "@/components/DestructiveDeleteDialog";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { invalidateVehicleQueries, invalidateVehicleReservationQueries } from "@/lib/fleetQueryInvalidation";
import { formatVehicleDisplayName } from "@/lib/displayNames";
import { format } from "date-fns";

const statusColors = {
  available: "default",
  reserved: "secondary",
  in_use: "default",
  needs_maintenance: "destructive",
  needs_cleaning: "secondary",
  out_of_service: "destructive",
} as const;

type FleetListVehicle = Vehicle & {
  registrationExpiresAt?: string | null;
  inspectionExpiresAt?: string | null;
};

function formatMileage(miles: number | null | undefined) {
  if (miles == null) return "—";
  return `${miles.toLocaleString()} mi`;
}

function formatVehicleStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function ComplianceDate({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <span className="text-muted-foreground">—</span>;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const overdue = date < startOfToday;
  return (
    <span className={overdue ? "font-medium text-destructive" : undefined}>
      {format(date, "MMM d, yyyy")}
    </span>
  );
}

function VehicleFleetActions({
  vehicle,
  canManage,
  onView,
  onEdit,
  onCopy,
  onDelete,
}: {
  vehicle: Vehicle;
  canManage: boolean;
  onView: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onCopy: (value: string, label: string) => void;
  onDelete: (vehicle: Vehicle) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {canManage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(vehicle)}
          data-testid={`button-edit-vehicle-${vehicle.id}`}
        >
          <Pencil />
          Edit
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid={`button-more-vehicle-${vehicle.id}`}
            aria-label={`More actions for ${vehicle.vehicleId}`}
          >
            More
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => onView(vehicle)}
            data-testid={`button-view-vehicle-${vehicle.id}`}
          >
            <Eye />
            View details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onCopy(vehicle.vehicleId, "Vehicle ID")}
            data-testid={`button-copy-id-${vehicle.id}`}
          >
            <Copy />
            Copy vehicle ID
          </DropdownMenuItem>
          {vehicle.licensePlate ? (
            <DropdownMenuItem
              onClick={() => onCopy(vehicle.licensePlate as string, "License plate")}
              data-testid={`button-copy-plate-${vehicle.id}`}
            >
              <Copy />
              Copy plate
            </DropdownMenuItem>
          ) : null}
          {canManage ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(vehicle)}
                className="text-destructive focus:text-destructive"
                data-testid={`button-delete-vehicle-${vehicle.id}`}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function FleetContent() {
  const { user } = useAuth();
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const urlState = parseFleetUrlState(searchString);
  const searchTerm = urlState.fleetSearch;
  const statusFilter = urlState.fleetStatus;
  const fleetPage = urlState.fleetPage;
  const [fleetSearchInput, setFleetSearchInput] = useState(urlState.fleetSearch);
  const debouncedFleetSearch = useDebouncedValue(fleetSearchInput);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [isUploadingVehicleImage, setIsUploadingVehicleImage] = useState(false);
  const vehicleImageObjectPathRef = useRef("");
  const { toast } = useToast();

  const patchFleetUrl = (patch: Partial<typeof urlState>) => {
    const next = { ...urlState, tab: "fleet", ...patch };
    setLocation(`/vehicles${buildFleetLocationSearch(next)}`);
  };

  useEffect(() => {
    setFleetSearchInput(urlState.fleetSearch);
  }, [urlState.fleetSearch]);

  useEffect(() => {
    if (debouncedFleetSearch !== urlState.fleetSearch) {
      patchFleetUrl({ fleetSearch: debouncedFleetSearch, fleetPage: 0 });
    }
  }, [debouncedFleetSearch]);

  const vehiclesQueryUrl = vehiclesListUrl(
    statusFilter,
    fleetPage,
    FLEET_PAGE_SIZE,
    searchTerm,
  );

  const { data: vehiclesData, isLoading, isError, error, refetch } = useQuery<
    PaginatedResponse<FleetListVehicle>
  >({
    queryKey: [vehiclesQueryUrl],
  });

  const vehicles = vehiclesData?.items ?? [];
  const fleetTotal = vehiclesData?.total ?? 0;

  useEffect(() => {
    const clamped = clampPageIndex(fleetPage, fleetTotal, FLEET_PAGE_SIZE);
    if (clamped !== fleetPage) {
      patchFleetUrl({ fleetPage: clamped });
    }
  }, [fleetTotal, fleetPage]);

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
      setTimeout(() => invalidateVehicleQueries(queryClient), 300);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncStatusesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/vehicles/sync-statuses");
    },
    onSuccess: (data: any) => {
      invalidateVehicleQueries(queryClient);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/vehicles/${id}`);
    },
    onSuccess: () => {
      setVehicleToDelete(null);
      toast({ title: "Vehicle deleted successfully" });
    },
    onSettled: () => {
      setTimeout(() => {
        invalidateVehicleQueries(queryClient);
        invalidateVehicleReservationQueries(queryClient);
      }, 300);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete vehicle",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyVehicleValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const canManageVehicles = isFleetPrivilegedRole(user);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        <div className="flex gap-2 flex-wrap">
          {canManageVehicles && (
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
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(parseIntInput(e.target.value))}
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
                              onChange={(e) => field.onChange(parseIntInput(e.target.value))}
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
                              onChange={(e) => field.onChange(parseIntInput(e.target.value))}
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
            value={fleetSearchInput}
            onChange={(e) => setFleetSearchInput(e.target.value)}
            className="pl-8"
            aria-label="Search vehicles"
            data-testid="input-search-vehicles"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => patchFleetUrl({ fleetStatus: value, fleetPage: 0 })}
        >
          <SelectTrigger
            className="w-full sm:w-[200px]"
            data-testid="select-status-filter"
            aria-label="Filter vehicles by status"
          >
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
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="animate-pulse divide-y">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-10 w-14 rounded-md bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-16" />
                  <div className="h-3 bg-muted rounded w-40" />
                </div>
                <div className="hidden sm:block h-3 bg-muted rounded w-20" />
                <div className="h-6 bg-muted rounded w-16" />
                <div className="h-8 bg-muted rounded w-28" />
              </div>
            ))}
          </div>
        </div>
      ) : vehicles && vehicles.length > 0 ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <ResponsiveTableScroll>
            <Table className="min-w-[980px] [&_td]:py-2.5 [&_th]:h-10">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="bg-card">Vehicle</TableHead>
                  <TableHead>Plate</TableHead>
                  <TableHead>Mileage</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Inspection</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="sticky right-0 z-10 border-l bg-card text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} className="group" data-testid={`row-vehicle-${vehicle.id}`}>
                    <TableCell>
                      <Link
                        href={`/vehicles/${vehicle.id}`}
                        className="group flex items-center gap-3 min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`${vehicle.vehicleId}, ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      >
                        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-muted/40">
                          {vehicle.imageUrl ? (
                            <img
                              src={toDisplayUrl(vehicle.imageUrl)}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Car className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div
                            className="font-medium leading-tight truncate group-hover:underline"
                            data-testid={`text-vehicle-id-${vehicle.id}`}
                          >
                            {vehicle.vehicleId}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {vehicle.licensePlate ? (
                        <span className="font-mono text-xs tracking-wide">{vehicle.licensePlate}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {formatMileage(vehicle.currentMileage)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <ComplianceDate value={vehicle.registrationExpiresAt} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <ComplianceDate value={vehicle.inspectionExpiresAt} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="no-default-hover-elevate"
                        variant={statusColors[vehicle.status]}
                        data-testid={`badge-status-${vehicle.id}`}
                      >
                        {formatVehicleStatus(vehicle.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 whitespace-nowrap border-l bg-card group-hover:bg-muted/50">
                      <VehicleFleetActions
                        vehicle={vehicle}
                        canManage={canManageVehicles}
                        onView={(selected) => setLocation(`/vehicles/${selected.id}`)}
                        onEdit={(selected) => setLocation(`/vehicles/${selected.id}/edit`)}
                        onCopy={copyVehicleValue}
                        onDelete={setVehicleToDelete}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableScroll>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No vehicles found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters"
                : canManageVehicles
                  ? "Add your first vehicle to get started"
                  : "No vehicles match your filters"}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError ? (
        <FleetListPagination
          page={fleetPage}
          pageSize={FLEET_PAGE_SIZE}
          total={fleetTotal}
          onPageChange={(page) => patchFleetUrl({ fleetPage: page })}
          itemLabel="vehicles"
          testIdPrefix="fleet"
        />
      ) : null}

      <DestructiveDeleteDialog
        open={vehicleToDelete != null}
        onOpenChange={(open) => {
          if (!open) setVehicleToDelete(null);
        }}
        entityLabel={vehicleToDelete ? formatVehicleDisplayName(vehicleToDelete) : "this vehicle"}
        entityType="vehicle"
        requireConfirmationText={vehicleToDelete?.vehicleId}
        warningDetails={[
          "Reservations, logbook entries, maintenance logs, and documents for this vehicle will be removed.",
          "Linked work tasks will be kept with this vehicle name preserved on their records.",
          "This action is logged and cannot be undone.",
        ]}
        onConfirm={() => {
          if (vehicleToDelete) deleteMutation.mutate(vehicleToDelete.id);
        }}
        isPending={deleteMutation.isPending}
      />
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
  const canAccessFleet = canManageFleet(user);

  const urlParams = new URLSearchParams(searchString);
  const tabParam = urlParams.get("tab");
  const requestedTab =
    tabParam === "reservations" ? "reservations" : tabParam === "codehub" ? "codehub" : "fleet";
  const activeTab =
    (requestedTab === "fleet" && !canAccessFleet) || (requestedTab === "codehub" && !isAdmin)
      ? "reservations"
      : requestedTab;
  const pendingCount =
    isAdmin || isTechnician ? notificationCounts.pendingVehicleReservations : 0;

  const urlState = parseFleetUrlState(searchString);
  const setActiveTab = (tab: string) => {
    const nextTab =
      (tab === "fleet" && !canAccessFleet) || (tab === "codehub" && !isAdmin) ? "reservations" : tab;
    setLocation(`/vehicles${buildFleetLocationSearch({ ...urlState, tab: nextTab })}`);
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
          {canAccessFleet && (
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
        {canAccessFleet && (
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

