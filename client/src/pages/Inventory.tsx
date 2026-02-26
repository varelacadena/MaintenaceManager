import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { InventoryItem, InsertInventoryItem } from "@shared/schema";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInventoryItemSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  ScanLine,
  QrCode,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Truck,
  Droplets,
  Leaf,
  Wrench,
  Zap,
  HardHat,
  LayoutGrid,
  PackageMinus,
  ShoppingCart,
  RefreshCw,
  MoreVertical,
  Search,
  TrendingUp,
} from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";

const CATEGORIES = [
  { value: "all", label: "All", icon: LayoutGrid },
  { value: "auto", label: "Auto", icon: Truck },
  { value: "cleaning", label: "Cleaning", icon: Droplets },
  { value: "landscaping", label: "Landscaping", icon: Leaf },
  { value: "plumbing", label: "Plumbing", icon: Wrench },
  { value: "electrical", label: "Electrical", icon: Zap },
  { value: "repairs", label: "Repairs", icon: HardHat },
  { value: "general", label: "General", icon: Package },
];

const TRACKING_MODES = [
  { value: "counted", label: "Counted", description: "Track exact quantities (auto parts, fluids, hardware)" },
  { value: "container", label: "Container / Unit", description: "Track whole containers or packages (spray bottles, bags)" },
  { value: "status", label: "Status Only", description: "Stocked / Low / Out — no counting (small fasteners, consumables)" },
];

const CATEGORY_TRACKING_DEFAULTS: Record<string, string> = {
  auto: "counted", cleaning: "container", landscaping: "container",
  plumbing: "counted", electrical: "counted", repairs: "counted", general: "counted",
};

const STATUS_CYCLE: Record<string, string> = { stocked: "low", low: "out", out: "stocked" };

const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "destructive" | "outline"; dot: string }> = {
  stocked: { label: "Stocked", variant: "secondary", dot: "bg-green-500" },
  low:     { label: "Low",     variant: "outline",   dot: "bg-yellow-500" },
  out:     { label: "Out",     variant: "destructive", dot: "bg-red-500" },
};

function formatQty(qty: string | number | null | undefined): string {
  const n = parseFloat(String(qty ?? 0));
  if (isNaN(n)) return "0";
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

export default function Inventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [isScanFindOpen, setIsScanFindOpen] = useState(false);
  const [isScanReceiveOpen, setIsScanReceiveOpen] = useState(false);
  const [isScanCreateBarcodeOpen, setIsScanCreateBarcodeOpen] = useState(false);
  const [isScanEditBarcodeOpen, setIsScanEditBarcodeOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantityChange, setQuantityChange] = useState<string>("");
  const [receiveItem, setReceiveItem] = useState<InventoryItem | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [aiReorderData, setAiReorderData] = useState<any[] | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: inventoryItems = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const filteredItems = inventoryItems.filter((item) => {
    const catMatch = activeCategory === "all" || item.category === activeCategory;
    const searchMatch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: InsertInventoryItem) => {
      const res = await fetch("/api/inventory", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({ title: "Item added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertInventoryItem> }) => {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsEditDialogOpen(false);
      setSelectedItem(null);
      toast({ title: "Item updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      toast({ title: "Item deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const quantityMutation = useMutation({
    mutationFn: async ({ id, change }: { id: string; change: number }) => {
      const res = await fetch(`/api/inventory/${id}/quantity`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change }), credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsQuantityDialogOpen(false);
      setSelectedItem(null);
      setQuantityChange("");
      toast({ title: "Quantity updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const containerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory/${id}/use-container`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Container used", description: "Stock updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, stockStatus }: { id: string; stockStatus: string }) => {
      const res = await fetch(`/api/inventory/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockStatus }), credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/inventory"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ─── Form schemas ──────────────────────────────────────────────────────────

  const inventoryFormSchema = insertInventoryItemSchema.extend({
    quantity: z.coerce.number().min(0),
    minQuantity: z.coerce.number().min(0).optional(),
  });

  const createForm = useForm<z.infer<typeof inventoryFormSchema>>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      name: "", description: "", quantity: 0, unit: "", location: "",
      minQuantity: 0, cost: "", trackingMode: "counted", category: "general",
      packageInfo: "", barcode: "", stockStatus: "stocked",
    },
  });

  const editForm = useForm<z.infer<typeof inventoryFormSchema>>({
    resolver: zodResolver(inventoryFormSchema),
  });

  const watchCreateCategory = createForm.watch("category");
  const watchCreateTracking = createForm.watch("trackingMode");
  const watchEditTracking = editForm.watch("trackingMode");

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCreateSubmit = (data: z.infer<typeof inventoryFormSchema>) => {
    createMutation.mutate({
      ...data,
      quantity: String(data.quantity ?? 0),
      minQuantity: String(data.minQuantity ?? 0),
      barcode: data.barcode || null,
      packageInfo: data.packageInfo || null,
    } as any);
  };

  const handleEditSubmit = (data: z.infer<typeof inventoryFormSchema>) => {
    if (!selectedItem) return;
    updateMutation.mutate({
      id: selectedItem.id,
      data: {
        ...data,
        quantity: String(data.quantity ?? 0),
        minQuantity: String(data.minQuantity ?? 0),
        barcode: data.barcode || null,
        packageInfo: data.packageInfo || null,
      } as any,
    });
  };

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    editForm.reset({
      name: item.name, description: item.description || "",
      quantity: parseFloat(item.quantity as any) || 0,
      unit: item.unit || "", location: item.location || "",
      minQuantity: parseFloat(item.minQuantity as any) || 0,
      cost: item.cost || "",
      trackingMode: (item.trackingMode as any) || "counted",
      category: (item.category as any) || "general",
      packageInfo: item.packageInfo || "", barcode: item.barcode || "",
      stockStatus: (item.stockStatus as any) || "stocked",
    });
    setIsEditDialogOpen(true);
  };

  const handleShowQr = async (item: InventoryItem) => {
    setSelectedItem(item);
    try {
      const QRCode = (await import("qrcode")).default;
      setQrCodeDataUrl(await QRCode.toDataURL(item.barcode || item.id, { width: 200, margin: 2 }));
    } catch { setQrCodeDataUrl(""); }
    setIsQrDialogOpen(true);
  };

  const handlePrintLabel = () => {
    if (!selectedItem || !qrCodeDataUrl) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Label - ${selectedItem.name}</title>
      <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
      .l{border:2px solid #333;padding:16px;border-radius:8px;text-align:center;max-width:280px}
      h2{margin:0 0 4px;font-size:16px}p{margin:2px 0;font-size:12px;color:#555}img{margin:12px 0}</style>
      </head><body><div class="l"><h2>${selectedItem.name}</h2>
      <p>${selectedItem.category || "general"} &bull; ${selectedItem.unit || "unit"}</p>
      ${selectedItem.packageInfo ? `<p>${selectedItem.packageInfo}</p>` : ""}
      ${selectedItem.location ? `<p>Location: ${selectedItem.location}</p>` : ""}
      <img src="${qrCodeDataUrl}" width="160" height="160" />
      <p style="font-size:10px;color:#999;">${selectedItem.barcode || selectedItem.id}</p>
      </div><script>window.onload=()=>{window.print();window.close();}</script></body></html>`);
    w.document.close();
  };

  const lookupScannedCode = async (code: string): Promise<InventoryItem | null> => {
    const byBarcode = await fetch(`/api/inventory/by-barcode/${encodeURIComponent(code)}`, { credentials: "include" });
    if (byBarcode.ok) return byBarcode.json();
    const byId = await fetch(`/api/inventory/${encodeURIComponent(code)}`, { credentials: "include" });
    if (byId.ok) return byId.json();
    return null;
  };

  const handleScanFind = async (barcode: string) => {
    const item = await lookupScannedCode(barcode);
    if (item) {
      setActiveCategory("all");
      setSearch("");
      setHighlightedId(item.id);
      setTimeout(() => { rowRefs.current[item.id]?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100);
      setTimeout(() => setHighlightedId(null), 3000);
      toast({ title: "Item found", description: item.name });
    } else {
      if (confirm(`No item found for "${barcode}". Create a new item with this barcode?`)) {
        createForm.reset({ ...createForm.getValues(), barcode, name: "" });
        setIsCreateDialogOpen(true);
      }
    }
  };

  const handleScanReceive = async (barcode: string) => {
    const item = await lookupScannedCode(barcode);
    if (item) {
      setReceiveItem(item);
      setSelectedItem(item);
      setQuantityChange("");
      setIsQuantityDialogOpen(true);
    } else {
      toast({ title: "Item not found", description: "No item has this barcode.", variant: "destructive" });
    }
  };

  const handleLoadAiInsights = async () => {
    setIsAiLoading(true);
    setAiReorderData(null);
    setAiSummary(null);
    try {
      const [reorderRes, summaryRes] = await Promise.all([
        apiRequest("POST", "/api/inventory/ai-insights", { type: "reorder" }),
        apiRequest("POST", "/api/inventory/ai-insights", { type: "summary" }),
      ]);
      const reorderData = await reorderRes.json();
      const summaryData = await summaryRes.json();
      setAiReorderData(reorderData.items || []);
      setAiSummary(summaryData.summary || "");
    } catch {
      toast({ title: "Error", description: "Failed to load AI insights", variant: "destructive" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const isLowStock = (item: InventoryItem) => {
    if (item.trackingMode === "status") return item.stockStatus === "low" || item.stockStatus === "out";
    const qty = parseFloat(item.quantity as any) || 0;
    const min = parseFloat(item.minQuantity as any) || 0;
    return min > 0 && qty <= min;
  };

  const openCreate = (cat?: string) => {
    const category = cat && cat !== "all" ? cat : "general";
    createForm.reset({
      name: "", description: "", quantity: 0, unit: "", location: "",
      minQuantity: 0, cost: "", trackingMode: CATEGORY_TRACKING_DEFAULTS[category] || "counted",
      category, packageInfo: "", barcode: "", stockStatus: "stocked",
    });
    setIsCreateDialogOpen(true);
  };

  if (!user || (user.role !== "admin" && user.role !== "technician")) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold leading-tight">Inventory</h1>
          <p className="text-xs text-muted-foreground">{inventoryItems.length} items tracked</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Scan dropdown */}
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

          {/* AI Insights (admin only) */}
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

          {/* Add item */}
          {isAdmin && (
            <Button onClick={() => openCreate(activeCategory)} data-testid="button-create-inventory">
              <Plus className="h-4 w-4 mr-1.5" />
              Add
            </Button>
          )}
        </div>
      </div>

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
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

      {/* ── Category tabs ──────────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
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

      {/* ── Item List ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : filteredItems.length === 0 ? (
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
        ) : (
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
                  {/* Left: name + meta */}
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

                    {/* Stock display + primary action */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {mode === "status" ? (
                        /* Status Only: tappable badge */
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
                        /* Container: quantity + Used One button */
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
                        /* Counted: quantity + adjust */
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

                  {/* Right: "..." menu */}
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
        )}
      </div>

      {/* ── Barcode Scanners ──────────────────────────────────────────────── */}
      <BarcodeScanner open={isScanFindOpen} onOpenChange={setIsScanFindOpen} onScan={handleScanFind}
        title="Find Item" description="Scan a barcode or QR code to locate it" />
      <BarcodeScanner open={isScanReceiveOpen} onOpenChange={setIsScanReceiveOpen} onScan={handleScanReceive}
        title="Receive Stock" description="Scan a barcode to restock an item" />

      {/* ── AI Insights Dialog ────────────────────────────────────────────── */}
      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent data-testid="dialog-ai-insights">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Inventory Insights
            </DialogTitle>
            <DialogDescription>AI-powered analysis of your inventory usage and reorder needs</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {isAiLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Analyzing inventory...</p>
              </div>
            ) : (
              <>
                {aiSummary && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Usage Trends</p>
                    <p className="text-sm leading-relaxed">{aiSummary}</p>
                  </div>
                )}
                {aiReorderData && aiReorderData.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reorder Recommendations</p>
                    <div className="space-y-2">
                      {aiReorderData.map((rec: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-2.5 rounded-md border text-sm" data-testid={`ai-reorder-${i}`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{rec.name}</p>
                            <p className="text-muted-foreground text-xs mt-0.5">{rec.reason}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant={rec.urgency === "high" ? "destructive" : rec.urgency === "medium" ? "outline" : "secondary"} className="text-xs">
                              {rec.urgency}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">Order {rec.suggestedReorderQuantity} {rec.unit}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiReorderData && aiReorderData.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">All items are well-stocked. No reorders needed.</p>
                )}
                {!aiReorderData && !aiSummary && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No data yet.</p>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleLoadAiInsights} disabled={isAiLoading} data-testid="button-refresh-ai-insights">
              <RefreshCw className={`h-4 w-4 mr-2 ${isAiLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsAiDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QR Code Dialog ────────────────────────────────────────────────── */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent data-testid="dialog-qr-code">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name}</DialogTitle>
            <DialogDescription>Scan to look up this item</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR Code" className="rounded-md border p-2" width={200} height={200} />
            ) : (
              <div className="h-48 w-48 flex items-center justify-center text-muted-foreground border rounded-md text-sm">Generating...</div>
            )}
            <div className="text-center space-y-1">
              {selectedItem?.packageInfo && <p className="text-xs text-muted-foreground">{selectedItem.packageInfo}</p>}
              {selectedItem?.location && <p className="text-xs text-muted-foreground">Location: {selectedItem.location}</p>}
              <p className="text-xs text-muted-foreground font-mono">{selectedItem?.barcode || selectedItem?.id}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQrDialogOpen(false)}>Close</Button>
            <Button onClick={handlePrintLabel} data-testid="button-print-label">Print Label</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quantity Dialog ───────────────────────────────────────────────── */}
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

      {/* ── Create Item Dialog ────────────────────────────────────────────── */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-create-inventory">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Add a new item to inventory</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField control={createForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Cleaning Spray, Motor Oil" data-testid="input-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={createForm.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value || "general"} onValueChange={(val) => {
                      field.onChange(val);
                      createForm.setValue("trackingMode", CATEGORY_TRACKING_DEFAULTS[val] || "counted");
                    }}>
                      <FormControl><SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={createForm.control} name="trackingMode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking</FormLabel>
                    <Select value={field.value || "counted"} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-tracking-mode"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {TRACKING_MODES.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {watchCreateTracking && (
                      <FormDescription className="text-xs">
                        {TRACKING_MODES.find((m) => m.value === watchCreateTracking)?.description}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {watchCreateTracking !== "status" && (
                  <FormField control={createForm.control} name="quantity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{watchCreateTracking === "container" ? "On Hand" : "Quantity"}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={createForm.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""}
                        placeholder={watchCreateTracking === "container" ? "bottles, bags" : "pcs, gallons, ft"}
                        data-testid="input-unit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {watchCreateTracking === "status" && (
                <FormField control={createForm.control} name="stockStatus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Status</FormLabel>
                    <Select value={field.value || "stocked"} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-stock-status"><SelectValue /></SelectTrigger></FormControl>
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

              <FormField control={createForm.control} name="packageInfo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Info (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="e.g. 32 oz bottle, 12-pack case" data-testid="input-package-info" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={createForm.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} placeholder="Storage Room A" data-testid="input-location" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="cost" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost / Unit (Optional)</FormLabel>
                    <FormControl><Input {...field} type="number" step="0.01" min="0" value={field.value || ""} placeholder="5.99" data-testid="input-cost" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {watchCreateTracking !== "status" && (
                <FormField control={createForm.control} name="minQuantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Alert Threshold (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? 0} type="number" step="0.01" min="0"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-min-quantity" />
                    </FormControl>
                    <FormDescription className="text-xs">Alert when stock falls to or below this level</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={createForm.control} name="barcode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode / QR Code (Optional)</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Scan or enter barcode" data-testid="input-barcode" />
                    </FormControl>
                    <Button type="button" variant="outline" size="icon" onClick={() => setIsScanCreateBarcodeOpen(true)} data-testid="button-scan-barcode-field">
                      <ScanLine className="h-4 w-4" />
                    </Button>
                  </div>
                  <BarcodeScanner open={isScanCreateBarcodeOpen} onOpenChange={setIsScanCreateBarcodeOpen}
                    onScan={(val) => { field.onChange(val); setIsScanCreateBarcodeOpen(false); }}
                    title="Scan Item Barcode" description="Scan the barcode on this item" />
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={createForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} placeholder="Additional details" data-testid="input-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel-create">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Item Dialog ──────────────────────────────────────────────── */}
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

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
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
    </div>
  );
}
