import { useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleSchema, type InsertVehicle, type Vehicle } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { toDisplayUrl } from "@/lib/imageUtils";
import { parseOptionalInt } from "@/lib/fleetUtils";

export default function VehicleEdit() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isUploadingVehicleImage, setIsUploadingVehicleImage] = useState(false);
  const vehicleImageObjectPathRef = useRef("");

  const { data: vehicle, isLoading } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${id}`],
  });

  const form = useForm<InsertVehicle>({
    resolver: zodResolver(insertVehicleSchema),
    values: vehicle ? {
      vehicleId: vehicle.vehicleId,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin || "",
      licensePlate: vehicle.licensePlate || "",
      category: vehicle.category,
      status: vehicle.status,
      currentMileage: vehicle.currentMileage || 0,
      fuelType: vehicle.fuelType,
      passengerCapacity: vehicle.passengerCapacity || 5,
      color: vehicle.color || "",
      notes: vehicle.notes || "",
      imageUrl: vehicle.imageUrl || "",
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      return await apiRequest("PATCH", `/api/vehicles/${id}`, data);
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
        description: "Vehicle updated successfully",
      });
      navigate(`/vehicles/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex-1 space-y-4 p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">Vehicle not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Vehicle</h2>
          <p className="text-muted-foreground mt-0.5">{vehicle.make} {vehicle.model}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} value={field.value ?? ""} />
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
                        <Input {...field} />
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
                        <Input {...field} />
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
                          onChange={(e) => field.onChange(parseOptionalInt(e.target.value, field.value))}
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
                        <Input {...field} value={field.value ?? ""} />
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
                          <SelectTrigger>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="reserved">Reserved</SelectItem>
                          <SelectItem value="in_use">In Use</SelectItem>
                          <SelectItem value="needs_maintenance">Needs Maintenance</SelectItem>
                          <SelectItem value="needs_cleaning">Needs Cleaning</SelectItem>
                          <SelectItem value="out_of_service">Out of Service</SelectItem>
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
                          onChange={(e) => field.onChange(parseOptionalInt(e.target.value, field.value ?? 0))}
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
                          onChange={(e) => field.onChange(parseOptionalInt(e.target.value, field.value ?? 5))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} rows={4} />
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
                              if (!uploadedFile) return;
                              const objectPath =
                                vehicleImageObjectPathRef.current ||
                                uploadedFile.objectPath ||
                                uploadedFile.objectUrl;
                              const displayUrl = objectPath
                                ? `/api/objects/image?path=${encodeURIComponent(objectPath)}`
                                : uploadedFile.objectUrl;
                              form.setValue("imageUrl", displayUrl, { shouldValidate: true, shouldDirty: true });
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
                        ) : null}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(`/vehicles/${id}`)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
