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
  AlertTriangle,
  DollarSign,
  Plus,
  X,
  Paperclip,
  ScanLine,
  Search,
  Package,
  Car,
  Sparkles,
  BookOpen,
  History,
  ExternalLink,
  FileText,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { ObjectUploader } from "@/components/ObjectUploader";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import { UploadLabelDialog } from "@/components/UploadLabelDialog";
import { toDisplayUrl } from "@/lib/imageUtils";
import {
  statusColors,
  EQUIPMENT_CATEGORY_ICONS,
  EQUIPMENT_CATEGORY_LABELS,
  RESOURCE_TYPE_ICONS,
  CONDITION_COLORS,
} from "./constants";
import { taskStatusLabels as statusLabels } from "@/lib/constants";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminDialogs({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, user, navigate, toast,
    vendors, inventoryItems, users,
    allEquipment, allVehicles,
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
    isAddVendorDialogOpen, setIsAddVendorDialogOpen,
    newVendorName, setNewVendorName,
    newVendorEmail, setNewVendorEmail,
    newVendorPhone, setNewVendorPhone,
    newVendorAddress, setNewVendorAddress,
    newVendorNotes, setNewVendorNotes,
    createVendorMutation,
    isAddPartDialogOpen, setIsAddPartDialogOpen,
    inventorySearchQuery, setInventorySearchQuery,
    selectedInventoryItemId, setSelectedInventoryItemId,
    partQuantity, setPartQuantity, partNotes, setPartNotes,
    handleAiSuggestParts, aiSuggestedParts, setAiSuggestedParts,
    isAiSuggestLoading,
    isScanPartOpen, setIsScanPartOpen,
    addPartMutation, handleScanPart,
    isQuickAddInventoryOpen, setIsQuickAddInventoryOpen,
    quickInventoryName, setQuickInventoryName,
    quickInventoryQuantity, setQuickInventoryQuantity,
    quickInventoryUnit, setQuickInventoryUnit,
    quickAddInventoryMutation,
    isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen,
    cancelLeave, confirmLeave,
    isScanEquipmentOpen, setIsScanEquipmentOpen,
    handleEquipmentScan,
    isEquipmentInfoOpen, setIsEquipmentInfoOpen,
    scannedEquipment, scannedEquipmentTasks, scannedEquipmentResources,
    equipmentInfoTab, setEquipmentInfoTab,
    isVehicleInfoOpen, setIsVehicleInfoOpen,
    scannedVehicle,
    isAddSubTaskDialogOpen, setIsAddSubTaskDialogOpen,
    subTaskSearchQuery, setSubTaskSearchQuery,
    subTaskSearchType, setSubTaskSearchType,
    addSubTaskMutation,
    summaryTaskId, setSummaryTaskId,
    pendingUploadForLabel, isUploadLabelSaving,
    handleUploadLabelSave, handleUploadLabelCancel,
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

      <Dialog open={isQuickAddInventoryOpen} onOpenChange={setIsQuickAddInventoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Item</DialogTitle>
            <DialogDescription>Quickly add a new inventory item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input
                value={quickInventoryName}
                onChange={(e) => setQuickInventoryName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quickInventoryQuantity}
                onChange={(e) => setQuickInventoryQuantity(parseInt(e.target.value) || 0)}
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit (Optional)</Label>
              <Input
                value={quickInventoryUnit}
                onChange={(e) => setQuickInventoryUnit(e.target.value)}
                placeholder="e.g., pieces, boxes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsQuickAddInventoryOpen(false); setQuickInventoryName(""); setQuickInventoryQuantity(0); setQuickInventoryUnit(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => quickAddInventoryMutation.mutate()}
              disabled={!quickInventoryName || quickInventoryQuantity <= 0 || quickAddInventoryMutation.isPending}
            >
              Create Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isLeaveConfirmDialogOpen} onOpenChange={setIsLeaveConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Timer Still Running
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have an active timer running for this task. If you leave now, the timer will continue running in the background. 
              Would you like to stop the timer first, or leave anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel onClick={cancelLeave}>
              Stay on Page
            </AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsLeaveConfirmDialogOpen(false);
                setIsStopTimerDialogOpen(true);
              }}
            >
              Stop Timer First
            </Button>
            <AlertDialogAction onClick={confirmLeave} className="bg-destructive text-destructive-foreground">
              Leave Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAddVendorDialogOpen} onOpenChange={setIsAddVendorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>Create a new vendor to associate with this estimate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vendor Name *</Label>
              <Input
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                placeholder="e.g., ABC Plumbing, Home Depot"
                data-testid="input-new-vendor-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={newVendorEmail}
                onChange={(e) => setNewVendorEmail(e.target.value)}
                placeholder="vendor@example.com"
                data-testid="input-new-vendor-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone (Optional)</Label>
              <Input
                value={newVendorPhone}
                onChange={(e) => setNewVendorPhone(e.target.value)}
                placeholder="(555) 123-4567"
                data-testid="input-new-vendor-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Address (Optional)</Label>
              <Input
                value={newVendorAddress}
                onChange={(e) => setNewVendorAddress(e.target.value)}
                placeholder="123 Main St, City, State"
                data-testid="input-new-vendor-address"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={newVendorNotes}
                onChange={(e) => setNewVendorNotes(e.target.value)}
                placeholder="Any additional details about this vendor..."
                data-testid="input-new-vendor-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddVendorDialogOpen(false);
              setNewVendorName("");
              setNewVendorEmail("");
              setNewVendorPhone("");
              setNewVendorAddress("");
              setNewVendorNotes("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => createVendorMutation.mutate({
                name: newVendorName,
                email: newVendorEmail || undefined,
                phone: newVendorPhone || undefined,
                address: newVendorAddress || undefined,
                notes: newVendorNotes || undefined,
              })}
              disabled={!newVendorName.trim() || createVendorMutation.isPending}
              data-testid="button-submit-new-vendor"
            >
              {createVendorMutation.isPending ? "Creating..." : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={isScanEquipmentOpen}
        onOpenChange={setIsScanEquipmentOpen}
        onScan={handleEquipmentScan}
        title="Scan Equipment"
        description="Scan an equipment QR code to view info, work history, and manuals"
      />

      <Dialog open={isEquipmentInfoOpen} onOpenChange={setIsEquipmentInfoOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-hidden flex flex-col p-0">
          {scannedEquipment && (() => {
            const CatIcon = EQUIPMENT_CATEGORY_ICONS[scannedEquipment.category] || Info;
            const catLabel = EQUIPMENT_CATEGORY_LABELS[scannedEquipment.category] || scannedEquipment.category;
            const condColor = CONDITION_COLORS[(scannedEquipment.condition || "").toLowerCase()] || "bg-muted text-muted-foreground border-transparent";
            return (
              <>
                <div className="flex items-start gap-3 p-4 border-b">
                  <div className="p-2 rounded-md bg-primary/10">
                    <CatIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-base leading-tight" data-testid="text-scanned-equipment-name">{scannedEquipment.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{catLabel}</Badge>
                      {scannedEquipment.condition && (
                        <Badge className={`text-xs border ${condColor}`} variant="outline">{scannedEquipment.condition}</Badge>
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setIsEquipmentInfoOpen(false)} data-testid="button-close-equipment-info">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex border-b bg-muted/30">
                  {(["info", "history", "resources"] as const).map(tab => {
                    const counts: Record<string, number> = {
                      info: 0,
                      history: scannedEquipmentTasks.length,
                      resources: scannedEquipmentResources.length,
                    };
                    const labels: Record<string, string> = { info: "Info", history: "Work History", resources: "Resources" };
                    return (
                      <button
                        key={tab}
                        onClick={() => setEquipmentInfoTab(tab)}
                        className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${equipmentInfoTab === tab ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"}`}
                        data-testid={`tab-equipment-${tab}`}
                      >
                        {labels[tab]}
                        {counts[tab] > 0 && (
                          <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5">{counts[tab]}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {equipmentInfoTab === "info" && (
                    <div className="space-y-4">
                      {(scannedEquipment as any).manufacturerImageUrl && (
                        <img
                          src={toDisplayUrl((scannedEquipment as any).manufacturerImageUrl)}
                          alt="Manufacturer"
                          className="w-full max-h-48 object-contain rounded-md border"
                          data-testid="img-manufacturer"
                        />
                      )}
                      {scannedEquipment.description && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                          <p className="text-sm">{scannedEquipment.description}</p>
                        </div>
                      )}
                      {scannedEquipment.serialNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Serial Number:</span>
                          <span className="font-mono font-medium">{scannedEquipment.serialNumber}</span>
                        </div>
                      )}
                      {scannedEquipment.notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                          <p className="text-sm text-muted-foreground">{scannedEquipment.notes}</p>
                        </div>
                      )}
                      {!scannedEquipment.description && !scannedEquipment.serialNumber && !scannedEquipment.notes && !(scannedEquipment as any).manufacturerImageUrl && (
                        <p className="text-sm text-muted-foreground text-center py-4">No additional details available</p>
                      )}
                    </div>
                  )}

                  {equipmentInfoTab === "history" && (
                    <div className="space-y-2">
                      {scannedEquipmentTasks.length === 0 ? (
                        <div className="text-center py-8">
                          <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No work history for this equipment</p>
                        </div>
                      ) : (
                        [...scannedEquipmentTasks]
                          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                          .map(t => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-md border hover-elevate cursor-pointer"
                              onClick={() => { setIsEquipmentInfoOpen(false); navigate(`/tasks/${t.id}`); }}
                              data-testid={`history-task-${t.id}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{t.name}</p>
                                <p className="text-xs text-muted-foreground">{t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : "Unknown date"}</p>
                              </div>
                              <Badge className={`text-xs shrink-0 ${statusColors[t.status] || ""}`} variant="outline">
                                {statusLabels[t.status] || t.status}
                              </Badge>
                            </div>
                          ))
                      )}
                    </div>
                  )}

                  {equipmentInfoTab === "resources" && (
                    <div className="space-y-2">
                      {scannedEquipmentResources.length === 0 ? (
                        <div className="text-center py-8">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No manuals or resources linked to this equipment</p>
                          <p className="text-xs text-muted-foreground mt-1">Admins can link resources in the Resource Library</p>
                        </div>
                      ) : (
                        scannedEquipmentResources.map((r: any) => {
                          const RIcon = RESOURCE_TYPE_ICONS[r.type] || FileText;
                          return (
                            <button
                              key={r.id}
                              className="w-full flex items-start gap-3 p-3 rounded-md border hover-elevate active-elevate-2 text-left"
                              onClick={() => window.open(toDisplayUrl(r.url), "_blank")}
                              data-testid={`resource-item-${r.id}`}
                            >
                              <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                                <RIcon className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{r.title}</p>
                                {r.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{r.description}</p>}
                                <p className="text-xs text-primary mt-0.5 capitalize">{r.type}</p>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={isVehicleInfoOpen} onOpenChange={setIsVehicleInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vehicle Info</DialogTitle>
            <DialogDescription>Scanned vehicle details</DialogDescription>
          </DialogHeader>
          {scannedVehicle && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{scannedVehicle.make} {scannedVehicle.model} {scannedVehicle.year}</p>
                  <p className="text-sm text-muted-foreground">{scannedVehicle.vehicleId}</p>
                </div>
              </div>
              {scannedVehicle.vin && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">VIN</p>
                  <p className="text-sm font-mono">{scannedVehicle.vin}</p>
                </div>
              )}
              {scannedVehicle.licensePlate && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">License Plate</p>
                  <p className="text-sm">{scannedVehicle.licensePlate}</p>
                </div>
              )}
              {scannedVehicle.currentMileage && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Mileage</p>
                  <p className="text-sm">{scannedVehicle.currentMileage.toLocaleString()} mi</p>
                </div>
              )}
              <Button
                className="w-full"
                onClick={() => {
                  addSubTaskMutation.mutate({
                    vehicleId: scannedVehicle.id,
                    name: `${task.name} - ${scannedVehicle.make} ${scannedVehicle.model} ${scannedVehicle.year}`,
                  });
                }}
                disabled={addSubTaskMutation.isPending}
                data-testid="button-add-vehicle-subtask"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add as Sub-Task
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddSubTaskDialogOpen} onOpenChange={setIsAddSubTaskDialogOpen}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Sub-Task</DialogTitle>
            <DialogDescription>Search for equipment or vehicles to create a sub-task.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant={subTaskSearchType === "equipment" ? "default" : "outline"}
              size="sm"
              onClick={() => setSubTaskSearchType("equipment")}
              data-testid="button-search-equipment"
            >
              <Package className="w-4 h-4 mr-1" />
              Equipment
            </Button>
            <Button
              variant={subTaskSearchType === "vehicle" ? "default" : "outline"}
              size="sm"
              onClick={() => setSubTaskSearchType("vehicle")}
              data-testid="button-search-vehicles"
            >
              <Car className="w-4 h-4 mr-1" />
              Vehicles
            </Button>
          </div>
          <Input
            placeholder={subTaskSearchType === "equipment" ? "Search equipment..." : "Search vehicles..."}
            value={subTaskSearchQuery}
            onChange={(e) => setSubTaskSearchQuery(e.target.value)}
            data-testid="input-subtask-search"
          />
          <div className="flex-1 overflow-y-auto space-y-2 mt-2 max-h-[40vh]">
            {subTaskSearchType === "equipment" ? (
              (allEquipment || [])
                .filter((eq: any) => {
                  if (!subTaskSearchQuery.trim()) return true;
                  const q = subTaskSearchQuery.toLowerCase();
                  return eq.name?.toLowerCase().includes(q) || eq.category?.toLowerCase().includes(q);
                })
                .map((eq: any) => (
                  <div
                    key={eq.id}
                    className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover-elevate"
                    onClick={() => {
                      addSubTaskMutation.mutate({
                        equipmentId: eq.id,
                        name: `${task.name} - ${eq.name}`,
                      });
                    }}
                    data-testid={`subtask-equipment-${eq.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{eq.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{eq.category}</p>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))
            ) : (
              (allVehicles || [])
                .filter((v: any) => {
                  if (!subTaskSearchQuery.trim()) return true;
                  const q = subTaskSearchQuery.toLowerCase();
                  return v.vehicleId?.toLowerCase().includes(q) || v.make?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q);
                })
                .map((v: any) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover-elevate"
                    onClick={() => {
                      addSubTaskMutation.mutate({
                        vehicleId: v.id,
                        name: `${task.name} - ${v.make} ${v.model} ${v.year}`,
                      });
                    }}
                    data-testid={`subtask-vehicle-${v.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{v.make} {v.model} {v.year}</p>
                        <p className="text-xs text-muted-foreground">{v.vehicleId}</p>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CompletedTaskSummary
        taskId={summaryTaskId || ""}
        open={!!summaryTaskId}
        onOpenChange={(open) => { if (!open) setSummaryTaskId(null); }}
      />

      <UploadLabelDialog
        open={!!pendingUploadForLabel}
        fileName={pendingUploadForLabel?.fileName || ""}
        fileType={pendingUploadForLabel?.fileType || ""}
        filePreviewUrl={pendingUploadForLabel?.previewUrl}
        saving={isUploadLabelSaving}
        onSave={handleUploadLabelSave}
        onCancel={handleUploadLabelCancel}
      />
    </>
  );
}
