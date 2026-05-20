import { useCallback } from "react";
import type { InventoryItem } from "@shared/schema";
import { escapeHtml } from "@/lib/inventoryUtils";

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
  const lookupScannedCode = useCallback(async (code: string): Promise<InventoryItem | null> => {
    try {
      const byBarcode = await fetch(`/api/inventory/by-barcode/${encodeURIComponent(code)}`, {
        credentials: "include",
      });
      if (byBarcode.ok) return byBarcode.json();
      const byId = await fetch(`/api/inventory/${encodeURIComponent(code)}`, {
        credentials: "include",
      });
      if (byId.ok) return byId.json();
    } catch {
      /* ignore */
    }
    return null;
  }, []);

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

  const handlePrintLabel = useCallback(
    (selectedItem: InventoryItem | null, qrCodeDataUrl: string) => {
      if (!selectedItem || !qrCodeDataUrl) return false;
      const w = window.open("", "_blank");
      if (!w) {
        toast({
          title: "Popup blocked",
          description: "Allow popups to print labels.",
          variant: "destructive",
        });
        return false;
      }
      const name = escapeHtml(selectedItem.name);
      const category = escapeHtml(selectedItem.category || "general");
      const unit = escapeHtml(selectedItem.unit || "unit");
      const packageInfo = selectedItem.packageInfo
        ? `<p>${escapeHtml(selectedItem.packageInfo)}</p>`
        : "";
      const location = selectedItem.location
        ? `<p>Location: ${escapeHtml(selectedItem.location)}</p>`
        : "";
      const code = escapeHtml(selectedItem.barcode || selectedItem.id);
      w.document.write(`<html><head><title>Label - ${name}</title>
      <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
      .l{border:2px solid #333;padding:16px;border-radius:8px;text-align:center;max-width:280px}
      h2{margin:0 0 4px;font-size:16px}p{margin:2px 0;font-size:12px;color:#555}img{margin:12px 0}</style>
      </head><body><div class="l"><h2>${name}</h2>
      <p>${category} &bull; ${unit}</p>
      ${packageInfo}
      ${location}
      <img src="${qrCodeDataUrl}" width="160" height="160" alt="QR" />
      <p style="font-size:10px;color:#999;">${code}</p>
      </div><script>window.onload=()=>{window.print();window.close();}</script></body></html>`);
      w.document.close();
      return true;
    },
    [toast],
  );

  return {
    lookupScannedCode,
    handleScanFind,
    handleScanReceive,
    handlePrintLabel,
    confirmScanCreate,
  };
}
