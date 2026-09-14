import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLiveNow } from "@/hooks/useLiveNow";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  addLocalDays,
  dateTimeLocalToIso,
  formatDurationMinutes,
  formatWeekLabel,
  localDateString,
  localWeekRange,
  parseLocalDate,
  resolveEntryMinutes,
  toDateTimeLocalValue,
} from "@shared/studentPortal";
import { ClockTimeFields } from "./ClockTimeFields";
import {
  studentPortalQueryKeys,
  useStudentHours,
  type StudentTimeEntryDto,
  type StudentTimeEditRequestDto,
} from "./studentPortalApi";

function statusLabel(status: string) {
  if (status === "approved") return "Approved";
  if (status === "denied") return "Denied";
  return "Pending";
}

export default function StudentHours() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() => localWeekRange().startDate);
  const hoursQuery = useStudentHours(true, weekStart);
  const data = hoursQuery.data;
  const [editing, setEditing] = useState<StudentTimeEntryDto | null>(null);
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [reason, setReason] = useState("");
  const hasOpenEntry = Boolean(data?.entries.some((entry) => entry.clockInAt && !entry.clockOutAt));
  const now = useLiveNow(hasOpenEntry);
  const nowDate = useMemo(() => new Date(now), [now]);

  const liveDays = useMemo(
    () =>
      (data?.days ?? []).map((day) => {
        const dayEntries = (data?.entries ?? []).filter(
          (entry) => entry.clockInAt && localDateString(new Date(entry.clockInAt)) === day.date,
        );
        if (!dayEntries.some((entry) => !entry.clockOutAt)) return day;
        return {
          ...day,
          minutes: dayEntries.reduce(
            (sum, entry) =>
              sum + resolveEntryMinutes(entry.clockInAt, entry.clockOutAt, entry.durationMinutes, nowDate),
            0,
          ),
        };
      }),
    [data?.days, data?.entries, nowDate],
  );
  const liveTotal = useMemo(
    () =>
      (data?.entries ?? []).reduce(
        (sum, entry) =>
          sum + resolveEntryMinutes(entry.clockInAt, entry.clockOutAt, entry.durationMinutes, nowDate),
        0,
      ),
    [data?.entries, nowDate],
  );

  const maxDayMinutes = useMemo(
    () => Math.max(1, ...liveDays.map((day) => day.minutes), 1),
    [liveDays],
  );

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("Choose an entry");
      const requestedClockInAt = dateTimeLocalToIso(clockIn);
      if (!requestedClockInAt) throw new Error("Enter a clock-in time");
      const response = await apiRequest("POST", "/api/student/time-edit-requests", {
        timeEntryId: editing.id,
        requestedClockInAt,
        requestedClockOutAt: clockOut ? dateTimeLocalToIso(clockOut) : null,
        reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.hours });
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.timeClock });
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.adminList });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts"] });
      toast({ title: "Request sent", description: "An admin will review your time change." });
      setEditing(null);
      setReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Could not send request", description: error.message, variant: "destructive" });
    },
  });

  function openRequest(entry: StudentTimeEntryDto) {
    setEditing(entry);
    setClockIn(toDateTimeLocalValue(entry.clockInAt));
    setClockOut(toDateTimeLocalValue(entry.clockOutAt));
    setReason("");
  }

  function shiftWeek(days: number) {
    setWeekStart(localDateString(addLocalDays(parseLocalDate(weekStart), days)));
  }

  const pendingRequests = (data?.editRequests ?? []).filter((request) => request.status === "pending");
  const recentRequests = (data?.editRequests ?? []).filter((request) => request.status !== "pending").slice(0, 5);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5" data-testid="student-hours-page">
      <div>
        <button
          type="button"
          onClick={() => navigate("/work")}
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          data-testid="button-back-hours"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Recap
        </button>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Hours
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your weekly time and a way to request a correction.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={() => shiftWeek(-7)} data-testid="button-week-prev">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <p className="text-sm font-medium text-center" data-testid="text-week-label">
          {data ? formatWeekLabel(data.weekStartDate, data.weekEndDate) : "This week"}
        </p>
        <Button type="button" variant="ghost" size="icon" onClick={() => shiftWeek(7)} data-testid="button-week-next">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-background p-5">
        <p className="text-sm text-muted-foreground">Recorded this week</p>
        <p className="text-3xl font-semibold tabular-nums mt-1" data-testid="text-week-total">
          {formatDurationMinutes(hasOpenEntry ? liveTotal : (data?.totalMinutes ?? 0))}
        </p>
      </div>

      {hoursQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading hours…</p>
      ) : (
        <>
          <section className="space-y-2">
            {liveDays.map((day) => (
              <div key={day.date} className="flex items-center gap-3 text-sm">
                <span className="w-10 shrink-0 text-muted-foreground">{day.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{ width: `${Math.round((day.minutes / maxDayMinutes) * 100)}%` }}
                  />
                </div>
                <span className="w-16 text-right tabular-nums">{formatDurationMinutes(day.minutes)}</span>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Shifts</h2>
            {(data?.entries.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No clock entries this week.</p>
            ) : (
              data?.entries.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-border p-3 space-y-2" data-testid={`row-hours-entry-${entry.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{entry.supervisorName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.clockInAt ? new Date(entry.clockInAt).toLocaleString() : "—"}
                        {entry.clockOutAt ? ` → ${new Date(entry.clockOutAt).toLocaleString()}` : " · In progress"}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {formatDurationMinutes(resolveEntryMinutes(entry.clockInAt, entry.clockOutAt, entry.durationMinutes, nowDate))}
                    </span>
                  </div>
                  {entry.pendingEditRequestId ? (
                    <Badge variant="secondary">Edit requested</Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => openRequest(entry)}
                      data-testid={`button-request-edit-${entry.id}`}
                    >
                      <PencilLine className="w-3.5 h-3.5 mr-1.5" />
                      Request time edit
                    </Button>
                  )}
                </article>
              ))
            )}
          </section>

          {(pendingRequests.length > 0 || recentRequests.length > 0) && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Edit requests</h2>
              {[...pendingRequests, ...recentRequests].map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </section>
          )}
        </>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request a time edit</DialogTitle>
            <DialogDescription>
              Tell us the correct clock times. An admin will review this before it changes.
            </DialogDescription>
          </DialogHeader>
          <ClockTimeFields
            idPrefix="student-edit"
            clockIn={clockIn}
            clockOut={clockOut}
            onClockInChange={setClockIn}
            onClockOutChange={setClockOut}
          />
          <div className="space-y-1.5">
            <Label htmlFor="student-edit-reason">Reason</Label>
            <Textarea
              id="student-edit-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Forgot to clock out, left early, etc."
              data-testid="input-edit-reason"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => requestMutation.mutate()}
              disabled={requestMutation.isPending || reason.trim().length < 8 || !clockIn}
              data-testid="button-submit-time-edit"
            >
              {requestMutation.isPending ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({ request }: { request: StudentTimeEditRequestDto }) {
  return (
    <article className="rounded-xl border border-border p-3 space-y-1 text-sm" data-testid={`row-edit-request-${request.id}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ""}
        </span>
        <Badge variant={request.status === "approved" ? "default" : request.status === "denied" ? "secondary" : "outline"}>
          {statusLabel(request.status)}
        </Badge>
      </div>
      <p>
        {request.requestedClockInAt ? new Date(request.requestedClockInAt).toLocaleString() : "—"}
        {request.requestedClockOutAt ? ` → ${new Date(request.requestedClockOutAt).toLocaleString()}` : " · Open"}
      </p>
      {request.requestedMinutes != null && (
        <p className="text-xs text-muted-foreground">{formatDurationMinutes(request.requestedMinutes)}</p>
      )}
      <p className="text-xs text-muted-foreground">{request.reason}</p>
      {request.adminNote && <p className="text-xs">Admin: {request.adminNote}</p>}
    </article>
  );
}
