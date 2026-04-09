import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { InventoryItem, InsertInventoryItem } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInventoryItemSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

export const CATEGORIES = [
  { value: "all", label: "All", icon: "LayoutGrid" },
  { value: "auto", label: "Auto", icon: "Truck" },
  { value: "cleaning", label: "Cleaning", icon: "Droplets" },
  { value: "landscaping", label: "Landscaping", icon: "Leaf" },
  { value: "plumbing", label: "Plumbing", icon: "Wrench" },
  { value: "electrical", label: "Electrical", icon: "Zap" },
  { value: "repairs", label: "Repairs", icon: "HardHat" },
  { value: "general", label: "General", icon: "Package" },
];

export const TRACKING_MODES = [
  { value: "counted", label: "Counted", description: "Track exact quantities (auto parts, fluids, hardware)" },
  { value: "container", label: "Container / Unit", description: "Track whole containers or packages (spray bottles, bags)" },
  { value: "status", label: "Status Only", description: "Stocked / Low / Out — no counting (small fasteners, consumables)" },
];

export const CATEGORY_TRACKING_DEFAULTS: Record<string, string> = {
  auto: "counted", cleaning: "container", landscaping: "container",
  plumbing: "counted", electrical: "counted", repairs: "counted", general: "counted",
};

export const STATUS_CYCLE: Record<string, string> = { stocked: "low", low: "out", out: "stocked" };

export const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "destructive" | "outline"; dot: string }> = {
  stocked: { label: "Stocked", variant: "secondary", dot: "bg-green-500" },
  low:     { label: "Low",     variant: "outline",   dot: "bg-yellow-500" },
  out:     { label: "Out",     variant: "destructive", dot: "bg-red-500" },
};

export function formatQty(qty: string | number | null | undefined): string {
  const n = parseFloat(String(qty ?? 0));
  if (isNaN(n)) return "0";
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

export const inventoryFormSchema = insertInventoryItemSchema.extend({
  quantity: z.coerce.number().min(0),
  minQuantity: z.coerce.number().min(0).optional(),
});

export function useInventory() {
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
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({ title: "Item added" });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/inventory"] }), 300);
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
      setIsEditDialogOpen(false);
      setSelectedItem(null);
      toast({ title: "Item updated" });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/inventory"] }), 300);
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
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      toast({ title: "Item deleted" });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/inventory"] }), 300);
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
      setIsQuantityDialogOpen(false);
      setSelectedItem(null);
      setQuantityChange("");
      toast({ title: "Quantity updated" });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/inventory"] }), 300);
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

  return {
    user, toast, isAdmin,
    activeCategory, setActiveCategory,
    search, setSearch,
    isCreateDialogOpen, setIsCreateDialogOpen,
    isEditDialogOpen, setIsEditDialogOpen,
    isDeleteDialogOpen, setIsDeleteDialogOpen,
    isQuantityDialogOpen, setIsQuantityDialogOpen,
    isQrDialogOpen, setIsQrDialogOpen,
    isScanFindOpen, setIsScanFindOpen,
    isScanReceiveOpen, setIsScanReceiveOpen,
    isScanCreateBarcodeOpen, setIsScanCreateBarcodeOpen,
    isScanEditBarcodeOpen, setIsScanEditBarcodeOpen,
    isAiDialogOpen, setIsAiDialogOpen,
    selectedItem, setSelectedItem,
    quantityChange, setQuantityChange,
    receiveItem, setReceiveItem,
    highlightedId, setHighlightedId,
    aiReorderData, setAiReorderData,
    aiSummary, setAiSummary,
    isAiLoading, setIsAiLoading,
    qrCodeDataUrl, setQrCodeDataUrl,
    rowRefs,
    inventoryItems, isLoading, filteredItems,
    createMutation, updateMutation, deleteMutation,
    quantityMutation, containerMutation, statusMutation,
    createForm, editForm,
    watchCreateCategory, watchCreateTracking, watchEditTracking,
    handleCreateSubmit, handleEditSubmit, handleEdit,
    handleShowQr, handlePrintLabel,
    handleScanFind, handleScanReceive,
    handleLoadAiInsights, isLowStock, openCreate,
  };
}

export type InventoryContext = ReturnType<typeof useInventory>;
