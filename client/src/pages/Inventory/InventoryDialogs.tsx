import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { QrLabelDialog } from "@/components/QrLabelDialog";
import { InventoryItemForm } from "./InventoryItemForm";
import { getInventoryQrLabelLines } from "@/lib/inventoryQrLabel";
import { inventoryQrUrl } from "@/lib/inventoryLinks";
import type { InventoryContext } from "./useInventory";

export function InventoryDialogs({ ctx }: { ctx: InventoryContext }) {
  const {
    isScanFindOpen, setIsScanFindOpen,
    isScanReceiveOpen, setIsScanReceiveOpen,
    isScanCreateBarcodeOpen, setIsScanCreateBarcodeOpen,
    isQrDialogOpen, setIsQrDialogOpen,
    isCreateDialogOpen, setIsCreateDialogOpen,
    selectedItem,
    createMutation,
    createForm,
    watchCreateTracking,
    handleCreateSubmit,
    handleScanFind, handleScanReceive,
    isAdmin,
  } = ctx;

  const qrLabel = selectedItem ? getInventoryQrLabelLines(selectedItem) : null;

  return (
    <>
      <BarcodeScanner open={isScanFindOpen} onOpenChange={setIsScanFindOpen} onScan={handleScanFind}
        title="Find Item" description="Scan a barcode or QR code to locate it" />
      <BarcodeScanner open={isScanReceiveOpen} onOpenChange={setIsScanReceiveOpen} onScan={handleScanReceive}
        title="Receive Stock" description="Scan a barcode to restock an item" />

      {selectedItem && qrLabel && (
        <QrLabelDialog
          open={isQrDialogOpen}
          onOpenChange={setIsQrDialogOpen}
          title="Inventory QR Code"
          qrValue={inventoryQrUrl(window.location.origin, selectedItem.id)}
          label={qrLabel}
          caption={selectedItem.name}
          scanHint="Scan to open this item in inventory."
          testIdPrefix="inventory-qr"
        />
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-create-inventory">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Add a new item to inventory</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <InventoryItemForm
                form={createForm}
                watchTracking={watchCreateTracking}
                isScanBarcodeOpen={isScanCreateBarcodeOpen}
                setIsScanBarcodeOpen={setIsScanCreateBarcodeOpen}
                showCost={isAdmin}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel-create">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
