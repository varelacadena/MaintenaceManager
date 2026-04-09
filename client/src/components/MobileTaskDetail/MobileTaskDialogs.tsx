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
  Trash2,
  Camera,
  ScanLine,
  StickyNote,
  X,
  FileText,
  History,
} from "lucide-react";
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
    task, toast,
    allUsers, timeEntries,
    deleteDialogOpen, setDeleteDialogOpen,
    isNoteSheetOpen, setIsNoteSheetOpen,
    noteText, setNoteText,
    isScannerOpen, setIsScannerOpen,
    previewUpload, setPreviewUpload,
    isHistorySheetOpen, setIsHistorySheetOpen,
    updateStatusMutation,
    deleteTaskMutation, deleteUploadMutation, addUploadMutation, addNoteMutation,
    getUploadParameters, handleAutoSaveUpload, handleEquipmentScan,
    isCompleted, allSubtasksDone,
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
