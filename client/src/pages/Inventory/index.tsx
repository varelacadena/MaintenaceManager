import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Sparkles,
  Truck,
  Droplets,
  Leaf,
  Wrench,
  Zap,
  HardHat,
  LayoutGrid,
  ShoppingCart,
  Search,
} from "lucide-react";
import {
  useInventory,
  CATEGORIES,
} from "./useInventory";
import { InventoryDialogs } from "./InventoryDialogs";
import { InventoryItemList } from "./InventoryItemList";

const CATEGORY_ICONS: Record<string, any> = {
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
  const ctx = useInventory();
  const {
    user, isAdmin,
    activeCategory, setActiveCategory,
    search, setSearch,
    setIsScanFindOpen, setIsScanReceiveOpen,
    setIsAiDialogOpen,
    aiReorderData, isAiLoading,
    inventoryItems,
    handleLoadAiInsights, openCreate,
  } = ctx;

  if (!user || (user.role !== "admin" && user.role !== "technician")) {
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
          <p className="text-xs text-muted-foreground">{inventoryItems.length} items tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-scan-menu">
                <ScanLine className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsScanFindOpen(true)} data-testid="button-scan-find">
                <ScanLine className="h-4 w-4 mr-2" />
                Find item
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => setIsScanReceiveOpen(true)} data-testid="button-scan-receive">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Receive stock
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {isAdmin && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => { setIsAiDialogOpen(true); if (!aiReorderData && !isAiLoading) handleLoadAiInsights(); }}
              data-testid="button-toggle-ai-insights"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}

          {isAdmin && (
            <Button onClick={() => openCreate(activeCategory)} data-testid="button-create-inventory">
              <Plus className="h-4 w-4 mr-1.5" />
              Add
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inventory..."
            className="pl-8 h-9 text-sm"
            data-testid="input-search-inventory"
          />
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.value] || Package;
            const count = cat.value === "all"
              ? inventoryItems.length
              : inventoryItems.filter((i) => i.category === cat.value).length;
            const isActive = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
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
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <InventoryItemList ctx={ctx} />
      </div>

      <InventoryDialogs ctx={ctx} />
    </div>
  );
}
