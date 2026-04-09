import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { AlertTriangle, Plus, Car } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import { UploadLabelDialog } from "@/components/UploadLabelDialog";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminDialogsExtra({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task,
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
    isVehicleInfoOpen, setIsVehicleInfoOpen,
    scannedVehicle,
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