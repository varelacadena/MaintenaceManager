import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLiveNow } from "@/hooks/useLiveNow";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { elapsedMilliseconds, formatLiveDuration } from "@shared/studentPortal";
import { studentPortalQueryKeys, useStudentTimeClock } from "./studentPortalApi";

export default function StudentClockOut() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const clockQuery = useStudentTimeClock(true);
  const openEntry = clockQuery.data?.openEntry;
  const now = useLiveNow(Boolean(openEntry?.clockInAt));

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/student/time-clock/clock-out");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.timeClock });
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.adminList });
      toast({ title: "Clocked out", description: "See you next shift." });
      navigate("/work", { replace: true });
    },
    onError: (error: Error) => {
      toast({ title: "Could not clock out", description: error.message, variant: "destructive" });
    },
  });

  const elapsed = openEntry?.clockInAt
    ? formatLiveDuration(elapsedMilliseconds(openEntry.clockInAt, now))
    : formatLiveDuration(0);
  const missingRecap = (clockQuery.data?.todayRecapCount ?? 0) === 0;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5" data-testid="student-clock-out-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Clock out
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          End your shift when you are done for the day.
        </p>
      </div>

      {openEntry ? (
        <div className="rounded-2xl border border-border bg-background p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time on the clock</p>
              <p className="text-3xl font-semibold tabular-nums" data-testid="text-elapsed-time">
                {elapsed}
              </p>
            </div>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Supervisor</p>
            <p className="font-medium">{openEntry.supervisorName}</p>
          </div>
          {missingRecap && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                You have not saved a recap yet today.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={() => navigate("/work/recap")}
                data-testid="button-write-recap-first"
              >
                Write recap first
              </Button>
            </div>
          )}
          <Button
            type="button"
            className="w-full h-12 text-base"
            onClick={() => clockOutMutation.mutate()}
            disabled={clockOutMutation.isPending}
            data-testid="button-clock-out"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {clockOutMutation.isPending ? "Clocking out…" : "Clock out"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">You are not clocked in.</p>
      )}
    </div>
  );
}
