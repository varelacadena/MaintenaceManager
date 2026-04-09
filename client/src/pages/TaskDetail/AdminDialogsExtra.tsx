import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@radix-ui/react-label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  Plus,
  X,
  Package,
  Car,
  BookOpen,
  History,
  ExternalLink,
  FileText,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import { UploadLabelDialog } from "@/components/UploadLabelDialog";
import { toDisplayUrl } from "@/lib/imageUtils";
import {
  statusColors,
  EQUIPMENT_CATEGORY_ICONS,
  EQUIPMENT_CATEGORY_LABELS,
  RESOURCE_TYPE_ICONS,
  CONDITION_COLORS,
} from "./constants";
import { taskStatusLabels as statusLabels } from "@/lib/constants";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminDialogsExtra({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, navigate,
    allEquipment, allVehicles,
    isStopTimerDialogOpen, setIsStopTimerDialogOpen,
    isQuickAddInventoryOpen, setIsQuickAddInventoryOpen,
    quickInventoryName, setQuickInventoryName,
    quickInventoryQuantity, setQuickInventoryQuantity,
    quickInventoryUnit, setQuickInventoryUnit,
    quickAddInventoryMutation,
    isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen,
    cancelLeave, confirmLeave,
    isAddVendorDialogOpen, setIsAddVendorDialogOpen,
    newVendorName, setNewVendorName,
    newVendorEmail, setNewVendorEmail,
    newVendorPhone, setNewVendorPhone,
    newVendorAddress, setNewVendorAddress,
    newVendorNotes, setNewVendorNotes,
    createVendorMutation,
    isScanEquipmentOpen, setIsScanEquipmentOpen,
    handleEquipmentScan,
    isEquipmentInfoOpen, setIsEquipmentInfoOpen,
    scannedEquipment, scannedEquipmentTasks, scannedEquipmentResources,
    equipmentInfoTab, setEquipmentInfoTab,
    isVehicleInfoOpen, setIsVehicleInfoOpen,
    scannedVehicle,
    isAddSubTaskDialogOpen, setIsAddSubTaskDialogOpen,
    subTaskSearchQuery, setSubTaskSearchQuery,
    subTaskSearchType, setSubTaskSearchType,
    addSubTaskMutation,
    summaryTaskId, setSummaryTaskId,
    pendingUploadForLabel, isUploadLabelSaving,
    handleUploadLabelSave, handleUploadLabelCancel,
  } = ctx;

  if (!task) return null;

  return (
    <>
      <Dialog open={isQuickAddInventoryOpen} onOpenChange={setIsQuickAddInventoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Item</DialogTitle>
            <DialogDescription>Quickly add a new inventory item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input
                value={quickInventoryName}
                onChange={(e) => setQuickInventoryName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quickInventoryQuantity}
                onChange={(e) => setQuickInventoryQuantity(parseInt(e.target.value) || 0)}
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit (Optional)</Label>
              <Input
                value={quickInventoryUnit}
                onChange={(e) => setQuickInventoryUnit(e.target.value)}
                placeholder="e.g., pieces, boxes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsQuickAddInventoryOpen(false); setQuickInventoryName(""); setQuickInventoryQuantity(0); setQuickInventoryUnit(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => quickAddInventoryMutation.mutate()}
              disabled={!quickInventoryName || quickInventoryQuantity <= 0 || quickAddInventoryMutation.isPending}
            >
              Create Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isLeaveConfirmDialogOpen} onOpenChange={setIsLeaveConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Timer Still Running
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have an active timer running for this task. If you leave now, the timer will continue running in the background. 
              Would you like to stop the timer first, or leave anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel onClick={cancelLeave}>
              Stay on Page
            </AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsLeaveConfirmDialogOpen(false);
                setIsStopTimerDialogOpen(true);
              }}
            >
              Stop Timer First
            </Button>
            <AlertDialogAction onClick={confirmLeave} className="bg-destructive text-destructive-foreground">
              Leave Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAddVendorDialogOpen} onOpenChange={setIsAddVendorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>Create a new vendor to associate with this estimate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vendor Name *</Label>
              <Input
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                placeholder="e.g., ABC Plumbing, Home Depot"
                data-testid="input-new-vendor-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={newVendorEmail}
                onChange={(e) => setNewVendorEmail(e.target.value)}
                placeholder="vendor@example.com"
                data-testid="input-new-vendor-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone (Optional)</Label>
              <Input
                value={newVendorPhone}
                onChange={(e) => setNewVendorPhone(e.target.value)}
                placeholder="(555) 123-4567"
                data-testid="input-new-vendor-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Address (Optional)</Label>
              <Input
                value={newVendorAddress}
                onChange={(e) => setNewVendorAddress(e.target.value)}
                placeholder="123 Main St, City, State"
                data-testid="input-new-vendor-address"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={newVendorNotes}
                onChange={(e) => setNewVendorNotes(e.target.value)}
                placeholder="Any additional details about this vendor..."
                data-testid="input-new-vendor-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddVendorDialogOpen(false);
              setNewVendorName("");
              setNewVendorEmail("");
              setNewVendorPhone("");
              setNewVendorAddress("");
              setNewVendorNotes("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => createVendorMutation.mutate({
                name: newVendorName,
                email: newVendorEmail || undefined,
                phone: newVendorPhone || undefined,
                address: newVendorAddress || undefined,
                notes: newVendorNotes || undefined,
              })}
              disabled={!newVendorName.trim() || createVendorMutation.isPending}
              data-testid="button-submit-new-vendor"
            >
              {createVendorMutation.isPending ? "Creating..." : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={isScanEquipmentOpen}
        onOpenChange={setIsScanEquipmentOpen}
        onScan={handleEquipmentScan}
        title="Scan Equipment"
        description="Scan an equipment QR code to view info, work history, and manuals"
      />

      <Dialog open={isEquipmentInfoOpen} onOpenChange={setIsEquipmentInfoOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-hidden flex flex-col p-0">
          {scannedEquipment && (() => {
            const CatIcon = EQUIPMENT_CATEGORY_ICONS[scannedEquipment.category] || Info;
            const catLabel = EQUIPMENT_CATEGORY_LABELS[scannedEquipment.category] || scannedEquipment.category;
            const condColor = CONDITION_COLORS[(scannedEquipment.condition || "").toLowerCase()] || "bg-muted text-muted-foreground border-transparent";
            return (
              <>
                <div className="flex items-start gap-3 p-4 border-b">
                  <div className="p-2 rounded-md bg-primary/10">
                    <CatIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-base leading-tight" data-testid="text-scanned-equipment-name">{scannedEquipment.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{catLabel}</Badge>
                      {scannedEquipment.condition && (
                        <Badge className={`text-xs border ${condColor}`} variant="outline">{scannedEquipment.condition}</Badge>
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setIsEquipmentInfoOpen(false)} data-testid="button-close-equipment-info">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex border-b bg-muted/30">
                  {(["info", "history", "resources"] as const).map(tab => {
                    const counts: Record<string, number> = {
                      info: 0,
                      history: scannedEquipmentTasks.length,
                      resources: scannedEquipmentResources.length,
                    };
                    const labels: Record<string, string> = { info: "Info", history: "Work History", resources: "Resources" };
                    return (
                      <button
                        key={tab}
                        onClick={() => setEquipmentInfoTab(tab)}
                        className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${equipmentInfoTab === tab ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"}`}
                        data-testid={`tab-equipment-${tab}`}
                      >
                        {labels[tab]}
                        {counts[tab] > 0 && (
                          <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5">{counts[tab]}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {equipmentInfoTab === "info" && (
                    <div className="space-y-4">
                      {(scannedEquipment as any).manufacturerImageUrl && (
                        <img
                          src={toDisplayUrl((scannedEquipment as any).manufacturerImageUrl)}
                          alt="Manufacturer"
                          className="w-full max-h-48 object-contain rounded-md border"
                          data-testid="img-manufacturer"
                        />
                      )}
                      {scannedEquipment.description && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                          <p className="text-sm">{scannedEquipment.description}</p>
                        </div>
                      )}
                      {scannedEquipment.serialNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Serial Number:</span>
                          <span className="font-mono font-medium">{scannedEquipment.serialNumber}</span>
                        </div>
                      )}
                      {scannedEquipment.notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                          <p className="text-sm text-muted-foreground">{scannedEquipment.notes}</p>
                        </div>
                      )}
                      {!scannedEquipment.description && !scannedEquipment.serialNumber && !scannedEquipment.notes && !(scannedEquipment as any).manufacturerImageUrl && (
                        <p className="text-sm text-muted-foreground text-center py-4">No additional details available</p>
                      )}
                    </div>
                  )}

                  {equipmentInfoTab === "history" && (
                    <div className="space-y-2">
                      {scannedEquipmentTasks.length === 0 ? (
                        <div className="text-center py-8">
                          <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No work history for this equipment</p>
                        </div>
                      ) : (
                        [...scannedEquipmentTasks]
                          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                          .map(t => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-md border hover-elevate cursor-pointer"
                              onClick={() => { setIsEquipmentInfoOpen(false); navigate(`/tasks/${t.id}`); }}
                              data-testid={`history-task-${t.id}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{t.name}</p>
                                <p className="text-xs text-muted-foreground">{t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : "Unknown date"}</p>
                              </div>
                              <Badge className={`text-xs shrink-0 ${statusColors[t.status] || ""}`} variant="outline">
                                {statusLabels[t.status] || t.status}
                              </Badge>
                            </div>
                          ))
                      )}
                    </div>
                  )}

                  {equipmentInfoTab === "resources" && (
                    <div className="space-y-2">
                      {scannedEquipmentResources.length === 0 ? (
                        <div className="text-center py-8">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No manuals or resources linked to this equipment</p>
                          <p className="text-xs text-muted-foreground mt-1">Admins can link resources in the Resource Library</p>
                        </div>
                      ) : (
                        scannedEquipmentResources.map((r: any) => {
                          const RIcon = RESOURCE_TYPE_ICONS[r.type] || FileText;
                          return (
                            <button
                              key={r.id}
                              className="w-full flex items-start gap-3 p-3 rounded-md border hover-elevate active-elevate-2 text-left"
                              onClick={() => window.open(toDisplayUrl(r.url), "_blank")}
                              data-testid={`resource-item-${r.id}`}
                            >
                              <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                                <RIcon className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{r.title}</p>
                                {r.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{r.description}</p>}
                                <p className="text-xs text-primary mt-0.5 capitalize">{r.type}</p>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={isVehicleInfoOpen} onOpenChange={setIsVehicleInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vehicle Info</DialogTitle>
            <DialogDescription>Scanned vehicle details</DialogDescription>
          </DialogHeader>
          {scannedVehicle && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{scannedVehicle.make} {scannedVehicle.model} {scannedVehicle.year}</p>
                  <p className="text-sm text-muted-foreground">{scannedVehicle.vehicleId}</p>
                </div>
              </div>
              {scannedVehicle.vin && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">VIN</p>
                  <p className="text-sm font-mono">{scannedVehicle.vin}</p>
                </div>
              )}
              {scannedVehicle.licensePlate && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">License Plate</p>
                  <p className="text-sm">{scannedVehicle.licensePlate}</p>
                </div>
              )}
              {scannedVehicle.currentMileage && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Mileage</p>
                  <p className="text-sm">{scannedVehicle.currentMileage.toLocaleString()} mi</p>
                </div>
              )}
              <Button
                className="w-full"
                onClick={() => {
                  addSubTaskMutation.mutate({
                    vehicleId: scannedVehicle.id,
                    name: `${task.name} - ${scannedVehicle.make} ${scannedVehicle.model} ${scannedVehicle.year}`,
                  });
                }}
                disabled={addSubTaskMutation.isPending}
                data-testid="button-add-vehicle-subtask"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add as Sub-Task
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddSubTaskDialogOpen} onOpenChange={setIsAddSubTaskDialogOpen}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Sub-Task</DialogTitle>
            <DialogDescription>Search for equipment or vehicles to create a sub-task.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant={subTaskSearchType === "equipment" ? "default" : "outline"}
              size="sm"
              onClick={() => setSubTaskSearchType("equipment")}
              data-testid="button-search-equipment"
            >
              <Package className="w-4 h-4 mr-1" />
              Equipment
            </Button>
            <Button
              variant={subTaskSearchType === "vehicle" ? "default" : "outline"}
              size="sm"
              onClick={() => setSubTaskSearchType("vehicle")}
              data-testid="button-search-vehicles"
            >
              <Car className="w-4 h-4 mr-1" />
              Vehicles
            </Button>
          </div>
          <Input
            placeholder={subTaskSearchType === "equipment" ? "Search equipment..." : "Search vehicles..."}
            value={subTaskSearchQuery}
            onChange={(e) => setSubTaskSearchQuery(e.target.value)}
            data-testid="input-subtask-search"
          />
          <div className="flex-1 overflow-y-auto space-y-2 mt-2 max-h-[40vh]">
            {subTaskSearchType === "equipment" ? (
              (allEquipment || [])
                .filter((eq: any) => {
                  if (!subTaskSearchQuery.trim()) return true;
                  const q = subTaskSearchQuery.toLowerCase();
                  return eq.name?.toLowerCase().includes(q) || eq.category?.toLowerCase().includes(q);
                })
                .map((eq: any) => (
                  <div
                    key={eq.id}
                    className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover-elevate"
                    onClick={() => {
                      addSubTaskMutation.mutate({
                        equipmentId: eq.id,
                        name: `${task.name} - ${eq.name}`,
                      });
                    }}
                    data-testid={`subtask-equipment-${eq.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{eq.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{eq.category}</p>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))
            ) : (
              (allVehicles || [])
                .filter((v: any) => {
                  if (!subTaskSearchQuery.trim()) return true;
                  const q = subTaskSearchQuery.toLowerCase();
                  return v.vehicleId?.toLowerCase().includes(q) || v.make?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q);
                })
                .map((v: any) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover-elevate"
                    onClick={() => {
                      addSubTaskMutation.mutate({
                        vehicleId: v.id,
                        name: `${task.name} - ${v.make} ${v.model} ${v.year}`,
                      });
                    }}
                    data-testid={`subtask-vehicle-${v.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{v.make} {v.model} {v.year}</p>
                        <p className="text-xs text-muted-foreground">{v.vehicleId}</p>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CompletedTaskSummary
        taskId={summaryTaskId || ""}
        open={!!summaryTaskId}
        onOpenChange={(open) => { if (!open) setSummaryTaskId(null); }}
      />

      <UploadLabelDialog
        open={!!pendingUploadForLabel}
        fileName={pendingUploadForLabel?.fileName || ""}
        fileType={pendingUploadForLabel?.fileType || ""}
        filePreviewUrl={pendingUploadForLabel?.previewUrl}
        saving={isUploadLabelSaving}
        onSave={handleUploadLabelSave}
        onCancel={handleUploadLabelCancel}
      />
    </>
  );
}