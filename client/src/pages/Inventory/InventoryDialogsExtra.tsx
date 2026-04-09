import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScanLine } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import {
  CATEGORIES,
  TRACKING_MODES,
  CATEGORY_TRACKING_DEFAULTS,
  formatQty,
} from "./useInventory";
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
  } = ctx;

  return (
    <>
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
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl><Input {...field} data-testid="input-edit-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={editForm.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value || "general"} onValueChange={(val) => {
                      field.onChange(val);
                      editForm.setValue("trackingMode", CATEGORY_TRACKING_DEFAULTS[val] || "counted");
                    }}>
                      <FormControl><SelectTrigger data-testid="select-edit-category"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={editForm.control} name="trackingMode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking</FormLabel>
                    <Select value={field.value || "counted"} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-edit-tracking-mode"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {TRACKING_MODES.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {watchEditTracking && (
                      <FormDescription className="text-xs">
                        {TRACKING_MODES.find((m) => m.value === watchEditTracking)?.description}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {watchEditTracking !== "status" && (
                  <FormField control={editForm.control} name="quantity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{watchEditTracking === "container" ? "On Hand" : "Quantity"}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-edit-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={editForm.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} data-testid="input-edit-unit" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {watchEditTracking === "status" && (
                <FormField control={editForm.control} name="stockStatus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Status</FormLabel>
                    <Select value={field.value || "stocked"} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-edit-stock-status"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="stocked">Stocked</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="out">Out</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={editForm.control} name="packageInfo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Info (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="e.g. 32 oz bottle" data-testid="input-edit-package-info" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={editForm.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} data-testid="input-edit-location" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="cost" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost / Unit</FormLabel>
                    <FormControl><Input {...field} type="number" step="0.01" min="0" value={field.value || ""} data-testid="input-edit-cost" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {watchEditTracking !== "status" && (
                <FormField control={editForm.control} name="minQuantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Threshold</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? 0} type="number" step="0.01" min="0"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-edit-min-quantity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={editForm.control} name="barcode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode / QR Code (Optional)</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Barcode value" data-testid="input-edit-barcode" />
                    </FormControl>
                    <Button type="button" variant="outline" size="icon" onClick={() => setIsScanEditBarcodeOpen(true)} data-testid="button-scan-edit-barcode-field">
                      <ScanLine className="h-4 w-4" />
                    </Button>
                  </div>
                  <BarcodeScanner open={isScanEditBarcodeOpen} onOpenChange={setIsScanEditBarcodeOpen}
                    onScan={(val) => { field.onChange(val); setIsScanEditBarcodeOpen(false); }}
                    title="Scan Item Barcode" />
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={editForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} data-testid="input-edit-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

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
