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
                onChange={(e) => setQuickInventoryQuantity(e.target.value)}
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
            <Button variant="outline" onClick={() => { setIsQuickAddInventoryOpen(false); setQuickInventoryName(""); setQuickInventoryQuantity(""); setQuickInventoryUnit(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => quickAddInventoryMutation.mutate()}
              disabled={!quickInventoryName || !quickInventoryQuantity || parseInt(quickInventoryQuantity, 10) <= 0 || quickAddInventoryMutation.isPending}
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