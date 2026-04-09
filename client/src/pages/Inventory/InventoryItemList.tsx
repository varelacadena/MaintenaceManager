import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  QrCode,
  PackageMinus,
  TrendingUp,
  MoreVertical,
} from "lucide-react";
import {
  STATUS_CYCLE,
  STATUS_CONFIG,
  formatQty,
} from "./useInventory";
import type { InventoryContext } from "./useInventory";

interface InventoryItemListProps {
  ctx: InventoryContext;
}

export function InventoryItemList({ ctx }: InventoryItemListProps) {
  const {
    isAdmin,
    search, activeCategory,
    isLoading, filteredItems,
    highlightedId,
    rowRefs,
    selectedItem, setSelectedItem,
    setQuantityChange,
    setIsQuantityDialogOpen,
    setIsDeleteDialogOpen,
    containerMutation, statusMutation,
    handleShowQr, handleEdit,
    isLowStock, openCreate,
  } = ctx;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <Package className="h-10 w-10 text-muted-foreground/40" />
        <div className="text-center">
          <p className="font-medium text-sm">
            {search ? `No results for "${search}"` : activeCategory === "all" ? "No items yet" : `No ${activeCategory} items`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? "Try a different search" : "Add your first item to get started"}
          </p>
        </div>
        {isAdmin && !search && (
          <Button size="sm" onClick={() => openCreate(activeCategory)} data-testid="button-create-first-inventory">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Item
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredItems.map((item) => {
        const mode = item.trackingMode || "counted";
        const isHighlighted = highlightedId === item.id;
        const lowStock = isLowStock(item);
        const status = item.stockStatus || "stocked";
        const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.stocked;

        return (
          <div
            key={item.id}
            ref={(el) => { rowRefs.current[item.id] = el; }}
            data-testid={`row-inventory-${item.id}`}
            className={`rounded-lg border p-3 flex items-start gap-3 transition-colors ${isHighlighted ? "border-primary bg-primary/5" : "bg-card"}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <span className="font-medium text-sm leading-tight" data-testid={`text-name-${item.id}`}>
                  {item.name}
                </span>
                {lowStock && mode !== "status" && (
                  <Badge variant="destructive" className="text-xs shrink-0">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Low
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground capitalize">{item.category || "general"}</span>
                {item.location && (
                  <span className="text-xs text-muted-foreground">· {item.location}</span>
                )}
                {item.packageInfo && (
                  <span className="text-xs text-muted-foreground">· {item.packageInfo}</span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {mode === "status" ? (
                  isAdmin ? (
                    <button
                      onClick={() => statusMutation.mutate({ id: item.id, stockStatus: STATUS_CYCLE[status] || "stocked" })}
                      data-testid={`badge-status-${item.id}`}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium hover-elevate"
                      title="Tap to cycle status"
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </button>
                  ) : (
                    <Badge variant={statusCfg.variant} className="text-xs" data-testid={`badge-status-${item.id}`}>
                      {statusCfg.label}
                    </Badge>
                  )
                ) : mode === "container" ? (
                  <>
                    <span className="text-sm font-semibold" data-testid={`text-quantity-${item.id}`}>
                      {formatQty(item.quantity)} {item.unit || "containers"}
                    </span>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => containerMutation.mutate(item.id)}
                        disabled={containerMutation.isPending}
                        data-testid={`button-use-container-${item.id}`}
                        className="h-7 text-xs"
                      >
                        <PackageMinus className="h-3 w-3 mr-1" />
                        Used One
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold" data-testid={`text-quantity-${item.id}`}>
                      {formatQty(item.quantity)} {item.unit || ""}
                    </span>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedItem(item); setQuantityChange(""); setIsQuantityDialogOpen(true); }}
                        data-testid={`button-update-quantity-${item.id}`}
                        className="h-7 text-xs"
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Adjust
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" data-testid={`button-menu-${item.id}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => handleShowQr(item)} data-testid={`button-qr-${item.id}`}>
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Label
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEdit(item)} data-testid={`button-edit-${item.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => { setSelectedItem(item); setIsDeleteDialogOpen(true); }}
                      className="text-destructive"
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}
