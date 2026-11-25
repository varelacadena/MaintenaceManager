import { and, eq, isNull } from "drizzle-orm";
import { timeEntries } from "@shared/schema";
import {
  TASK_TIMER_AUTO_STOP_NOTE,
  studentShiftCutoff,
  taskTimerCutoff,
} from "@shared/openIntervals";
import { computeDurationMinutes } from "@shared/studentPortal";
import { db } from "./db";
import { createTaskNote } from "./storage/workOrders";
import { userDisplayName } from "./displayNameFill";
import { clockOutStudentTimeEntry, listOpenStudentTimeEntries } from "./storage/students";
import { log } from "./vite";

const INTERVAL_MS = 60 * 1000;

function taskMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
}

async function closeDueTaskTimers(now: Date): Promise<number> {
  const open = await db
    .select({
      id: timeEntries.id,
      taskId: timeEntries.taskId,
      userId: timeEntries.userId,
      startTime: timeEntries.startTime,
    })
    .from(timeEntries)
    .where(isNull(timeEntries.endTime));

  let closed = 0;
  for (const entry of open) {
    const startedAt = entry.startTime ? new Date(entry.startTime) : null;
    if (!startedAt || Number.isNaN(startedAt.getTime())) continue;
    const endAt = taskTimerCutoff(startedAt, now);
    if (!endAt) continue;
    const [updated] = await db
      .update(timeEntries)
      .set({ endTime: endAt, durationMinutes: taskMinutes(startedAt, endAt) })
      .where(and(eq(timeEntries.id, entry.id), isNull(timeEntries.endTime)))
      .returning({ id: timeEntries.id });
    if (!updated) continue;
    closed += 1;
    try {
      await createTaskNote({
        taskId: entry.taskId,
        userId: entry.userId,
        userName: await userDisplayName(entry.userId),
        content: TASK_TIMER_AUTO_STOP_NOTE,
        noteType: "job_note",
      });
    } catch (error) {
      console.error("Failed to record automatic timer stop", error);
    }
  }
  return closed;
}

async function closeDueStudentShifts(now: Date): Promise<number> {
  const open = await listOpenStudentTimeEntries();
  let closed = 0;
  for (const entry of open) {
    const startedAt = entry.clockInAt ? new Date(entry.clockInAt) : null;
    if (!startedAt || Number.isNaN(startedAt.getTime())) continue;
    const endAt = studentShiftCutoff(startedAt, now);
    if (!endAt) continue;
    const updated = await clockOutStudentTimeEntry(
      entry.id,
      endAt,
      computeDurationMinutes(startedAt, endAt),
    );
    if (updated) closed += 1;
  }
  return closed;
}

/** Close every open task timer and student shift whose cutoff has passed. */
export async function closeDueOpenIntervals(now: Date = new Date()): Promise<{
  taskTimers: number;
  studentShifts: number;
}> {
  const taskTimers = await closeDueTaskTimers(now);
  const studentShifts = await closeDueStudentShifts(now);
  return { taskTimers, studentShifts };
}

export function startOpenIntervalCloser(): void {
  const run = () => {
    closeDueOpenIntervals()
      .then((result) => {
        const total = result.taskTimers + result.studentShifts;
        if (total > 0) {
          log(
            `Closed ${result.taskTimers} task timer(s) and ${result.studentShifts} student shift(s) at their cutoff`,
          );
        }
      })
      .catch((error) => {
        console.error("Error closing open intervals:", error);
      });
  };

  run();
  setInterval(run, INTERVAL_MS);
  log("Open interval closer started (runs every minute)");
}
