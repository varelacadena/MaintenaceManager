import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Car, Check, Edit, Image, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SecureImage } from "@/components/SecureImage";
import { useFileDownload } from "@/hooks/use-download";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { VehicleCheckInLog, VehicleCheckOutLog, Vehicle, User, Upload } from "@shared/schema";

export default function VehicleCheckInVerification() {
  const { checkInLogId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState<Upload | null>(null);
  const { downloadFile } = useFileDownload();
  const [editedData, setEditedData] = useState<{
    endMileage: number;
    fuelLevel: string;
    cleanlinessStatus: string;
    issues: string;
  } | null>(null);

  const { data: checkInLog, isLoading } = useQuery<VehicleCheckInLog>({
    queryKey: [`/api/vehicle-checkin-logs/${checkInLogId}`],
  });

  const { data: checkOutLog } = useQuery<VehicleCheckOutLog>({
    queryKey: [`/api/vehicle-checkout-logs/${checkInLog?.checkOutLogId}`],
    enabled: !!checkInLog?.checkOutLogId,
  });

  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${checkInLog?.vehicleId}`],
    enabled: !!checkInLog?.vehicleId,
  });

  const { data: user } = useQuery<User>({
    queryKey: [`/api/users/${checkInLog?.userId}`],
    enabled: !!checkInLog?.userId,
  });

  const { data: uploads } = useQuery<Upload[]>({
    queryKey: [`/api/uploads/vehicle-checkin/${checkInLogId}`],
    enabled: !!checkInLogId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<VehicleCheckInLog>) => {
      const response = await apiRequest("PATCH", `/api/vehicle-checkin-logs/${checkInLogId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Check-in log updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/vehicle-checkin-logs/${checkInLogId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/vehicle-checkin-logs'] });
      setIsEditing(false);
      setEditedData(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = () => {
    if (checkInLog) {
      setEditedData({
        endMileage: checkInLog.endMileage,
        fuelLevel: checkInLog.fuelLevel || "",
        cleanlinessStatus: checkInLog.cleanlinessStatus,
        issues: checkInLog.issues || "",
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (editedData) {
      updateMutation.mutate(editedData);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData(null);
  };

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

  if (!checkInLog) {
    return (
      <div className="flex-1 space-y-4 p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Check-in log not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const milesDriven = checkOutLog ? checkInLog.endMileage - checkOutLog.startMileage : 0;

  return (
    <div className="flex-1 space-y-4 p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Check-In Verification</h2>
            <p className="text-muted-foreground mt-0.5">
              {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.vehicleId})` : "Loading..."}
            </p>
          </div>
        </div>
        {!isEditing ? (
          <Button onClick={handleStartEdit} data-testid="button-edit">
            <Edit className="mr-2 h-4 w-4" />
            Edit Details
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-edit">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save">
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trip Summary</CardTitle>
            <CardDescription>Overview of the completed trip</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Requestor</Label>
                <p className="font-medium" data-testid="text-requestor">
                  {user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username : "Loading..."}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Check-in Time</Label>
                <p className="font-medium" data-testid="text-checkin-time">
                  {checkInLog.checkInTime ? new Date(checkInLog.checkInTime).toLocaleString() : "N/A"}
                </p>
              </div>
              {checkOutLog && (
                <>
                  <div>
                    <Label className="text-muted-foreground">Check-out Time</Label>
                    <p className="font-medium" data-testid="text-checkout-time">
                      {new Date(checkOutLog.checkOutTime).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Start Mileage</Label>
                    <p className="font-medium" data-testid="text-start-mileage">
                      {checkOutLog.startMileage.toLocaleString()} miles
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Check-In Details</CardTitle>
            <CardDescription>Information provided at vehicle return</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing && editedData ? (
              <>
                <div>
                  <Label htmlFor="endMileage">Final Mileage</Label>
                  <Input
                    id="endMileage"
                    type="number"
                    value={editedData.endMileage}
                    onChange={(e) => setEditedData({ ...editedData, endMileage: parseInt(e.target.value) || 0 })}
                    data-testid="input-edit-mileage"
                  />
                </div>
                <div>
                  <Label htmlFor="fuelLevel">Fuel Level</Label>
                  <Select
                    value={editedData.fuelLevel}
                    onValueChange={(value) => setEditedData({ ...editedData, fuelLevel: value })}
                  >
                    <SelectTrigger data-testid="select-edit-fuel">
                      <SelectValue placeholder="Select fuel level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empty">Empty</SelectItem>
                      <SelectItem value="1/4">1/4 Tank</SelectItem>
                      <SelectItem value="1/2">1/2 Tank</SelectItem>
                      <SelectItem value="3/4">3/4 Tank</SelectItem>
                      <SelectItem value="full">Full</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cleanlinessStatus">Cleanliness Status</Label>
                  <Select
                    value={editedData.cleanlinessStatus}
                    onValueChange={(value) => setEditedData({ ...editedData, cleanlinessStatus: value })}
                  >
                    <SelectTrigger data-testid="select-edit-cleanliness">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clean">Clean</SelectItem>
                      <SelectItem value="needs_cleaning">Needs Cleaning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="issues">Issues / Notes</Label>
                  <Textarea
                    id="issues"
                    value={editedData.issues}
                    onChange={(e) => setEditedData({ ...editedData, issues: e.target.value })}
                    data-testid="input-edit-issues"
                  />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Final Mileage</Label>
                  <p className="font-medium" data-testid="text-end-mileage">
                    {checkInLog.endMileage.toLocaleString()} miles
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Miles Driven</Label>
                  <p className="font-medium" data-testid="text-miles-driven">
                    {milesDriven.toLocaleString()} miles
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fuel Level</Label>
                  <p className="font-medium" data-testid="text-fuel-level">
                    {checkInLog.fuelLevel === "full" ? "Full" :
                     checkInLog.fuelLevel === "3/4" ? "3/4 Tank" :
                     checkInLog.fuelLevel === "1/2" ? "1/2 Tank" :
                     checkInLog.fuelLevel === "1/4" ? "1/4 Tank" :
                     checkInLog.fuelLevel === "empty" ? "Empty" :
                     checkInLog.fuelLevel}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cleanliness</Label>
                  <Badge
                    variant={checkInLog.cleanlinessStatus === "clean" ? "default" : "destructive"}
                    data-testid="badge-cleanliness"
                  >
                    {checkInLog.cleanlinessStatus === "clean" ? "Clean" : "Needs Cleaning"}
                  </Badge>
                </div>
                {checkInLog.issues && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Issues Reported</Label>
                    <p className="font-medium text-destructive" data-testid="text-issues">{checkInLog.issues}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Uploaded Photos
          </CardTitle>
          <CardDescription>Photos submitted during check-in</CardDescription>
        </CardHeader>
        <CardContent>
          {uploads && uploads.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {uploads.map((upload) => {
                const isDash = upload.fileName.startsWith("DASH_");
                const isInterior = upload.fileName.startsWith("INTERIOR_");
                const label = isDash ? "Dashboard" : isInterior ? "Interior" : "Damage/Issue";
                
                return (
                  <div
                    key={upload.id}
                    className="relative group cursor-pointer"
                    onClick={() => setSelectedUpload(upload)}
                    data-testid={`image-${upload.id}`}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                      <SecureImage
                        uploadId={upload.id}
                        objectUrl={upload.objectUrl}
                        fileName={upload.fileName}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 rounded-b-lg">
                      <Badge
                        variant={isDash ? "secondary" : isInterior ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No photos uploaded</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedUpload} onOpenChange={() => setSelectedUpload(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Photo Preview</DialogTitle>
          </DialogHeader>
          {selectedUpload && (
            <div className="w-full">
              <SecureImage
                uploadId={selectedUpload.id}
                objectUrl={selectedUpload.objectUrl}
                fileName={selectedUpload.fileName}
                className="w-full h-auto rounded-lg object-contain max-h-[70vh]"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => downloadFile(selectedUpload.id, selectedUpload.objectUrl)}
                  className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  data-testid="button-open-full"
                >
                  Open full size
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
