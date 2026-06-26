import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type DestructiveDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityLabel: string;
  entityType?: string;
  warningDetails?: string[];
  requireConfirmationText?: string;
  onConfirm: () => void;
  isPending?: boolean;
};

export function DestructiveDeleteDialog({
  open,
  onOpenChange,
  entityLabel,
  entityType = "item",
  warningDetails = [],
  requireConfirmationText,
  onConfirm,
  isPending = false,
}: DestructiveDeleteDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) setConfirmationText("");
    onOpenChange(next);
  };

  const confirmationRequired = Boolean(requireConfirmationText?.trim());
  const confirmationMatches =
    !confirmationRequired ||
    confirmationText.trim() === requireConfirmationText?.trim();

  const defaultWarnings = [
    "All linked configuration for this " + entityType + " will be removed from the system.",
    "Work tasks and history will be kept, but links to this " + entityType + " will be detached.",
    "This action is logged and cannot be undone.",
  ];

  const details = warningDetails.length > 0 ? warningDetails : defaultWarnings;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        className="max-w-lg border-destructive/50"
        data-testid="dialog-destructive-delete"
      >
        <AlertDialogHeader>
          <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive mb-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-destructive text-lg">
            Permanently delete {entityLabel}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                This action cannot be undone.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
              {confirmationRequired ? (
                <div className="space-y-2 pt-2">
                  <p>
                    Type <span className="font-mono font-semibold text-foreground">{requireConfirmationText}</span> to confirm.
                  </p>
                  <Input
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder={requireConfirmationText}
                    autoComplete="off"
                    data-testid="input-delete-confirmation"
                  />
                </div>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto mt-0" disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={isPending || !confirmationMatches}
            onClick={() => {
              onConfirm();
              setConfirmationText("");
            }}
            data-testid="button-confirm-destructive-delete"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete permanently"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
