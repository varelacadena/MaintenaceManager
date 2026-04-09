import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  ChevronDown,
  Package,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import type { PartUsed, InventoryItem } from "@shared/schema";
import type { UseMutationResult } from "@tanstack/react-query";

interface PanelPartsSectionProps {
  isPartsOpen: boolean;
  setIsPartsOpen: (v: boolean) => void;
  taskParts: PartUsed[];
  isAddPartFormOpen: boolean;
  setIsAddPartFormOpen: (v: boolean) => void;
  inventorySearchQuery: string;
  setInventorySearchQuery: (v: string) => void;
  selectedInventoryItemId: string;
  setSelectedInventoryItemId: (v: string) => void;
  inventoryItems: InventoryItem[];
  newPartQuantity: string;
  setNewPartQuantity: (v: string) => void;
  newPartNotes: string;
  setNewPartNotes: (v: string) => void;
  addPartMutation: UseMutationResult<any, any, any, any>;
  isAdmin: boolean;
  taskId: string;
}

export function PanelPartsSection({
  isPartsOpen,
  setIsPartsOpen,
  taskParts,
  isAddPartFormOpen,
  setIsAddPartFormOpen,
  inventorySearchQuery,
  setInventorySearchQuery,
  selectedInventoryItemId,
  setSelectedInventoryItemId,
  inventoryItems,
  newPartQuantity,
  setNewPartQuantity,
  newPartNotes,
  setNewPartNotes,
  addPartMutation,
  isAdmin,
  taskId,
}: PanelPartsSectionProps) {
  return (
    <div style={{ borderBottom: "1px solid #EEEEEE" }}>
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
        style={{ color: "#1A1A1A" }}
        onClick={() => setIsPartsOpen(!isPartsOpen)}
        data-testid="link-panel-parts"
      >
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4" style={{ color: "#6B7280" }} />
          Parts Used
          {taskParts.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}>
              {taskParts.length}
            </span>
          )}
        </div>
        {isPartsOpen ? (
          <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        ) : (
          <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        )}
      </button>
      {isPartsOpen && (
        <div className="px-5 pb-4 space-y-2">
          {taskParts.length === 0 && !isAddPartFormOpen ? (
            <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>No parts used yet</p>
          ) : (
            taskParts.map((part) => (
              <div
                key={part.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}
                data-testid={`panel-part-${part.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#1A1A1A" }}>{part.partName}</p>
                  {part.notes && <p className="text-xs mt-0.5 truncate" style={{ color: "#6B7280" }}>{part.notes}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-xs font-medium" style={{ color: "#6B7280" }}>x{part.quantity}</span>
                  {part.cost !== null && part.cost !== undefined && Number(part.cost) > 0 && (
                    <span className="text-xs font-medium" style={{ color: "#15803D" }}>${Number(part.cost).toFixed(2)}</span>
                  )}
                </div>
              </div>
            ))
          )}
          {isAddPartFormOpen ? (
            <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search inventory..."
                  value={inventorySearchQuery}
                  onChange={(e) => {
                    setInventorySearchQuery(e.target.value);
                    setSelectedInventoryItemId("");
                  }}
                  className="pl-9"
                  data-testid="input-panel-search-part"
                />
              </div>
              {inventorySearchQuery && !selectedInventoryItemId && (() => {
                const filtered = inventoryItems.filter((item) =>
                  item.name.toLowerCase().includes(inventorySearchQuery.toLowerCase())
                );
                return (
                  <div className="border border-border rounded-md max-h-40 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground" data-testid="text-panel-no-inventory-match">
                        No matching inventory items
                      </div>
                    ) : (
                      filtered.map((item) => {
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
                            data-testid={`panel-inventory-item-${item.id}`}
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
                      })
                    )}
                  </div>
                );
              })()}
              {selectedInventoryItemId && (() => {
                const selectedItem = inventoryItems.find((i) => i.id === selectedInventoryItemId);
                const qty = Number(selectedItem?.quantity) || 0;
                const isOut = selectedItem?.stockStatus === "out" || (selectedItem?.trackingMode === "counted" && qty <= 0);
                const isLow = selectedItem?.stockStatus === "low" || (selectedItem?.trackingMode === "counted" && selectedItem?.minQuantity && qty <= Number(selectedItem.minQuantity) && qty > 0);
                return (
                  <div className="p-2 rounded-md text-sm bg-muted text-foreground" data-testid="text-panel-selected-item">
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
              <div className="flex gap-2">
                <Input
                  value={newPartQuantity}
                  onChange={(e) => setNewPartQuantity(e.target.value)}
                  placeholder="Qty"
                  type="number"
                  min="1"
                  className="w-20"
                  data-testid="input-panel-part-quantity"
                />
                <Input
                  value={
                    selectedInventoryItemId
                      ? (
                          (parseFloat(
                            inventoryItems.find((i) => i.id === selectedInventoryItemId)?.cost || "0"
                          ) || 0) * (parseFloat(newPartQuantity) || 1)
                        ).toFixed(2)
                      : ""
                  }
                  readOnly
                  placeholder="Cost ($)"
                  type="number"
                  className="w-24"
                  data-testid="input-panel-part-cost"
                />
              </div>
              <Input
                value={newPartNotes}
                onChange={(e) => setNewPartNotes(e.target.value)}
                placeholder="Notes (optional)"
                data-testid="input-panel-part-notes"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddPartFormOpen(false);
                    setNewPartQuantity("1");
                    setInventorySearchQuery("");
                    setSelectedInventoryItemId("");
                    setNewPartNotes("");
                  }}
                  data-testid="button-panel-cancel-part"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                  disabled={!selectedInventoryItemId || addPartMutation.isPending}
                  onClick={() => {
                    const selectedItem = inventoryItems.find((i) => i.id === selectedInventoryItemId);
                    if (!selectedItem) return;
                    const cost = (parseFloat(selectedItem.cost || "0") || 0) * (parseFloat(newPartQuantity) || 1);
                    addPartMutation.mutate({
                      taskId,
                      partName: selectedItem.name,
                      quantity: newPartQuantity || "1",
                      cost,
                      notes: newPartNotes.trim() || undefined,
                      inventoryItemId: selectedInventoryItemId,
                    });
                  }}
                  data-testid="button-panel-save-part"
                >
                  {addPartMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          ) : (
            isAdmin && (
              <button
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ border: "1px dashed #D1D5DB", color: "#6B7280" }}
                onClick={() => setIsAddPartFormOpen(true)}
                data-testid="button-panel-add-part"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Part
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
