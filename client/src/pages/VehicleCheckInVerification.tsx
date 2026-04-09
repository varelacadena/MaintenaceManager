import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Car, Check, Edit, Image, Save, X, Wrench, Sparkles, CheckCircle2,
  AlertTriangle, ExternalLink, Fuel, ShieldAlert, ShieldCheck, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SecureImage } from "@/components/SecureImage";
import { useFileDownload } from "@/hooks/use-download";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
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

  const [checklistIssues, setChecklistIssues] = useState(false);
  const [checklistFuel, setChecklistFuel] = useState(false);
  const [checklistCleanliness, setChecklistCleanliness] = useState(false);

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
      toast({ title: "Success", description: "Check-in log updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/vehicle-checkin-logs/${checkInLogId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/vehicle-checkin-logs'] });
      setIsEditing(false);
      setEditedData(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateVehicleStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PATCH", `/api/vehicles/${checkInLog?.vehicleId}`, { status });
      return response.json();
    },
    onSuccess: async (_, status) => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${checkInLog?.vehicleId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      if (checkOutLog?.reservationId) {
        await apiRequest("PATCH", `/api/vehicle-reservations/${checkOutLog.reservationId}`, { status: "completed" });
        queryClient.invalidateQueries({ queryKey: ['/api/vehicle-reservations'] });
      }
      toast({
        title: status === "available" ? "Vehicle Returned to Service" : "Vehicle Flagged for Maintenance",
        description: status === "available"
          ? "The vehicle has been marked as available for new reservations."
          : "The vehicle has been marked as needing maintenance.",
      });
      if (checkInLog?.vehicleId) {
        setLocation(`/vehicles/${checkInLog.vehicleId}`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    if (editedData) updateMutation.mutate(editedData);
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
  const hasIssues = !!(checkInLog.issues && checkInLog.issues.trim().length > 0);
  const isLowFuel = checkInLog.fuelLevel === "empty" || checkInLog.fuelLevel === "1/4";
  const needsCleaning = checkInLog.cleanlinessStatus === "needs_cleaning";

  const requiredChecklist = [
    hasIssues && "issues",
    isLowFuel && "fuel",
    needsCleaning && "cleanliness",
  ].filter(Boolean) as string[];

  const checklistComplete =
    (!hasIssues || checklistIssues) &&
    (!isLowFuel || checklistFuel) &&
    (!needsCleaning || checklistCleanliness);

  const getVehicleStatusInfo = () => {
    if (!vehicle) return { label: "Unknown", variant: "secondary" as const, icon: Car };
    switch (vehicle.status) {
      case "needs_maintenance": return { label: "Needs Maintenance", variant: "destructive" as const, icon: Wrench };
      case "needs_cleaning": return { label: "Needs Cleaning", variant: "secondary" as const, icon: Sparkles };
      case "available": return { label: "Available", variant: "default" as const, icon: CheckCircle2 };
      case "in_use": return { label: "In Use", variant: "secondary" as const, icon: Car };
      case "out_of_service": return { label: "Out of Service", variant: "destructive" as const, icon: ShieldAlert };
      default: return { label: vehicle.status || "Unknown", variant: "secondary" as const, icon: Car };
    }
  };

  const statusInfo = getVehicleStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="flex-1 space-y-4 p-4 max-w-4xl mx-auto">
      {vehicle && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation(`/vehicles/${vehicle.id}`)}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Vehicle
        </Button>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">Check-In Verification</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {vehicle ? (
              <Link href={`/vehicles/${vehicle.id}`}>
                <button className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 transition-colors">
                  {vehicle.make} {vehicle.model} ({vehicle.vehicleId})
                  <ExternalLink className="h-3 w-3" />
                </button>
              </Link>
            ) : (
              <p className="text-muted-foreground text-sm">Loading vehicle...</p>
            )}
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={handleStartEdit} data-testid="button-edit" className="w-full sm:w-auto">
              <Edit className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-edit">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save">
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </div>

      {(hasIssues || isLowFuel || needsCleaning) && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
            <strong>Admin Review Required:</strong> This vehicle was returned with one or more issues that need to be addressed before it can return to service.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trip Summary</CardTitle>
            <CardDescription>Overview of the completed trip</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Requestor</Label>
                <p className="font-medium text-sm" data-testid="text-requestor">
                  {user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username : "Loading..."}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Check-in Time</Label>
                <p className="font-medium text-sm" data-testid="text-checkin-time">
                  {checkInLog.checkInTime ? new Date(checkInLog.checkInTime).toLocaleString() : "N/A"}
                </p>
              </div>
              {checkOutLog && (
                <>
                  <div>
                    <Label className="text-muted-foreground text-xs">Check-out Time</Label>
                    <p className="font-medium text-sm" data-testid="text-checkout-time">
                      {new Date(checkOutLog.checkOutTime).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Start Mileage</Label>
                    <p className="font-medium text-sm" data-testid="text-start-mileage">
                      {checkOutLog.startMileage.toLocaleString()} mi
                    </p>
                  </div>
                </>
              )}
              <div>
                <Label className="text-muted-foreground text-xs">End Mileage</Label>
                <p className="font-medium text-sm">{checkInLog.endMileage.toLocaleString()} mi</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Miles Driven</Label>
                <p className="font-medium text-sm" data-testid="text-miles-driven">
                  {milesDriven.toLocaleString()} mi
                </p>
              </div>
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
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Fuel Level</Label>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Fuel className="h-3 w-3 text-muted-foreground" />
                      <p className="font-medium text-sm" data-testid="text-fuel-level">
                        {checkInLog.fuelLevel === "full" ? "Full" :
                         checkInLog.fuelLevel === "3/4" ? "3/4 Tank" :
                         checkInLog.fuelLevel === "1/2" ? "1/2 Tank" :
                         checkInLog.fuelLevel === "1/4" ? "1/4 Tank" :
                         checkInLog.fuelLevel === "empty" ? "Empty" :
                         checkInLog.fuelLevel}
                      </p>
                      {isLowFuel && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Cleanliness</Label>
                    <Badge
                      variant={checkInLog.cleanlinessStatus === "clean" ? "default" : "destructive"}
                      className="mt-0.5"
                      data-testid="badge-cleanliness"
                    >
                      {checkInLog.cleanlinessStatus === "clean" ? "Clean" : "Needs Cleaning"}
                    </Badge>
                  </div>
                </div>
                {checkInLog.issues && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Issues Reported</Label>
                    <p className="font-medium text-sm text-destructive mt-0.5" data-testid="text-issues">{checkInLog.issues}</p>
                  </div>
                )}
                {checkInLog.returnNotes && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Notes</Label>
                    <p className="text-sm mt-0.5">{checkInLog.returnNotes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(hasIssues || isLowFuel || needsCleaning) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Vehicle Readiness Checklist
            </CardTitle>
            <CardDescription>
              Confirm the following before returning the vehicle to service. Check each item you have reviewed and addressed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasIssues && (
              <div className="flex items-start gap-3 p-3 rounded-md border bg-muted/30">
                <Checkbox
                  id="checklist-issues"
                  checked={checklistIssues}
                  onCheckedChange={(v) => setChecklistIssues(v === true)}
                  data-testid="checkbox-checklist-issues"
                />
                <label htmlFor="checklist-issues" className="text-sm leading-relaxed cursor-pointer">
                  <span className="font-medium flex items-center gap-1 mb-0.5">
                    <Wrench className="h-3 w-3" />
                    Reported mechanical issues have been reviewed and assessed
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Note: Checking this confirms you've reviewed the report. Use the action buttons below to set the final vehicle status.
                  </span>
                </label>
              </div>
            )}
            {isLowFuel && (
              <div className="flex items-start gap-3 p-3 rounded-md border bg-muted/30">
                <Checkbox
                  id="checklist-fuel"
                  checked={checklistFuel}
                  onCheckedChange={(v) => setChecklistFuel(v === true)}
                  data-testid="checkbox-checklist-fuel"
                />
                <label htmlFor="checklist-fuel" className="text-sm leading-relaxed cursor-pointer">
                  <span className="font-medium flex items-center gap-1 mb-0.5">
                    <Fuel className="h-3 w-3" />
                    Low fuel situation has been reviewed and addressed
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Vehicle was returned with {checkInLog.fuelLevel === "empty" ? "an empty tank" : "only 1/4 tank"} of fuel.
                  </span>
                </label>
              </div>
            )}
            {needsCleaning && (
              <div className="flex items-start gap-3 p-3 rounded-md border bg-muted/30">
                <Checkbox
                  id="checklist-cleanliness"
                  checked={checklistCleanliness}
                  onCheckedChange={(v) => setChecklistCleanliness(v === true)}
                  data-testid="checkbox-checklist-cleanliness"
                />
                <label htmlFor="checklist-cleanliness" className="text-sm leading-relaxed cursor-pointer">
                  <span className="font-medium flex items-center gap-1 mb-0.5">
                    <Sparkles className="h-3 w-3" />
                    Cleanliness situation has been reviewed and addressed
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Vehicle was returned needing cleaning.
                  </span>
                </label>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={!checklistComplete || updateVehicleStatusMutation.isPending}
                    className="w-full sm:flex-1"
                    data-testid="button-return-to-service"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Return Vehicle to Service
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Return Vehicle to Service?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the vehicle as <strong>available</strong> for new reservations. Confirm that all reported issues, cleanliness, and fuel requirements have been addressed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => updateVehicleStatusMutation.mutate("available")}
                    >
                      Confirm — Return to Service
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!checklistComplete || updateVehicleStatusMutation.isPending}
                    className="w-full sm:flex-1"
                    data-testid="button-confirm-maintenance"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Confirm Needs Maintenance
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Vehicle Needs Maintenance?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will keep the vehicle flagged as <strong>needs maintenance</strong>. Use this when you've reviewed the issues and confirmed the vehicle needs shop time before returning to service.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => updateVehicleStatusMutation.mutate("needs_maintenance")}
                    >
                      Confirm — Needs Maintenance
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {!checklistComplete && (
              <p className="text-xs text-muted-foreground text-center">
                Check all items above to enable the action buttons.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!hasIssues && !isLowFuel && !needsCleaning && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">No Issues Reported</p>
                  <p className="text-xs text-muted-foreground">
                    The vehicle was returned in good condition and is already available for new reservations.
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" className="w-full sm:w-auto shrink-0" data-testid="button-confirm-available">
                    <Check className="h-3 w-3 mr-1" />
                    Confirm Available
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Vehicle Available?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will confirm the vehicle is available for new reservations.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => updateVehicleStatusMutation.mutate("available")}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

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
