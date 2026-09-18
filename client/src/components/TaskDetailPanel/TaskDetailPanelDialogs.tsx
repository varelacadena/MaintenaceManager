import { Button } from "@/components/ui/button";
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
import { ManualTimeLogFields } from "@/components/ManualTimeLogFields";
import { durationFromHoursAndMinutes } from "@/lib/timeEntryUtils";
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
            <DialogDescription>Enter hours and minutes spent on this task.</DialogDescription>
          </DialogHeader>
          <ManualTimeLogFields
            hours={ctx.logTimeHours}
            minutes={ctx.logTimeMinutes}
            date={ctx.logTimeDate}
            onHoursChange={ctx.setLogTimeHours}
            onMinutesChange={ctx.setLogTimeMinutes}
            onDateChange={ctx.setLogTimeDate}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => ctx.setIsLogTimeDialogOpen(false)}
              data-testid="button-cancel-time"
            >
              Cancel
            </Button>
            <Button
              onClick={() => ctx.logTimeMutation.mutate(durationFromHoursAndMinutes(ctx.logTimeHours, ctx.logTimeMinutes))}
              disabled={durationFromHoursAndMinutes(ctx.logTimeHours, ctx.logTimeMinutes) <= 0 || ctx.logTimeMutation.isPending}
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
