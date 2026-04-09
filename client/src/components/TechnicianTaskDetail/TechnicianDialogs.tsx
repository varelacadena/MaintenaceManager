import {
  Check,
  Pause,
  X,
  Plus,
  Search,
  QrCode,
  MapPin,
  Package,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { Badge } from "@/components/ui/badge";
import { toDisplayUrl } from "@/lib/imageUtils";
import type { Task, Quote, InventoryItem } from "@shared/schema";

export interface TechnicianDialogsProps {
  task: Task;
  isPauseDialogOpen: boolean;
  setIsPauseDialogOpen: (v: boolean) => void;
  handlePauseConfirm: () => void;
  handleMarkComplete: () => void;
  stopTimerMutation: any;
  estimateBlocksCompletion: boolean;
  isEstimateSheetOpen: boolean;
  setIsEstimateSheetOpen: (v: boolean) => void;
  quotes: Quote[];
  setIsAddQuoteDialogOpen: (v: boolean) => void;
  isPartModalOpen: boolean;
  setIsPartModalOpen: (v: boolean) => void;
  inventorySearchQuery: string;
  setInventorySearchQuery: (v: string) => void;
  selectedInventoryItemId: string;
  setSelectedInventoryItemId: (v: string) => void;
  inventoryItems: InventoryItem[];
  partQuantity: string;
  setPartQuantity: (v: string) => void;
  partNotes: string;
  setPartNotes: (v: string) => void;
  addPartMutation: any;
  setIsScanPartOpen: (v: boolean) => void;
  isResourcesOpen: boolean;
  setIsResourcesOpen: (v: boolean) => void;
  allTaskResources: any[];
}

export function TechnicianDialogs({
  task,
  isPauseDialogOpen,
  setIsPauseDialogOpen,
  handlePauseConfirm,
  handleMarkComplete,
  stopTimerMutation,
  estimateBlocksCompletion,
  isEstimateSheetOpen,
  setIsEstimateSheetOpen,
  quotes,
  setIsAddQuoteDialogOpen,
  isPartModalOpen,
  setIsPartModalOpen,
  inventorySearchQuery,
  setInventorySearchQuery,
  selectedInventoryItemId,
  setSelectedInventoryItemId,
  inventoryItems,
  partQuantity,
  setPartQuantity,
  partNotes,
  setPartNotes,
  addPartMutation,
  setIsScanPartOpen,
  isResourcesOpen,
  setIsResourcesOpen,
  allTaskResources,
}: TechnicianDialogsProps) {
  return (
    <>
      {isPauseDialogOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsPauseDialogOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="dialog-pause-complete"
          >
            <p className="text-sm font-semibold mb-1 text-foreground">
              Timer running
            </p>
            <p className="text-xs mb-4 text-muted-foreground">
              What would you like to do?
            </p>
            <div className="space-y-2">
              <button
                className="w-full py-3 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 bg-gray-600 dark:bg-gray-500"
                onClick={handlePauseConfirm}
                disabled={stopTimerMutation.isPending}
                data-testid="button-pause-confirm"
              >
                <Pause className="w-4 h-4" />
                Pause — resume later
              </button>
              <button
                className={`w-full py-3 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 ${estimateBlocksCompletion ? "bg-muted-foreground opacity-70" : "bg-green-700 dark:bg-green-600"}`}
                onClick={handleMarkComplete}
                disabled={stopTimerMutation.isPending || !!estimateBlocksCompletion}
                data-testid="button-mark-complete"
              >
                <Check className="w-4 h-4" />
                Mark as complete
              </button>
              {estimateBlocksCompletion && (
                <p className="text-xs text-center mt-1 text-amber-600 dark:text-amber-400" data-testid="text-estimate-block-reason">
                  Estimate must be approved before completing
                </p>
              )}
              <button
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center bg-muted border border-border text-muted-foreground"
                onClick={() => setIsPauseDialogOpen(false)}
                data-testid="button-pause-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isEstimateSheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsEstimateSheetOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-estimate"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Estimates
              </p>
              <button onClick={() => setIsEstimateSheetOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            {quotes.length > 0 && (
              <div className="space-y-2 mb-4">
                {quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                    data-testid={`estimate-row-${quote.id}`}
                  >
                    {quote.vendorName && (
                      <p className="text-xs text-muted-foreground">
                        {quote.vendorName}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-foreground">
                      ${(quote.estimatedCost || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {quote.status === "approved" ? "Approved" : "Pending approval"}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {task.estimateStatus !== "approved" && (
              <button
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border-2 border-dashed border-amber-600 text-amber-600 dark:text-amber-400 dark:border-amber-400 bg-transparent"
                onClick={() => {
                  setIsEstimateSheetOpen(false);
                  setIsAddQuoteDialogOpen(true);
                }}
                data-testid="button-add-another-quote"
              >
                <Plus className="w-4 h-4" />
                Add another quote
              </button>
            )}
          </div>
        </div>
      )}

      {isPartModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsPartModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-add-part"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Add Part
              </p>
              <button onClick={() => setIsPartModalOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  />
                  <Input
                    placeholder="Search inventory..."
                    value={inventorySearchQuery}
                    onChange={(e) => {
                      setInventorySearchQuery(e.target.value);
                      setSelectedInventoryItemId("");
                    }}
                    className="pl-9"
                    data-testid="input-search-part"
                  />
                </div>
                <button
                  className="flex items-center justify-center shrink-0 border border-border rounded-lg"
                  style={{ width: 40, height: 40 }}
                  onClick={() => {
                    setIsPartModalOpen(false);
                    setIsScanPartOpen(true);
                  }}
                  data-testid="button-scan-part-qr"
                >
                  <QrCode className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {inventorySearchQuery && !selectedInventoryItemId && (
                <div className="border border-border rounded-md max-h-40 overflow-y-auto">
                  {inventoryItems
                    ?.filter((item) =>
                      item.name.toLowerCase().includes(inventorySearchQuery.toLowerCase())
                    )
                    .map((item) => {
                      const qty = Number(item.quantity) || 0;
                      const isOut = item.stockStatus === "out" || (item.trackingMode === "counted" && qty <= 0);
                      const isLow = item.stockStatus === "low" || (item.trackingMode === "counted" && item.minQuantity && qty <= Number(item.minQuantity) && qty > 0);
                      return (
                        <div
                          key={item.id}
                          className={`px-3 py-2 cursor-pointer text-sm border-b border-border/50 hover-elevate ${isOut ? "opacity-50" : "text-foreground"}`}
                          onClick={() => {
                            setSelectedInventoryItemId(item.id);
                            setInventorySearchQuery(item.name);
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{item.name}</span>
                            <Badge variant={isOut ? "destructive" : isLow ? "outline" : "secondary"} className="text-[10px] shrink-0">
                              {isOut ? "Out" : isLow ? "Low" : "Stocked"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.location || "No location set"}
                            </span>
                            {item.trackingMode === "counted" && (
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {qty} {item.unit || "pcs"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {selectedInventoryItemId && (() => {
                const selectedItem = inventoryItems.find((i) => i.id === selectedInventoryItemId);
                const qty = Number(selectedItem?.quantity) || 0;
                const isOut = selectedItem?.stockStatus === "out" || (selectedItem?.trackingMode === "counted" && qty <= 0);
                const isLow = selectedItem?.stockStatus === "low" || (selectedItem?.trackingMode === "counted" && selectedItem?.minQuantity && qty <= Number(selectedItem.minQuantity) && qty > 0);
                return (
                  <div className="p-2 rounded-md text-sm bg-muted text-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{selectedItem?.name}</span>
                      <Badge variant={isOut ? "destructive" : isLow ? "outline" : "secondary"} className="text-[10px] shrink-0">
                        {isOut ? "Out" : isLow ? "Low" : "Stocked"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {selectedItem?.location || "No location set"}
                      </span>
                      {selectedItem?.trackingMode === "counted" && (
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {qty} {selectedItem?.unit || "pcs"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    QTY
                  </Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(e.target.value)}
                    placeholder="1"
                    data-testid="input-part-qty"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    COST
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      selectedInventoryItemId
                        ? (
                            (parseFloat(
                              inventoryItems.find((i) => i.id === selectedInventoryItemId)
                                ?.cost || "0"
                            ) || 0) * (parseFloat(partQuantity) || 1)
                          ).toFixed(2)
                        : ""
                    }
                    readOnly
                    placeholder="0.00"
                    data-testid="input-part-cost"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 py-3 rounded-lg text-white text-sm font-medium bg-primary"
                  onClick={async () => {
                    try {
                      await addPartMutation.mutateAsync();
                      setIsPartModalOpen(false);
                    } catch {
                    }
                  }}
                  disabled={
                    !selectedInventoryItemId ||
                    !partQuantity ||
                    addPartMutation.isPending
                  }
                  data-testid="button-confirm-add-part"
                >
                  Add Part
                </button>
                <button
                  className="px-6 py-3 rounded-lg text-sm font-medium bg-muted border border-border text-muted-foreground"
                  onClick={() => {
                    setIsPartModalOpen(false);
                    setSelectedInventoryItemId("");
                    setInventorySearchQuery("");
                    setPartQuantity("");
                    setPartNotes("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isResourcesOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsResourcesOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[70vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-resources"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Resources
              </p>
              <button onClick={() => setIsResourcesOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-1">
              {[...allTaskResources]
                .sort((a, b) => a.title?.localeCompare(b.title || "") || 0)
                .map((resource: any) => {
                  const isVideo = resource.type === "video";
                  return (
                    <button
                      key={resource.id}
                      className="flex items-center gap-3 w-full py-3 text-left border-b border-border"
                      onClick={() => window.open(toDisplayUrl(resource.url), "_blank")}
                      data-testid={`resource-row-${resource.id}`}
                    >
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold uppercase shrink-0 ${isVideo ? "bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400" : "bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400"}`}
                      >
                        {isVideo ? "VID" : "PDF"}
                      </span>
                      <span className="text-sm flex-1 truncate text-foreground">
                        {resource.title}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
