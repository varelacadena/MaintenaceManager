import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin, requireRole } from "../middleware";
import { handleRouteError } from "../routeUtils";
import { storage } from "../storage";
import * as studentStorage from "../storage/students";
import { formatUserDisplayName } from "@shared/displayNames";
import {
  addLocalDays,
  adminStudentTimeEntryCreateSchema,
  adminStudentTimeEntryPatchSchema,
  adminTimeEditReviewSchema,
  assertClockRange,
  computeDurationMinutes,
  hoursFromMinutes,
  localDateString,
  localWeekRange,
  parseLocalDate,
  resolveEntryMinutes,
  studentClockInRequestSchema,
  studentRecapRequestSchema,
  studentTimeEditRequestSchema,
  weekdayLabel,
} from "@shared/studentPortal";

const requireStudent = requireRole("student");

function parseDateBoundary(value: unknown, endOfDay = false): Date | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function recapDateValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function serializeTimeEntry(
  entry: Awaited<ReturnType<typeof studentStorage.createStudentTimeEntry>>,
  extras: { pendingEditRequestId?: string | null } = {},
) {
  return {
    id: entry.id,
    studentId: entry.studentId,
    studentName: entry.studentName,
    supervisorId: entry.supervisorId,
    supervisorName: entry.supervisorName,
    clockInAt: entry.clockInAt?.toISOString() ?? null,
    clockOutAt: entry.clockOutAt?.toISOString() ?? null,
    durationMinutes: entry.durationMinutes,
    pendingEditRequestId: extras.pendingEditRequestId ?? null,
  };
}

function serializeRecap(recap: Awaited<ReturnType<typeof studentStorage.createStudentDailyRecap>>) {
  return {
    id: recap.id,
    studentId: recap.studentId,
    studentName: recap.studentName,
    timeEntryId: recap.timeEntryId,
    recapDate: recapDateValue(recap.recapDate),
    whatIDid: recap.whatIDid,
    whatILearned: recap.whatILearned,
    createdAt: recap.createdAt?.toISOString() ?? null,
  };
}

function serializeEditRequest(row: Awaited<ReturnType<typeof studentStorage.createStudentTimeEditRequest>>) {
  const requestedOut = row.requestedClockOutAt ?? null;
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: row.studentName,
    timeEntryId: row.timeEntryId,
    requestedClockInAt: row.requestedClockInAt?.toISOString() ?? null,
    requestedClockOutAt: requestedOut?.toISOString() ?? null,
    originalClockInAt: row.originalClockInAt?.toISOString() ?? null,
    originalClockOutAt: row.originalClockOutAt?.toISOString() ?? null,
    requestedMinutes: requestedOut
      ? computeDurationMinutes(row.requestedClockInAt, requestedOut)
      : null,
    reason: row.reason,
    status: row.status,
    adminNote: row.adminNote,
    reviewedByName: row.reviewedByName,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function durationForTimes(clockInAt: Date, clockOutAt: Date | null): number | null {
  if (!clockOutAt) return null;
  return computeDurationMinutes(clockInAt, clockOutAt);
}

async function applyTimeEntryTimes(
  entryId: string,
  studentId: string | null | undefined,
  clockInAt: Date,
  clockOutAt: Date | null,
) {
  const rangeError = assertClockRange(clockInAt, clockOutAt);
  if (rangeError) {
    return { error: rangeError, status: 400 as const };
  }

  if (!clockOutAt && studentId) {
    const open = await studentStorage.getOpenStudentTimeEntry(studentId);
    if (open && open.id !== entryId) {
      return { error: "This student already has an open clock-in", status: 409 as const };
    }
  }

  const updated = await studentStorage.updateStudentTimeEntry(entryId, {
    clockInAt,
    clockOutAt,
    durationMinutes: durationForTimes(clockInAt, clockOutAt),
  });
  return { entry: updated };
}

async function notifyAdminsOfTimeEdit(studentName: string, studentId: string, requestId: string) {
  try {
    const admins = await storage.getUsersByRoles(["admin"]);
    await Promise.all(
      admins.map((admin) =>
        storage.createNotification({
          userId: admin.id,
          type: "system",
          title: "Student time edit requested",
          message: `${studentName} asked to change a clock entry.`,
          link: `/students/${studentId}`,
          relatedId: requestId,
          relatedType: "student_time_edit",
        }),
      ),
    );
  } catch (error) {
    console.error("Failed to notify admins of student time edit", error);
  }
}

async function notifyStudentOfTimeEditReview(studentId: string | null, approved: boolean, requestId: string) {
  if (!studentId) return;
  try {
    await storage.createNotification({
      userId: studentId,
      type: "system",
      title: approved ? "Time edit approved" : "Time edit denied",
      message: approved
        ? "An admin updated your clock time."
        : "An admin declined your clock time request.",
      link: "/hours",
      relatedId: requestId,
      relatedType: "student_time_edit",
    });
  } catch (error) {
    console.error("Failed to notify student of time edit review", error);
  }
}

export function registerStudentRoutes(app: Express) {
  app.get("/api/student/time-clock", isAuthenticated, requireStudent, async (req: any, res) => {
    try {
      const student = req.currentUser;
      await studentStorage.closeOvernightOpenStudentShift(student.id);
      const openEntry = await studentStorage.getOpenStudentTimeEntry(student.id);
      const latest = openEntry ?? (await studentStorage.getLatestStudentTimeEntry(student.id));
      const todayRecapCount = await studentStorage.countStudentRecapsOnDate(student.id, localDateString());
      const week = localWeekRange();
      const weekEntries = await studentStorage.listStudentTimeEntries({
        studentId: student.id,
        startDate: week.start,
        endDate: week.end,
      });
      const weekMinutes = weekEntries.reduce((sum, entry) => {
        if (!entry.clockOutAt) return sum;
        return sum + resolveEntryMinutes(entry.clockInAt, entry.clockOutAt, entry.durationMinutes);
      }, 0);

      res.json({
        openEntry: openEntry ? serializeTimeEntry(openEntry) : null,
        lastSupervisorId: latest?.supervisorId ?? null,
        lastSupervisorName: latest?.supervisorName ?? null,
        todayRecapCount,
        weekMinutes,
        weekStartDate: week.startDate,
        weekEndDate: week.endDate,
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to load clock status");
    }
  });

  app.post("/api/student/time-clock/clock-in", isAuthenticated, requireStudent, async (req: any, res) => {
    try {
      const parsed = studentClockInRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Select your supervisor", errors: parsed.error.flatten().fieldErrors });
      }

      const student = req.currentUser;
      await studentStorage.closeOvernightOpenStudentShift(student.id);
      const existing = await studentStorage.getOpenStudentTimeEntry(student.id);
      if (existing) {
        return res.status(409).json({ message: "You are already clocked in" });
      }

      const supervisor = await storage.getUser(parsed.data.supervisorId);
      if (!supervisor || supervisor.role !== "technician") {
        return res.status(400).json({ message: "Choose a supervisor from the technician list" });
      }

      const entry = await studentStorage.createStudentTimeEntry({
        studentId: student.id,
        studentName: formatUserDisplayName(student),
        supervisorId: supervisor.id,
        supervisorName: formatUserDisplayName(supervisor),
        clockInAt: new Date(),
      });

      res.status(201).json(serializeTimeEntry(entry));
    } catch (error) {
      handleRouteError(res, error, "Failed to clock in");
    }
  });

  app.post("/api/student/time-clock/clock-out", isAuthenticated, requireStudent, async (req: any, res) => {
    try {
      const student = req.currentUser;
      const openEntry = await studentStorage.getOpenStudentTimeEntry(student.id);
      if (!openEntry) {
        return res.status(409).json({ message: "You are not clocked in" });
      }

      let recapCount = await studentStorage.countStudentRecapsForTimeEntry(openEntry.id);
      if (recapCount < 1) {
        const parsed = studentRecapRequestSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
          return res.status(409).json({ message: "Write your daily recap before clocking out" });
        }
        await studentStorage.createStudentDailyRecap({
          studentId: student.id,
          studentName: formatUserDisplayName(student),
          timeEntryId: openEntry.id,
          recapDate: parsed.data.recapDate || localDateString(openEntry.clockInAt ?? new Date()),
          whatIDid: parsed.data.whatIDid,
          whatILearned: parsed.data.whatILearned,
        });
      }

      const clockOutAt = new Date();
      const clockInAt = openEntry.clockInAt ?? clockOutAt;
      const updated = await studentStorage.clockOutStudentTimeEntry(
        openEntry.id,
        clockOutAt,
        computeDurationMinutes(clockInAt, clockOutAt),
      );

      res.json(serializeTimeEntry(updated ?? { ...openEntry, clockOutAt, durationMinutes: computeDurationMinutes(clockInAt, clockOutAt) }));
    } catch (error) {
      handleRouteError(res, error, "Failed to clock out");
    }
  });

  app.get("/api/student/hours", isAuthenticated, requireStudent, async (req: any, res) => {
    try {
      const student = req.currentUser;
      const week = localWeekRange(parseLocalDate(typeof req.query.weekStart === "string" ? req.query.weekStart : undefined));
      const [entries, editRequests] = await Promise.all([
        studentStorage.listStudentTimeEntries({
          studentId: student.id,
          startDate: week.start,
          endDate: week.end,
        }),
        studentStorage.listStudentTimeEditRequests({ studentId: student.id }),
      ]);

      const pendingByEntry = new Map(
        editRequests
          .filter((request) => request.status === "pending" && request.timeEntryId)
          .map((request) => [request.timeEntryId as string, request.id]),
      );

      const days = Array.from({ length: 7 }, (_, index) => {
        const date = localDateString(addLocalDays(week.start, index));
        const dayEntries = entries.filter((entry) => entry.clockInAt && localDateString(entry.clockInAt) === date);
        const minutes = dayEntries.reduce(
          (sum, entry) => sum + resolveEntryMinutes(entry.clockInAt, entry.clockOutAt, entry.durationMinutes),
          0,
        );
        return { date, label: weekdayLabel(date), minutes };
      });

      const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0);

      res.json({
        weekStartDate: week.startDate,
        weekEndDate: week.endDate,
        totalMinutes,
        days,
        entries: entries.map((entry) =>
          serializeTimeEntry(entry, { pendingEditRequestId: pendingByEntry.get(entry.id) ?? null }),
        ),
        editRequests: editRequests.map(serializeEditRequest),
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to load hours");
    }
  });

  app.post("/api/student/time-edit-requests", isAuthenticated, requireStudent, async (req: any, res) => {
    try {
      const parsed = studentTimeEditRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Add the corrected times and a reason",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const student = req.currentUser;
      const entry = await studentStorage.getStudentTimeEntry(parsed.data.timeEntryId);
      if (!entry || entry.studentId !== student.id) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      const existingPending = await studentStorage.getPendingEditRequestForEntry(entry.id);
      if (existingPending) {
        return res.status(409).json({ message: "You already have a pending edit for this entry" });
      }

      const requestedClockInAt = parseTimestamp(parsed.data.requestedClockInAt);
      if (!requestedClockInAt) {
        return res.status(400).json({ message: "Enter a valid clock-in time" });
      }
      const requestedClockOutAt =
        parsed.data.requestedClockOutAt === undefined
          ? entry.clockOutAt ?? null
          : parseTimestamp(parsed.data.requestedClockOutAt);

      const rangeError = assertClockRange(requestedClockInAt, requestedClockOutAt);
      if (rangeError) {
        return res.status(400).json({ message: rangeError });
      }

      const created = await studentStorage.createStudentTimeEditRequest({
        studentId: student.id,
        studentName: formatUserDisplayName(student),
        timeEntryId: entry.id,
        requestedClockInAt,
        requestedClockOutAt,
        originalClockInAt: entry.clockInAt,
        originalClockOutAt: entry.clockOutAt ?? null,
        reason: parsed.data.reason,
        status: "pending",
      });

      await notifyAdminsOfTimeEdit(formatUserDisplayName(student), student.id, created.id);
      res.status(201).json(serializeEditRequest(created));
    } catch (error) {
      handleRouteError(res, error, "Failed to submit time edit request");
    }
  });

  app.get("/api/student/recaps", isAuthenticated, requireStudent, async (req: any, res) => {
    try {
      const recaps = await studentStorage.listStudentDailyRecaps({ studentId: req.currentUser.id });
      res.json(recaps.map(serializeRecap));
    } catch (error) {
      handleRouteError(res, error, "Failed to load recaps");
    }
  });

  app.post("/api/student/recaps", isAuthenticated, requireStudent, async (req: any, res) => {
    try {
      const parsed = studentRecapRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Add what you did and what you learned",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const student = req.currentUser;
      const openEntry = await studentStorage.getOpenStudentTimeEntry(student.id);
      if (!openEntry) {
        return res.status(409).json({ message: "Clock in before writing a recap" });
      }

      const recap = await studentStorage.createStudentDailyRecap({
        studentId: student.id,
        studentName: formatUserDisplayName(student),
        timeEntryId: openEntry.id,
        recapDate: parsed.data.recapDate || localDateString(),
        whatIDid: parsed.data.whatIDid,
        whatILearned: parsed.data.whatILearned,
      });

      res.status(201).json(serializeRecap(recap));
    } catch (error) {
      handleRouteError(res, error, "Failed to save recap");
    }
  });

  app.get("/api/admin/students", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const startDate = parseDateBoundary(req.query.startDate);
      const endDate = parseDateBoundary(req.query.endDate, true);
      const students = await studentStorage.listStudents();
      const entries = await studentStorage.listStudentTimeEntries({ startDate, endDate });
      const recaps = await studentStorage.listStudentDailyRecaps({ startDate, endDate });
      const pendingEdits = await studentStorage.listStudentTimeEditRequests({ status: "pending" });
      const today = localDateString();

      const now = Date.now();
      const rows = students.map((student) => {
        const studentEntries = entries.filter((entry) => entry.studentId === student.id);
        const openEntry = studentEntries.find((entry) => !entry.clockOutAt);
        const latestOpen = openEntry;
        const hoursInRange = studentEntries.reduce(
          (sum, entry) =>
            sum + resolveEntryMinutes(entry.clockInAt, entry.clockOutAt, entry.durationMinutes, new Date(now)),
          0,
        );
        const studentRecaps = recaps.filter((recap) => recap.studentId === student.id);
        const recapsToday = studentRecaps.filter((recap) => recap.recapDate === today).length;
        const pendingEditCount = pendingEdits.filter((request) => request.studentId === student.id).length;

        return {
          id: student.id,
          username: student.username,
          firstName: student.firstName,
          lastName: student.lastName,
          name: formatUserDisplayName(student),
          isClockedIn: Boolean(latestOpen),
          supervisorName: latestOpen?.supervisorName ?? studentEntries[0]?.supervisorName ?? null,
          clockInAt: latestOpen?.clockInAt?.toISOString() ?? null,
          hoursInRange: hoursFromMinutes(hoursInRange),
          minutesInRange: hoursInRange,
          recapCount: studentRecaps.length,
          recapsToday,
          pendingEditCount,
        };
      });

      const clockedInCount = rows.filter((row) => row.isClockedIn).length;
      const recapsToday = recaps.filter((recap) => recap.recapDate === today).length;
      const hoursToday = rows
        .filter((row) => row.isClockedIn || row.recapsToday > 0)
        .reduce((sum, row) => sum + row.hoursInRange, 0);

      res.json({
        students: rows,
        clockedInCount,
        recapsToday,
        hoursToday: Math.round(hoursToday * 10) / 10,
        recapCount: recaps.length,
        pendingEditCount: pendingEdits.length,
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to load students");
    }
  });

  app.patch("/api/admin/students/:id/time-entries/:entryId", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const student = await storage.getUser(req.params.id);
      if (!student || student.role !== "student") {
        return res.status(404).json({ message: "Student not found" });
      }

      const parsed = adminStudentTimeEntryPatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Enter valid clock times", errors: parsed.error.flatten().fieldErrors });
      }

      const entry = await studentStorage.getStudentTimeEntry(req.params.entryId);
      if (!entry || entry.studentId !== student.id) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      const clockInAt = parseTimestamp(parsed.data.clockInAt);
      if (!clockInAt) {
        return res.status(400).json({ message: "Enter a valid clock-in time" });
      }
      const clockOutAt =
        parsed.data.clockOutAt === undefined ? entry.clockOutAt ?? null : parseTimestamp(parsed.data.clockOutAt);

      const result = await applyTimeEntryTimes(entry.id, student.id, clockInAt, clockOutAt);
      if ("error" in result && result.error) {
        return res.status(result.status).json({ message: result.error });
      }
      res.json(serializeTimeEntry(result.entry ?? entry));
    } catch (error) {
      handleRouteError(res, error, "Failed to update time entry");
    }
  });

  app.delete("/api/admin/students/:id/time-entries/:entryId", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const student = await storage.getUser(req.params.id);
      if (!student || student.role !== "student") {
        return res.status(404).json({ message: "Student not found" });
      }

      const entry = await studentStorage.getStudentTimeEntry(req.params.entryId);
      if (!entry || entry.studentId !== student.id) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      const deleted = await studentStorage.deleteStudentTimeEntry(entry.id);
      if (!deleted) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      res.json({ ok: true, id: deleted.id });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete time entry");
    }
  });

  app.post("/api/admin/students/:id/time-entries", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const student = await storage.getUser(req.params.id);
      if (!student || student.role !== "student") {
        return res.status(404).json({ message: "Student not found" });
      }

      const parsed = adminStudentTimeEntryCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Enter clock times and a supervisor", errors: parsed.error.flatten().fieldErrors });
      }

      const supervisor = await storage.getUser(parsed.data.supervisorId);
      if (!supervisor || supervisor.role !== "technician") {
        return res.status(400).json({ message: "Choose a supervisor from the technician list" });
      }

      const clockInAt = parseTimestamp(parsed.data.clockInAt);
      if (!clockInAt) {
        return res.status(400).json({ message: "Enter a valid clock-in time" });
      }
      const clockOutAt = parsed.data.clockOutAt === undefined ? null : parseTimestamp(parsed.data.clockOutAt);
      const rangeError = assertClockRange(clockInAt, clockOutAt);
      if (rangeError) {
        return res.status(400).json({ message: rangeError });
      }
      if (!clockOutAt) {
        const open = await studentStorage.getOpenStudentTimeEntry(student.id);
        if (open) {
          return res.status(409).json({ message: "This student already has an open clock-in" });
        }
      }

      const created = await studentStorage.createStudentTimeEntry({
        studentId: student.id,
        studentName: formatUserDisplayName(student),
        supervisorId: supervisor.id,
        supervisorName: formatUserDisplayName(supervisor),
        clockInAt,
        clockOutAt,
        durationMinutes: durationForTimes(clockInAt, clockOutAt),
      });
      res.status(201).json(serializeTimeEntry(created));
    } catch (error) {
      handleRouteError(res, error, "Failed to add time entry");
    }
  });

  app.post("/api/admin/student-time-edits/:requestId/review", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const parsed = adminTimeEditReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Approve or deny this request", errors: parsed.error.flatten().fieldErrors });
      }

      const request = await studentStorage.getStudentTimeEditRequest(req.params.requestId);
      if (!request) {
        return res.status(404).json({ message: "Time edit request not found" });
      }
      if (request.status !== "pending") {
        return res.status(409).json({ message: "This request was already reviewed" });
      }

      if (parsed.data.status === "approved") {
        if (!request.timeEntryId) {
          return res.status(409).json({ message: "The original time entry is no longer available" });
        }
        const clockInAt = parseTimestamp(parsed.data.clockInAt) ?? request.requestedClockInAt;
        const clockOutAt =
          parsed.data.clockOutAt === undefined
            ? request.requestedClockOutAt ?? null
            : parseTimestamp(parsed.data.clockOutAt);
        const result = await applyTimeEntryTimes(request.timeEntryId, request.studentId, clockInAt, clockOutAt);
        if ("error" in result && result.error) {
          return res.status(result.status).json({ message: result.error });
        }
      }

      const reviewer = req.currentUser;
      const updated = await studentStorage.reviewStudentTimeEditRequest(request.id, {
        status: parsed.data.status,
        adminNote: parsed.data.adminNote || null,
        reviewedById: reviewer.id,
        reviewedByName: formatUserDisplayName(reviewer),
        reviewedAt: new Date(),
      });

      await notifyStudentOfTimeEditReview(request.studentId, parsed.data.status === "approved", request.id);
      res.json(serializeEditRequest(updated ?? request));
    } catch (error) {
      handleRouteError(res, error, "Failed to review time edit");
    }
  });

  app.get("/api/admin/students/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const student = await storage.getUser(req.params.id);
      if (!student || student.role !== "student") {
        return res.status(404).json({ message: "Student not found" });
      }

      const startDate = parseDateBoundary(req.query.startDate);
      const endDate = parseDateBoundary(req.query.endDate, true);
      const [timeEntries, recaps, editRequests] = await Promise.all([
        studentStorage.listStudentTimeEntries({ studentId: student.id, startDate, endDate }),
        studentStorage.listStudentDailyRecaps({ studentId: student.id, startDate, endDate }),
        studentStorage.listStudentTimeEditRequests({ studentId: student.id }),
      ]);

      const pendingByEntry = new Map(
        editRequests
          .filter((request) => request.status === "pending" && request.timeEntryId)
          .map((request) => [request.timeEntryId as string, request.id]),
      );
      const openEntry = await studentStorage.getOpenStudentTimeEntry(student.id);

      res.json({
        student: {
          id: student.id,
          username: student.username,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          name: formatUserDisplayName(student),
          isClockedIn: Boolean(openEntry),
        },
        timeEntries: timeEntries.map((entry) =>
          serializeTimeEntry(entry, { pendingEditRequestId: pendingByEntry.get(entry.id) ?? null }),
        ),
        recaps: recaps.map(serializeRecap),
        editRequests: editRequests.map(serializeEditRequest),
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to load student detail");
    }
  });
}
