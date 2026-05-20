import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Package } from "lucide-react";
import type { InventoryItem } from "@shared/schema";
import { formatQty, STATUS_CONFIG } from "./inventoryConstants";
import { isLowStock } from "@/lib/inventoryUtils";

type PartUsageRow = {
  id: string;
  taskId: string;
  taskName: string;
  quantity: string;
  cost: number;
  notes: string | null;
  createdAt: string | Date | null;
};

interface InventoryDetailSheetProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onEdit: (item: InventoryItem) => void;
}

export function InventoryDetailSheet({ item, open, onOpenChange, isAdmin, onEdit }: InventoryDetailSheetProps) {
  const { data: usage = [], isLoading } = useQuery<PartUsageRow[]>({
    queryKey: ["/api/inventory", item?.id, "parts-usage"],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/${item!.id}/parts-usage`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load usage");
      return res.json();
    },
    enabled: open && !!item?.id,
  });

  if (!item) return null;

  const mode = item.trackingMode || "counted";
  const status = item.stockStatus || "stocked";
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.stocked;
  const low = isLowStock(item);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto" data-testid="sheet-inventory-detail">
        <SheetHeader>
          <SheetTitle className="pr-8">{item.name}</SheetTitle>
          <SheetDescription className="capitalize">{item.category || "general"}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {low && <Badge variant="destructive">Low stock</Badge>}
            {mode === "status" ? (
              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
            ) : (
              <Badge variant="secondary">
                {formatQty(item.quantity)} {item.unit || ""}
              </Badge>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            {item.location && (
              <>
                <dt className="text-muted-foreground">Location</dt>
                <dd>{item.location}</dd>
              </>
            )}
            {item.packageInfo && (
              <>
                <dt className="text-muted-foreground">Package</dt>
                <dd>{item.packageInfo}</dd>
              </>
            )}
            {item.barcode && (
              <>
                <dt className="text-muted-foreground">Barcode</dt>
                <dd className="font-mono text-xs">{item.barcode}</dd>
              </>
            )}
            {isAdmin && item.cost && (
              <>
                <dt className="text-muted-foreground">Cost / unit</dt>
                <dd>${parseFloat(String(item.cost)).toFixed(2)}</dd>
              </>
            )}
            {mode !== "status" && item.minQuantity && parseFloat(String(item.minQuantity)) > 0 && (
              <>
                <dt className="text-muted-foreground">Min threshold</dt>
                <dd>{formatQty(item.minQuantity)}</dd>
              </>
            )}
          </dl>

          {item.description && (
            <p className="text-sm text-muted-foreground border-t pt-3">{item.description}</p>
          )}

          {isAdmin && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => { onEdit(item); onOpenChange(false); }}>
              Edit item
            </Button>
          )}

          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Package className="h-4 w-4" />
              Parts used on tasks
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : usage.length === 0 ? (
              <p className="text-xs text-muted-foreground">No task usage recorded yet.</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {usage.map((row) => (
                  <li key={row.id} className="text-sm border rounded-md p-2" data-testid={`usage-row-${row.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/tasks/${row.taskId}`} className="font-medium hover:underline truncate block">
                          {row.taskName}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Qty {formatQty(row.quantity)}
                          {row.createdAt && ` · ${format(new Date(row.createdAt), "MMM d, yyyy")}`}
                        </p>
                      </div>
                      <Link href={`/tasks/${row.taskId}`}>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Open task">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
