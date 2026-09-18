import { useState } from "react";
import { BookOpen, CheckCircle2, Clock, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useLiveNow } from "@/hooks/useLiveNow";
import {
  elapsedMilliseconds,
  formatDurationMinutes,
  formatLiveDuration,
  formatWeekLabel,
  localDateString,
  weekDurationMs,
} from "@shared/studentPortal";
import type { User } from "@shared/schema";
import { useStudentRecaps, useStudentTimeClock, type StudentRecapDto } from "./studentPortalApi";
import { StudentClockOutDialog } from "./StudentClockOutDialog";

interface StudentRecapHomeProps {
  user: User;
}

function RecapCard({ recap }: { recap: StudentRecapDto }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((current) => !current)}
      className="w-full text-left rounded-xl border border-border bg-background p-4 space-y-2"
      data-testid={`card-recap-${recap.id}`}
      aria-expanded={open}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {recap.recapDate}
      </p>
      <p className={`text-sm leading-relaxed ${open ? "" : "line-clamp-3"}`}>{recap.whatIDid}</p>
      {open && (
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            What I learned
          </p>
          <p className="text-sm leading-relaxed">{recap.whatILearned}</p>
        </div>
      )}
    </button>
  );
}

export function StudentRecapHome({ user }: StudentRecapHomeProps) {
  const [, navigate] = useLocation();
  const [clockOutOpen, setClockOutOpen] = useState(false);
  const clockQuery = useStudentTimeClock(true);
  const recapsQuery = useStudentRecaps(true);
  const today = localDateString();
  const recaps = recapsQuery.data ?? [];
  const todayRecaps = recaps.filter((recap) => recap.recapDate === today);
  const earlierRecaps = recaps.filter((recap) => recap.recapDate !== today);
  const openEntry = clockQuery.data?.openEntry;
  const hasShiftRecap = Boolean(
    openEntry?.id && recaps.some((recap) => recap.timeEntryId === openEntry.id),
  );
  const now = useLiveNow(Boolean(openEntry?.clockInAt));
  const elapsed = openEntry?.clockInAt
    ? formatLiveDuration(elapsedMilliseconds(openEntry.clockInAt, now))
    : null;
  const weekTotal = openEntry?.clockInAt
    ? formatLiveDuration(weekDurationMs(clockQuery.data?.weekMinutes ?? 0, openEntry.clockInAt, now))
    : formatDurationMinutes(clockQuery.data?.weekMinutes ?? 0);

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Daily Recap
        </h1>
        <p className="text-sm text-muted-foreground">
          Hi {user.firstName || "there"} — when you are done, write your recap. Clock out is the next step after that.
        </p>
      </div>

      {openEntry && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 p-4" data-testid="card-clocked-in">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Clocked in</p>
          <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80 truncate">
            Supervisor: {openEntry.supervisorName}
          </p>
          {elapsed && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1" data-testid="text-elapsed-so-far">
              <Clock className="w-3.5 h-3.5" />
              {elapsed} so far
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate("/hours")}
        className="w-full text-left rounded-xl border border-border bg-background p-4"
        data-testid="button-open-hours"
      >
        <p className="text-sm text-muted-foreground">This week</p>
        <p className="text-xl font-semibold tabular-nums mt-0.5" data-testid="text-week-total">
          {weekTotal}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {clockQuery.data?.weekStartDate && clockQuery.data?.weekEndDate
            ? formatWeekLabel(clockQuery.data.weekStartDate, clockQuery.data.weekEndDate)
            : "View daily hours and request a time edit"}
        </p>
      </button>

      {openEntry && (
        <Button
          type="button"
          variant={hasShiftRecap ? "destructive" : "default"}
          className="w-full h-14 text-lg font-semibold"
          onClick={() => setClockOutOpen(true)}
          data-testid="button-start-clock-out"
        >
          {hasShiftRecap ? <LogOut className="w-5 h-5 mr-2" /> : <BookOpen className="w-5 h-5 mr-2" />}
          {hasShiftRecap ? "Clock out" : "Write recap"}
        </Button>
      )}

      {recapsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading recaps…</p>
      ) : recaps.length === 0 ? (
        <div className="text-center py-10 px-2">
          <BookOpen className="w-14 h-14 mx-auto mb-3 text-primary/70" />
          <p className="text-lg font-semibold">No recaps yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Write your recap when the shift is done. Clock out only appears after that recap is saved.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {todayRecaps.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
              {todayRecaps.map((recap) => (
                <RecapCard key={recap.id} recap={recap} />
              ))}
            </section>
          )}
          {earlierRecaps.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Earlier
              </p>
              {earlierRecaps.map((recap) => (
                <RecapCard key={recap.id} recap={recap} />
              ))}
            </section>
          )}
        </div>
      )}

      <StudentClockOutDialog open={clockOutOpen} onOpenChange={setClockOutOpen} />
    </div>
  );
}
