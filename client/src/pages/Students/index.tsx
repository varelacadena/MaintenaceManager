import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock, GraduationCap, BookOpen, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLiveNow } from "@/hooks/useLiveNow";
import {
  elapsedMilliseconds,
  formatDurationMinutes,
  formatLiveDuration,
  formatWeekLabel,
  studentAdminDateRange,
  type StudentAdminRangePreset,
} from "@shared/studentPortal";

const RANGE_OPTIONS: { value: StudentAdminRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "lastWeek", label: "Last week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

interface AdminStudentRow {
  id: string;
  username: string;
  name: string;
  isClockedIn: boolean;
  supervisorName: string | null;
  clockInAt: string | null;
  hoursInRange: number;
  minutesInRange: number;
  recapCount: number;
  recapsToday: number;
  pendingEditCount?: number;
}

interface AdminStudentsResponse {
  students: AdminStudentRow[];
  clockedInCount: number;
  recapsToday: number;
  hoursToday: number;
  recapCount: number;
  pendingEditCount?: number;
}

export default function StudentsAdminPage() {
  const [, navigate] = useLocation();
  const [rangePreset, setRangePreset] = useState<StudentAdminRangePreset>("week");
  const range = useMemo(() => studentAdminDateRange(rangePreset), [rangePreset]);
  const rangeLabel = range.startDate && range.endDate
    ? rangePreset === "today"
      ? "Today"
      : formatWeekLabel(range.startDate, range.endDate)
    : "All time";
  const { data, isLoading, isError, refetch } = useQuery<AdminStudentsResponse>({
    queryKey: ["/api/admin/students", range.startDate ?? "", range.endDate ?? ""],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.startDate) params.set("startDate", range.startDate);
      if (range.endDate) params.set("endDate", range.endDate);
      const query = params.toString();
      const response = await fetch(`/api/admin/students${query ? `?${query}` : ""}`, { credentials: "include" });
      if (!response.ok) throw new Error("Could not load students");
      return response.json();
    },
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="p-3 md:p-0 space-y-4" data-testid="students-admin-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-page-title">Students</h1>
          <p className="text-sm text-muted-foreground">Clock times and daily recaps for review.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => navigate("/analytics?tab=technicians&role=student")}
          data-testid="button-open-student-analytics"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          View in Analytics
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1 bg-muted rounded-md p-1" data-testid="students-range-filter">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={rangePreset === option.value}
              onClick={() => setRangePreset(option.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                rangePreset === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover-elevate"
              }`}
              data-testid={`button-student-range-${option.value}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground" data-testid="text-student-range-label">{rangeLabel}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading students…</p>
      ) : isError || !data ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Could not load students.</p>
          <Button type="button" onClick={() => void refetch()}>Retry</Button>
        </div>
      ) : (
        <StudentsAdminBody data={data} />
      )}
    </div>
  );
}

function StudentsAdminBody({ data }: { data: AdminStudentsResponse }) {
  const now = useLiveNow(Boolean(data.students.some((student) => student.isClockedIn && student.clockInAt)));

  return (
    <>

      {(data.pendingEditCount ?? 0) > 0 && (
        <div
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white"
          data-testid="banner-pending-time-edits"
        >
          {data.pendingEditCount} time edit{(data.pendingEditCount ?? 0) === 1 ? "" : "s"} waiting for review
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Clocked in
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xl font-semibold" data-testid="text-clocked-in-count">{data.clockedInCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Time
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xl font-semibold" data-testid="text-time-in-range">
              {formatDurationMinutes(data.students.reduce((sum, row) => sum + (row.minutesInRange || Math.round(row.hoursInRange * 60)), 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Recaps
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xl font-semibold" data-testid="text-recap-count">{data.recapCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> Students
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xl font-semibold">{data.students.length}</p>
          </CardContent>
        </Card>
      </div>

      {data.students.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No student accounts yet.</p>
      ) : (
        <div className="space-y-2">
          {[...data.students]
            .sort((a, b) => (b.pendingEditCount ?? 0) - (a.pendingEditCount ?? 0))
            .map((student) => (
            <Link
              key={student.id}
              href={`/students/${student.id}`}
              className="block rounded-xl border border-border bg-background p-4 hover:bg-accent/40 transition-colors"
              data-testid={`row-student-${student.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{student.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {student.isClockedIn
                      ? `With ${student.supervisorName || "a technician"} · ${formatLiveDuration(elapsedMilliseconds(student.clockInAt, now))}`
                      : student.supervisorName
                        ? `Last supervisor: ${student.supervisorName}`
                        : "Not clocked in"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={student.isClockedIn ? "default" : "secondary"}>
                    {student.isClockedIn ? "In" : "Out"}
                  </Badge>
                  {(student.pendingEditCount ?? 0) > 0 && (
                    <span
                      className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-600 text-[11px] font-medium text-white"
                      data-testid={`badge-pending-edits-${student.id}`}
                    >
                      {student.pendingEditCount} edit{(student.pendingEditCount ?? 0) === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>{formatDurationMinutes(student.minutesInRange || Math.round(student.hoursInRange * 60))} logged</span>
                <span className="text-right">{student.recapCount} recap{student.recapCount === 1 ? "" : "s"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
