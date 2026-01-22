import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Car, Upload, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import type { VehicleCheckOutLog, Vehicle } from "@shared/schema";
import { insertVehicleCheckInLogSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function VehicleCheckIn() {
  const { checkOutLogId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashPhoto, setDashPhoto] = useState<{ fileName: string; objectUrl: string; fileType: string; objectPath?: string } | null>(null);
  const [interiorPhoto, setInteriorPhoto] = useState<{ fileName: string; objectUrl: string; fileType: string; objectPath?: string } | null>(null);
  const [damagePhotos, setDamagePhotos] = useState<Array<{ fileName: string; objectUrl: string; fileType: string; objectPath?: string }>>([]);

  const { data: checkOutLog, isLoading } = useQuery<VehicleCheckOutLog>({
    queryKey: [`/api/vehicle-checkout-logs/${checkOutLogId}`],
  });

  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${checkOutLog?.vehicleId}`],
    enabled: !!checkOutLog?.vehicleId,
  });

  type CheckInFormData = {
    endMileage: number;
    fuelLevel: string;
    cleanlinessStatus: string;
    issues: string;
    returnNotes: string;
  };

  const form = useForm<CheckInFormData>({
    resolver: zodResolver(insertVehicleCheckInLogSchema.omit({ userId: true, vehicleId: true, checkOutLogId: true })),
    defaultValues: {
      endMileage: 0,
      fuelLevel: "100",
      cleanlinessStatus: "clean",
      issues: "",
      returnNotes: "",
    },
  });

  const getUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to get upload URL" }));
      throw new Error(error.message || "Failed to get upload URL");
    }

    const { uploadURL, isMock, warning } = await response.json();

    if (warning) {
      console.warn(warning);
    }

    return { method: "PUT" as const, url: uploadURL };
  };

  const handleFileUpload = async (result: any, type: 'dash' | 'interior' | 'damage') => {
    const { successful, failed } = result;

    if (failed && failed.length > 0) {
      toast({
        title: "Some uploads failed",
        description: failed.map((f: any) => f.error).join(", "),
        variant: "destructive"
      });
    }

    if (successful && successful.length > 0) {
      const newFiles = successful.map((file: any) => ({
        fileName: file.fileName || file.name,
        objectUrl: file.objectUrl || file.uploadURL || file.url,
        fileType: file.type || "image/jpeg",
        objectPath: file.objectPath
      }));

      if (type === 'dash') {
        setDashPhoto(newFiles[0]);
      } else if (type === 'interior') {
        setInteriorPhoto(newFiles[0]);
      } else {
        setDamagePhotos([...damagePhotos, ...newFiles]);
      }

      toast({
        title: "Upload successful",
        description: `${successful.length} file(s) uploaded successfully`
      });
    }
  };

  const checkInMutation = useMutation({
    mutationFn: async (data: CheckInFormData) => {
      const response = await apiRequest("POST", "/api/vehicle-checkin-logs", {
        ...data,
        userId: user!.id,
        vehicleId: checkOutLog!.vehicleId,
        checkOutLogId: checkOutLogId!,
      });

      const checkInLog = await response.json();

      // Upload the files to the check-in log
      const allFiles: Array<{ fileName: string; fileType: string; objectUrl: string; objectPath?: string; prefix: string }> = [];
      if (dashPhoto) allFiles.push({ ...dashPhoto, prefix: "DASH_" });
      if (interiorPhoto) allFiles.push({ ...interiorPhoto, prefix: "INTERIOR_" });
      damagePhotos.forEach(f => allFiles.push({ ...f, prefix: "" }));

      for (const file of allFiles) {
        try {
          await fetch("/api/uploads", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              fileName: `${file.prefix}${file.fileName}`,
              fileType: file.fileType,
              objectUrl: file.objectUrl,
              objectPath: file.objectPath,
              vehicleCheckInLogId: checkInLog.id,
            }),
          });
        } catch (uploadError) {
          console.error("Error saving upload:", uploadError);
        }
      }

      toast({
        title: "Success",
        description: "Vehicle checked in successfully",
      });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0]?.toString();
          return !!(key?.startsWith('/api/vehicle-checkin-logs') ||
                 key?.startsWith('/api/vehicles') ||
                 key?.startsWith('/api/vehicle-reservations') ||
                 key?.startsWith('/api/tasks') ||
                 key?.startsWith('/api/requests'));
        }
      });
      setLocation("/my-reservations");
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

  if (!checkOutLog || !vehicle) {
    return (
      <div className="flex-1 space-y-4 p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Check-out log not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" data-testid="button-back" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Vehicle Check-In</h2>
          <p className="text-muted-foreground">
            {vehicle.make} {vehicle.model} ({vehicle.vehicleId})
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Return Inspection</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => checkInMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="endMileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ending Mileage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-end-mileage"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fuelLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ending Fuel Level (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                        data-testid="input-end-fuel"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cleanlinessStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cleanliness Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-cleanliness">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="clean">Clean</SelectItem>
                        <SelectItem value="needs_cleaning">Needs Cleaning</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issues"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issues or Damages (Optional)</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Report mechanical problems, damage, or safety concerns. This will flag the vehicle for maintenance.
                    </p>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Engine warning light on, brake noise, tire damage..."
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-issues"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="returnNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      General observations or comments. These won't trigger maintenance.
                    </p>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Great trip, returned on time, parked in lot B..."
                        className="min-h-[80px]"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-return-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label className="text-base font-semibold">Dash Picture (Required) *</Label>
                <p className="text-sm text-muted-foreground">
                  Take a clear photo of the dashboard showing the current mileage and fuel level
                </p>
                <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4 bg-amber-50 dark:bg-amber-950/20">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760}
                    onGetUploadParameters={getUploadParameters}
                    onComplete={(res) => handleFileUpload(res, 'dash')}
                    onError={(error) => {
                      console.error("Upload error:", error);
                      toast({
                        title: "Upload failed",
                        description: error.message,
                        variant: "destructive"
                      });
                    }}
                    buttonClassName="bg-amber-600 text-white hover:bg-amber-700"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Dash Photo
                  </ObjectUploader>
                </div>
                {dashPhoto && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800 flex items-center justify-between">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">✓ Dash photo uploaded: {dashPhoto.fileName}</p>
                    <Button variant="ghost" size="sm" onClick={() => setDashPhoto(null)}>Remove</Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Interior Picture (Required) *</Label>
                <p className="text-sm text-muted-foreground">
                  Take a clear photo of the vehicle interior to verify cleanliness
                </p>
                <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4 bg-blue-50 dark:bg-blue-950/20">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760}
                    onGetUploadParameters={getUploadParameters}
                    onComplete={(res) => handleFileUpload(res, 'interior')}
                    onError={(error) => {
                      console.error("Upload error:", error);
                      toast({
                        title: "Upload failed",
                        description: error.message,
                        variant: "destructive"
                      });
                    }}
                    buttonClassName="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Upload Interior Photo
                  </ObjectUploader>
                </div>
                {interiorPhoto && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800 flex items-center justify-between">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Interior photo uploaded: {interiorPhoto.fileName}</p>
                    <Button variant="ghost" size="sm" onClick={() => setInteriorPhoto(null)}>Remove</Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Upload Damage/Issue Photos (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Take photos of any new damage or issues discovered during use
                </p>
                <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4">
                  <ObjectUploader
                    maxNumberOfFiles={5}
                    maxFileSize={10485760}
                    onGetUploadParameters={getUploadParameters}
                    onComplete={(res) => handleFileUpload(res, 'damage')}
                    onError={(error) => {
                      console.error("Upload error:", error);
                      toast({
                        title: "Upload failed",
                        description: error.message,
                        variant: "destructive"
                      });
                    }}
                    buttonClassName="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photos
                  </ObjectUploader>
                </div>
                {damagePhotos.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Damage Photos ({damagePhotos.length})</p>
                    <div className="space-y-2">
                      {damagePhotos.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm truncate flex-1">{file.fileName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDamagePhotos(damagePhotos.filter((_, i) => i !== index));
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Link href="/my-reservations">
                  <Button type="button" variant="outline" data-testid="button-cancel">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={checkInMutation.isPending || !dashPhoto || !interiorPhoto} data-testid="button-submit-checkin">
                  {checkInMutation.isPending ? "Checking In..." : "Complete Check-In"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}