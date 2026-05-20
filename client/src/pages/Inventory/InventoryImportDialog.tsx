import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  parseInventoryCsv,
  downloadInventoryCsvTemplate,
  inventoryCsvTemplate,
} from "@/lib/inventoryCsv";
import { Download, Upload } from "lucide-react";

interface InventoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryImportDialog({ open, onOpenChange }: InventoryImportDialogProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<import("@shared/schema").InsertInventoryItem[]>([]);

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/inventory/import", { items: parsedItems });
      return res.json() as Promise<{ created: number; errors: { row: number; message: string }[]; total: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      onOpenChange(false);
      setParsedItems([]);
      setPreviewCount(0);
      setParseError(null);
      if (data.errors.length > 0) {
        toast({
          title: `Imported ${data.created} of ${data.total}`,
          description: `${data.errors.length} row(s) failed.`,
          variant: "destructive",
        });
      } else {
        toast({ title: `Imported ${data.created} items` });
      }
    },
    onError: (e: Error) => {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    },
  });

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = parseInventoryCsv(text);
    if (!result.ok) {
      setParseError(result.error);
      setParsedItems([]);
      setPreviewCount(0);
      return;
    }
    setParseError(null);
    setParsedItems(result.items);
    setPreviewCount(result.items.length);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setParseError(null); setPreviewCount(0); setParsedItems([]); } }}>
      <DialogContent data-testid="dialog-import-inventory">
        <DialogHeader>
          <DialogTitle>Import inventory CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: name, category, tracking_mode, quantity, unit, location, and more.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadInventoryCsvTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Choose file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
          <pre className="text-[10px] text-muted-foreground bg-muted p-2 rounded overflow-x-auto max-h-24">
            {inventoryCsvTemplate()}
          </pre>
          {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          {previewCount > 0 && (
            <p className="text-sm text-muted-foreground" data-testid="text-import-preview-count">
              Ready to import <span className="font-medium text-foreground">{previewCount}</span> items (max 500 per file).
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={previewCount === 0 || importMutation.isPending}
            data-testid="button-confirm-import"
          >
            {importMutation.isPending ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
