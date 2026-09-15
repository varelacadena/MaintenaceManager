import assert from "node:assert";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    redirect: "manual",
  });
  const cookies: string[] =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const sessionCookie = cookies.find((c) => c.startsWith("connect.sid"));
  if (!sessionCookie) {
    throw new Error(`Login failed for ${username} (status ${res.status})`);
  }
  return sessionCookie.split(";")[0];
}

async function api(method: string, path: string, cookie: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function run() {
  console.log("\n=== Student portal API ===\n");

  const adminCookie = await login("admin", "123456");
  const techUsers = await api("GET", "/api/users/directory?role=technician", adminCookie);
  assert.strictEqual(techUsers.status, 200);
  assert.ok(Array.isArray(techUsers.data) && techUsers.data.length > 0, "need a technician supervisor");
  const supervisorId = techUsers.data[0].id;

  const username = `portaltest_${Date.now()}`;
  const created = await api("POST", "/api/users", adminCookie, {
    username,
    password: "test1234",
    firstName: "Portal",
    lastName: "Tester",
    role: "student",
  });
  assert.strictEqual(created.status, 200, "admin should create a student test account");
  const studentId = created.data.id;

  try {
    const studentCookie = await login(username, "test1234");
    const techCookie = await login("admin", "123456");

    const techs = await api("GET", "/api/users/directory?role=technician", studentCookie);
    assert.strictEqual(techs.status, 200);

    const statusBefore = await api("GET", "/api/student/time-clock", studentCookie);
    assert.strictEqual(statusBefore.status, 200);
    assert.equal(statusBefore.data.openEntry, null);

    const blockedRecap = await api("POST", "/api/student/recaps", studentCookie, {
      whatIDid: "Tried to save without clocking in first today.",
      whatILearned: "The portal requires a supervisor clock-in.",
    });
    assert.strictEqual(blockedRecap.status, 409, "recap should require clock in");

    const clockIn = await api("POST", "/api/student/time-clock/clock-in", studentCookie, { supervisorId });
    assert.strictEqual(clockIn.status, 201, "clock in should succeed");
    assert.equal(clockIn.data.supervisorId, supervisorId);

    const duplicate = await api("POST", "/api/student/time-clock/clock-in", studentCookie, { supervisorId });
    assert.strictEqual(duplicate.status, 409, "cannot clock in twice");

    const blockedClockOut = await api("POST", "/api/student/time-clock/clock-out", studentCookie);
    assert.strictEqual(blockedClockOut.status, 409, "clock out should require a daily recap");

    const recap = await api("POST", "/api/student/recaps", studentCookie, {
      whatIDid: "Helped the technician inspect filters and restock supplies.",
      whatILearned: "How to check the filter orientation before installing a new one.",
    });
    assert.strictEqual(recap.status, 201, "recap should save while clocked in");
    assert.equal(recap.data.timeEntryId, clockIn.data.id, "recap should belong to the open shift");

    const recaps = await api("GET", "/api/student/recaps", studentCookie);
    assert.strictEqual(recaps.status, 200);
    assert.ok(recaps.data.some((item: { id: string }) => item.id === recap.data.id));

    const clockOut = await api("POST", "/api/student/time-clock/clock-out", studentCookie);
    assert.strictEqual(clockOut.status, 200);
    assert.ok(clockOut.data.clockOutAt);

    const hours = await api("GET", "/api/student/hours", studentCookie);
    assert.strictEqual(hours.status, 200);
    assert.ok(typeof hours.data.totalMinutes === "number");
    assert.ok(Array.isArray(hours.data.days) && hours.data.days.length === 7);
    assert.ok(hours.data.entries.length >= 1);
    const entryId = hours.data.entries[0].id;

    const editRequest = await api("POST", "/api/student/time-edit-requests", studentCookie, {
      timeEntryId: entryId,
      requestedClockInAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      requestedClockOutAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      reason: "Forgot to clock out at the end of my shift.",
    });
    assert.strictEqual(editRequest.status, 201, "student can request a time edit");
    assert.equal(editRequest.data.status, "pending");

    const duplicateEdit = await api("POST", "/api/student/time-edit-requests", studentCookie, {
      timeEntryId: entryId,
      requestedClockInAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      requestedClockOutAt: new Date().toISOString(),
      reason: "Forgot to clock out at the end of my shift.",
    });
    assert.strictEqual(duplicateEdit.status, 409, "cannot stack pending edits on one entry");

    const adminForbidden = await api("GET", "/api/admin/students", studentCookie);
    assert.strictEqual(adminForbidden.status, 403);

    const adminList = await api("GET", "/api/admin/students", techCookie);
    assert.strictEqual(adminList.status, 200);
    const adminRow = adminList.data.students.find((row: { id: string }) => row.id === studentId);
    assert.ok(adminRow);
    assert.ok(adminRow.pendingEditCount >= 1);

    const countsPending = await api("GET", "/api/notifications/counts", techCookie);
    assert.strictEqual(countsPending.status, 200);
    assert.ok(countsPending.data.pendingStudentTimeEdits >= 1, "admin sidebar should count pending time edits");
    const pendingBeforeReview = countsPending.data.pendingStudentTimeEdits;

    const studentCounts = await api("GET", "/api/notifications/counts", studentCookie);
    assert.strictEqual(studentCounts.status, 200);
    assert.equal(studentCounts.data.pendingStudentTimeEdits ?? 0, 0);

    const detail = await api("GET", `/api/admin/students/${studentId}`, techCookie);
    assert.strictEqual(detail.status, 200);
    assert.ok(detail.data.timeEntries.length >= 1);
    assert.ok(detail.data.recaps.length >= 1);
    assert.ok(detail.data.editRequests.some((row: { id: string }) => row.id === editRequest.data.id));

    const patchedIn = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const patchedOut = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const patch = await api("PATCH", `/api/admin/students/${studentId}/time-entries/${entryId}`, techCookie, {
      clockInAt: patchedIn,
      clockOutAt: patchedOut,
    });
    assert.strictEqual(patch.status, 200, "admin can modify student time");
    assert.ok(patch.data.durationMinutes >= 100);

    const review = await api("POST", `/api/admin/student-time-edits/${editRequest.data.id}/review`, techCookie, {
      status: "approved",
      adminNote: "Adjusted to the requested window.",
    });
    assert.strictEqual(review.status, 200);
    assert.equal(review.data.status, "approved");

    const countsAfter = await api("GET", "/api/notifications/counts", techCookie);
    assert.strictEqual(countsAfter.status, 200);
    assert.equal(countsAfter.data.pendingStudentTimeEdits, pendingBeforeReview - 1);

    const extraIn = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const extraOut = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    const extra = await api("POST", `/api/admin/students/${studentId}/time-entries`, techCookie, {
      supervisorId,
      clockInAt: extraIn,
      clockOutAt: extraOut,
    });
    assert.strictEqual(extra.status, 201, "admin can add a time entry to delete");
    const removed = await api("DELETE", `/api/admin/students/${studentId}/time-entries/${extra.data.id}`, techCookie);
    assert.strictEqual(removed.status, 200, "admin can delete student time");
    const afterDelete = await api("GET", `/api/admin/students/${studentId}`, techCookie);
    assert.ok(!afterDelete.data.timeEntries.some((row: { id: string }) => row.id === extra.data.id));

    const studentCannotDelete = await api("DELETE", `/api/admin/students/${studentId}/time-entries/${entryId}`, studentCookie);
    assert.strictEqual(studentCannotDelete.status, 403);

    const analytics = await api("GET", "/api/analytics/technicians/summary?roleType=student", techCookie);
    assert.strictEqual(analytics.status, 200);
    assert.ok(Array.isArray(analytics.data));
    const analyticRow = analytics.data.find((row: { technicianId: string }) => row.technicianId === studentId);
    assert.ok(analyticRow, "student should appear on team analytics");
    assert.ok(analyticRow.clockHoursLogged >= 0);
    assert.ok(analyticRow.recapsSubmitted >= 1);

    const removedShift = await api("DELETE", `/api/admin/students/${studentId}/time-entries/${clockIn.data.id}`, techCookie);
    assert.strictEqual(removedShift.status, 200, "admin can delete a shift that has a recap");
    const afterShiftDelete = await api("GET", `/api/admin/students/${studentId}`, techCookie);
    assert.ok(!afterShiftDelete.data.timeEntries.some((row: { id: string }) => row.id === clockIn.data.id));
    assert.ok(
      !afterShiftDelete.data.recaps.some((row: { id: string }) => row.id === recap.data.id),
      "recap should be deleted with its shift",
    );
    const recapsAfterDelete = await api("GET", "/api/student/recaps", studentCookie);
    assert.strictEqual(recapsAfterDelete.status, 200);
    assert.ok(
      !recapsAfterDelete.data.some((item: { id: string }) => item.id === recap.data.id),
      "student recap list should drop the recap when its shift is deleted",
    );

    console.log("Student portal API checks passed.");
  } finally {
    await api("DELETE", `/api/users/${studentId}`, adminCookie);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
