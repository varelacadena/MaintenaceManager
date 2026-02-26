import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { InventoryItem, InsertInventoryItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TrendingUp,
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
  {
    value: "counted",
    label: "Counted",
    description: "Track exact quantities (e.g. auto parts, fluids, hardware)",
  },
  {
    value: "container",
    label: "Container / Unit",
    description: "Track whole containers or packages (e.g. cleaning spray bottles, bags of mulch)",
  },
  {
    value: "status",
    label: "Status Only",
    description: "Just track Stocked / Low / Out — no counting (e.g. small fasteners, consumables)",
  },
];

const CATEGORY_TRACKING_DEFAULTS: Record<string, string> = {
  auto: "counted",
  cleaning: "container",
  landscaping: "container",
  plumbing: "counted",
  electrical: "counted",
  repairs: "counted",
  general: "counted",
};

const STATUS_CYCLE: Record<string, string> = {
  stocked: "low",
  low: "out",
  out: "stocked",
};

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "destructive" | "outline" }> = {
  stocked: { label: "Stocked", variant: "secondary" },
  low: { label: "Low", variant: "outline" },
  out: { label: "Out", variant: "destructive" },
};

function formatQty(qty: string | number | null | undefined): string {
  const n = parseFloat(String(qty ?? 0));
  if (isNaN(n)) return "0";
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

export default function Inventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [isScanFindOpen, setIsScanFindOpen] = useState(false);
  const [isScanReceiveOpen, setIsScanReceiveOpen] = useState(false);
  const [isScanCreateBarcodeOpen, setIsScanCreateBarcodeOpen] = useState(false);
  const [isScanEditBarcodeOpen, setIsScanEditBarcodeOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantityChange, setQuantityChange] = useState<string>("");
  const [receiveQuantity, setReceiveQuantity] = useState<string>("");
  const [receiveItem, setReceiveItem] = useState<InventoryItem | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showAiInsights, setShowAiInsights] = useState(false);
  const [aiReorderData, setAiReorderData] = useState<any[] | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const { data: inventoryItems, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const filteredItems = inventoryItems?.filter((item) =>
    activeCategory === "all" ? true : item.category === activeCategory
  ) ?? [];

  const createMutation = useMutation({
    mutationFn: async (data: InsertInventoryItem) => {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({ title: "Item created", description: "Inventory item added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create item", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertInventoryItem> }) => {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsEditDialogOpen(false);
      setSelectedItem(null);
      toast({ title: "Item updated", description: "Inventory item updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update item", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      toast({ title: "Item deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete item", variant: "destructive" });
    },
  });

  const quantityMutation = useMutation({
    mutationFn: async ({ id, change }: { id: string; change: number }) => {
      const res = await fetch(`/api/inventory/${id}/quantity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change }),
        credentials: "include",
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
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update quantity", variant: "destructive" });
    },
  });

  const containerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory/${id}/use-container`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Container used", description: "Stock updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, stockStatus }: { id: string; stockStatus: string }) => {
      const res = await fetch(`/api/inventory/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockStatus }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const inventoryFormSchema = insertInventoryItemSchema.extend({
    quantity: z.coerce.number().min(0, "Quantity must be 0 or more"),
    minQuantity: z.coerce.number().min(0, "Min quantity must be 0 or more").optional(),
  });

  const createForm = useForm<z.infer<typeof inventoryFormSchema>>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      quantity: 0,
      unit: "",
      location: "",
      minQuantity: 0,
      cost: "",
      trackingMode: "counted",
      category: "general",
      packageInfo: "",
      barcode: "",
      stockStatus: "stocked",
    },
  });

  const editForm = useForm<z.infer<typeof inventoryFormSchema>>({
    resolver: zodResolver(inventoryFormSchema),
  });

  const watchCreateCategory = createForm.watch("category");
  const watchCreateTracking = createForm.watch("trackingMode");
  const watchEditTracking = editForm.watch("trackingMode");

  const handleCreateSubmit = (data: z.infer<typeof inventoryFormSchema>) => {
    const payload: any = {
      ...data,
      quantity: String(data.quantity ?? 0),
      minQuantity: String(data.minQuantity ?? 0),
      barcode: data.barcode || null,
      packageInfo: data.packageInfo || null,
    };
    createMutation.mutate(payload);
  };

  const handleEditSubmit = (data: z.infer<typeof inventoryFormSchema>) => {
    if (selectedItem) {
      const payload: any = {
        ...data,
        quantity: String(data.quantity ?? 0),
        minQuantity: String(data.minQuantity ?? 0),
        barcode: data.barcode || null,
        packageInfo: data.packageInfo || null,
      };
      updateMutation.mutate({ id: selectedItem.id, data: payload });
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    editForm.reset({
      name: item.name,
      description: item.description || "",
      quantity: parseFloat(item.quantity as unknown as string) || 0,
      unit: item.unit || "",
      location: item.location || "",
      minQuantity: parseFloat(item.minQuantity as unknown as string) || 0,
      cost: item.cost || "",
      trackingMode: (item.trackingMode as any) || "counted",
      category: (item.category as any) || "general",
      packageInfo: item.packageInfo || "",
      barcode: item.barcode || "",
      stockStatus: (item.stockStatus as any) || "stocked",
    });
    setIsEditDialogOpen(true);
  };

  const handleShowQr = async (item: InventoryItem) => {
    setSelectedItem(item);
    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(item.barcode || item.id, {
        width: 200,
        margin: 2,
      });
      setQrCodeDataUrl(dataUrl);
    } catch {
      setQrCodeDataUrl("");
    }
    setIsQrDialogOpen(true);
  };

  const handlePrintLabel = () => {
    if (!selectedItem || !qrCodeDataUrl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Label - ${selectedItem.name}</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .label { border: 2px solid #333; padding: 16px; border-radius: 8px; text-align: center; max-width: 280px; }
            h2 { margin: 0 0 4px; font-size: 16px; }
            p { margin: 2px 0; font-size: 12px; color: #555; }
            img { margin: 12px 0; }
          </style>
        </head>
        <body>
          <div class="label">
            <h2>${selectedItem.name}</h2>
            <p>${selectedItem.category || "general"} &bull; ${selectedItem.unit || "unit"}</p>
            ${selectedItem.packageInfo ? `<p>${selectedItem.packageInfo}</p>` : ""}
            ${selectedItem.location ? `<p>Location: ${selectedItem.location}</p>` : ""}
            <img src="${qrCodeDataUrl}" width="160" height="160" />
            <p style="font-size:10px;color:#999;">${selectedItem.barcode || selectedItem.id}</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleScanFind = async (barcodeValue: string) => {
    const res = await fetch(`/api/inventory/by-barcode/${encodeURIComponent(barcodeValue)}`, {
      credentials: "include",
    });
    if (res.ok) {
      const item: InventoryItem = await res.json();
      setActiveCategory("all");
      setHighlightedId(item.id);
      setTimeout(() => {
        rowRefs.current[item.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      setTimeout(() => setHighlightedId(null), 3000);
      toast({ title: "Item found", description: item.name });
    } else {
      const proceed = confirm(
        `No item found for barcode "${barcodeValue}". Would you like to create a new item with this barcode?`
      );
      if (proceed) {
        createForm.reset({ ...createForm.getValues(), barcode: barcodeValue, name: "" });
        setIsCreateDialogOpen(true);
      }
    }
  };

  const handleScanReceive = async (barcodeValue: string) => {
    const res = await fetch(`/api/inventory/by-barcode/${encodeURIComponent(barcodeValue)}`, {
      credentials: "include",
    });
    if (res.ok) {
      const item: InventoryItem = await res.json();
      setReceiveItem(item);
      setReceiveQuantity("");
      setIsQuantityDialogOpen(true);
      setSelectedItem(item);
    } else {
      toast({ title: "Item not found", description: "No inventory item has this barcode.", variant: "destructive" });
    }
  };

  const handleLoadAiInsights = async () => {
    setIsAiLoading(true);
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
    const qty = parseFloat(item.quantity as unknown as string) || 0;
    const min = parseFloat(item.minQuantity as unknown as string) || 0;
    return min > 0 && qty <= min;
  };

  if (!user || (user.role !== "admin" && user.role !== "technician")) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 md:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">Track and manage supplies across all categories</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setIsScanFindOpen(true)}
            data-testid="button-scan-find"
          >
            <ScanLine className="h-4 w-4 mr-2" />
            Scan to Find
          </Button>
          {user.role === "admin" && (
            <Button
              variant="outline"
              onClick={() => setIsScanReceiveOpen(true)}
              data-testid="button-scan-receive"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Receive Stock
            </Button>
          )}
          <Button
            onClick={() => {
              createForm.reset({
                name: "", description: "", quantity: 0, unit: "", location: "",
                minQuantity: 0, cost: "", trackingMode: "counted", category: "general",
                packageInfo: "", barcode: "", stockStatus: "stocked",
              });
              setIsCreateDialogOpen(true);
            }}
            data-testid="button-create-inventory"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* AI Insights Panel */}
      {user.role === "admin" && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                AI Inventory Insights
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAiInsights(!showAiInsights);
                    if (!showAiInsights && !aiReorderData) handleLoadAiInsights();
                  }}
                  data-testid="button-toggle-ai-insights"
                >
                  {showAiInsights ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                  {showAiInsights ? "Hide" : "Show Insights"}
                </Button>
                {showAiInsights && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadAiInsights}
                    disabled={isAiLoading}
                    data-testid="button-refresh-ai-insights"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isAiLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          {showAiInsights && (
            <CardContent className="pt-0">
              {isAiLoading ? (
                <p className="text-sm text-muted-foreground">Analyzing inventory...</p>
              ) : (
                <div className="space-y-4">
                  {aiSummary && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Usage Trends</p>
                      <p className="text-sm">{aiSummary}</p>
                    </div>
                  )}
                  {aiReorderData && aiReorderData.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Reorder Recommendations</p>
                      <div className="space-y-2">
                        {aiReorderData.map((rec: any, i: number) => (
                          <div key={i} className="flex items-start justify-between gap-3 text-sm p-2 rounded-md border" data-testid={`ai-reorder-${i}`}>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{rec.name}</p>
                              <p className="text-muted-foreground text-xs">{rec.reason}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge variant={rec.urgency === "high" ? "destructive" : rec.urgency === "medium" ? "outline" : "secondary"} className="text-xs">
                                {rec.urgency}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">Order: {rec.suggestedReorderQuantity} {rec.unit}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiReorderData && aiReorderData.length === 0 && (
                    <p className="text-sm text-muted-foreground">All items are well-stocked. No reorders needed.</p>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Category Filter Tabs */}
      <div className="mb-3 overflow-x-auto">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = cat.value === "all"
                ? (inventoryItems?.length ?? 0)
                : (inventoryItems?.filter((i) => i.category === cat.value).length ?? 0);
              return (
                <TabsTrigger
                  key={cat.value}
                  value={cat.value}
                  className="flex items-center gap-1.5 text-xs"
                  data-testid={`tab-category-${cat.value}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="text-xs px-1 py-0 min-w-[18px] h-4">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">Loading inventory...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg p-4">
          <Package className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-base font-medium">
            {activeCategory === "all" ? "No inventory items yet" : `No ${activeCategory} items yet`}
          </p>
          <p className="text-sm text-muted-foreground mb-4">Get started by adding your first item</p>
          <Button
            onClick={() => {
              createForm.reset({
                name: "", description: "", quantity: 0, unit: "", location: "",
                minQuantity: 0, cost: "", trackingMode: CATEGORY_TRACKING_DEFAULTS[activeCategory] || "counted",
                category: activeCategory === "all" ? "general" : activeCategory,
                packageInfo: "", barcode: "", stockStatus: "stocked",
              });
              setIsCreateDialogOpen(true);
            }}
            data-testid="button-create-first-inventory"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs whitespace-nowrap">Name</TableHead>
                <TableHead className="text-xs whitespace-nowrap hidden sm:table-cell">Category</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Stock</TableHead>
                <TableHead className="text-xs whitespace-nowrap hidden md:table-cell">Unit / Package</TableHead>
                <TableHead className="text-xs whitespace-nowrap hidden lg:table-cell">Location</TableHead>
                <TableHead className="text-xs whitespace-nowrap hidden lg:table-cell">Cost</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Status</TableHead>
                <TableHead className="text-xs text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const mode = item.trackingMode || "counted";
                const isHighlighted = highlightedId === item.id;
                return (
                  <TableRow
                    key={item.id}
                    data-testid={`row-inventory-${item.id}`}
                    ref={(el) => { rowRefs.current[item.id] = el; }}
                    className={isHighlighted ? "bg-primary/10 transition-colors" : ""}
                  >
                    <TableCell className="font-medium text-xs md:text-sm" data-testid={`text-name-${item.id}`}>
                      <div>
                        <p>{item.name}</p>
                        {item.description && (
                          <p className="text-muted-foreground text-xs truncate max-w-[160px] hidden sm:block">{item.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs capitalize">{item.category || "general"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs md:text-sm">
                      {mode === "status" ? (
                        <span className="text-muted-foreground italic text-xs">—</span>
                      ) : mode === "container" ? (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" data-testid={`text-quantity-${item.id}`}>
                            {formatQty(item.quantity)} {item.unit || "containers"}
                          </span>
                          {user.role === "admin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => containerMutation.mutate(item.id)}
                              disabled={containerMutation.isPending}
                              data-testid={`button-use-container-${item.id}`}
                              className="h-7 px-2 text-xs"
                            >
                              <PackageMinus className="h-3 w-3 mr-1" />
                              Used One
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 md:gap-2">
                          <span className="font-semibold" data-testid={`text-quantity-${item.id}`}>
                            {formatQty(item.quantity)}
                          </span>
                          {user.role === "admin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setSelectedItem(item); setQuantityChange(""); setIsQuantityDialogOpen(true); }}
                              data-testid={`button-update-quantity-${item.id}`}
                              className="h-7 w-7 p-0"
                            >
                              <TrendingUp className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      <div>
                        <span>{item.unit || "—"}</span>
                        {item.packageInfo && (
                          <p className="text-muted-foreground text-xs">{item.packageInfo}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs hidden lg:table-cell">{item.location || "—"}</TableCell>
                    <TableCell className="text-xs hidden lg:table-cell">
                      {item.cost ? `$${parseFloat(item.cost).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {mode === "status" ? (
                        <button
                          onClick={() => {
                            if (user.role !== "admin") return;
                            const next = STATUS_CYCLE[item.stockStatus || "stocked"] || "stocked";
                            statusMutation.mutate({ id: item.id, stockStatus: next });
                          }}
                          data-testid={`badge-status-${item.id}`}
                          className="cursor-pointer"
                          title={user.role === "admin" ? "Click to cycle status" : undefined}
                        >
                          <Badge variant={STATUS_LABELS[item.stockStatus || "stocked"]?.variant || "secondary"} className="text-xs">
                            {STATUS_LABELS[item.stockStatus || "stocked"]?.label || "Stocked"}
                          </Badge>
                        </button>
                      ) : isLowStock(item) ? (
                        <Badge variant="destructive" data-testid={`badge-low-stock-${item.id}`} className="text-xs whitespace-nowrap">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Low Stock</span>
                          <span className="sm:hidden">Low</span>
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-in-stock-${item.id}`} className="text-xs whitespace-nowrap">
                          <span className="hidden sm:inline">In Stock</span>
                          <span className="sm:hidden">OK</span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleShowQr(item)}
                          data-testid={`button-qr-${item.id}`}
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {user.role === "admin" && (
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => { setSelectedItem(item); setIsDeleteDialogOpen(true); }}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Barcode Scanners */}
      <BarcodeScanner
        open={isScanFindOpen}
        onOpenChange={setIsScanFindOpen}
        onScan={handleScanFind}
        title="Scan to Find Item"
        description="Scan a barcode or QR code to locate the item in inventory"
      />
      <BarcodeScanner
        open={isScanReceiveOpen}
        onOpenChange={setIsScanReceiveOpen}
        onScan={handleScanReceive}
        title="Receive Stock"
        description="Scan a barcode to find the item and add received quantity"
      />

      {/* QR Code Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent data-testid="dialog-qr-code">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {selectedItem?.name}
            </DialogTitle>
            <DialogDescription>
              Scan this code with any device to look up this item
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR Code" className="rounded-md border p-2" width={200} height={200} />
            ) : (
              <div className="h-48 w-48 flex items-center justify-center text-muted-foreground border rounded-md">
                Generating...
              </div>
            )}
            {selectedItem && (
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">{selectedItem.name}</p>
                {selectedItem.packageInfo && <p className="text-xs text-muted-foreground">{selectedItem.packageInfo}</p>}
                {selectedItem.location && <p className="text-xs text-muted-foreground">Location: {selectedItem.location}</p>}
                <p className="text-xs text-muted-foreground font-mono">{selectedItem.barcode || selectedItem.id}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQrDialogOpen(false)}>Close</Button>
            <Button onClick={handlePrintLabel} data-testid="button-print-label">
              Print Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quantity Update / Receive Stock Dialog */}
      <Dialog open={isQuantityDialogOpen} onOpenChange={setIsQuantityDialogOpen}>
        <DialogContent data-testid="dialog-update-quantity">
          <DialogHeader>
            <DialogTitle>{receiveItem ? "Receive Stock" : "Update Quantity"}</DialogTitle>
            <DialogDescription>
              {selectedItem?.name} — current: {formatQty(selectedItem?.quantity)} {selectedItem?.unit || ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Quantity Change</label>
              <Input
                type="number"
                step="0.01"
                value={quantityChange}
                onChange={(e) => setQuantityChange(e.target.value)}
                placeholder="e.g. +5 to add, -2 to remove"
                data-testid="input-quantity-change"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use positive numbers to add stock, negative to remove
              </p>
            </div>
            {quantityChange && !isNaN(parseFloat(quantityChange)) && selectedItem && (
              <p className="text-sm">
                New quantity:{" "}
                <span className="font-semibold">
                  {formatQty(
                    Math.max(0, (parseFloat(selectedItem.quantity as unknown as string) || 0) + parseFloat(quantityChange))
                  )} {selectedItem.unit || ""}
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

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-create-inventory">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Add a new item to the inventory system</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Cleaning Spray, Motor Oil, PVC Pipe" data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value || "general"}
                        onValueChange={(val) => {
                          field.onChange(val);
                          const defaultMode = CATEGORY_TRACKING_DEFAULTS[val] || "counted";
                          createForm.setValue("trackingMode", defaultMode);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="trackingMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking Mode</FormLabel>
                      <Select value={field.value || "counted"} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tracking-mode">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                        </FormControl>
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
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Additional details" data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {watchCreateTracking !== "status" && (
                  <FormField
                    control={createForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {watchCreateTracking === "container" ? "Containers on Hand" : "Quantity"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={createForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder={
                            watchCreateTracking === "container" ? "e.g. bottles, bags" :
                            watchCreateTracking === "status" ? "e.g. rolls, boxes" :
                            "e.g. pcs, gallons, ft"
                          }
                          data-testid="input-unit"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="packageInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package / Container Info (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="e.g. 32 oz bottle, 500-sheet ream, 12-pack case"
                        data-testid="input-package-info"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage Location (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="e.g. Storage Room A" data-testid="input-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per Unit (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" value={field.value || ""} placeholder="e.g. 5.99" data-testid="input-cost" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {watchCreateTracking !== "status" && (
                <FormField
                  control={createForm.control}
                  name="minQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Quantity (Low Stock Alert)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? 0}
                          type="number"
                          step="0.01"
                          min="0"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-min-quantity"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Alert when stock falls to or below this level</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchCreateTracking === "status" && (
                <FormField
                  control={createForm.control}
                  name="stockStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Status</FormLabel>
                      <Select value={field.value || "stocked"} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-stock-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="stocked">Stocked</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="out">Out</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={createForm.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode / QR Code (Optional)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Scan or enter barcode value" data-testid="input-barcode" />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsScanCreateBarcodeOpen(true)}
                        data-testid="button-scan-barcode-field"
                      >
                        <ScanLine className="h-4 w-4" />
                      </Button>
                    </div>
                    <BarcodeScanner
                      open={isScanCreateBarcodeOpen}
                      onOpenChange={setIsScanCreateBarcodeOpen}
                      onScan={(val) => { field.onChange(val); setIsScanCreateBarcodeOpen(false); }}
                      title="Scan Item Barcode"
                      description="Scan the barcode on this item to register it"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel-create">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending ? "Creating..." : "Create Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-inventory">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>Update item information</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value || "general"}
                        onValueChange={(val) => {
                          field.onChange(val);
                          const defaultMode = CATEGORY_TRACKING_DEFAULTS[val] || "counted";
                          editForm.setValue("trackingMode", defaultMode);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="trackingMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking Mode</FormLabel>
                      <Select value={field.value || "counted"} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-tracking-mode">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
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
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-edit-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {watchEditTracking !== "status" && (
                  <FormField
                    control={editForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{watchEditTracking === "container" ? "Containers on Hand" : "Quantity"}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-edit-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={editForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-edit-unit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="packageInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package / Container Info (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="e.g. 32 oz bottle, 500-sheet ream" data-testid="input-edit-package-info" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage Location</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-edit-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per Unit</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" value={field.value || ""} data-testid="input-edit-cost" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {watchEditTracking !== "status" && (
                <FormField
                  control={editForm.control}
                  name="minQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Quantity (Low Stock Alert)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? 0}
                          type="number"
                          step="0.01"
                          min="0"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-edit-min-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchEditTracking === "status" && (
                <FormField
                  control={editForm.control}
                  name="stockStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Status</FormLabel>
                      <Select value={field.value || "stocked"} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-stock-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="stocked">Stocked</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="out">Out</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={editForm.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode / QR Code (Optional)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Barcode or QR code value" data-testid="input-edit-barcode" />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsScanEditBarcodeOpen(true)}
                        data-testid="button-scan-edit-barcode-field"
                      >
                        <ScanLine className="h-4 w-4" />
                      </Button>
                    </div>
                    <BarcodeScanner
                      open={isScanEditBarcodeOpen}
                      onOpenChange={setIsScanEditBarcodeOpen}
                      onScan={(val) => { field.onChange(val); setIsScanEditBarcodeOpen(false); }}
                      title="Scan Item Barcode"
                      description="Scan the barcode on this item"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  {updateMutation.isPending ? "Updating..." : "Update Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-inventory">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
