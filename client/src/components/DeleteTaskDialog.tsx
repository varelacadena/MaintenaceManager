import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { taskDeleteWarning, taskOffersSeriesDelete, type TaskDeleteScope } from "@/utils/taskUtils";

type DeleteTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: {
    taskType?: string | null;
    recurringFrequency?: string | null;
    status?: string | null;
  } | null;
  pending?: boolean;
  onConfirm: (scope: TaskDeleteScope) => void;
  confirmTestId?: string;
  seriesTestId?: string;
  cancelTestId?: string;
};

export function DeleteTaskDialog({
  open,
  onOpenChange,
  task,
  pending = false,
  onConfirm,
  confirmTestId = "button-confirm-delete",
  seriesTestId = "button-delete-open-copies",
  cancelTestId = "button-cancel-delete",
}: DeleteTaskDialogProps) {
  const offerSeries = taskOffersSeriesDelete(task);
  const warning = task
    ? taskDeleteWarning(task)
    : "This permanently removes the task.";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="dialog-delete-task">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this task?</AlertDialogTitle>
          <AlertDialogDescription>{warning}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <AlertDialogAction
            onClick={() => onConfirm("one")}
            disabled={pending}
            data-testid={confirmTestId}
            style={{ backgroundColor: "#D94F4F", color: "#FFFFFF" }}
          >
            {pending ? "Deleting..." : "Delete this task"}
          </AlertDialogAction>
          {offerSeries && (
            <AlertDialogAction
              onClick={() => onConfirm("series")}
              disabled={pending}
              data-testid={seriesTestId}
              className="border border-[#D94F4F] bg-background text-[#D94F4F] hover:bg-[#FEF2F2]"
            >
              Delete this and open copies
            </AlertDialogAction>
          )}
          <AlertDialogCancel data-testid={cancelTestId} disabled={pending}>
            Cancel
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
