import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { canOperateInventory } from "@/lib/inventoryAccess";
import { isLowStock, type InventorySortKey } from "@/lib/inventoryUtils";
import type { InventoryItem, InsertInventoryItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { INVENTORY_PAGE_SIZE } from "@/lib/inventoryCsv";
import { clampPageIndex } from "@/lib/fleetUtils";
import { inventoryFormSchema, type InventoryFormValues } from "./inventoryFormSchema";
import { useInventoryQueries, downloadInventoryExportCsv } from "./useInventoryQueries";
import { useInventoryMutations } from "./useInventoryMutations";
import { useInventoryScanHelpers } from "./useInventoryScan";
import { CATEGORY_TRACKING_DEFAULTS } from "./inventoryConstants";

export {
  CATEGORIES,
  TRACKING_MODES,
  CATEGORY_TRACKING_DEFAULTS,
  STATUS_CYCLE,
  STATUS_CONFIG,
  formatQty,
} from "./inventoryConstants";

export { inventoryFormSchema };

export function useInventory() {
  const urlSearch = useSearch();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const canOperate = canOperateInventory(user);

  const [activeCategory, setActiveCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");
  const [sortKey, setSortKey] = useState<InventorySortKey>("name-asc");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(0);
  const [statusAnnouncement, setStatusAnnouncement] = useState("");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [isScanFindOpen, setIsScanFindOpen] = useState(false);
  const [isScanReceiveOpen, setIsScanReceiveOpen] = useState(false);
  const [isScanCreateBarcodeOpen, setIsScanCreateBarcodeOpen] = useState(false);
  const [isScanEditBarcodeOpen, setIsScanEditBarcodeOpen] = useState(false);
  const [isScanCreatePromptOpen, setIsScanCreatePromptOpen] = useState(false);
  const [pendingScanBarcode, setPendingScanBarcode] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantityChange, setQuantityChange] = useState("");
  const [receiveItem, setReceiveItem] = useState<InventoryItem | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const itemDeepLinkHandled = useRef(false);

  const urlInitialized = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(urlSearch);
    const low = params.get("lowStock");
    if (low === "1" || low === "true") {
      setStockFilter("low");
    }
    if (!urlInitialized.current) {
      const cat = params.get("category");
      if (cat) setActiveCategory(cat);
      const q = params.get("q");
      if (q) setSearch(q);
      urlInitialized.current = true;
    }
  }, [urlSearch]);

  useEffect(() => {
    const params = new URLSearchParams(urlSearch);
    const itemId = params.get("item");
    if (!itemId || itemDeepLinkHandled.current) return;
    itemDeepLinkHandled.current = true;

    fetch(`/api/inventory/${encodeURIComponent(itemId)}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((item: InventoryItem | null) => {
        if (!item) return;
        setActiveCategory("all");
        setStockFilter("all");
        setSearch(item.name);
        setPage(0);
        setDetailItem(item);
        setIsDetailOpen(true);
        setHighlightedId(item.id);
        setTimeout(() => {
          rowRefs.current[item.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
        setTimeout(() => setHighlightedId(null), 3000);
      })
      .catch(() => {
        itemDeepLinkHandled.current = false;
      });
  }, [urlSearch]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (stockFilter === "low") params.set("lowStock", "1");
    if (activeCategory !== "all") params.set("category", activeCategory);
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    const next = params.toString();
    const current = urlSearch.replace(/^\?/, "");
    if (next !== current) {
      setLocation(`/inventory${next ? `?${next}` : ""}`, { replace: true });
    }
  }, [stockFilter, activeCategory, debouncedSearch, urlSearch, setLocation]);

  useEffect(() => {
    setPage(0);
  }, [activeCategory, stockFilter, debouncedSearch, sortKey]);

  const queryFilters = {
    activeCategory,
    stockFilter,
    sortKey,
    search: debouncedSearch,
    page,
  };

  const { listQuery, summaryQuery } = useInventoryQueries(queryFilters, debouncedSearch);

  const listData = listQuery.data;
  const paginatedItems = listData?.items ?? [];
  const filteredTotal = listData?.total ?? 0;
  const pageIndex = clampPageIndex(page, filteredTotal, INVENTORY_PAGE_SIZE);

  const categoryCounts = summaryQuery.data?.categoryCounts ?? { all: 0 };
  const lowStockCount = summaryQuery.data?.lowStockCount ?? 0;
  const inventoryTotal = summaryQuery.data?.total ?? 0;

  const createForm = useForm<InventoryFormValues>({
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

  const editForm = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
  });

  const watchCreateCategory = createForm.watch("category");
  const watchCreateTracking = createForm.watch("trackingMode");
  const watchEditTracking = editForm.watch("trackingMode");

  const mutations = useInventoryMutations({
    toast,
    createForm,
    setIsCreateDialogOpen,
    setIsEditDialogOpen,
    setIsDeleteDialogOpen,
    setIsQuantityDialogOpen,
    setSelectedItem,
    setQuantityChange,
    setReceiveItem,
  });

  const scan = useInventoryScanHelpers({
    toast,
    canOperate,
    pendingScanBarcode,
    createForm,
    setActiveCategory,
    setStockFilter,
    setSearch,
    setPage,
    setHighlightedId,
    rowRefs,
    setPendingScanBarcode,
    setIsScanCreatePromptOpen,
    setIsCreateDialogOpen,
    setReceiveItem,
    setSelectedItem,
    setQuantityChange,
    setIsQuantityDialogOpen,
  });

  const openDetail = useCallback((item: InventoryItem) => {
    setDetailItem(item);
    setIsDetailOpen(true);
  }, []);

  const handleCreateSubmit = (data: InventoryFormValues) => {
    mutations.createMutation.mutate({
      ...data,
      quantity: String(data.quantity ?? 0),
      minQuantity: String(data.minQuantity ?? 0),
      cost: data.cost ? String(data.cost) : null,
      barcode: data.barcode?.trim() || null,
      packageInfo: data.packageInfo?.trim() || null,
    } as InsertInventoryItem);
  };

  const handleEditSubmit = (data: InventoryFormValues) => {
    if (!selectedItem) return;
    mutations.updateMutation.mutate({
      id: selectedItem.id,
      data: {
        ...data,
        quantity: String(data.quantity ?? 0),
        minQuantity: String(data.minQuantity ?? 0),
        cost: data.cost ? String(data.cost) : null,
        barcode: data.barcode?.trim() || null,
        packageInfo: data.packageInfo?.trim() || null,
      },
    });
  };

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    editForm.reset({
      name: item.name,
      description: item.description || "",
      quantity: parseFloat(String(item.quantity)) || 0,
      unit: item.unit || "",
      location: item.location || "",
      minQuantity: parseFloat(String(item.minQuantity)) || 0,
      cost: item.cost || "",
      trackingMode: (item.trackingMode as "counted" | "container" | "status") || "counted",
      category: (item.category ?? "general") as InventoryFormValues["category"],
      packageInfo: item.packageInfo || "",
      barcode: item.barcode || "",
      stockStatus: (item.stockStatus as "stocked" | "low" | "out") || "stocked",
    });
    setIsEditDialogOpen(true);
  };

  const handleShowQr = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsQrDialogOpen(true);
  };

  const announceStatusChange = (label: string) => {
    setStatusAnnouncement(`${label} status updated`);
  };

  const exportFilteredCsv = useCallback(async () => {
    await downloadInventoryExportCsv({
      activeCategory,
      stockFilter,
      sortKey,
      search: debouncedSearch,
    });
  }, [activeCategory, stockFilter, sortKey, debouncedSearch]);

  const openCreate = (cat?: string) => {
    const category = cat && cat !== "all" ? cat : "general";
    createForm.reset({
      name: "",
      description: "",
      quantity: 0,
      unit: "",
      location: "",
      minQuantity: 0,
      cost: "",
      trackingMode: (CATEGORY_TRACKING_DEFAULTS[category] || "counted") as
        | "counted"
        | "container"
        | "status",
      category: category as InventoryFormValues["category"],
      packageInfo: "",
      barcode: "",
      stockStatus: "stocked",
    });
    setIsCreateDialogOpen(true);
  };

  return {
    user,
    toast,
    isAdmin,
    canOperate,
    activeCategory,
    setActiveCategory,
    stockFilter,
    setStockFilter,
    sortKey,
    setSortKey,
    search,
    setSearch,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isQuantityDialogOpen,
    setIsQuantityDialogOpen,
    isQrDialogOpen,
    setIsQrDialogOpen,
    isScanFindOpen,
    setIsScanFindOpen,
    isScanReceiveOpen,
    setIsScanReceiveOpen,
    isScanCreateBarcodeOpen,
    setIsScanCreateBarcodeOpen,
    isScanEditBarcodeOpen,
    setIsScanEditBarcodeOpen,
    isScanCreatePromptOpen,
    setIsScanCreatePromptOpen,
    pendingScanBarcode,
    confirmScanCreate: scan.confirmScanCreate,
    selectedItem,
    setSelectedItem,
    quantityChange,
    setQuantityChange,
    receiveItem,
    setReceiveItem,
    highlightedId,
    setHighlightedId,
    rowRefs,
    statusAnnouncement,
    announceStatusChange,
    inventoryItems: paginatedItems,
    inventoryTotal,
    isLoading: listQuery.isLoading || summaryQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
    filteredItems: paginatedItems,
    filteredTotal,
    paginatedItems,
    page,
    setPage,
    pageIndex,
    categoryCounts,
    lowStockCount,
    detailItem,
    setDetailItem,
    isDetailOpen,
    setIsDetailOpen,
    isImportOpen,
    setIsImportOpen,
    openDetail,
    exportFilteredCsv,
    ...mutations,
    createForm,
    editForm,
    watchCreateCategory,
    watchCreateTracking,
    watchEditTracking,
    handleCreateSubmit,
    handleEditSubmit,
    handleEdit,
    handleShowQr,
    handleScanFind: scan.handleScanFind,
    handleScanReceive: scan.handleScanReceive,
    isLowStock,
    openCreate,
    INVENTORY_PAGE_SIZE,
  };
}

export type InventoryContext = ReturnType<typeof useInventory>;
