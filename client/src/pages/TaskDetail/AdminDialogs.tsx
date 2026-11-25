import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { User, Check, Pause, CheckCircle2 } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminDialogs({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, toast,
    isAssignDialogOpen, setIsAssignDialogOpen,
    assignedUser, adminUsers, technicianUsers, staffUsers, studentUsers,
    updateTaskMutation,
    isAddNoteDialogOpen, setIsAddNoteDialogOpen,
    noteType, setNoteType, newNote, setNewNote, addNoteMutation,
    isStopTimerDialogOpen, setIsStopTimerDialogOpen,
    activeTimer, stopTimerMutation,
    isHoldReasonDialogOpen, setIsHoldReasonDialogOpen,
    holdReason, setHoldReason,
    isScanPartOpen, setIsScanPartOpen, handleScanPart,
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
                if (activeTimer) { stopTimerMutation.mutate({ timerId: activeTimer, newStatus: "completed" }); }
              }}
              disabled={stopTimerMutation.isPending}
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

      <BarcodeScanner open={isScanPartOpen} onOpenChange={setIsScanPartOpen} onScan={handleScanPart} title="Scan Inventory Barcode" description="Scan a barcode to find matching inventory" />
    </>
  );
}