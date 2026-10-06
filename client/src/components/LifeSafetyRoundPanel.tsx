import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, ScanLine } from "lucide-react";
import type { LifeSafetyCheck } from "@shared/schema";
import { lifeSafetyAction, lifeSafetyGroupLabel, lifeSafetyPlace } from "@shared/lifeSafety";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

function placeLine(check: LifeSafetyCheck): string {
  return lifeSafetyPlace(check.spaceName, check.floor);
}

export function LifeSafetyRoundPanel({
  taskId,
  canRecord,
}: {
  taskId: string;
  canRecord: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scanCheck, setScanCheck] = useState<LifeSafetyCheck | null>(null);
  const [problemCheck, setProblemCheck] = useState<LifeSafetyCheck | null>(null);
  const [problemNote, setProblemNote] = useState("");

  const { data: checks = [], isLoading } = useQuery<LifeSafetyCheck[]>({
    queryKey: ["/api/tasks", taskId, "life-safety-checks"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/tasks/${taskId}/life-safety-checks`);
      return response.json();
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "life-safety-checks"] });
  };

  const passMutation = useMutation({
    mutationFn: async ({ checkId, scan }: { checkId: string; scan: string }) => {
      const response = await apiRequest("POST", `/api/tasks/${taskId}/life-safety-checks/${checkId}/pass`, { scan });
      return response.json();
    },
    onSuccess: () => {
      setScanCheck(null);
      refresh();
      toast({ title: "Checked", description: "That unit passed." });
    },
    onError: (error: Error) => {
      toast({ title: "Not this unit", description: error.message, variant: "destructive" });
    },
  });

  const problemMutation = useMutation({
    mutationFn: async ({ checkId, note }: { checkId: string; note: string }) => {
      const response = await apiRequest("POST", `/api/tasks/${taskId}/life-safety-checks/${checkId}/problem`, { note });
      return response.json();
    },
    onSuccess: () => {
      setProblemCheck(null);
      setProblemNote("");
      refresh();
      toast({ title: "Problem saved", description: "A repair job was opened for this unit." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    },
  });

  const pending = checks.filter((check) => check.result === "pending").length;
  const groups = ["smoke_detector", "exit_sign"].filter((category) =>
    checks.some((check) => check.category === category),
  );

  return (
    <section className="space-y-3" data-testid="life-safety-round">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Life safety</h2>
          <p className="text-sm text-muted-foreground">
            {checks.length === 0
              ? "No smoke detectors or exit signs on this property."
              : `${checks.length - pending} of ${checks.length} recorded`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the list…</p>
      ) : checks.length === 0 ? null : (
        groups.map((category) => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {lifeSafetyGroupLabel(category)}
            </p>
            {checks
              .filter((check) => check.category === category)
              .map((check) => (
                <article
                  key={check.id}
                  className="rounded-xl border border-border bg-card p-3"
                  data-testid={`life-safety-check-${check.id}`}
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold leading-snug">{placeLine(check)}</p>
                    <p className="text-sm text-muted-foreground">{check.equipmentName}</p>
                    <p className="mt-1 text-sm">{lifeSafetyAction(check.category)}</p>
                  </div>

                  {check.result === "pass" && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                      <Check className="h-4 w-4 shrink-0" />
                      Passed{check.checkedByName ? ` · ${check.checkedByName}` : ""}
                    </p>
                  )}

                  {check.result === "problem" && (
                    <div className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-300">
                      <p className="flex items-start gap-1.5">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{check.problemNote}</span>
                      </p>
                      {check.repairTaskId && (
                        <Link href={`/tasks/${check.repairTaskId}`} className="inline-flex min-h-11 items-center text-sm font-medium underline">
                          Open repair job
                        </Link>
                      )}
                    </div>
                  )}

                  {check.result === "pending" && canRecord && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        className="h-12 text-base"
                        onClick={() => setScanCheck(check)}
                        data-testid={`button-scan-check-${check.id}`}
                      >
                        <ScanLine className="mr-2 h-5 w-5" />
                        Scan
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 text-base"
                        onClick={() => {
                          setProblemCheck(check);
                          setProblemNote("");
                        }}
                        data-testid={`button-problem-check-${check.id}`}
                      >
                        Problem
                      </Button>
                    </div>
                  )}
                </article>
              ))}
          </div>
        ))
      )}

      <BarcodeScanner
        open={!!scanCheck}
        onOpenChange={(open) => {
          if (!open) setScanCheck(null);
        }}
        title={scanCheck ? placeLine(scanCheck) : "Scan"}
        description={scanCheck ? `Scan ${scanCheck.equipmentName}` : "Scan the sticker on this unit"}
        onScan={(value) => {
          if (!scanCheck) return;
          passMutation.mutate({ checkId: scanCheck.id, scan: value });
        }}
      />

      <Dialog open={!!problemCheck} onOpenChange={(open) => { if (!open) setProblemCheck(null); }}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Problem</DialogTitle>
            <DialogDescription>
              {problemCheck ? `${placeLine(problemCheck)} · ${problemCheck.equipmentName}` : ""}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={problemNote}
            onChange={(event) => setProblemNote(event.target.value)}
            placeholder={problemCheck?.category === "exit_sign" ? "Sign is not lit" : "Alarm did not sound"}
            className="min-h-[88px] text-base"
            data-testid="input-life-safety-problem"
          />
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
            <Button type="button" variant="outline" className="h-12 w-full text-base sm:w-auto" onClick={() => setProblemCheck(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="h-12 w-full text-base sm:w-auto"
              disabled={problemNote.trim().length < 3 || problemMutation.isPending}
              onClick={() => {
                if (!problemCheck) return;
                problemMutation.mutate({ checkId: problemCheck.id, note: problemNote.trim() });
              }}
              data-testid="button-save-life-safety-problem"
            >
              Save problem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
