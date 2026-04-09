import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarcodeScanner } from "../BarcodeScanner";
import { UploadLabelDialog } from "@/components/UploadLabelDialog";
import type { TaskDetailPanelContext } from "./useTaskDetailPanel";

interface TaskDetailPanelDialogsProps {
  ctx: TaskDetailPanelContext;
}

export function TaskDetailPanelDialogs({ ctx }: TaskDetailPanelDialogsProps) {
  return (
    <>
      <AlertDialog open={ctx.deleteDialogOpen} onOpenChange={ctx.setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-task">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task and all its subtasks will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => ctx.deleteTaskMutation.mutate()}
              disabled={ctx.deleteTaskMutation.isPending}
              data-testid="button-confirm-delete"
              style={{ backgroundColor: "#D94F4F", color: "#FFFFFF" }}
            >
              {ctx.deleteTaskMutation.isPending ? "Deleting..." : "Delete task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={ctx.isAddNoteDialogOpen} onOpenChange={ctx.setIsAddNoteDialogOpen}>
        <DialogContent data-testid="dialog-add-note">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add a note to this task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={ctx.newNoteType} onValueChange={ctx.setNewNoteType}>
              <SelectTrigger data-testid="select-note-type">
                <SelectValue placeholder="Note type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="job_note">Job Note</SelectItem>
                <SelectItem value="recommendation">Recommendation</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Write your note..."
              value={ctx.newNoteContent}
              onChange={(e) => ctx.setNewNoteContent(e.target.value)}
              rows={4}
              data-testid="input-note-content"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => ctx.setIsAddNoteDialogOpen(false)}
              data-testid="button-cancel-note"
            >
              Cancel
            </Button>
            <Button
              onClick={() => ctx.addNoteMutation.mutate({ content: ctx.newNoteContent, noteType: ctx.newNoteType })}
              disabled={!ctx.newNoteContent.trim() || ctx.addNoteMutation.isPending}
              data-testid="button-save-note"
            >
              {ctx.addNoteMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ctx.isLogTimeDialogOpen} onOpenChange={ctx.setIsLogTimeDialogOpen}>
        <DialogContent data-testid="dialog-log-time">
          <DialogHeader>
            <DialogTitle>Log Time</DialogTitle>
            <DialogDescription>Record time spent on this task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" style={{ color: "#1A1A1A" }}>Duration (minutes)</label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 30"
                value={ctx.logTimeDuration}
                onChange={(e) => ctx.setLogTimeDuration(e.target.value)}
                data-testid="input-time-duration"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => ctx.setIsLogTimeDialogOpen(false)}
              data-testid="button-cancel-time"
            >
              Cancel
            </Button>
            <Button
              onClick={() => ctx.logTimeMutation.mutate(parseInt(ctx.logTimeDuration, 10))}
              disabled={!ctx.logTimeDuration || parseInt(ctx.logTimeDuration, 10) <= 0 || ctx.logTimeMutation.isPending}
              data-testid="button-save-time"
            >
              {ctx.logTimeMutation.isPending ? "Saving..." : "Log Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={ctx.isScanDialogOpen}
        onOpenChange={ctx.setIsScanDialogOpen}
        onScan={(code: string) => {
          ctx.setIsScanDialogOpen(false);
          ctx.toast({ title: "Scanned", description: `Code: ${code}` });
        }}
        title="Scan Barcode / QR Code"
        description="Scan an equipment or inventory barcode to look it up."
      />

      <UploadLabelDialog
        open={!!ctx.pendingUploadForLabel}
        fileName={ctx.pendingUploadForLabel?.fileName || ""}
        fileType={ctx.pendingUploadForLabel?.fileType || ""}
        filePreviewUrl={ctx.pendingUploadForLabel?.previewUrl}
        saving={ctx.isPanelUploadLabelSaving}
        onSave={ctx.handlePanelUploadLabelSave}
        onCancel={ctx.handlePanelUploadLabelCancel}
      />

      <Dialog open={!!ctx.editingTimeEntryId} onOpenChange={(open) => { if (!open) { ctx.setEditingTimeEntryId(null); ctx.setEditTimeDuration(""); } }}>
        <DialogContent data-testid="dialog-edit-time-entry">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>Update the duration of this time entry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" style={{ color: "#1A1A1A" }}>Duration (minutes)</label>
              <Input
                type="number"
                min="0"
                value={ctx.editTimeDuration}
                onChange={(e) => ctx.setEditTimeDuration(e.target.value)}
                data-testid="input-edit-time-duration"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => { ctx.setEditingTimeEntryId(null); ctx.setEditTimeDuration(""); }}
              data-testid="button-cancel-edit-time"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (ctx.editingTimeEntryId) {
                  ctx.updateTimeEntryMutation.mutate({
                    entryId: ctx.editingTimeEntryId,
                    durationMinutes: parseInt(ctx.editTimeDuration, 10) || 0,
                  });
                }
              }}
              disabled={ctx.updateTimeEntryMutation.isPending}
              data-testid="button-save-edit-time"
            >
              {ctx.updateTimeEntryMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!ctx.deleteTimeEntryId} onOpenChange={(open) => { if (!open) ctx.setDeleteTimeEntryId(null); }}>
        <AlertDialogContent data-testid="dialog-delete-time-entry">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete time entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This time entry will be permanently removed from this task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-time">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (ctx.deleteTimeEntryId) ctx.deleteTimeEntryMutation.mutate(ctx.deleteTimeEntryId); }}
              disabled={ctx.deleteTimeEntryMutation.isPending}
              data-testid="button-confirm-delete-time"
              style={{ backgroundColor: "#D94F4F", color: "#FFFFFF" }}
            >
              {ctx.deleteTimeEntryMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!ctx.deleteNoteId} onOpenChange={(open) => { if (!open) ctx.setDeleteNoteId(null); }}>
        <AlertDialogContent data-testid="dialog-delete-note">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This note will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-note">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (ctx.deleteNoteId) ctx.deleteNoteMutation.mutate(ctx.deleteNoteId); }}
              disabled={ctx.deleteNoteMutation.isPending}
              data-testid="button-confirm-delete-note"
              style={{ backgroundColor: "#D94F4F", color: "#FFFFFF" }}
            >
              {ctx.deleteNoteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
