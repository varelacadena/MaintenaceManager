import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Car, Calendar, ClipboardList, QrCode, Edit, Trash2, Wrench, Plus, FileCheck, AlertTriangle as AlertTriangleIcon, LogIn, LogOut, Eye } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import type { Vehicle, VehicleReservation, VehicleCheckOutLog, VehicleCheckInLog, User, VehicleMaintenanceLog, VehicleDocument } from "@shared/schema";
import { format } from "date-fns";
import { AlertTriangle, User as UserIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import QRCode from "react-qr-code";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusColors = {
  available: "default",
  reserved: "secondary",
  in_use: "default",
  needs_maintenance: "destructive",
  needs_cleaning: "secondary",
  out_of_service: "destructive",
} as const;

export default function VehicleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteVehicleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Vehicle deleted successfully" });
      navigate("/vehicles");
    },
    onError: () => {
      toast({ title: "Failed to delete vehicle", variant: "destructive" });
    },
  });

  const { data: vehicle, isLoading } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${id}`],
  });

  const { data: reservations } = useQuery<VehicleReservation[]>({
    queryKey: [`/api/vehicle-reservations?vehicleId=${id}`],
  });

  const { data: checkOutLogs } = useQuery<VehicleCheckOutLog[]>({
    queryKey: [`/api/vehicle-checkout-logs?vehicleId=${id}`],
  });

  const { data: checkInLogs } = useQuery<VehicleCheckInLog[]>({
    queryKey: [`/api/vehicle-checkin-logs?vehicleId=${id}`],
  });

  const { data: maintenanceLogs } = useQuery<VehicleMaintenanceLog[]>({
    queryKey: [`/api/vehicles/${id}/maintenance-logs`],
  });

  const { data: vehicleDocuments } = useQuery<VehicleDocument[]>({
    queryKey: [`/api/vehicles/${id}/documents`],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const canManageVehicles = user?.role === "admin" || user?.role === "technician";

  const [addDocumentDate, setAddDocumentDate] = useState<Date | undefined>(undefined);
  const [summaryTaskId, setSummaryTaskId] = useState<string | null>(null);

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("PATCH", `/api/vehicles/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${id}`] });
      toast({ title: "Vehicle status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const addMaintenanceMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/vehicles/${id}/maintenance-logs`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${id}/maintenance-logs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${id}`] });
      toast({ title: "Maintenance log added" });
    },
    onError: () => {
      toast({ title: "Failed to add maintenance log", variant: "destructive" });
    },
  });

  const addDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/vehicles/${id}/documents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${id}/documents`] });
      toast({ title: "Document added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add document", variant: "destructive" });
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ docId, data }: { docId: string; data: any }) => {
      return await apiRequest("PATCH", `/api/vehicle-documents/${docId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${id}/documents`] });
      toast({ title: "Document updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update document", variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      return await apiRequest("DELETE", `/api/vehicle-documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${id}/documents`] });
      toast({ title: "Document deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete document", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 pb-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="space-y-3 pb-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Vehicle not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const qrCodeUrl = `${window.location.origin}/vehicles/${vehicle.id}`;

  return (
    <div className="space-y-3 pb-6">
      {/* Header Section - Mobile Optimized */}
      <div className="space-y-3 sm:space-y-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate" data-testid="text-vehicle-name">
              {vehicle.make} {vehicle.model}
            </h2>
            <p className="text-sm text-muted-foreground truncate">{vehicle.year} • {vehicle.vehicleId}</p>
          </div>
        </div>

        {/* Action Buttons - Full width on mobile, inline on desktop */}
        {canManageVehicles && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => navigate(`/vehicles/${id}/edit`)} className="w-full sm:w-auto">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-delete-vehicle" className="w-full sm:w-auto">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this vehicle and all associated data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto mt-0">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteVehicleMutation.mutate()}
                    className="bg-destructive text-destructive-foreground w-full sm:w-auto"
                    data-testid="button-confirm-delete-vehicle"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6">
            <TabsTrigger value="overview" className="text-xs sm:text-sm whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm whitespace-nowrap">Documents</TabsTrigger>
            <TabsTrigger value="reservations" className="text-xs sm:text-sm whitespace-nowrap">Reservations</TabsTrigger>
            <TabsTrigger value="logbook" className="text-xs sm:text-sm whitespace-nowrap">Logbook</TabsTrigger>
            <TabsTrigger value="maintenance" className="text-xs sm:text-sm whitespace-nowrap">Maintenance</TabsTrigger>
            <TabsTrigger value="qr-code" className="text-xs sm:text-sm whitespace-nowrap">QR Code</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[vehicle.status]} className="text-xs">
                      {vehicle.status.replace(/_/g, " ")}
                    </Badge>
                    {canManageVehicles && (
                      <select
                        className="text-xs border rounded p-1"
                        value={vehicle.status}
                        onChange={(e) => updateStatusMutation.mutate(e.target.value)}
                      >
                        <option value="available">Available</option>
                        <option value="reserved">Reserved</option>
                        <option value="in_use">In Use</option>
                        <option value="needs_cleaning">Needs Cleaning</option>
                        <option value="needs_maintenance">Needs Maintenance</option>
                        <option value="out_of_service">Out of Service</option>
                      </select>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-start gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">VIN</span>
                  <span className="font-mono text-xs sm:text-sm text-right break-all">{vehicle.vin || "N/A"}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">License Plate</span>
                  <span className="font-mono text-sm">{vehicle.licensePlate || "N/A"}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <span className="text-sm">{vehicle.category}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">Fuel Type</span>
                  <span className="text-sm">{vehicle.fuelType}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">Passenger Capacity</span>
                  <span className="text-sm">{vehicle.passengerCapacity}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Mileage & Maintenance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">Current Mileage</span>
                  <span className="text-sm" data-testid="text-mileage">
                    {vehicle.currentMileage?.toLocaleString()} mi
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground">Color</span>
                  <span className="text-sm">{vehicle.color || "N/A"}</span>
                </div>
                {vehicle.notes && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm text-muted-foreground">Notes</span>
                      <p className="text-sm mt-1">{vehicle.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {canManageVehicles && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Add Document</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    if (!addDocumentDate) {
                      toast({ title: "Please select an expiration date", variant: "destructive" });
                      return;
                    }
                    const data = {
                      documentType: formData.get("documentType"),
                      documentName: formData.get("documentName") || null,
                      expirationDate: format(addDocumentDate, "yyyy-MM-dd"),
                      notes: formData.get("notes") || null,
                    };
                    addDocumentMutation.mutate(data);
                    (e.target as HTMLFormElement).reset();
                    setAddDocumentDate(undefined);
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Document Type</label>
                      <select name="documentType" required className="w-full border rounded p-2 text-sm bg-background" data-testid="select-document-type">
                        <option value="">Select type...</option>
                        <option value="insurance">Insurance</option>
                        <option value="annual_inspection">Annual Inspection</option>
                        <option value="registration">Registration</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Document Name (optional)</label>
                      <input name="documentName" className="w-full border rounded p-2 text-sm bg-background" placeholder="e.g., State Farm Policy" data-testid="input-document-name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Expiration Date</label>
                      <DatePicker 
                        value={addDocumentDate}
                        onChange={setAddDocumentDate}
                        placeholder="Select expiration date"
                        data-testid="input-expiration-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes (optional)</label>
                      <input name="notes" className="w-full border rounded p-2 text-sm bg-background" placeholder="Additional details..." data-testid="input-document-notes" />
                    </div>
                  </div>
                  <Button type="submit" disabled={addDocumentMutation.isPending} className="w-full sm:w-auto" data-testid="button-add-document">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Document
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Document Expiration Dates</h3>
            {vehicleDocuments && vehicleDocuments.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {vehicleDocuments.map((doc) => {
                  const expirationDate = new Date(doc.expirationDate);
                  const now = new Date();
                  const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpiringSoon = daysUntilExpiration <= 30 && daysUntilExpiration > 0;
                  const isExpired = daysUntilExpiration <= 0;

                  const documentTypeLabels: Record<string, string> = {
                    insurance: "Insurance",
                    annual_inspection: "Annual Inspection",
                    registration: "Registration",
                    other: "Other",
                  };

                  return (
                    <Card key={doc.id} className={isExpired ? "border-destructive" : isExpiringSoon ? "border-yellow-500" : ""} data-testid={`card-document-${doc.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-muted-foreground" />
                            <CardTitle className="text-sm sm:text-base">
                              {documentTypeLabels[doc.documentType] || doc.documentType}
                            </CardTitle>
                          </div>
                          {isExpired ? (
                            <Badge variant="destructive" className="text-xs">Expired</Badge>
                          ) : isExpiringSoon ? (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              <AlertTriangleIcon className="w-3 h-3 mr-1" />
                              {daysUntilExpiration} days
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-xs">{daysUntilExpiration} days</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {doc.documentName && (
                          <p className="text-muted-foreground">{doc.documentName}</p>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Expires:</span>
                          <span className={isExpired ? "text-destructive font-medium" : isExpiringSoon ? "text-yellow-600 dark:text-yellow-400 font-medium" : ""}>
                            {format(expirationDate, "MMM d, yyyy")}
                          </span>
                        </div>
                        {doc.notes && (
                          <p className="text-xs text-muted-foreground italic">{doc.notes}</p>
                        )}
                        {canManageVehicles && (
                          <div className="flex gap-2 pt-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" data-testid={`button-edit-document-${doc.id}`}>
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-md">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Edit Document</AlertDialogTitle>
                                </AlertDialogHeader>
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    updateDocumentMutation.mutate({
                                      docId: doc.id,
                                      data: {
                                        documentName: formData.get("documentName") || null,
                                        expirationDate: formData.get("expirationDate"),
                                        notes: formData.get("notes") || null,
                                      },
                                    });
                                  }}
                                  className="space-y-4"
                                >
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Document Name</label>
                                    <input name="documentName" defaultValue={doc.documentName || ""} className="w-full border rounded p-2 text-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Expiration Date</label>
                                    <input
                                      name="expirationDate"
                                      type="date"
                                      defaultValue={format(expirationDate, "yyyy-MM-dd")}
                                      required
                                      className="w-full border rounded p-2 text-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Notes</label>
                                    <input name="notes" defaultValue={doc.notes || ""} className="w-full border rounded p-2 text-sm" />
                                  </div>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <Button type="submit" disabled={updateDocumentMutation.isPending}>
                                      Save Changes
                                    </Button>
                                  </AlertDialogFooter>
                                </form>
                              </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" data-testid={`button-delete-document-${doc.id}`}>
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this document record.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteDocumentMutation.mutate(doc.id)}
                                    className="bg-destructive text-destructive-foreground"
                                    data-testid={`button-confirm-delete-document-${doc.id}`}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FileCheck className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No documents tracked yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add insurance, registration, and inspection expiration dates</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reservations" className="space-y-4">
          {reservations && reservations.length > 0 ? (
            <div className="space-y-4">
              {reservations.map((reservation) => {
                const resCheckOut = checkOutLogs?.find(co => co.reservationId === reservation.id);
                const resCheckIn = resCheckOut ? checkInLogs?.find(ci => ci.checkOutLogId === resCheckOut.id) : undefined;

                const getReservationStatusBadge = () => {
                  if (reservation.status === "completed") return { label: "Completed", variant: "default" as const };
                  if (reservation.status === "pending_review") return { label: "Needs Review", variant: "destructive" as const };
                  if (reservation.status === "active" && resCheckIn) return { label: "Returned", variant: "secondary" as const };
                  if (reservation.status === "active") return { label: "Checked Out", variant: "secondary" as const };
                  if (reservation.status === "approved") return { label: "Approved", variant: "default" as const };
                  if (reservation.status === "cancelled") return { label: "Cancelled", variant: "secondary" as const };
                  return { label: reservation.status?.replace(/_/g, " ") || "Pending", variant: "secondary" as const };
                };

                const statusBadge = getReservationStatusBadge();

                return (
                  <Card key={reservation.id} data-testid={`card-reservation-${reservation.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-sm sm:text-base md:text-lg">
                          {format(new Date(reservation.startDate), "MMM d, yyyy")} - {format(new Date(reservation.endDate), "MMM d, yyyy")}
                        </CardTitle>
                        <Badge variant={statusBadge.variant} className="text-xs self-start sm:self-auto capitalize">
                          {statusBadge.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-start gap-2 text-sm">
                        <span className="text-muted-foreground shrink-0">Purpose</span>
                        <span className="text-right break-words">{reservation.purpose}</span>
                      </div>
                      {reservation.notes && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Notes: </span>
                          <span className="break-words">{reservation.notes}</span>
                        </div>
                      )}

                      {reservation.status === "pending_review" && resCheckIn && canManageVehicles && (
                        <>
                          <Separator />
                          <Button
                            onClick={() => navigate(`/vehicle-checkin-verify/${resCheckIn.id}`)}
                            className="w-full sm:w-auto"
                            data-testid={`button-review-checkin-${reservation.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review Check-In
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                <p className="text-base sm:text-lg font-medium">No reservations</p>
                <p className="text-sm text-muted-foreground text-center">This vehicle has no reservations yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logbook" className="space-y-3">
          {(() => {
            const trips = (checkOutLogs || []).map(co => {
              const reservation = reservations?.find(r => r.id === co.reservationId);
              const checkIn = checkInLogs?.find(ci => ci.checkOutLogId === co.id);
              const coUser = users?.find(u => u.id === co.userId);
              return { checkOut: co, checkIn, reservation, user: coUser };
            }).sort((a, b) => {
              const aTime = a.checkOut.checkOutTime ? new Date(a.checkOut.checkOutTime).getTime() : 0;
              const bTime = b.checkOut.checkOutTime ? new Date(b.checkOut.checkOutTime).getTime() : 0;
              return bTime - aTime;
            });

            if (trips.length === 0) {
              return (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
                    <ClipboardList className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                    <p className="text-base sm:text-lg font-medium">No trip history</p>
                    <p className="text-sm text-muted-foreground text-center">Vehicle usage logs will appear here after check-outs</p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div className="space-y-4">
                {trips.map(({ checkOut, checkIn, reservation, user: tripUser }) => {
                  const isPendingReview = reservation?.status === "pending_review";
                  const milesDriven = checkIn && checkOut.startMileage ? checkIn.endMileage - checkOut.startMileage : null;

                  return (
                    <Card key={checkOut.id} data-testid={`card-trip-${checkOut.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="min-w-0">
                            <CardTitle className="text-sm sm:text-base">
                              {reservation
                                ? `${format(new Date(reservation.startDate), "MMM d, yyyy")} - ${format(new Date(reservation.endDate), "MMM d, yyyy")}`
                                : checkOut.checkOutTime ? format(new Date(checkOut.checkOutTime), "MMM d, yyyy") : "Date unavailable"
                              }
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {tripUser && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <UserIcon className="w-3 h-3" />
                                  {`${tripUser.firstName || ''} ${tripUser.lastName || ''}`.trim() || tripUser.username}
                                </span>
                              )}
                              {reservation?.purpose && (
                                <span className="text-xs text-muted-foreground">
                                  {reservation.purpose}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                            {isPendingReview ? (
                              <Badge variant="destructive" className="text-xs">Needs Review</Badge>
                            ) : checkIn ? (
                              <Badge variant="default" className="text-xs">Completed</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Checked Out</Badge>
                            )}
                            {checkOut.adminOverride && (
                              <Badge variant="secondary" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Override
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-7 h-7 rounded-full border-2 border-foreground/20 flex items-center justify-center bg-background">
                                <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                              <div className="w-0.5 h-full min-h-[2rem] bg-border" />
                            </div>
                            <div className="flex-1 pb-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Check-Out</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground text-xs">Time</span>
                                  <p className="font-medium text-xs sm:text-sm">{checkOut.checkOutTime ? format(new Date(checkOut.checkOutTime), "M/d/yy h:mm a") : "N/A"}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Mileage</span>
                                  <p className="font-medium text-xs sm:text-sm">{checkOut.startMileage?.toLocaleString()} mi</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Fuel</span>
                                  <Badge variant="secondary" className="text-xs capitalize mt-0.5">{checkOut.fuelLevel}</Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center bg-background ${checkIn ? 'border-foreground/20' : 'border-dashed border-muted-foreground/30'}`}>
                                <LogIn className={`w-3.5 h-3.5 ${checkIn ? 'text-muted-foreground' : 'text-muted-foreground/30'}`} />
                              </div>
                            </div>
                            <div className="flex-1">
                              {checkIn ? (
                                <>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Check-In</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground text-xs">Time</span>
                                      <p className="font-medium text-xs sm:text-sm">{checkIn.checkInTime ? format(new Date(checkIn.checkInTime), "M/d/yy h:mm a") : "N/A"}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground text-xs">Mileage</span>
                                      <p className="font-medium text-xs sm:text-sm">{checkIn.endMileage?.toLocaleString()} mi</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground text-xs">Fuel</span>
                                      <Badge variant="secondary" className="text-xs capitalize mt-0.5">{checkIn.fuelLevel}</Badge>
                                    </div>
                                  </div>
                                  {milesDriven !== null && (
                                    <p className="text-xs text-muted-foreground mt-1">{milesDriven.toLocaleString()} miles driven</p>
                                  )}
                                  {checkIn.cleanlinessStatus && checkIn.cleanlinessStatus !== 'clean' && (
                                    <Badge variant="secondary" className="text-xs mt-1 capitalize">{checkIn.cleanlinessStatus.replace(/_/g, " ")}</Badge>
                                  )}
                                  {checkIn.issues && (
                                    <div className="mt-2">
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-destructive" />
                                        Issues Reported
                                      </p>
                                      <p className="text-xs text-destructive mt-0.5">{checkIn.issues}</p>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">Not yet returned</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {isPendingReview && checkIn && canManageVehicles && (
                          <>
                            <Separator />
                            <Button
                              onClick={() => navigate(`/vehicle-checkin-verify/${checkIn.id}`)}
                              className="w-full sm:w-auto"
                              data-testid={`button-review-trip-${checkOut.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Review Check-In
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          {canManageVehicles && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Add Maintenance Record</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const data = {
                      type: formData.get("type"),
                      description: formData.get("description"),
                      mileageAtMaintenance: parseInt(formData.get("mileage") as string) || null,
                      performedBy: formData.get("performedBy"),
                      cost: parseFloat(formData.get("cost") as string) || 0,
                      notes: formData.get("notes"),
                    };
                    addMaintenanceMutation.mutate(data);
                    (e.target as HTMLFormElement).reset();
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <input name="type" required className="w-full border rounded p-2 text-sm" placeholder="Oil Change, Repair, etc." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Performed By</label>
                      <input name="performedBy" className="w-full border rounded p-2 text-sm" placeholder="Vendor or Staff" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mileage</label>
                      <input name="mileage" type="number" className="w-full border rounded p-2 text-sm" placeholder="Current mileage" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cost</label>
                      <input name="cost" type="number" step="0.01" className="w-full border rounded p-2 text-sm" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea name="description" required className="w-full border rounded p-2 text-sm min-h-[80px]" placeholder="Work performed..." />
                  </div>
                  <Button type="submit" disabled={addMaintenanceMutation.isPending} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Record Maintenance
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Maintenance History</h3>
            {maintenanceLogs && maintenanceLogs.length > 0 ? (
              maintenanceLogs.map((log) => (
                <Card
                  key={log.id}
                  className={log.taskId ? "cursor-pointer hover-elevate" : ""}
                  onClick={log.taskId ? () => setSummaryTaskId(log.taskId!) : undefined}
                  data-testid={`card-maintenance-log-${log.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{log.type}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.maintenanceDate), "PPP")}
                        </p>
                      </div>
                      {log.cost && log.cost > 0 ? (
                        <Badge variant="secondary">${log.cost.toFixed(2)}</Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p className="whitespace-pre-wrap">{log.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {log.performedBy && <span>By: {log.performedBy}</span>}
                      {log.mileageAtMaintenance && <span>Mileage: {log.mileageAtMaintenance.toLocaleString()} mi</span>}
                    </div>
                    {log.notes && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs italic">
                        {log.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Wrench className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No maintenance records found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="qr-code" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Vehicle QR Code</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Scan this QR code to quickly access this vehicle's details
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6 sm:py-8 px-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCode
                  value={qrCodeUrl}
                  size={Math.min(200, window.innerWidth - 100)}
                  data-testid="qr-code"
                />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-4 text-center break-words">
                {vehicle.make} {vehicle.model} ({vehicle.vehicleId})
              </p>
              <Button variant="outline" onClick={() => window.print()} data-testid="button-print-qr" className="mt-4">
                <QrCode className="h-4 w-4 mr-2" />
                Print QR Code
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CompletedTaskSummary
        taskId={summaryTaskId || ""}
        open={!!summaryTaskId}
        onOpenChange={(open) => { if (!open) setSummaryTaskId(null); }}
      />
    </div>
  );
}