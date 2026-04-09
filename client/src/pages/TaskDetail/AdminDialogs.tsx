import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@radix-ui/react-label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { User, Check, Pause, CheckCircle2, DollarSign, Plus, X, Paperclip } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminDialogs({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, toast, vendors,
    isAssignDialogOpen, setIsAssignDialogOpen,
    assignedUser, adminUsers, technicianUsers, staffUsers, studentUsers,
    updateTaskMutation,
    isAddNoteDialogOpen, setIsAddNoteDialogOpen,
    noteType, setNoteType, newNote, setNewNote, addNoteMutation,
    isStopTimerDialogOpen, setIsStopTimerDialogOpen,
    activeTimer, stopTimerMutation, estimateBlocksCompletion,
    isHoldReasonDialogOpen, setIsHoldReasonDialogOpen,
    holdReason, setHoldReason,
    isScanPartOpen, setIsScanPartOpen, handleScanPart,
    isAddQuoteDialogOpen, setIsAddQuoteDialogOpen,
    newQuoteVendorId, setNewQuoteVendorId,
    newQuoteVendorName, setNewQuoteVendorName,
    newQuoteEstimatedCost, setNewQuoteEstimatedCost,
    newQuoteNotes, setNewQuoteNotes,
    pendingQuoteFiles, setPendingQuoteFiles,
    getUploadParameters, createQuoteMutation,
    setIsAddVendorDialogOpen,
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
                <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">{group.label}</p>
                <div className="space-y-1 px-1">
                  {group.users.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover-elevate ${u.id === task.assignedToId ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}
                      onClick={() => { updateTaskMutation.mutate({ assignedToId: u.id }); setIsAssignDialogOpen(false); }}
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
              <Button variant={noteType === "job_note" ? "default" : "outline"} size="sm" onClick={() => setNoteType("job_note")} className="flex-1">Job Note</Button>
              <Button variant={noteType === "recommendation" ? "default" : "outline"} size="sm" onClick={() => setNoteType("recommendation")} className="flex-1">Recommendation</Button>
            </div>
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Enter your note..." rows={4} data-testid="textarea-new-note" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddNoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => addNoteMutation.mutate({ content: newNote, noteType })} disabled={!newNote.trim() || addNoteMutation.isPending} data-testid="button-submit-note">Add Note</Button>
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
            <Button variant="outline" className="w-full justify-start h-12" onClick={() => { setIsStopTimerDialogOpen(false); setIsHoldReasonDialogOpen(true); }}>
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
                if (activeTimer) { stopTimerMutation.mutate({ timerId: activeTimer, newStatus: "completed" }); }
              }}
              disabled={stopTimerMutation.isPending || !!estimateBlocksCompletion}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Task
            </Button>
            <Button variant="ghost" className="w-full h-12" onClick={() => { if (activeTimer) { stopTimerMutation.mutate({ timerId: activeTimer }); } }} disabled={stopTimerMutation.isPending}>
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
            <Textarea placeholder="Enter reason..." value={holdReason} onChange={(e) => setHoldReason(e.target.value)} rows={4} data-testid="textarea-hold-reason" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsHoldReasonDialogOpen(false); setHoldReason(""); }}>Cancel</Button>
            <Button
              onClick={() => { if (activeTimer) { stopTimerMutation.mutate({ timerId: activeTimer, newStatus: "on_hold", onHoldReason: holdReason }); } }}
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
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={newQuoteEstimatedCost} onChange={(e) => setNewQuoteEstimatedCost(e.target.value)} className="pl-8" data-testid="input-quote-cost" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vendor/Source (Optional)</Label>
              <div className="flex gap-2">
                <Select
                  value={newQuoteVendorId}
                  onValueChange={(value) => {
                    if (value === "none") { setNewQuoteVendorId(""); setNewQuoteVendorName(""); }
                    else { setNewQuoteVendorId(value); setNewQuoteVendorName(vendors.find(v => v.id === value)?.name || ""); }
                  }}
                >
                  <SelectTrigger data-testid="select-quote-vendor" className="flex-1">
                    <SelectValue placeholder="Select a vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vendor</SelectItem>
                    {vendors.map((vendor) => (<SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setIsAddVendorDialogOpen(true)} data-testid="button-add-new-vendor">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea placeholder="Details about this estimate..." value={newQuoteNotes} onChange={(e) => setNewQuoteNotes(e.target.value)} data-testid="input-quote-notes" />
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
                      const newFiles = result.successful.map(file => ({ url: file.url, fileName: file.fileName, fileType: file.type, fileSize: file.size }));
                      setPendingQuoteFiles(prev => [...prev, ...newFiles]);
                      toast({ title: "File uploaded", description: `${result.successful.length} file(s) uploaded` });
                    }
                  }}
                  onError={(error) => { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); }}
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
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPendingQuoteFiles(prev => prev.filter((_, i) => i !== index))}>
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
            <Button variant="outline" onClick={() => { setIsAddQuoteDialogOpen(false); setNewQuoteVendorId(""); setNewQuoteVendorName(""); setPendingQuoteFiles([]); }}>Cancel</Button>
            <Button
              onClick={() => createQuoteMutation.mutate({ vendorName: newQuoteVendorName, estimatedCost: parseFloat(newQuoteEstimatedCost) || 0, notes: newQuoteNotes, files: pendingQuoteFiles })}
              disabled={!newQuoteEstimatedCost || createQuoteMutation.isPending}
              data-testid="button-submit-quote"
            >
              Add Estimate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner open={isScanPartOpen} onOpenChange={setIsScanPartOpen} onScan={handleScanPart} title="Scan Inventory Barcode" description="Scan a barcode to find matching inventory" />
    </>
  );
}