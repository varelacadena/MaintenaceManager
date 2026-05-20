import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Package,
  ScanLine,
  Truck,
  Droplets,
  Leaf,
  Wrench,
  Zap,
  HardHat,
  LayoutGrid,
  ShoppingCart,
  Search,
  AlertTriangle,
  Download,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useInventory } from "./useInventory";
import { CATEGORIES } from "./inventoryConstants";
import { InventoryDialogs } from "./InventoryDialogs";
import { InventoryDialogsExtra } from "./InventoryDialogsExtra";
import { InventoryItemList } from "./InventoryItemList";
import { InventoryDetailSheet } from "./InventoryDetailSheet";
import { InventoryImportDialog } from "./InventoryImportDialog";

import type { LucideIcon } from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  all: LayoutGrid,
  auto: Truck,
  cleaning: Droplets,
  landscaping: Leaf,
  plumbing: Wrench,
  electrical: Zap,
  repairs: HardHat,
  general: Package,
};

export default function Inventory() {
  const { toast } = useToast();
  const ctx = useInventory();
  const {
    user, isAdmin, canOperate,
    activeCategory, setActiveCategory,
    stockFilter, setStockFilter,
    sortKey, setSortKey,
    search, setSearch,
    setIsScanFindOpen, setIsScanReceiveOpen,
    inventoryTotal, filteredTotal, categoryCounts, lowStockCount,
    exportFilteredCsv,
    detailItem, isDetailOpen, setIsDetailOpen,
    isImportOpen, setIsImportOpen,
    openCreate, handleEdit,
  } = ctx;

  const handleExportCsv = async () => {
    try {
      await exportFilteredCsv();
      toast({ title: "Export started", description: "Your CSV download should begin shortly." });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Could not export",
        variant: "destructive",
      });
    }
  };

  if (!user || !canOperate) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">

      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold leading-tight">Inventory</h1>
          <p className="text-xs text-muted-foreground">
            {inventoryTotal} items tracked
            {lowStockCount > 0 && (
              <span className="text-destructive"> · {lowStockCount} low stock</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Export and import" data-testid="button-inventory-more">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => void handleExportCsv()}
                disabled={filteredTotal === 0}
                data-testid="button-export-inventory"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV ({filteredTotal})
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => setIsImportOpen(true)} data-testid="button-import-inventory">
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Scan inventory" data-testid="button-scan-menu">
                <ScanLine className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsScanFindOpen(true)} data-testid="button-scan-find">
                <ScanLine className="h-4 w-4 mr-2" />
                Find item
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsScanReceiveOpen(true)} data-testid="button-scan-receive">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Receive stock
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => openCreate(activeCategory)} data-testid="button-create-inventory">
            <Plus className="h-4 w-4 mr-1.5" />
            Add
          </Button>
        </div>
      </div>

      <div className="px-4 pb-2 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, barcode, location..."
            aria-label="Search inventory"
            className="pl-8 h-9 text-sm"
            data-testid="input-search-inventory"
          />
        </div>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as typeof sortKey)}>
          <SelectTrigger className="w-[130px] h-9 text-xs" data-testid="select-inventory-sort">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name A–Z</SelectItem>
            <SelectItem value="name-desc">Name Z–A</SelectItem>
            <SelectItem value="qty-asc">Qty low–high</SelectItem>
            <SelectItem value="qty-desc">Qty high–low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="px-4 pb-3 space-y-2">
        <div
          className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
          role="tablist"
          aria-label="Inventory filters"
        >
          <button
            type="button"
            role="tab"
            aria-selected={stockFilter === "low"}
            onClick={() => { setStockFilter("low"); setActiveCategory("all"); }}
            data-testid="tab-stock-low"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 border
              ${stockFilter === "low"
                ? "bg-destructive text-destructive-foreground border-destructive"
                : "bg-background text-muted-foreground border-border hover-elevate"
              }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Low stock</span>
            {lowStockCount > 0 && (
              <span className={stockFilter === "low" ? "opacity-80" : "opacity-60"}>{lowStockCount}</span>
            )}
          </button>
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.value] || Package;
            const count = categoryCounts[cat.value] ?? 0;
            const isActive = activeCategory === cat.value && stockFilter === "all";
            return (
              <button
                key={cat.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => { setActiveCategory(cat.value); setStockFilter("all"); }}
                data-testid={`tab-category-${cat.value}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 border
                  ${isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover-elevate"
                  }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
                {count > 0 && (
                  <span className={`text-xs ${isActive ? "opacity-80" : "opacity-60"}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
        {stockFilter === "low" && (
          <p className="text-xs text-muted-foreground">
            Showing items at or below minimum quantity, or with low/out status.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <InventoryItemList ctx={ctx} />
      </div>

      <InventoryDialogs ctx={ctx} />
      <InventoryDialogsExtra ctx={ctx} />

      <InventoryDetailSheet
        item={detailItem}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        isAdmin={isAdmin}
        onEdit={handleEdit}
      />
      <InventoryImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
