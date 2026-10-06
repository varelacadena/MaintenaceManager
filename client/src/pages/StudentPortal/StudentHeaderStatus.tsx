import { Link } from "wouter";
import { Clock } from "lucide-react";
import { useLiveNow } from "@/hooks/useLiveNow";
import { elapsedMilliseconds, formatLiveDuration } from "@shared/studentPortal";
import { useStudentTimeClock } from "./studentPortalApi";

export function StudentHeaderStatus() {
  const { data } = useStudentTimeClock(true);
  const openEntry = data?.openEntry;
  const now = useLiveNow(Boolean(openEntry?.clockInAt));

  if (!openEntry?.clockInAt) return null;

  const elapsed = formatLiveDuration(elapsedMilliseconds(openEntry.clockInAt, now));

  return (
    <Link
      href="/clock-out"
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 text-sm font-medium text-emerald-800 dark:text-emerald-200"
      data-testid="link-student-clock-status"
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{elapsed}</span>
    </Link>
  );
}
