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
  Eye,
} from "lucide-react";
import { FleetListPagination } from "@/components/fleet/FleetListPagination";
import { isLowStock } from "@/lib/inventoryUtils";
import {
  STATUS_CYCLE,
  STATUS_CONFIG,
  formatQty,
} from "./inventoryConstants";
import type { InventoryContext } from "./useInventory";

interface InventoryItemListProps {
  ctx: InventoryContext;
}

export function InventoryItemList({ ctx }: InventoryItemListProps) {
  const {
    isAdmin, canOperate,
    search, activeCategory,
    isLoading, isError, error, refetch,
    filteredItems, filteredTotal, paginatedItems, stockFilter,
    page, setPage, INVENTORY_PAGE_SIZE,
    announceStatusChange, statusAnnouncement,
    highlightedId,
    rowRefs,
    selectedItem, setSelectedItem,
    setQuantityChange,
    setIsQuantityDialogOpen,
    setIsDeleteDialogOpen,
    containerMutation, statusMutation,
    handleShowQr, handleEdit, openDetail,
    openCreate,
  } = ctx;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-3 h-20 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-4">
        <AlertTriangle className="h-10 w-10 text-destructive/70" />
        <p className="font-medium text-sm">Could not load inventory</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {error instanceof Error ? error.message : "Please try again."}
        </p>
        <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="button-retry-inventory">
          Retry
        </Button>
      </div>
    );
  }

  if (filteredTotal === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <Package className="h-10 w-10 text-muted-foreground/40" />
        <div className="text-center">
          <p className="font-medium text-sm">
            {search
              ? `No results for "${search}"`
              : stockFilter === "low"
                ? "No low-stock items"
                : activeCategory === "all"
                  ? "No items yet"
                  : `No ${activeCategory} items`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {search || stockFilter === "low" ? "Try a different search or filter" : "Add your first item to get started"}
          </p>
        </div>
        {canOperate && !search && (
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
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusAnnouncement}
      </div>
      {paginatedItems.map((item) => {
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
                <button
                  type="button"
                  className="font-medium text-sm leading-tight text-left hover:underline"
                  data-testid={`text-name-${item.id}`}
                  onClick={() => openDetail(item)}
                >
                  {item.name}
                </button>
                {lowStock && (
                  <Badge variant="destructive" className="text-xs shrink-0">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {mode === "status" ? (status === "out" ? "Out" : "Low") : "Low"}
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
                  canOperate ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = STATUS_CYCLE[status] || "stocked";
                        statusMutation.mutate(
                          { id: item.id, stockStatus: next },
                          {
                            onSuccess: () => announceStatusChange(item.name),
                          },
                        );
                      }}
                      data-testid={`badge-status-${item.id}`}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium hover-elevate"
                      aria-label={`Stock status ${statusCfg.label}, tap to cycle`}
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
                    {canOperate && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); containerMutation.mutate(item.id); }}
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
                    {canOperate && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setQuantityChange(""); setIsQuantityDialogOpen(true); }}
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
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  data-testid={`button-menu-${item.id}`}
                  aria-label={`Actions for ${item.name}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => openDetail(item)} data-testid={`button-detail-${item.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShowQr(item)} data-testid={`button-qr-${item.id}`}>
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Label
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => handleEdit(item)} data-testid={`button-edit-${item.id}`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
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
      <FleetListPagination
        page={page}
        pageSize={INVENTORY_PAGE_SIZE}
        total={filteredTotal}
        onPageChange={setPage}
        itemLabel="items"
        testIdPrefix="inventory"
      />
    </div>
  );
}
