import {
  Check,
  X,
  DollarSign,
  FileText,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@radix-ui/react-label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { toDisplayUrl } from "@/lib/imageUtils";
import { format } from "date-fns";
import type { Task, Upload, User as UserType, Vendor } from "@shared/schema";

export interface TechnicianDialogsExtraProps {
  isAddQuoteDialogOpen: boolean;
  setIsAddQuoteDialogOpen: (v: boolean) => void;
  newQuoteEstimatedCost: string;
  setNewQuoteEstimatedCost: (v: string) => void;
  newQuoteVendorId: string;
  setNewQuoteVendorId: (v: string) => void;
  newQuoteVendorName: string;
  setNewQuoteVendorName: (v: string) => void;
  newQuoteNotes: string;
  setNewQuoteNotes: (v: string) => void;
  vendors: Vendor[];
  createQuoteMutation: any;
  pendingQuoteFiles: any[];
  isPreviousWorkOpen: boolean;
  setIsPreviousWorkOpen: (v: boolean) => void;
  previousWork: Task[];
  users: UserType[];
  safeNavigate: (path: string) => void;
  previewUpload: Upload | null;
  setPreviewUpload: (v: Upload | null) => void;
  deleteUploadMutation: any;
  isScanEquipmentOpen: boolean;
  setIsScanEquipmentOpen: (v: boolean) => void;
  handleEquipmentScan: (value: string) => void;
  isScanPartOpen: boolean;
  setIsScanPartOpen: (v: boolean) => void;
  handleScanPart: (value: string) => void;
  setIsPartModalOpen: (v: boolean) => void;
}

export function TechnicianDialogsExtra({
  isAddQuoteDialogOpen,
  setIsAddQuoteDialogOpen,
  newQuoteEstimatedCost,
  setNewQuoteEstimatedCost,
  newQuoteVendorId,
  setNewQuoteVendorId,
  newQuoteVendorName,
  setNewQuoteVendorName,
  newQuoteNotes,
  setNewQuoteNotes,
  vendors,
  createQuoteMutation,
  pendingQuoteFiles,
  isPreviousWorkOpen,
  setIsPreviousWorkOpen,
  previousWork,
  users,
  safeNavigate,
  previewUpload,
  setPreviewUpload,
  deleteUploadMutation,
  isScanEquipmentOpen,
  setIsScanEquipmentOpen,
  handleEquipmentScan,
  isScanPartOpen,
  setIsScanPartOpen,
  handleScanPart,
  setIsPartModalOpen,
}: TechnicianDialogsExtraProps) {
  return (
    <>
      {isAddQuoteDialogOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsAddQuoteDialogOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-add-estimate"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Add Estimate
              </p>
              <button onClick={() => setIsAddQuoteDialogOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">
                  Estimated Cost
                </Label>
                <div className="relative">
                  <DollarSign
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newQuoteEstimatedCost}
                    onChange={(e) => setNewQuoteEstimatedCost(e.target.value)}
                    className="pl-8"
                    data-testid="input-quote-cost"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">
                  Vendor (Optional)
                </Label>
                <Select
                  value={newQuoteVendorId}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setNewQuoteVendorId("");
                      setNewQuoteVendorName("");
                    } else {
                      setNewQuoteVendorId(value);
                      const v = vendors.find((v) => v.id === value);
                      setNewQuoteVendorName(v?.name || "");
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-quote-vendor">
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vendor</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">
                  Notes (Optional)
                </Label>
                <Textarea
                  placeholder="Details..."
                  value={newQuoteNotes}
                  onChange={(e) => setNewQuoteNotes(e.target.value)}
                  data-testid="input-quote-notes"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 py-3 rounded-lg text-white text-sm font-medium bg-primary"
                  onClick={() =>
                    createQuoteMutation.mutate({
                      vendorName: newQuoteVendorName,
                      estimatedCost: parseFloat(newQuoteEstimatedCost) || 0,
                      notes: newQuoteNotes,
                      files: pendingQuoteFiles,
                    })
                  }
                  disabled={!newQuoteEstimatedCost || createQuoteMutation.isPending}
                  data-testid="button-submit-quote"
                >
                  Add Estimate
                </button>
                <button
                  className="px-6 py-3 rounded-lg text-sm bg-muted border border-border text-muted-foreground"
                  onClick={() => setIsAddQuoteDialogOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPreviousWorkOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsPreviousWorkOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-previous-work"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Previous Work
              </p>
              <button onClick={() => setIsPreviousWorkOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2">
              {previousWork.map((prevTask) => {
                const completedBy = users.find(u => u.id === prevTask.assignedToId);
                return (
                  <button
                    key={prevTask.id}
                    className="w-full text-left p-3 rounded-lg bg-muted/50 border border-border"
                    onClick={() => {
                      setIsPreviousWorkOpen(false);
                      safeNavigate(`/tasks/${prevTask.id}`);
                    }}
                    data-testid={`previous-work-item-${prevTask.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {prevTask.name}
                        </p>
                        {prevTask.description && (
                          <p className="text-xs mt-0.5 line-clamp-2 text-muted-foreground">
                            {prevTask.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {completedBy && (
                            <span className="text-xs flex items-center gap-1 text-muted-foreground">
                              {completedBy.firstName} {completedBy.lastName}
                            </span>
                          )}
                          {prevTask.updatedAt && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(prevTask.updatedAt), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {previewUpload && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          onClick={() => setPreviewUpload(null)}
        >
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-photo-preview"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white truncate flex-1 mr-4">
                {previewUpload.fileName}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center justify-center rounded-full bg-red-600/80 hover:bg-red-600"
                  style={{ width: 32, height: 32 }}
                  onClick={async () => {
                    try {
                      await deleteUploadMutation.mutateAsync(previewUpload.id);
                      setPreviewUpload(null);
                    } catch {}
                  }}
                  data-testid="button-delete-photo"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
                <button
                  className="flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
                  style={{ width: 32, height: 32 }}
                  onClick={() => setPreviewUpload(null)}
                  data-testid="button-close-photo-preview"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            {previewUpload.fileType?.startsWith("image/") ? (
              <img
                src={toDisplayUrl(previewUpload.objectUrl)}
                alt={previewUpload.fileName}
                className="w-full max-h-[70vh] object-contain rounded-lg"
                data-testid="img-photo-preview"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-card rounded-lg">
                <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-sm text-foreground">{previewUpload.fileName}</p>
                <a
                  href={toDisplayUrl(previewUpload.objectUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 underline"
                >
                  Open file
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <BarcodeScanner
        open={isScanEquipmentOpen}
        onOpenChange={setIsScanEquipmentOpen}
        onScan={handleEquipmentScan}
        title="Scan Equipment"
        description="Scan an equipment QR code"
      />
      <BarcodeScanner
        open={isScanPartOpen}
        onOpenChange={(v) => {
          setIsScanPartOpen(v);
          if (!v) setIsPartModalOpen(true);
        }}
        onScan={(value) => {
          handleScanPart(value);
          setIsPartModalOpen(true);
        }}
        title="Scan Part"
        description="Scan a barcode to find this part"
      />
    </>
  );
}
