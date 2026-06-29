import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@radix-ui/react-label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScanLine } from "lucide-react";
import { canOperateInventory } from "@/lib/inventoryAccess";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminDialogsA({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, user, inventoryItems, isInventoryLoading,
    isAddPartDialogOpen, setIsAddPartDialogOpen,
    inventorySearchQuery, setInventorySearchQuery,
    selectedInventoryItemId, setSelectedInventoryItemId,
    partQuantity, setPartQuantity, partNotes, setPartNotes,
    isScanPartOpen, setIsScanPartOpen,
    addPartMutation,
    setIsQuickAddInventoryOpen,
    setQuickInventoryName,
  } = ctx;

  const canCreateInventory = canOperateInventory(user);

  if (!task) return null;

  return (
    <>
      <Dialog open={isAddPartDialogOpen} onOpenChange={setIsAddPartDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Part</DialogTitle>
            <DialogDescription>Select an inventory item to add to this task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setIsScanPartOpen(true)} data-testid="button-scan-part">
              <ScanLine className="h-4 w-4 mr-2" />
              Scan Part
            </Button>

            <div className="space-y-2">
              <Label>Search Inventory</Label>
              <div className="relative">
                <Input
                  placeholder="Type to search..."
                  value={inventorySearchQuery}
                  onChange={(e) => { setInventorySearchQuery(e.target.value); setSelectedInventoryItemId(""); }}
                  data-testid="input-search-inventory"
                />
                {inventorySearchQuery && !selectedInventoryItemId && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto" role="listbox" aria-label="Inventory search results">
                    {isInventoryLoading && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
                    )}
                    {canCreateInventory && (
                      <div
                        className="px-3 py-2 cursor-pointer hover-elevate font-semibold text-primary border-b"
                        onClick={() => { setIsQuickAddInventoryOpen(true); setQuickInventoryName(inventorySearchQuery); setInventorySearchQuery(""); }}
                      >
                        + Create New Item
                      </div>
                    )}
                    {!isInventoryLoading && inventoryItems?.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          role="option"
                          className="w-full text-left px-3 py-2 hover-elevate"
                          onClick={() => { setSelectedInventoryItemId(item.id); setInventorySearchQuery(item.name); }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.name}</span>
                            <div className="text-right">
                              <span className="text-sm text-muted-foreground">
                                {(item.trackingMode === "status")
                                  ? (item.stockStatus || "stocked")
                                  : `${parseFloat(String(item.quantity || "0")).toFixed(2)} ${item.unit || ""}`}
                              </span>
                              {item.packageInfo && (
                                <p className="text-xs text-muted-foreground">{item.packageInfo}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              {selectedInventoryItemId && (
                <div className="bg-muted p-2 rounded space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{inventoryItems.find(i => i.id === selectedInventoryItemId)?.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedInventoryItemId(""); setInventorySearchQuery(""); }}>Change</Button>
                  </div>
                  {(() => {
                    const sel = inventoryItems.find(i => i.id === selectedInventoryItemId);
                    return sel?.packageInfo ? (<p className="text-xs text-muted-foreground">{sel.packageInfo}</p>) : null;
                  })()}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Quantity {(() => { const sel = inventoryItems.find(i => i.id === selectedInventoryItemId); return sel?.unit ? `(${sel.unit})` : ""; })()}</Label>
              <Input type="number" min="0.01" step="0.01" value={partQuantity} onChange={(e) => setPartQuantity(e.target.value)} placeholder="e.g. 1, 0.5, 2.5" data-testid="input-part-quantity" />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea value={partNotes} onChange={(e) => setPartNotes(e.target.value)} placeholder="Additional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddPartDialogOpen(false); setSelectedInventoryItemId(""); setInventorySearchQuery(""); setPartQuantity(""); setPartNotes(""); }}>Cancel</Button>
            <Button
              onClick={() => addPartMutation.mutate()}
              disabled={!selectedInventoryItemId || !partQuantity || isNaN(parseFloat(partQuantity)) || addPartMutation.isPending}
              data-testid="button-confirm-add-part"
            >
              {addPartMutation.isPending ? "Adding..." : "Add Part"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
