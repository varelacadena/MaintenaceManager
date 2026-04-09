import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Trash2,
  MapPin,
  Camera,
  ScanLine,
  StickyNote,
  X,
  Send,
  Plus,
  Search,
  MessageSquare,
  Package,
  History,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "../ObjectUploader";
import { BarcodeScanner } from "../BarcodeScanner";
import { toDisplayUrl } from "@/lib/imageUtils";
import { format } from "date-fns";
import type { MobileTaskDetailProps } from "./types";

interface MobileTaskDialogsProps {
  ctx: MobileTaskDetailProps;
}

export function MobileTaskDialogs({ ctx }: MobileTaskDialogsProps) {
  const {
    task, user, isAdmin, toast,
    allUsers, timeEntries, taskMessages, taskParts, inventoryItems,
    deleteDialogOpen, setDeleteDialogOpen,
    isNoteSheetOpen, setIsNoteSheetOpen,
    noteText, setNoteText,
    isScannerOpen, setIsScannerOpen,
    previewUpload, setPreviewUpload,
    isMessagesSheetOpen, setIsMessagesSheetOpen,
    newMessageText, setNewMessageText,
    isPartsSheetOpen, setIsPartsSheetOpen,
    isHistorySheetOpen, setIsHistorySheetOpen,
    messagesEndRef,
    isAddPartFormOpen, setIsAddPartFormOpen,
    newPartQuantity, setNewPartQuantity,
    newPartNotes, setNewPartNotes,
    inventorySearchQuery, setInventorySearchQuery,
    selectedInventoryItemId, setSelectedInventoryItemId,
    sendMessageMutation, addPartMutation,
    updateStatusMutation,
    deleteTaskMutation, deleteUploadMutation, addUploadMutation, addNoteMutation,
    getUploadParameters, handleAutoSaveUpload, handleEquipmentScan,
    id, isCompleted, allSubtasksDone,
  } = ctx;

  if (!task) return null;

  return (
    <>
      {!isCompleted && (
        <div
          className="fixed bottom-0 left-0 right-0 flex items-center gap-2 px-4 py-3"
          style={{ backgroundColor: "#FFFFFF", borderTop: "1px solid #EEEEEE", zIndex: 50 }}
          data-testid="mobile-bottom-bar"
        >
          <div className="flex items-center gap-2">
            <ObjectUploader
              maxNumberOfFiles={5}
              maxFileSize={10485760}
              onGetUploadParameters={getUploadParameters}
              onComplete={handleAutoSaveUpload}
              onError={(error) => {
                toast({ title: "Upload failed", description: error.message, variant: "destructive" });
              }}
              buttonVariant="outline"
              buttonClassName=""
              buttonTestId="button-mobile-photos"
              isLoading={addUploadMutation.isPending}
            >
              <Camera className="w-4 h-4" />
            </ObjectUploader>
            <Button
              variant="outline"
              size="icon"
              style={{ borderColor: "#EEEEEE", color: "#6B7280" }}
              onClick={() => setIsScannerOpen(true)}
              data-testid="button-mobile-scan"
              aria-label="Scan"
            >
              <ScanLine className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              style={{ borderColor: "#EEEEEE", color: "#6B7280" }}
              onClick={() => setIsNoteSheetOpen(true)}
              data-testid="button-mobile-note"
              aria-label="Note"
            >
              <StickyNote className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1">
            {task.status === "not_started" || task.status === "needs_estimate" || task.status === "waiting_approval" ? (
              <Button
                className="w-full"
                style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                onClick={() => updateStatusMutation.mutate("in_progress")}
                disabled={updateStatusMutation.isPending}
                data-testid="button-mobile-start-task"
              >
                Start Task
              </Button>
            ) : task.status === "in_progress" ? (
              <Button
                className="w-full"
                style={{
                  backgroundColor: allSubtasksDone ? "#4338CA" : "#9CA3AF",
                  color: "#FFFFFF",
                }}
                onClick={() => updateStatusMutation.mutate("completed")}
                disabled={!allSubtasksDone || updateStatusMutation.isPending}
                data-testid="button-mobile-mark-complete"
              >
                Mark Complete
              </Button>
            ) : task.status === "on_hold" ? (
              <Button
                className="w-full"
                style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                onClick={() => updateStatusMutation.mutate("in_progress")}
                disabled={updateStatusMutation.isPending}
                data-testid="button-mobile-resume"
              >
                Resume Task
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskMutation.mutate()}
              style={{ backgroundColor: "#D94F4F", color: "#FFFFFF" }}
              data-testid="button-confirm-mobile-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isNoteSheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsNoteSheetOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-add-note"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">Add Note</p>
              <button onClick={() => setIsNoteSheetOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type your note..."
              rows={4}
              className="mb-3"
              data-testid="input-mobile-note"
            />
            <div className="flex gap-2">
              <Button
                className="flex-1"
                style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                onClick={() => noteText.trim() && addNoteMutation.mutate(noteText.trim())}
                disabled={!noteText.trim() || addNoteMutation.isPending}
                data-testid="button-submit-note"
              >
                Save Note
              </Button>
              <Button
                variant="outline"
                onClick={() => { setIsNoteSheetOpen(false); setNoteText(""); }}
              >
                Cancel
              </Button>
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
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            {previewUpload.fileType?.startsWith("image/") ? (
              <img
                src={toDisplayUrl(previewUpload.objectUrl)}
                alt={previewUpload.fileName}
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-card rounded-lg">
                <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-sm text-foreground">{previewUpload.fileName}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <BarcodeScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleEquipmentScan}
        title="Scan Equipment"
        description="Scan a QR code or barcode"
      />

      {isMessagesSheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setIsMessagesSheetOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-card rounded-t-2xl flex flex-col"
            style={{ height: "80vh", maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-messages"
          >
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" style={{ color: "#6B7280" }} />
                <p className="text-sm font-semibold text-foreground">Messages</p>
                {taskMessages.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}>
                    {taskMessages.length}
                  </span>
                )}
              </div>
              <button onClick={() => setIsMessagesSheetOpen(false)} data-testid="button-close-messages">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {taskMessages.length === 0 ? (
                <p className="text-xs text-center py-8" style={{ color: "#9CA3AF" }}>No messages yet</p>
              ) : (
                taskMessages.map((msg) => {
                  const sender = allUsers?.find(u => u.id === msg.senderId);
                  const isOwnMessage = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
                      data-testid={`message-item-${msg.id}`}
                    >
                      <p className="text-xs font-medium mb-0.5" style={{ color: "#6B7280" }}>
                        {sender ? `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || sender.username : "Unknown"}
                      </p>
                      <div
                        className="rounded-xl px-3 py-2 max-w-[80%]"
                        style={{
                          backgroundColor: isOwnMessage ? "#4338CA" : "#F3F4F6",
                          color: isOwnMessage ? "#FFFFFF" : "#1A1A1A",
                        }}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                        {msg.createdAt ? format(new Date(msg.createdAt), "MMM d, h:mm a") : ""}
                      </p>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="shrink-0 px-4 py-3 flex gap-2" style={{ borderTop: "1px solid #EEEEEE" }}>
              <Input
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && newMessageText.trim()) {
                    e.preventDefault();
                    sendMessageMutation.mutate(newMessageText.trim());
                  }
                }}
                data-testid="input-mobile-message"
              />
              <Button
                size="icon"
                style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                onClick={() => newMessageText.trim() && sendMessageMutation.mutate(newMessageText.trim())}
                disabled={!newMessageText.trim() || sendMessageMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {isPartsSheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setIsPartsSheetOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-card rounded-t-2xl flex flex-col"
            style={{ maxHeight: "70vh" }}
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-parts"
          >
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: "#6B7280" }} />
                <p className="text-sm font-semibold text-foreground">Parts Used</p>
                {taskParts.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}>
                    {taskParts.length}
                  </span>
                )}
              </div>
              <button onClick={() => setIsPartsSheetOpen(false)} data-testid="button-close-parts">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {taskParts.length === 0 && !isAddPartFormOpen ? (
                <p className="text-xs text-center py-8" style={{ color: "#9CA3AF" }}>No parts used yet</p>
              ) : (
                <div className="space-y-2">
                  {taskParts.map((part) => (
                    <div
                      key={part.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}
                      data-testid={`part-item-${part.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#1A1A1A" }}>{part.partName}</p>
                        {part.notes && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: "#6B7280" }}>{part.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-xs font-medium" style={{ color: "#6B7280" }}>
                          x{part.quantity}
                        </span>
                        {part.cost !== null && part.cost !== undefined && Number(part.cost) > 0 && (
                          <span className="text-xs font-medium" style={{ color: "#15803D" }}>
                            ${Number(part.cost).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isAddPartFormOpen ? (
                <div className="mt-2 p-3 rounded-lg space-y-2" style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search inventory..."
                      value={inventorySearchQuery}
                      onChange={(e) => {
                        setInventorySearchQuery(e.target.value);
                        setSelectedInventoryItemId("");
                      }}
                      className="pl-9"
                      data-testid="input-mobile-search-part"
                    />
                  </div>
                  {inventorySearchQuery && !selectedInventoryItemId && (() => {
                    const filtered = inventoryItems.filter((item) =>
                      item.name.toLowerCase().includes(inventorySearchQuery.toLowerCase())
                    );
                    return (
                      <div className="border border-border rounded-md max-h-40 overflow-y-auto">
                        {filtered.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground" data-testid="text-mobile-no-inventory-match">
                            No matching inventory items
                          </div>
                        ) : (
                          filtered.map((item) => {
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
                                data-testid={`mobile-inventory-item-${item.id}`}
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
                          })
                        )}
                      </div>
                    );
                  })()}
                  {selectedInventoryItemId && (() => {
                    const selectedItem = inventoryItems.find((i) => i.id === selectedInventoryItemId);
                    const qty = Number(selectedItem?.quantity) || 0;
                    const isOut = selectedItem?.stockStatus === "out" || (selectedItem?.trackingMode === "counted" && qty <= 0);
                    const isLow = selectedItem?.stockStatus === "low" || (selectedItem?.trackingMode === "counted" && selectedItem?.minQuantity && qty <= Number(selectedItem.minQuantity) && qty > 0);
                    return (
                      <div className="p-2 rounded-md text-sm bg-muted text-foreground" data-testid="text-mobile-selected-item">
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
                  <div className="flex gap-2">
                    <Input
                      value={newPartQuantity}
                      onChange={(e) => setNewPartQuantity(e.target.value)}
                      placeholder="Qty"
                      type="number"
                      min="1"
                      className="w-20"
                      data-testid="input-mobile-part-quantity"
                    />
                    <Input
                      value={
                        selectedInventoryItemId
                          ? (
                              (parseFloat(
                                inventoryItems.find((i) => i.id === selectedInventoryItemId)?.cost || "0"
                              ) || 0) * (parseFloat(newPartQuantity) || 1)
                            ).toFixed(2)
                          : ""
                      }
                      readOnly
                      placeholder="Cost ($)"
                      type="number"
                      className="w-24"
                      data-testid="input-mobile-part-cost"
                    />
                  </div>
                  <Input
                    value={newPartNotes}
                    onChange={(e) => setNewPartNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    data-testid="input-mobile-part-notes"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddPartFormOpen(false);
                        setNewPartQuantity("1");
                        setInventorySearchQuery("");
                        setSelectedInventoryItemId("");
                        setNewPartNotes("");
                      }}
                      data-testid="button-mobile-cancel-part"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
                      disabled={!selectedInventoryItemId || addPartMutation.isPending}
                      onClick={() => {
                        const selectedItem = inventoryItems.find((i) => i.id === selectedInventoryItemId);
                        if (!selectedItem) return;
                        const cost = (parseFloat(selectedItem.cost || "0") || 0) * (parseFloat(newPartQuantity) || 1);
                        addPartMutation.mutate({
                          taskId: id!,
                          partName: selectedItem.name,
                          quantity: newPartQuantity || "1",
                          cost,
                          notes: newPartNotes.trim() || undefined,
                          inventoryItemId: selectedInventoryItemId,
                        });
                      }}
                      data-testid="button-mobile-save-part"
                    >
                      {addPartMutation.isPending ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </div>
              ) : (
                isAdmin && (
                  <button
                    className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 rounded-lg text-xs font-medium transition-colors"
                    style={{ border: "1px dashed #D1D5DB", color: "#6B7280" }}
                    onClick={() => setIsAddPartFormOpen(true)}
                    data-testid="button-mobile-add-part"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Part
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {isHistorySheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setIsHistorySheetOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-card rounded-t-2xl flex flex-col"
            style={{ maxHeight: "70vh" }}
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-history"
          >
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" style={{ color: "#6B7280" }} />
                <p className="text-sm font-semibold text-foreground">Time History</p>
              </div>
              <button onClick={() => setIsHistorySheetOpen(false)} data-testid="button-close-history">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {(!timeEntries || timeEntries.length === 0) ? (
                <p className="text-xs text-center py-8" style={{ color: "#9CA3AF" }}>No time entries yet</p>
              ) : (
                <div className="space-y-2">
                  {timeEntries.map((entry: any) => {
                    const entryUser = allUsers?.find(u => u.id === entry.userId);
                    const isRunning = entry.startTime && !entry.endTime;
                    const duration = entry.durationMinutes
                      ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m`
                      : isRunning ? "Running" : "—";
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{ backgroundColor: "#F9FAFB", border: "1px solid #EEEEEE" }}
                        data-testid={`history-entry-${entry.id}`}
                      >
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                            {entryUser ? `${entryUser.firstName || ""} ${entryUser.lastName || ""}`.trim() || entryUser.username : "Unknown"}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                            {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : "No start time"}
                          </p>
                        </div>
                        <span
                          className="text-xs font-medium px-2 py-1 rounded"
                          style={{
                            backgroundColor: isRunning ? "#EEF2FF" : "#F3F4F6",
                            color: isRunning ? "#4338CA" : "#6B7280",
                          }}
                        >
                          {duration}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
