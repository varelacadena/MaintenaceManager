import { useCallback } from "react";
import type { InventoryItem } from "@shared/schema";
import { resolveInventoryItemFromScan } from "@/lib/inventoryLinks";
type ToastFn = (opts: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

export function useInventoryScanHelpers({
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
}: {
  toast: ToastFn;
  canOperate: boolean;
  pendingScanBarcode: string;
  createForm: { reset: (v: Record<string, unknown>) => void; getValues: () => Record<string, unknown> };
  setActiveCategory: (v: string) => void;
  setStockFilter: (v: "all" | "low") => void;
  setSearch: (v: string) => void;
  setPage: (v: number) => void;
  setHighlightedId: (v: string | null) => void;
  rowRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  setPendingScanBarcode: (v: string) => void;
  setIsScanCreatePromptOpen: (v: boolean) => void;
  setIsCreateDialogOpen: (v: boolean) => void;
  setReceiveItem: (v: InventoryItem | null) => void;
  setSelectedItem: (v: InventoryItem | null) => void;
  setQuantityChange: (v: string) => void;
  setIsQuantityDialogOpen: (v: boolean) => void;
}) {
  const lookupScannedCode = useCallback(
    async (code: string): Promise<InventoryItem | null> => {
      try {
        return await resolveInventoryItemFromScan<InventoryItem>(code);
      } catch {
        return null;
      }
    },
    [],
  );

  const handleScanFind = useCallback(
    async (barcode: string) => {
      const item = await lookupScannedCode(barcode);
      if (item) {
        setActiveCategory("all");
        setStockFilter("all");
        setSearch(item.name);
        setPage(0);
        setHighlightedId(item.id);
        setTimeout(() => {
          rowRefs.current[item.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
        setTimeout(() => setHighlightedId(null), 3000);
        toast({ title: "Item found", description: item.name });
      } else if (canOperate) {
        setPendingScanBarcode(barcode);
        setIsScanCreatePromptOpen(true);
      } else {
        toast({
          title: "Item not found",
          description: `No item matches "${barcode}".`,
          variant: "destructive",
        });
      }
    },
    [
      lookupScannedCode,
      canOperate,
      setActiveCategory,
      setStockFilter,
      setSearch,
      setPage,
      setHighlightedId,
      rowRefs,
      setPendingScanBarcode,
      setIsScanCreatePromptOpen,
      toast,
    ],
  );

  const confirmScanCreate = useCallback(() => {
    createForm.reset({
      ...createForm.getValues(),
      barcode: pendingScanBarcode,
      name: "",
    });
    setPendingScanBarcode("");
    setIsScanCreatePromptOpen(false);
    setIsCreateDialogOpen(true);
  }, [
    createForm,
    pendingScanBarcode,
    setPendingScanBarcode,
    setIsScanCreatePromptOpen,
    setIsCreateDialogOpen,
  ]);

  const handleScanReceive = useCallback(
    async (barcode: string) => {
      const item = await lookupScannedCode(barcode);
      if (item) {
        setReceiveItem(item);
        setSelectedItem(item);
        setQuantityChange("");
        setIsQuantityDialogOpen(true);
      } else {
        toast({
          title: "Item not found",
          description: "No item has this barcode.",
          variant: "destructive",
        });
      }
    },
    [
      lookupScannedCode,
      setReceiveItem,
      setSelectedItem,
      setQuantityChange,
      setIsQuantityDialogOpen,
      toast,
    ],
  );

  return {
    lookupScannedCode,
    handleScanFind,
    handleScanReceive,
    confirmScanCreate,
  };
}
