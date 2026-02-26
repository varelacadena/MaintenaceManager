import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Car, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useSearch } from "wouter";
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

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
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      return await apiRequest("POST", "/api/vehicles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/vehicles');
        }
      });
      toast({
        title: "Success",
        description: "Vehicle created successfully",
      });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredVehicles = vehicles?.filter(vehicle => {
    const matchesSearch = 
      vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.vehicleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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

  const canManageVehicles = user?.role === "admin" || user?.role === "technician";

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
                              onChange={e => field.onChange(parseInt(e.target.value))}
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
                              onChange={e => field.onChange(parseInt(e.target.value))}
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
                              onChange={e => field.onChange(parseInt(e.target.value))}
                              data-testid="input-passenger-capacity" 
                            />
                          </FormControl>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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

      {isLoading ? (
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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle) => (
            <Link key={vehicle.id} href={`/vehicles/${vehicle.id}`}>
              <Card className="hover-elevate cursor-pointer" data-testid={`card-vehicle-${vehicle.id}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold">
                    {vehicle.make} {vehicle.model}
                  </CardTitle>
                  <Car className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">ID:</span>
                      <span className="text-sm font-medium" data-testid={`text-vehicle-id-${vehicle.id}`}>{vehicle.vehicleId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Year:</span>
                      <span className="text-sm">{vehicle.year}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Mileage:</span>
                      <span className="text-sm">{vehicle.currentMileage?.toLocaleString()} mi</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant={statusColors[vehicle.status]} data-testid={`badge-status-${vehicle.id}`}>
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
    </div>
  );
}

export default function Vehicles() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const defaultTab = urlParams.get("tab") === "reservations" ? "reservations" : "fleet";
  const { user } = useAuth();
  const notificationCounts = useNotificationCounts();

  const isAdminOrTechnician = user?.role === "admin" || user?.role === "technician";
  const pendingCount = isAdminOrTechnician ? notificationCounts.pendingVehicleReservations : 0;

  return (
    <div className="flex-1 space-y-4 p-4">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-page-title">Vehicle Management</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage fleet and reservations
        </p>
      </div>

      <Tabs defaultValue={defaultTab} data-testid="tabs-vehicles">
        <TabsList>
          <TabsTrigger value="fleet" data-testid="tab-fleet">Fleet</TabsTrigger>
          <TabsTrigger value="reservations" data-testid="tab-reservations" className="flex items-center gap-2">
            Reservations
            {pendingCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs flex items-center justify-center no-default-active-elevate" data-testid="badge-pending-reservations-count">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="fleet">
          <FleetContent />
        </TabsContent>
        <TabsContent value="reservations">
          <VehicleReservationsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
