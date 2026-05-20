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
import { InventoryItemForm } from "./InventoryItemForm";
import type { InventoryContext } from "./useInventory";

export function InventoryDialogs({ ctx }: { ctx: InventoryContext }) {
  const {
    isScanFindOpen, setIsScanFindOpen,
    isScanReceiveOpen, setIsScanReceiveOpen,
    isScanCreateBarcodeOpen, setIsScanCreateBarcodeOpen,
    isQrDialogOpen, setIsQrDialogOpen,
    isCreateDialogOpen, setIsCreateDialogOpen,
    selectedItem,
    qrCodeDataUrl,
    createMutation,
    createForm,
    watchCreateTracking,
    handleCreateSubmit,
    handleScanFind, handleScanReceive,
    handlePrintLabel,
    isAdmin,
  } = ctx;

  return (
    <>
      <BarcodeScanner open={isScanFindOpen} onOpenChange={setIsScanFindOpen} onScan={handleScanFind}
        title="Find Item" description="Scan a barcode or QR code to locate it" />
      <BarcodeScanner open={isScanReceiveOpen} onOpenChange={setIsScanReceiveOpen} onScan={handleScanReceive}
        title="Receive Stock" description="Scan a barcode to restock an item" />

      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent data-testid="dialog-qr-code">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name}</DialogTitle>
            <DialogDescription>Scan to look up this item</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR Code" className="rounded-md border p-2" width={200} height={200} />
            ) : (
              <div className="h-48 w-48 flex items-center justify-center text-muted-foreground border rounded-md text-sm">Generating...</div>
            )}
            <div className="text-center space-y-1">
              {selectedItem?.packageInfo && <p className="text-xs text-muted-foreground">{selectedItem.packageInfo}</p>}
              {selectedItem?.location && <p className="text-xs text-muted-foreground">Location: {selectedItem.location}</p>}
              <p className="text-xs text-muted-foreground font-mono">{selectedItem?.barcode || selectedItem?.id}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQrDialogOpen(false)}>Close</Button>
            <Button onClick={handlePrintLabel} data-testid="button-print-label">Print Label</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
