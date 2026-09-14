import { useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLiveNow } from "@/hooks/useLiveNow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  dateTimeLocalToIso,
  formatDurationMinutes,
  resolveEntryMinutes,
  toDateTimeLocalValue,
} from "@shared/studentPortal";
import { formatUserDisplayName } from "@shared/displayNames";
import { ClockTimeFields } from "../StudentPortal/ClockTimeFields";
import { studentPortalQueryKeys, type StudentRecapDto, type StudentTimeEditRequestDto, type StudentTimeEntryDto } from "../StudentPortal/studentPortalApi";

interface TechnicianOption {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  role: string;
}

interface StudentAdminDetailResponse {
  student: {
    id: string;
    name: string;
    username: string;
    email: string | null;
    isClockedIn: boolean;
  };
  timeEntries: StudentTimeEntryDto[];
  recaps: StudentRecapDto[];
  editRequests: StudentTimeEditRequestDto[];
}

function recapsForEntry(recaps: StudentRecapDto[], timeEntryId: string) {
  return recaps.filter((recap) => recap.timeEntryId === timeEntryId);
}

function formatShiftRange(entry: Pick<StudentTimeEntryDto, "clockInAt" | "clockOutAt">) {
  const start = entry.clockInAt ? new Date(entry.clockInAt).toLocaleString() : "—";
  if (!entry.clockOutAt) return `${start} · In progress`;
  return `${start} → ${new Date(entry.clockOutAt).toLocaleString()}`;
}

function recapShiftLabel(recap: StudentRecapDto, entries: StudentTimeEntryDto[]) {
  const entry = entries.find((item) => item.id === recap.timeEntryId);
  return entry ? formatShiftRange(entry) : recap.recapDate;
}

export default function StudentAdminDetail() {
  const [, params] = useRoute("/students/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const studentId = params?.id;
  const { data, isLoading, isError, refetch } = useQuery<StudentAdminDetailResponse>({
    queryKey: ["/api/admin/students", studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const response = await fetch(`/api/admin/students/${studentId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load student");
      return response.json();
    },
    staleTime: 15_000,
  });
  const techniciansQuery = useQuery<TechnicianOption[]>({
    queryKey: ["/api/users/directory", { role: "technician" }],
    queryFn: async () => {
      const response = await fetch("/api/users/directory?role=technician", { credentials: "include" });
      if (!response.ok) throw new Error("Could not load technicians");
      return response.json();
    },
    staleTime: 60_000,
  });

  const [editing, setEditing] = useState<StudentTimeEntryDto | null>(null);
  const [adding, setAdding] = useState(false);
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [reviewing, setReviewing] = useState<StudentTimeEditRequestDto | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [deleting, setDeleting] = useState<StudentTimeEntryDto | null>(null);

  const technicians = (techniciansQuery.data ?? []).filter((user) => user.role === "technician");
  const hasOpenEntry = Boolean(data?.timeEntries.some((entry) => entry.clockInAt && !entry.clockOutAt));
  const now = useLiveNow(hasOpenEntry);
  const nowDate = useMemo(() => new Date(now), [now]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/students", studentId] });
    queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.adminList });
    queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.hours });
    queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.timeClock });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts"] });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!studentId || !editing) throw new Error("Missing entry");
      const clockInAt = dateTimeLocalToIso(clockIn);
      if (!clockInAt) throw new Error("Enter a clock-in time");
      const response = await apiRequest("PATCH", `/api/admin/students/${studentId}/time-entries/${editing.id}`, {
        clockInAt,
        clockOutAt: clockOut ? dateTimeLocalToIso(clockOut) : null,
      });
      return response.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Time updated" });
      setEditing(null);
    },
    onError: (error: Error) => {
      toast({ title: "Could not update time", description: error.message, variant: "destructive" });
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error("Missing student");
      const clockInAt = dateTimeLocalToIso(clockIn);
      if (!clockInAt) throw new Error("Enter a clock-in time");
      const response = await apiRequest("POST", `/api/admin/students/${studentId}/time-entries`, {
        supervisorId,
        clockInAt,
        clockOutAt: clockOut ? dateTimeLocalToIso(clockOut) : null,
      });
      return response.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Time entry added" });
      setAdding(false);
    },
    onError: (error: Error) => {
      toast({ title: "Could not add time", description: error.message, variant: "destructive" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (status: "approved" | "denied") => {
      if (!reviewing) throw new Error("Missing request");
      const response = await apiRequest("POST", `/api/admin/student-time-edits/${reviewing.id}/review`, {
        status,
        adminNote: adminNote.trim() || undefined,
        clockInAt: dateTimeLocalToIso(clockIn) ?? undefined,
        clockOutAt: clockOut ? dateTimeLocalToIso(clockOut) : null,
      });
      return response.json();
    },
    onSuccess: (_data, status) => {
      invalidate();
      toast({ title: status === "approved" ? "Edit approved" : "Edit denied" });
      setReviewing(null);
    },
    onError: (error: Error) => {
      toast({ title: "Could not review request", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!studentId || !deleting) throw new Error("Missing entry");
      await apiRequest("DELETE", `/api/admin/students/${studentId}/time-entries/${deleting.id}`);
    },
    onSuccess: () => {
      invalidate();
      toast({
        title: "Time entry deleted",
        description: recapsForEntry(data?.recaps ?? [], deleting?.id ?? "").length
          ? "The recap for this shift was deleted too."
          : undefined,
      });
      setDeleting(null);
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete time", description: error.message, variant: "destructive" });
    },
  });

  function openEdit(entry: StudentTimeEntryDto) {
    setEditing(entry);
    setClockIn(toDateTimeLocalValue(entry.clockInAt));
    setClockOut(toDateTimeLocalValue(entry.clockOutAt));
  }

  function openAdd() {
    setAdding(true);
    setClockIn(toDateTimeLocalValue(new Date()));
    setClockOut("");
    setSupervisorId(technicians[0]?.id ?? "");
  }

  function openReview(request: StudentTimeEditRequestDto) {
    setReviewing(request);
    setClockIn(toDateTimeLocalValue(request.requestedClockInAt));
    setClockOut(toDateTimeLocalValue(request.requestedClockOutAt));
    setAdminNote("");
  }

  if (!studentId) return null;
  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">Loading student…</p>;
  if (isError || !data) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">Could not load this student.</p>
        <Button type="button" onClick={() => void refetch()}>Retry</Button>
      </div>
    );
  }

  const pendingRequests = data.editRequests.filter((request) => request.status === "pending");

  return (
    <div className="p-3 md:p-0 space-y-5 max-w-3xl" data-testid="student-admin-detail">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate("/students")}
            className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            data-testid="button-back-students"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Students
          </button>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-page-title">
            {data.student.name}
          </h1>
          <p className="text-sm text-muted-foreground">{data.student.username}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={data.student.isClockedIn ? "default" : "secondary"}>
            {data.student.isClockedIn ? "Clocked in" : "Clocked out"}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/analytics?tab=technicians&role=student")}
            data-testid="button-student-analytics"
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Analytics
          </Button>
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Pending time edits</h2>
          {pendingRequests.map((request) => (
            <article key={request.id} className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/20 p-3 space-y-2" data-testid={`row-pending-edit-${request.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {request.requestedClockInAt ? new Date(request.requestedClockInAt).toLocaleString() : "—"}
                    {request.requestedClockOutAt ? ` → ${new Date(request.requestedClockOutAt).toLocaleString()}` : " · Open"}
                  </p>
                  {request.requestedMinutes != null && (
                    <p className="text-xs text-muted-foreground">{formatDurationMinutes(request.requestedMinutes)}</p>
                  )}
                </div>
                <Button type="button" size="sm" onClick={() => openReview(request)} data-testid={`button-review-edit-${request.id}`}>
                  Review
                </Button>
              </div>
              <p className="text-sm">{request.reason}</p>
              <p className="text-xs text-muted-foreground">
                Was {request.originalClockInAt ? new Date(request.originalClockInAt).toLocaleString() : "—"}
                {request.originalClockOutAt ? ` → ${new Date(request.originalClockOutAt).toLocaleString()}` : " · Open"}
              </p>
            </article>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Clock history</h2>
          <Button type="button" variant="outline" size="sm" onClick={openAdd} data-testid="button-add-time-entry">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add time
          </Button>
        </div>
        {data.timeEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clock entries yet.</p>
        ) : (
          <div className="space-y-2">
            {data.timeEntries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border p-3 text-sm" data-testid={`row-time-${entry.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{entry.supervisorName}</p>
                  <span className="text-xs font-medium tabular-nums">
                    {formatDurationMinutes(resolveEntryMinutes(entry.clockInAt, entry.clockOutAt, entry.durationMinutes, nowDate))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{formatShiftRange(entry)}</p>
                {recapsForEntry(data.recaps, entry.id).map((recap) => (
                  <p key={recap.id} className="mt-2 text-xs text-muted-foreground line-clamp-2" data-testid={`text-shift-recap-${entry.id}`}>
                    Recap: {recap.whatIDid}
                  </p>
                ))}
                <div className="mt-2 flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(entry)} data-testid={`button-edit-time-${entry.id}`}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleting(entry)}
                    data-testid={`button-delete-time-${entry.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                  {entry.pendingEditRequestId && <Badge variant="secondary">Edit requested</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Daily recaps</h2>
        {data.recaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recaps yet.</p>
        ) : (
          <div className="space-y-3">
            {data.recaps.map((recap) => (
              <article key={recap.id} className="rounded-xl border border-border p-4 space-y-2" data-testid={`row-recap-${recap.id}`}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {recapShiftLabel(recap, data.timeEntries)}
                </p>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">What they did</p>
                  <p className="text-sm whitespace-pre-wrap">{recap.whatIDid}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">What they learned</p>
                  <p className="text-sm whitespace-pre-wrap">{recap.whatILearned}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit clock time</DialogTitle>
            <DialogDescription>Change the recorded in/out times. Duration is shown as hours and minutes.</DialogDescription>
          </DialogHeader>
          <ClockTimeFields
            idPrefix="admin-edit"
            clockIn={clockIn}
            clockOut={clockOut}
            onClockInChange={setClockIn}
            onClockOutChange={setClockOut}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !clockIn} data-testid="button-save-time-entry">
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add clock time</DialogTitle>
            <DialogDescription>Record a missed clock-in or completed shift.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="admin-add-supervisor">Supervisor</Label>
            <select
              id="admin-add-supervisor"
              value={supervisorId}
              onChange={(event) => setSupervisorId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              data-testid="select-add-supervisor"
            >
              <option value="">Choose a technician</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {formatUserDisplayName(tech)}
                </option>
              ))}
            </select>
          </div>
          <ClockTimeFields
            idPrefix="admin-add"
            clockIn={clockIn}
            clockOut={clockOut}
            onClockInChange={setClockIn}
            onClockOutChange={setClockOut}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="button" onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !clockIn || !supervisorId} data-testid="button-create-time-entry">
              {addMutation.isPending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reviewing)} onOpenChange={(open) => !open && setReviewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review time edit</DialogTitle>
            <DialogDescription>{reviewing?.reason}</DialogDescription>
          </DialogHeader>
          <ClockTimeFields
            idPrefix="admin-review"
            clockIn={clockIn}
            clockOut={clockOut}
            onClockInChange={setClockIn}
            onClockOutChange={setClockOut}
          />
          <div className="space-y-1.5">
            <Label htmlFor="admin-review-note">Note (optional)</Label>
            <Textarea
              id="admin-review-note"
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              data-testid="input-review-note"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => reviewMutation.mutate("denied")}
              disabled={reviewMutation.isPending}
              data-testid="button-deny-time-edit"
            >
              Deny
            </Button>
            <Button
              type="button"
              onClick={() => reviewMutation.mutate("approved")}
              disabled={reviewMutation.isPending || !clockIn}
              data-testid="button-approve-time-edit"
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this clock time?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? recapsForEntry(data.recaps, deleting.id).length > 0
                  ? `This removes ${formatDurationMinutes(resolveEntryMinutes(deleting.clockInAt, deleting.clockOutAt, deleting.durationMinutes, nowDate))} from ${deleting.clockInAt ? new Date(deleting.clockInAt).toLocaleString() : "this entry"} and deletes the recap for this shift. This cannot be undone.`
                  : `This removes ${formatDurationMinutes(resolveEntryMinutes(deleting.clockInAt, deleting.clockOutAt, deleting.durationMinutes, nowDate))} from ${deleting.clockInAt ? new Date(deleting.clockInAt).toLocaleString() : "this entry"}. This cannot be undone.`
                : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-time"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
