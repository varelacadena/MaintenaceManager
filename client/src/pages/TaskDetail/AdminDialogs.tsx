import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@radix-ui/react-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  User,
  Check,
  Pause,
  CheckCircle2,
  DollarSign,
  Plus,
  X,
  Paperclip,
  ScanLine,
  Search,
  Sparkles,
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { statusColors } from "./constants";
import { taskStatusLabels as statusLabels } from "@/lib/constants";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminDialogs({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, toast,
    vendors, inventoryItems,
    isAssignDialogOpen, setIsAssignDialogOpen,
    assignedUser, adminUsers, technicianUsers, staffUsers, studentUsers,
    updateTaskMutation,
    isAddNoteDialogOpen, setIsAddNoteDialogOpen,
    noteType, setNoteType, newNote, setNewNote, addNoteMutation,
    isStopTimerDialogOpen, setIsStopTimerDialogOpen,
    activeTimer, stopTimerMutation, estimateBlocksCompletion,
    isHoldReasonDialogOpen, setIsHoldReasonDialogOpen,
    holdReason, setHoldReason,
    isAddQuoteDialogOpen, setIsAddQuoteDialogOpen,
    newQuoteVendorId, setNewQuoteVendorId,
    newQuoteVendorName, setNewQuoteVendorName,
    newQuoteEstimatedCost, setNewQuoteEstimatedCost,
    newQuoteNotes, setNewQuoteNotes,
    pendingQuoteFiles, setPendingQuoteFiles,
    getUploadParameters, createQuoteMutation,
    setIsAddVendorDialogOpen,
    isAddPartDialogOpen, setIsAddPartDialogOpen,
    inventorySearchQuery, setInventorySearchQuery,
    selectedInventoryItemId, setSelectedInventoryItemId,
    partQuantity, setPartQuantity, partNotes, setPartNotes,
    handleAiSuggestParts, aiSuggestedParts, setAiSuggestedParts,
    isAiSuggestLoading,
    isScanPartOpen, setIsScanPartOpen,
    addPartMutation, handleScanPart,
    setIsQuickAddInventoryOpen,
    setQuickInventoryName,
  } = ctx;

  if (!task) return null;

  return (
    <>
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{assignedUser ? "Reassign Task" : "Assign Task"}</DialogTitle>
            <DialogDescription>Select a team member to assign this task to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-4 max-h-[400px] overflow-y-auto">
            {[
              { label: "Admins", users: adminUsers },
              { label: "Technicians", users: technicianUsers },
              { label: "Staff", users: staffUsers },
              { label: "Students", users: studentUsers },
            ].filter(group => group.users.length > 0).map((group) => (
              <div key={group.label}>
                <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </p>
                <div className="space-y-1 px-1">
                  {group.users.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover-elevate ${
                        u.id === task.assignedToId ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                      }`}
                      onClick={() => {
                        updateTaskMutation.mutate({ assignedToId: u.id });
                        setIsAssignDialogOpen(false);
                      }}
                      data-testid={`assign-user-${u.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                        </div>
                      </div>
                      {u.id === task.assignedToId && <Check className="w-5 h-5 text-primary" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddNoteDialogOpen} onOpenChange={setIsAddNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add a note or recommendation for this task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={noteType === "job_note" ? "default" : "outline"}
                size="sm"
                onClick={() => setNoteType("job_note")}
                className="flex-1"
              >
                Job Note
              </Button>
              <Button
                variant={noteType === "recommendation" ? "default" : "outline"}
                size="sm"
                onClick={() => setNoteType("recommendation")}
                className="flex-1"
              >
                Recommendation
              </Button>
            </div>
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter your note..."
              rows={4}
              data-testid="textarea-new-note"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddNoteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addNoteMutation.mutate({ content: newNote, noteType })}
              disabled={!newNote.trim() || addNoteMutation.isPending}
              data-testid="button-submit-note"
            >
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStopTimerDialogOpen} onOpenChange={setIsStopTimerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
            <DialogDescription>What would you like to do?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start h-12"
              onClick={() => {
                setIsStopTimerDialogOpen(false);
                setIsHoldReasonDialogOpen(true);
              }}
            >
              <Pause className="w-4 h-4 mr-2" />
              Put Task On Hold
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-12"
              onClick={() => {
                if (estimateBlocksCompletion) {
                  toast({ title: "Cannot complete task", description: "Estimates must be approved before completing this task.", variant: "destructive" });
                  return;
                }
                if (activeTimer) {
                  stopTimerMutation.mutate({ timerId: activeTimer, newStatus: "completed" });
                }
              }}
              disabled={stopTimerMutation.isPending || !!estimateBlocksCompletion}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Task
            </Button>
            <Button
              variant="ghost"
              className="w-full h-12"
              onClick={() => {
                if (activeTimer) {
                  stopTimerMutation.mutate({ timerId: activeTimer });
                }
              }}
              disabled={stopTimerMutation.isPending}
            >
              Just Stop Timer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isHoldReasonDialogOpen} onOpenChange={setIsHoldReasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hold Task</DialogTitle>
            <DialogDescription>Please provide a reason for putting this task on hold.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter reason..."
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              rows={4}
              data-testid="textarea-hold-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsHoldReasonDialogOpen(false); setHoldReason(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (activeTimer) {
                  stopTimerMutation.mutate({ timerId: activeTimer, newStatus: "on_hold", onHoldReason: holdReason });
                }
              }}
              disabled={!holdReason.trim() || stopTimerMutation.isPending}
            >
              Hold Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddQuoteDialogOpen} onOpenChange={setIsAddQuoteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Estimate</DialogTitle>
            <DialogDescription>Add a new estimate for comparison. You can add multiple estimates to compare before approving one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Estimated Cost *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
            <div className="space-y-2">
              <Label>Vendor/Source (Optional)</Label>
              <div className="flex gap-2">
                <Select
                  value={newQuoteVendorId}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setNewQuoteVendorId("");
                      setNewQuoteVendorName("");
                    } else {
                      setNewQuoteVendorId(value);
                      const selectedVendor = vendors.find(v => v.id === value);
                      setNewQuoteVendorName(selectedVendor?.name || "");
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-quote-vendor" className="flex-1">
                    <SelectValue placeholder="Select a vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vendor</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsAddVendorDialogOpen(true)}
                  data-testid="button-add-new-vendor"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Details about this estimate..."
                value={newQuoteNotes}
                onChange={(e) => setNewQuoteNotes(e.target.value)}
                data-testid="input-quote-notes"
              />
            </div>
            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={10485760}
                  onGetUploadParameters={getUploadParameters}
                  onComplete={(result: { successful: Array<{url: string, fileName: string, type: string, size: number}>, failed: Array<any> }) => {
                    if (result.successful && result.successful.length > 0) {
                      const newFiles = result.successful.map(file => ({
                        url: file.url,
                        fileName: file.fileName,
                        fileType: file.type,
                        fileSize: file.size,
                      }));
                      setPendingQuoteFiles(prev => [...prev, ...newFiles]);
                      toast({ title: "File uploaded", description: `${result.successful.length} file(s) uploaded` });
                    }
                  }}
                  onError={(error) => {
                    toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                  }}
                  buttonClassName="w-full"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Browse Files
                </ObjectUploader>
                {pendingQuoteFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {pendingQuoteFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                        <span className="truncate flex-1">{file.fileName}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setPendingQuoteFiles(prev => prev.filter((_, i) => i !== index))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddQuoteDialogOpen(false);
              setNewQuoteVendorId("");
              setNewQuoteVendorName("");
              setPendingQuoteFiles([]);
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => createQuoteMutation.mutate({
                vendorName: newQuoteVendorName,
                estimatedCost: parseFloat(newQuoteEstimatedCost) || 0,
                notes: newQuoteNotes,
                files: pendingQuoteFiles,
              })}
              disabled={!newQuoteEstimatedCost || createQuoteMutation.isPending}
              data-testid="button-submit-quote"
            >
              Add Estimate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddPartDialogOpen} onOpenChange={setIsAddPartDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Part</DialogTitle>
            <DialogDescription>Select an inventory item to add to this task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setIsScanPartOpen(true)}
                data-testid="button-scan-part"
              >
                <ScanLine className="h-4 w-4 mr-2" />
                Scan Part
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleAiSuggestParts}
                disabled={isAiSuggestLoading}
                data-testid="button-ai-suggest-parts"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isAiSuggestLoading ? "Thinking..." : "AI Suggest"}
              </Button>
            </div>

            {aiSuggestedParts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Suggestions</p>
                {aiSuggestedParts.map((suggestion, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm" data-testid={`ai-suggestion-${i}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{suggestion.name}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const item = inventoryItems.find((inv) => inv.id === suggestion.id);
                        if (item) {
                          setSelectedInventoryItemId(item.id);
                          setInventorySearchQuery(item.name);
                          setPartQuantity(String(suggestion.suggestedQuantity));
                        }
                      }}
                      data-testid={`button-add-suggestion-${i}`}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Search Inventory</Label>
              <div className="relative">
                <Input
                  placeholder="Type to search..."
                  value={inventorySearchQuery}
                  onChange={(e) => { setInventorySearchQuery(e.target.value); setSelectedInventoryItemId(""); }}
                  data-testid="input-search-inventory"
                />
                {inventorySearchQuery && !selectedInventoryItemId && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div
                      className="px-3 py-2 cursor-pointer hover-elevate font-semibold text-primary border-b"
                      onClick={() => {
                        setIsQuickAddInventoryOpen(true);
                        setQuickInventoryName(inventorySearchQuery);
                        setInventorySearchQuery("");
                      }}
                    >
                      + Create New Item
                    </div>
                    {inventoryItems
                      ?.filter((item) => item.name.toLowerCase().includes(inventorySearchQuery.toLowerCase()))
                      .map((item) => (
                        <div
                          key={item.id}
                          className="px-3 py-2 cursor-pointer hover-elevate"
                          onClick={() => {
                            setSelectedInventoryItemId(item.id);
                            setInventorySearchQuery(item.name);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.name}</span>
                            <div className="text-right">
                              <span className="text-sm text-muted-foreground">
                                {(item.trackingMode === "status")
                                  ? (item.stockStatus || "stocked")
                                  : `${parseFloat(String(item.quantity || "0")).toFixed(2)} ${item.unit || ""}`}
                              </span>
                              {item.packageInfo && (
                                <p className="text-xs text-muted-foreground">{item.packageInfo}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              {selectedInventoryItemId && (
                <div className="bg-muted p-2 rounded space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{inventoryItems.find(i => i.id === selectedInventoryItemId)?.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedInventoryItemId(""); setInventorySearchQuery(""); }}>
                      Change
                    </Button>
                  </div>
                  {(() => {
                    const sel = inventoryItems.find(i => i.id === selectedInventoryItemId);
                    return sel?.packageInfo ? (
                      <p className="text-xs text-muted-foreground">{sel.packageInfo}</p>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Quantity {(() => {
                const sel = inventoryItems.find(i => i.id === selectedInventoryItemId);
                return sel?.unit ? `(${sel.unit})` : "";
              })()}</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={partQuantity}
                onChange={(e) => setPartQuantity(e.target.value)}
                placeholder="e.g. 1, 0.5, 2.5"
                data-testid="input-part-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={partNotes}
                onChange={(e) => setPartNotes(e.target.value)}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddPartDialogOpen(false); setSelectedInventoryItemId(""); setInventorySearchQuery(""); setPartQuantity(""); setPartNotes(""); setAiSuggestedParts([]); }}>
              Cancel
            </Button>
            <Button
              onClick={() => addPartMutation.mutate()}
              disabled={!selectedInventoryItemId || !partQuantity || isNaN(parseFloat(partQuantity)) || addPartMutation.isPending}
              data-testid="button-confirm-add-part"
            >
              {addPartMutation.isPending ? "Adding..." : "Add Part"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
