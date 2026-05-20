import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Form } from "@/components/ui/form";
import { formatQty } from "./inventoryConstants";
import { InventoryItemForm } from "./InventoryItemForm";
import type { InventoryContext } from "./useInventory";

interface InventoryDialogsExtraProps {
  ctx: InventoryContext;
}

export function InventoryDialogsExtra({ ctx }: InventoryDialogsExtraProps) {
  const {
    isScanEditBarcodeOpen, setIsScanEditBarcodeOpen,
    isQuantityDialogOpen, setIsQuantityDialogOpen,
    isEditDialogOpen, setIsEditDialogOpen,
    isDeleteDialogOpen, setIsDeleteDialogOpen,
    selectedItem,
    quantityChange, setQuantityChange,
    receiveItem, setReceiveItem,
    quantityMutation, updateMutation, deleteMutation,
    editForm,
    watchEditTracking,
    handleEditSubmit,
    isScanCreatePromptOpen, setIsScanCreatePromptOpen,
    pendingScanBarcode,
    confirmScanCreate,
    isAdmin,
  } = ctx;

  return (
    <>
      <AlertDialog open={isScanCreatePromptOpen} onOpenChange={setIsScanCreatePromptOpen}>
        <AlertDialogContent data-testid="dialog-scan-create-prompt">
          <AlertDialogHeader>
            <AlertDialogTitle>Item not found</AlertDialogTitle>
            <AlertDialogDescription>
              No inventory item matches barcode <span className="font-mono font-medium">{pendingScanBarcode}</span>.
              Create a new item with this barcode?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-scan-create">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmScanCreate} data-testid="button-confirm-scan-create">
              Create item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isQuantityDialogOpen} onOpenChange={(v) => { setIsQuantityDialogOpen(v); if (!v) setReceiveItem(null); }}>
        <DialogContent data-testid="dialog-update-quantity">
          <DialogHeader>
            <DialogTitle>{receiveItem ? "Receive Stock" : "Adjust Quantity"}</DialogTitle>
            <DialogDescription>
              {selectedItem?.name} — current: {formatQty(selectedItem?.quantity)} {selectedItem?.unit || ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="number"
              step="0.01"
              value={quantityChange}
              onChange={(e) => setQuantityChange(e.target.value)}
              placeholder={receiveItem ? "e.g. +10" : "e.g. +5 to add, -2 to remove"}
              data-testid="input-quantity-change"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Use positive to add stock, negative to remove</p>
            {quantityChange && !isNaN(parseFloat(quantityChange)) && selectedItem && (
              <p className="text-sm">
                New quantity: <span className="font-semibold">
                  {formatQty(Math.max(0, (parseFloat(selectedItem.quantity as any) || 0) + parseFloat(quantityChange)))} {selectedItem.unit || ""}
                </span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsQuantityDialogOpen(false); setReceiveItem(null); }}>Cancel</Button>
            <Button
              onClick={() => {
                if (selectedItem && quantityChange) {
                  const change = parseFloat(quantityChange);
                  if (!isNaN(change)) quantityMutation.mutate({ id: selectedItem.id, change });
                }
                setReceiveItem(null);
              }}
              disabled={!quantityChange || isNaN(parseFloat(quantityChange)) || quantityMutation.isPending}
              data-testid="button-confirm-quantity"
            >
              {quantityMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-inventory">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>{selectedItem?.name}</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <InventoryItemForm
                form={editForm}
                watchTracking={watchEditTracking}
                idPrefix="edit-"
                isScanBarcodeOpen={isScanEditBarcodeOpen}
                setIsScanBarcodeOpen={setIsScanEditBarcodeOpen}
                showCost={isAdmin}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-inventory">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{selectedItem?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
