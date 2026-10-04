import { useEffect, useRef, useState, type FocusEvent } from "react";
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
  MAX_RECAP_LENGTH,
  MIN_RECAP_LENGTH,
} from "@shared/studentPortal";
import { studentPortalQueryKeys, useStudentRecaps, useStudentTimeClock } from "./studentPortalApi";

interface StudentClockOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClockedOut?: () => void;
}

type RecapDraft = {
  whatIDid: string;
  whatILearned: string;
};

const DID_EXAMPLE = "Helped replace a faucet and restocked supplies.";
const LEARNED_EXAMPLE = "Shut the water off before loosening fittings.";

function draftKey(entryId: string) {
  return `student-clock-out-draft:${entryId}`;
}

function readDraft(entryId: string): RecapDraft | null {
  try {
    const raw = sessionStorage.getItem(draftKey(entryId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RecapDraft>;
    return {
      whatIDid: typeof parsed.whatIDid === "string" ? parsed.whatIDid : "",
      whatILearned: typeof parsed.whatILearned === "string" ? parsed.whatILearned : "",
    };
  } catch {
    return null;
  }
}

function writeDraft(entryId: string, draft: RecapDraft) {
  try {
    sessionStorage.setItem(draftKey(entryId), JSON.stringify(draft));
  } catch {
    // A full or blocked session store should not stop clock-out.
  }
}

function clearDraft(entryId: string) {
  try {
    sessionStorage.removeItem(draftKey(entryId));
  } catch {
    // Ignore storage failures on the way out.
  }
}

function recapHint(value: string): string | null {
  const length = value.trim().length;
  if (length >= MIN_RECAP_LENGTH) return null;
  if (length === 0) return "A short sentence is enough.";
  return "A few more words.";
}

function useKeyboardViewport(active: boolean) {
  const [box, setBox] = useState<{ height: number; top: number } | null>(null);

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      setBox(null);
      return;
    }

    const media = window.matchMedia("(max-width: 639px)");
    const viewport = window.visualViewport;

    const update = () => {
      if (!media.matches || !viewport) {
        setBox((current) => (current ? null : current));
        return;
      }
      const next = { height: viewport.height, top: viewport.offsetTop };
      setBox((current) =>
        current && current.height === next.height && current.top === next.top ? current : next,
      );
    };

    update();
    media.addEventListener("change", update);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => {
      media.removeEventListener("change", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, [active]);

  return box;
}

export function StudentClockOutDialog({ open, onOpenChange, onClockedOut }: StudentClockOutDialogProps) {
  const { toast } = useToast();
  const clockQuery = useStudentTimeClock(open);
  const recapsQuery = useStudentRecaps(open);
  const openEntry = clockQuery.data?.openEntry;
  const now = useLiveNow(open && Boolean(openEntry?.clockInAt));
  const shiftRecap = openEntry?.id
    ? (recapsQuery.data ?? []).find((recap) => recap.timeEntryId === openEntry.id)
    : undefined;
  const keyboardViewport = useKeyboardViewport(open);
  const loadedFor = useRef<string | null>(null);

  const [whatIDid, setWhatIDid] = useState("");
  const [whatILearned, setWhatILearned] = useState("");

  useEffect(() => {
    if (!open || !openEntry?.id) return;
    if (loadedFor.current === openEntry.id) return;

    const draft = readDraft(openEntry.id);
    if (draft) {
      setWhatIDid(draft.whatIDid);
      setWhatILearned(draft.whatILearned);
      loadedFor.current = openEntry.id;
      return;
    }

    if (recapsQuery.isLoading) return;

    if (shiftRecap) {
      setWhatIDid(shiftRecap.whatIDid);
      setWhatILearned(shiftRecap.whatILearned);
    }
    loadedFor.current = openEntry.id;
  }, [open, openEntry?.id, recapsQuery.isLoading, shiftRecap]);

  const elapsed = openEntry?.clockInAt
    ? formatLiveDuration(elapsedMilliseconds(openEntry.clockInAt, now))
    : null;

  const didHint = recapHint(whatIDid);
  const learnedHint = recapHint(whatILearned);
  const recapReady = !didHint && !learnedHint;

  const remember = (entryId: string, draft: RecapDraft) => {
    writeDraft(entryId, draft);
    loadedFor.current = entryId;
  };

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/student/time-clock/clock-out", {
        whatIDid: whatIDid.trim(),
        whatILearned: whatILearned.trim(),
      });
      return response.json();
    },
    onSuccess: () => {
      if (openEntry?.id) clearDraft(openEntry.id);
      loadedFor.current = null;
      setWhatIDid("");
      setWhatILearned("");
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.timeClock });
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.recaps });
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

  const scrollFieldIntoView = (event: FocusEvent<HTMLTextAreaElement>) => {
    window.setTimeout(() => {
      event.target.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none p-0 sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[min(40rem,calc(100dvh-2rem))] sm:w-[calc(100vw-2rem)] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:p-0 [&>button]:right-2 [&>button]:top-[max(0.5rem,env(safe-area-inset-top))] [&>button]:z-10 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center sm:[&>button]:top-3"
        style={
          keyboardViewport
            ? { height: keyboardViewport.height, maxHeight: keyboardViewport.height, top: keyboardViewport.top }
            : undefined
        }
        data-testid="dialog-clock-out-flow"
      >
        <DialogHeader className="shrink-0 px-4 pr-16 pt-[max(1rem,env(safe-area-inset-top))] pb-3 text-left sm:px-5 sm:pt-5">
          <DialogTitle className="text-xl">Clock out</DialogTitle>
          <DialogDescription className="text-base sm:text-sm">
            Write one short sentence in each box, then clock out.
          </DialogDescription>
          {elapsed && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1">
              <Clock className="w-4 h-4 shrink-0" />
              <span data-testid="text-review-hours">
                {elapsed}
                {openEntry?.supervisorName ? ` with ${openEntry.supervisorName}` : ""}
              </span>
            </p>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-2 sm:px-5">
          <div className="space-y-1.5">
            <Label htmlFor="clock-out-did" className="flex items-center gap-1.5 text-base sm:text-sm">
              <FileText className="w-4 h-4" />
              What I did
            </Label>
            <Textarea
              id="clock-out-did"
              value={whatIDid}
              onChange={(event) => {
                const next = event.target.value.slice(0, MAX_RECAP_LENGTH);
                setWhatIDid(next);
                if (openEntry?.id) remember(openEntry.id, { whatIDid: next, whatILearned });
              }}
              onFocus={scrollFieldIntoView}
              placeholder={DID_EXAMPLE}
              rows={2}
              enterKeyHint="next"
              className="min-h-[4.5rem] text-base md:text-base"
              aria-describedby="clock-out-did-hint"
              data-testid="textarea-what-i-did"
            />
            <p id="clock-out-did-hint" className="min-h-[1.25rem] text-sm text-muted-foreground" data-testid="text-did-hint">
              {didHint}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clock-out-learned" className="flex items-center gap-1.5 text-base sm:text-sm">
              <Lightbulb className="w-4 h-4" />
              What I learned
            </Label>
            <Textarea
              id="clock-out-learned"
              value={whatILearned}
              onChange={(event) => {
                const next = event.target.value.slice(0, MAX_RECAP_LENGTH);
                setWhatILearned(next);
                if (openEntry?.id) remember(openEntry.id, { whatIDid, whatILearned: next });
              }}
              onFocus={scrollFieldIntoView}
              placeholder={LEARNED_EXAMPLE}
              rows={2}
              enterKeyHint="done"
              className="min-h-[4.5rem] text-base md:text-base"
              aria-describedby="clock-out-learned-hint"
              data-testid="textarea-what-i-learned"
            />
            <p
              id="clock-out-learned-hint"
              className="min-h-[1.25rem] text-sm text-muted-foreground"
              data-testid="text-learned-hint"
            >
              {learnedHint}
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          <Button
            type="button"
            className="w-full h-12 text-base font-semibold"
            onClick={() => clockOutMutation.mutate()}
            disabled={!recapReady || clockOutMutation.isPending}
            data-testid="button-clock-out"
          >
            <LogOut className="w-5 h-5 mr-2" />
            {clockOutMutation.isPending ? "Clocking out…" : "Clock out"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
