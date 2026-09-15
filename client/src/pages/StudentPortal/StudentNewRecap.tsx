import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { BookOpen, FileText, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { localDateString, MAX_RECAP_LENGTH, MIN_RECAP_LENGTH } from "@shared/studentPortal";
import { studentPortalQueryKeys } from "./studentPortalApi";

const steps = [
  { title: "Work", description: "What did you do today?" },
  { title: "Learning", description: "What did you learn?" },
  { title: "Review", description: "Check it, then save." },
];

const touchArea = "min-h-[140px] text-base sm:text-sm resize-y bg-background";

export default function StudentNewRecap() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const afterSavePath = new URLSearchParams(search).get("next") === "clock-out" ? "/clock-out" : "/work";
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [whatIDid, setWhatIDid] = useState("");
  const [whatILearned, setWhatILearned] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/student/recaps", {
        whatIDid: whatIDid.trim(),
        whatILearned: whatILearned.trim(),
        recapDate: localDateString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.recaps });
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.timeClock });
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.adminList });
      toast({ title: "Recap saved", description: "Nice work capturing today." });
      navigate(afterSavePath, { replace: true });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save recap", description: error.message, variant: "destructive" });
    },
  });

  const validateStep = (index: number) => {
    if (index === 0 && whatIDid.trim().length < MIN_RECAP_LENGTH) {
      toast({
        title: "Add a bit more",
        description: "Describe the work you did in a sentence or two.",
        variant: "destructive",
      });
      return false;
    }
    if (index === 1 && whatILearned.trim().length < MIN_RECAP_LENGTH) {
      toast({
        title: "Add a bit more",
        description: "Share one thing you learned or practiced.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleSubmit = () => {
    if (!validateStep(0) || !validateStep(1)) return;
    saveMutation.mutate();
  };

  return (
    <div className="min-h-full flex flex-col max-w-lg mx-auto w-full" data-testid="student-new-recap">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-3 sm:px-4 py-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary shrink-0" />
              <h1 className="text-lg font-semibold tracking-tight">New recap</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{steps[step].description}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/work", { replace: true })}
            className="h-10 w-10 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent"
            aria-label="Close recap"
            data-testid="button-close-recap"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <Progress value={((step + 1) / steps.length) * 100} className="h-1.5" />
      </div>

      <div
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4"
        style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {step === 0 && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/30 p-4 space-y-2 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="recap-did" className="flex items-center gap-1.5 text-blue-800 dark:text-blue-200">
                <FileText className="w-4 h-4" />
                What I did
              </Label>
              <span className="text-xs tabular-nums text-blue-600 dark:text-blue-400">
                {whatIDid.length}/{MAX_RECAP_LENGTH}
              </span>
            </div>
            <Textarea
              id="recap-did"
              value={whatIDid}
              onChange={(event) => setWhatIDid(event.target.value.slice(0, MAX_RECAP_LENGTH))}
              placeholder="e.g. Helped replace a faucet, cleaned filters, and restocked supplies."
              className={touchArea}
              data-testid="textarea-what-i-did"
            />
          </div>
        )}

        {step === 1 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/30 p-4 space-y-2 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="recap-learned" className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                <Lightbulb className="w-4 h-4" />
                What I learned
              </Label>
              <span className="text-xs tabular-nums text-amber-700 dark:text-amber-400">
                {whatILearned.length}/{MAX_RECAP_LENGTH}
              </span>
            </div>
            <Textarea
              id="recap-learned"
              value={whatILearned}
              onChange={(event) => setWhatILearned(event.target.value.slice(0, MAX_RECAP_LENGTH))}
              placeholder="e.g. Always shut the water off before loosening fittings."
              className={touchArea}
              data-testid="textarea-what-i-learned"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/30 p-4 space-y-2 border-l-4 border-l-blue-500">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-blue-700 dark:text-blue-300">
                What I did
              </p>
              <p className="text-sm whitespace-pre-wrap">{whatIDid.trim()}</p>
            </div>
            <div className="rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/30 p-4 space-y-2 border-l-4 border-l-amber-500">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-300">
                What I learned
              </p>
              <p className="text-sm whitespace-pre-wrap">{whatILearned.trim()}</p>
            </div>
          </div>
        )}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-3 pt-3 shadow-lg backdrop-blur sm:px-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto flex max-w-lg gap-2">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
              disabled={saveMutation.isPending}
              data-testid="button-recap-back"
            >
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button type="button" className="flex-1 h-11" onClick={handleNext} data-testid="button-recap-next">
              Next
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 h-11"
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
              data-testid="button-recap-save"
            >
              {saveMutation.isPending ? "Saving…" : "Save recap"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
