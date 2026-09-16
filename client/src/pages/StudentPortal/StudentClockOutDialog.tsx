import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Clock, FileText, Lightbulb, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLiveNow } from "@/hooks/useLiveNow";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  elapsedMilliseconds,
  formatLiveDuration,
  localDateString,
  MAX_RECAP_LENGTH,
  MIN_RECAP_LENGTH,
} from "@shared/studentPortal";
import { studentPortalQueryKeys, useStudentRecaps, useStudentTimeClock } from "./studentPortalApi";

interface StudentClockOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClockedOut?: () => void;
}

export function StudentClockOutDialog({ open, onOpenChange, onClockedOut }: StudentClockOutDialogProps) {
  const { toast } = useToast();
  const clockQuery = useStudentTimeClock(open);
  const recapsQuery = useStudentRecaps(open);
  const openEntry = clockQuery.data?.openEntry;
  const now = useLiveNow(open && Boolean(openEntry?.clockInAt));
  const shiftRecap = (recapsQuery.data ?? []).find((recap) => recap.timeEntryId === openEntry?.id);
  const alreadyRecapped = Boolean(shiftRecap);

  const [step, setStep] = useState<"recap" | "review">("recap");
  const [whatIDid, setWhatIDid] = useState("");
  const [whatILearned, setWhatILearned] = useState("");

  useEffect(() => {
    if (!open) return;
    setWhatIDid(shiftRecap?.whatIDid ?? "");
    setWhatILearned(shiftRecap?.whatILearned ?? "");
    setStep(alreadyRecapped ? "review" : "recap");
  }, [open, alreadyRecapped, shiftRecap?.whatIDid, shiftRecap?.whatILearned]);

  const elapsed = openEntry?.clockInAt
    ? formatLiveDuration(elapsedMilliseconds(openEntry.clockInAt, now))
    : formatLiveDuration(0);

  const recapReady =
    whatIDid.trim().length >= MIN_RECAP_LENGTH && whatILearned.trim().length >= MIN_RECAP_LENGTH;

  const saveRecapMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/student/recaps", {
        whatIDid: whatIDid.trim(),
        whatILearned: whatILearned.trim(),
        recapDate: localDateString(openEntry?.clockInAt ? new Date(openEntry.clockInAt) : undefined),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.recaps });
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.timeClock });
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.adminList });
      setStep("review");
    },
    onError: (error: Error) => {
      toast({ title: "Add a bit more to your recap", description: error.message, variant: "destructive" });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/student/time-clock/clock-out", {
        whatIDid: whatIDid.trim(),
        whatILearned: whatILearned.trim(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.timeClock });
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.adminList });
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.hours });
      toast({ title: "Clocked out", description: "See you next shift." });
      onOpenChange(false);
      onClockedOut?.();
    },
    onError: (error: Error) => {
      toast({ title: "Could not clock out", description: error.message, variant: "destructive" });
    },
  });

  function handleNext() {
    if (!recapReady) {
      toast({
        title: "Fill in both boxes",
        description: "Write a sentence about what you did and what you learned.",
        variant: "destructive",
      });
      return;
    }
    if (alreadyRecapped && whatIDid === (shiftRecap?.whatIDid ?? "") && whatILearned === (shiftRecap?.whatILearned ?? "")) {
      setStep("review");
      return;
    }
    saveRecapMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden" data-testid="dialog-clock-out-flow">
        <DialogHeader className="px-5 pt-5 pb-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {step === "recap" ? "Step 1 of 2" : "Step 2 of 2"}
          </p>
          <DialogTitle className="text-xl">
            {step === "recap" ? "Daily recap" : "Review & clock out"}
          </DialogTitle>
          <DialogDescription>
            {step === "recap"
              ? "Tell us what you did and what you learned, then tap Next."
              : "Check your hours and recap, then clock out."}
          </DialogDescription>
        </DialogHeader>

        {step === "recap" ? (
          <div className="px-5 pb-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clock-out-did" className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                What I did
              </Label>
              <Textarea
                id="clock-out-did"
                value={whatIDid}
                onChange={(event) => setWhatIDid(event.target.value.slice(0, MAX_RECAP_LENGTH))}
                placeholder="e.g. Helped replace a faucet, cleaned filters, and restocked supplies."
                className="min-h-[110px] text-base"
                data-testid="textarea-what-i-did"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clock-out-learned" className="flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" />
                What I learned
              </Label>
              <Textarea
                id="clock-out-learned"
                value={whatILearned}
                onChange={(event) => setWhatILearned(event.target.value.slice(0, MAX_RECAP_LENGTH))}
                placeholder="e.g. Always shut the water off before loosening fittings."
                className="min-h-[110px] text-base"
                data-testid="textarea-what-i-learned"
              />
            </div>
            <Button
              type="button"
              className="w-full h-12 text-base font-semibold"
              onClick={handleNext}
              disabled={saveRecapMutation.isPending}
              data-testid="button-recap-next"
            >
              {saveRecapMutation.isPending ? "Saving…" : "Next"}
            </Button>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hours worked</p>
              <p className="text-3xl font-semibold tabular-nums mt-1" data-testid="text-review-hours">
                {elapsed}
              </p>
              {openEntry?.supervisorName && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  With {openEntry.supervisorName}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border p-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Daily recap</p>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What I did</p>
                <p className="text-sm mt-1 whitespace-pre-wrap" data-testid="text-review-did">
                  {whatIDid.trim() || shiftRecap?.whatIDid}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What I learned</p>
                <p className="text-sm mt-1 whitespace-pre-wrap" data-testid="text-review-learned">
                  {whatILearned.trim() || shiftRecap?.whatILearned}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="w-full h-14 text-lg font-semibold"
              onClick={() => clockOutMutation.mutate()}
              disabled={clockOutMutation.isPending}
              data-testid="button-clock-out"
            >
              <LogOut className="w-5 h-5 mr-2" />
              {clockOutMutation.isPending ? "Clocking out…" : "Clock out"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
