import {
  Check,
  Pause,
  X,
  Plus,
  Search,
  QrCode,
  MapPin,
  Package,
  Camera,
  StickyNote,
  CircleHelp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toDisplayUrl } from "@/lib/imageUtils";
import { openResourceUrl, useImagePreview } from "@/components/ImagePreviewProvider";
import { canSeeInventoryCost } from "@/lib/inventoryAccess";
import type { Task, Quote, InventoryItem } from "@shared/schema";

export interface TechnicianDialogsProps {
  task: Task;
  isStartReminderOpen: boolean;
  setIsStartReminderOpen: (v: boolean) => void;
  handleStartReminderConfirm: () => void;
  startTimerMutation: any;
  isPauseDialogOpen: boolean;
  pauseDialogMode: "running" | "paused";
  setIsPauseDialogOpen: (v: boolean) => void;
  handlePauseConfirm: () => void;
  handleMarkComplete: () => void;
  stopTimerMutation: any;
  estimateBlocksCompletion: boolean;
  completionNoteValue: string;
  completionNoteError: boolean;
  notesReady: boolean;
  photoReady: boolean;
  handleNoteChange: (value: string) => void;
  isEstimateSheetOpen: boolean;
  setIsEstimateSheetOpen: (v: boolean) => void;
  quotes: Quote[];
  setIsAddQuoteDialogOpen: (v: boolean) => void;
  isPartModalOpen: boolean;
  setIsPartModalOpen: (v: boolean) => void;
  inventorySearchQuery: string;
  setInventorySearchQuery: (v: string) => void;
  selectedInventoryItemId: string;
  setSelectedInventoryItemId: (v: string) => void;
  inventoryItems: InventoryItem[];
  partQuantity: string;
  setPartQuantity: (v: string) => void;
  partNotes: string;
  setPartNotes: (v: string) => void;
  addPartMutation: any;
  setIsScanPartOpen: (v: boolean) => void;
  isResourcesOpen: boolean;
  setIsResourcesOpen: (v: boolean) => void;
  allTaskResources: any[];
  userRole?: string;
  isLeaveConfirmDialogOpen: boolean;
  cancelLeave: () => void;
  confirmLeave: () => void;
  handlePauseAndLeave: () => void;
}

export function TechnicianDialogs({
  task,
  isStartReminderOpen,
  setIsStartReminderOpen,
  handleStartReminderConfirm,
  startTimerMutation,
  isPauseDialogOpen,
  pauseDialogMode,
  setIsPauseDialogOpen,
  handlePauseConfirm,
  handleMarkComplete,
  stopTimerMutation,
  estimateBlocksCompletion,
  completionNoteValue,
  completionNoteError,
  notesReady,
  photoReady,
  handleNoteChange,
  isEstimateSheetOpen,
  setIsEstimateSheetOpen,
  quotes,
  setIsAddQuoteDialogOpen,
  isPartModalOpen,
  setIsPartModalOpen,
  inventorySearchQuery,
  setInventorySearchQuery,
  selectedInventoryItemId,
  setSelectedInventoryItemId,
  inventoryItems,
  partQuantity,
  setPartQuantity,
  partNotes,
  setPartNotes,
  addPartMutation,
  setIsScanPartOpen,
  isResourcesOpen,
  setIsResourcesOpen,
  allTaskResources,
  userRole,
  isLeaveConfirmDialogOpen,
  cancelLeave,
  confirmLeave,
  handlePauseAndLeave,
}: TechnicianDialogsProps) {
  const { openImagePreview } = useImagePreview();
  const showCost = canSeeInventoryCost(userRole);
  const isTimerRunning = pauseDialogMode === "running";
  const isPending = stopTimerMutation.isPending;
  const isStartPending = startTimerMutation.isPending;

  return (
    <>
      {isLeaveConfirmDialogOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
          onClick={() => !isPending && cancelLeave()}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="dialog-leave-running-timer"
          >
            <p className="text-sm font-semibold mb-1 text-foreground">
              Timer is still running
            </p>
            <p className="text-xs mb-4 text-muted-foreground">
              The app is working. You can&apos;t go back to the main page while the timer is on.
              Pause this task to leave, or stay and keep working.
            </p>
            <div className="space-y-2">
              <button
                className="w-full py-3 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 bg-gray-600 dark:bg-gray-500"
                onClick={handlePauseAndLeave}
                disabled={isPending}
                data-testid="button-pause-and-leave"
              >
                <Pause className="w-4 h-4" />
                {isPending ? "Pausing..." : "Pause & leave"}
              </button>
              <button
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center bg-muted border border-border text-foreground"
                onClick={cancelLeave}
                disabled={isPending}
                data-testid="button-stay-on-task"
              >
                Stay on task
              </button>
              <button
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center text-destructive"
                onClick={confirmLeave}
                disabled={isPending}
                data-testid="button-leave-anyway"
              >
                Leave anyway (timer keeps running)
              </button>
            </div>
          </div>
        </div>
      )}

      {isStartReminderOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => !isStartPending && setIsStartReminderOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="dialog-start-reminder"
          >
            <p className="text-sm font-semibold mb-1 text-foreground">
              Don&apos;t forget
            </p>
            <p className="text-xs mb-4 text-muted-foreground">
              Before you finish this task, please:
            </p>
            <ul className="space-y-3 mb-5">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <StickyNote className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Add work notes</p>
                  <p className="text-xs text-muted-foreground">
                    Write what you did so others have a clear record.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Camera className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Upload a photo</p>
                  <p className="text-xs text-muted-foreground">
                    Use the camera button to attach at least one picture.
                  </p>
                </div>
              </li>
            </ul>
            <div className="space-y-2">
              <button
                className="w-full py-3 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 bg-primary"
                onClick={handleStartReminderConfirm}
                disabled={isStartPending}
                data-testid="button-start-reminder-confirm"
              >
                {isStartPending ? "Starting..." : "Got it — Start task"}
              </button>
              <button
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center bg-muted border border-border text-muted-foreground"
                onClick={() => setIsStartReminderOpen(false)}
                disabled={isStartPending}
                data-testid="button-start-reminder-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isPauseDialogOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => !isPending && setIsPauseDialogOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="dialog-pause-complete"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {isTimerRunning ? "Timer running" : "Finish this task?"}
                </p>
                {isTimerRunning && (
                  <p className="text-xs mt-0.5 text-muted-foreground">
                    Pause now, or complete with a work note.
                  </p>
                )}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 flex items-center justify-center rounded-full border border-border text-muted-foreground hover-elevate"
                    style={{ width: 28, height: 28 }}
                    aria-label="How to finish this task"
                    data-testid="button-complete-help"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CircleHelp className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="space-y-2" data-testid="popover-complete-help">
                  <p className="text-sm font-medium text-foreground">Work note required</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Write a short sentence about what you found and what you did.
                    Example: &ldquo;Replaced the belt and tested the unit.&rdquo;
                    &ldquo;Done&rdquo; or &ldquo;ok&rdquo; is not enough.
                  </p>
                  {task.instructions && (
                    <div
                      className="pt-2 border-t border-border"
                      data-testid="dialog-complete-instructions"
                    >
                      <p className="text-[11px] uppercase font-medium mb-1 text-muted-foreground tracking-wide">
                        Task instructions
                      </p>
                      <p className="text-xs whitespace-pre-wrap text-foreground leading-relaxed">
                        {task.instructions}
                      </p>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="mb-4">
              <label
                htmlFor="completion-work-note"
                className="text-xs font-medium text-foreground"
              >
                Work notes <span className="text-destructive">*</span>
              </label>
              <textarea
                id="completion-work-note"
                value={completionNoteValue}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="What did you do?"
                rows={3}
                className={`w-full resize-none rounded-lg px-3 py-2 mt-1.5 text-sm bg-background text-foreground outline-none ${
                  completionNoteError
                    ? "border-2 border-destructive"
                    : "border border-border"
                }`}
                data-testid="textarea-completion-note"
              />
              {completionNoteError && (
                <p className="text-xs text-destructive mt-1" data-testid="text-completion-note-error">
                  Add a work note before marking this task complete.
                </p>
              )}
            </div>
            <div className="space-y-2">
              {isTimerRunning && (
                <button
                  className="w-full py-3 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 bg-gray-600 dark:bg-gray-500"
                  onClick={handlePauseConfirm}
                  disabled={isPending}
                  data-testid="button-pause-confirm"
                >
                  <Pause className="w-4 h-4" />
                  Pause — resume later
                </button>
              )}
              <button
                className={`w-full py-3 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 ${estimateBlocksCompletion || !notesReady || !photoReady ? "bg-muted-foreground opacity-70" : "bg-green-700 dark:bg-green-600"}`}
                onClick={handleMarkComplete}
                disabled={isPending || !!estimateBlocksCompletion || !notesReady || !photoReady}
                data-testid="button-mark-complete"
              >
                <Check className="w-4 h-4" />
                {isPending ? "Completing..." : "Mark as complete"}
              </button>
              {estimateBlocksCompletion && (
                <p className="text-xs text-center mt-1 text-amber-600 dark:text-amber-400" data-testid="text-estimate-block-reason">
                  Estimate must be approved before completing
                </p>
              )}
              {!estimateBlocksCompletion && !photoReady && (
                <p className="text-xs text-center mt-1 text-muted-foreground" data-testid="text-photo-required-hint">
                  Add a photo before marking this task complete.
                </p>
              )}
              {!estimateBlocksCompletion && photoReady && !notesReady && (
                <p className="text-xs text-center mt-1 text-muted-foreground" data-testid="text-note-required-hint">
                  {completionNoteValue.trim()
                    ? "Add a bit more detail so the note is a real explanation."
                    : "Write a work note above to enable Mark as complete."}
                </p>
              )}
              <button
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center bg-muted border border-border text-muted-foreground"
                onClick={() => setIsPauseDialogOpen(false)}
                disabled={isPending}
                data-testid="button-pause-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isEstimateSheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsEstimateSheetOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-estimate"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Estimates
              </p>
              <button onClick={() => setIsEstimateSheetOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            {quotes.length > 0 && (
              <div className="space-y-2 mb-4">
                {quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                    data-testid={`estimate-row-${quote.id}`}
                  >
                    {quote.vendorName && (
                      <p className="text-xs text-muted-foreground">
                        {quote.vendorName}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-foreground">
                      ${(quote.estimatedCost || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {quote.status === "approved" ? "Approved" : "Pending approval"}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {task.estimateStatus !== "approved" && (
              <button
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border-2 border-dashed border-amber-600 text-amber-600 dark:text-amber-400 dark:border-amber-400 bg-transparent"
                onClick={() => {
                  setIsEstimateSheetOpen(false);
                  setIsAddQuoteDialogOpen(true);
                }}
                data-testid="button-add-another-quote"
              >
                <Plus className="w-4 h-4" />
                Add another quote
              </button>
            )}
          </div>
        </div>
      )}

      {isPartModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsPartModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-add-part"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Add Part
              </p>
              <button onClick={() => setIsPartModalOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  />
                  <Input
                    placeholder="Search inventory..."
                    value={inventorySearchQuery}
                    onChange={(e) => {
                      setInventorySearchQuery(e.target.value);
                      setSelectedInventoryItemId("");
                    }}
                    className="pl-9"
                    data-testid="input-search-part"
                  />
                </div>
                <button
                  className="flex items-center justify-center shrink-0 border border-border rounded-lg"
                  style={{ width: 40, height: 40 }}
                  onClick={() => {
                    setIsPartModalOpen(false);
                    setIsScanPartOpen(true);
                  }}
                  data-testid="button-scan-part-qr"
                >
                  <QrCode className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {inventorySearchQuery && !selectedInventoryItemId && (
                <div className="border border-border rounded-md max-h-40 overflow-y-auto">
                  {inventoryItems?.map((item) => {
                      const qty = Number(item.quantity) || 0;
                      const isOut = item.stockStatus === "out" || (item.trackingMode === "counted" && qty <= 0);
                      const isLow = item.stockStatus === "low" || (item.trackingMode === "counted" && item.minQuantity && qty <= Number(item.minQuantity) && qty > 0);
                      return (
                        <div
                          key={item.id}
                          className={`px-3 py-2 cursor-pointer text-sm border-b border-border/50 hover-elevate ${isOut ? "opacity-50" : "text-foreground"}`}
                          onClick={() => {
                            setSelectedInventoryItemId(item.id);
                            setInventorySearchQuery(item.name);
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{item.name}</span>
                            <Badge variant={isOut ? "destructive" : isLow ? "outline" : "secondary"} className="text-[10px] shrink-0">
                              {isOut ? "Out" : isLow ? "Low" : "Stocked"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.location || "No location set"}
                            </span>
                            {item.trackingMode === "counted" && (
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {qty} {item.unit || "pcs"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {selectedInventoryItemId && (() => {
                const selectedItem = inventoryItems.find((i) => i.id === selectedInventoryItemId);
                const qty = Number(selectedItem?.quantity) || 0;
                const isOut = selectedItem?.stockStatus === "out" || (selectedItem?.trackingMode === "counted" && qty <= 0);
                const isLow = selectedItem?.stockStatus === "low" || (selectedItem?.trackingMode === "counted" && selectedItem?.minQuantity && qty <= Number(selectedItem.minQuantity) && qty > 0);
                return (
                  <div className="p-2 rounded-md text-sm bg-muted text-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{selectedItem?.name}</span>
                      <Badge variant={isOut ? "destructive" : isLow ? "outline" : "secondary"} className="text-[10px] shrink-0">
                        {isOut ? "Out" : isLow ? "Low" : "Stocked"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {selectedItem?.location || "No location set"}
                      </span>
                      {selectedItem?.trackingMode === "counted" && (
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {qty} {selectedItem?.unit || "pcs"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className={showCost ? "grid grid-cols-2 gap-3" : ""}>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    QTY
                  </Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(e.target.value)}
                    placeholder="1"
                    data-testid="input-part-qty"
                  />
                </div>
                {showCost && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      COST
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        selectedInventoryItemId
                          ? (
                              (parseFloat(
                                inventoryItems.find((i) => i.id === selectedInventoryItemId)
                                  ?.cost || "0"
                              ) || 0) * (parseFloat(partQuantity) || 1)
                            ).toFixed(2)
                          : ""
                      }
                      readOnly
                      placeholder="0.00"
                      data-testid="input-part-cost"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 py-3 rounded-lg text-white text-sm font-medium bg-primary"
                  onClick={async () => {
                    try {
                      await addPartMutation.mutateAsync();
                      setIsPartModalOpen(false);
                    } catch {
                    }
                  }}
                  disabled={
                    !selectedInventoryItemId ||
                    !partQuantity ||
                    addPartMutation.isPending
                  }
                  data-testid="button-confirm-add-part"
                >
                  Add Part
                </button>
                <button
                  className="px-6 py-3 rounded-lg text-sm font-medium bg-muted border border-border text-muted-foreground"
                  onClick={() => {
                    setIsPartModalOpen(false);
                    setSelectedInventoryItemId("");
                    setInventorySearchQuery("");
                    setPartQuantity("");
                    setPartNotes("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isResourcesOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsResourcesOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[70vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-resources"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Resources
              </p>
              <button onClick={() => setIsResourcesOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-1">
              {[...allTaskResources]
                .sort((a, b) => a.title?.localeCompare(b.title || "") || 0)
                .map((resource: any) => {
                  const isVideo = resource.type === "video";
                  return (
                    <button
                      key={resource.id}
                      className="flex items-center gap-3 w-full py-3 text-left border-b border-border"
                      onClick={() => openResourceUrl(openImagePreview, resource.url, { title: resource.title, type: resource.type })}
                      data-testid={`resource-row-${resource.id}`}
                    >
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold uppercase shrink-0 ${isVideo ? "bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400" : "bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400"}`}
                      >
                        {isVideo ? "VID" : "PDF"}
                      </span>
                      <span className="text-sm flex-1 truncate text-foreground">
                        {resource.title}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
