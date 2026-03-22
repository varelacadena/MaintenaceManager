import assert from "node:assert";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
let passed = 0;
let failed = 0;

async function login(username: string, password: string): Promise<{ cookie: string; user: any }> {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    redirect: "manual",
  });
  const body = await res.json();
  const rawHeaders = res.headers;
  const cookies: string[] = [];
  rawHeaders.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") cookies.push(value);
  });
  if (cookies.length === 0 && typeof rawHeaders.getSetCookie === "function") {
    cookies.push(...rawHeaders.getSetCookie());
  }
  const sessionCookie = cookies.find((c: string) => c.startsWith("connect.sid"));
  if (!sessionCookie) {
    throw new Error(`Login failed for ${username} (status ${res.status}): ${JSON.stringify(body).substring(0, 200)}`);
  }
  return { cookie: sessionCookie.split(";")[0], user: body.user };
}

async function apiGet(path: string, cookie: string) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { Cookie: cookie } });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function apiPatch(path: string, body: any, cookie: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function apiPost(path: string, body: any, cookie: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function apiDelete(path: string, cookie: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  return { status: res.status };
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (e: any) {
    failed++;
    console.error(`  FAIL: ${name} — ${e.message}`);
  }
}

async function main() {
  console.log("\n=== Task Features E2E Tests ===\n");

  const adminSession = await login("admin", "123456");
  const techSession = await login("maintenance", "123456");
  const studentSession = await login("Sebastian", "123456");

  const adminCookie = adminSession.cookie;
  const techCookie = techSession.cookie;
  const studentCookie = studentSession.cookie;
  const adminUser = adminSession.user;
  const techUser = techSession.user;
  const studentUser = studentSession.user;

  assert.ok(adminUser.id, "Admin should be logged in");
  assert.ok(techUser.id, "Technician should be logged in");
  assert.ok(studentUser.id, "Student should be logged in");
  console.log(`Logged in: admin=${adminUser.id}, tech=${techUser.id}, student=${studentUser.id}`);

  let testTaskId: string | null = null;
  let parentTaskId: string | null = null;
  let subtaskId: string | null = null;

  try {
    console.log("\n--- Section 1: Task Completion Flow (Task #34) ---");

    await test("Admin can create a task for technician", async () => {
      const res = await apiPost("/api/tasks", {
        name: "E2E Completion Test Task",
        description: "Test task for completion flow validation",
        urgency: "medium",
        initialDate: new Date().toISOString(),
        estimatedCompletionDate: new Date().toISOString(),
        assignedToId: techUser.id,
        executorType: "technician",
        status: "in_progress",
      }, adminCookie);
      assert.ok(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
      testTaskId = res.data.id;
      assert.ok(testTaskId, "Task ID should be returned");
    });

    await test("Task starts as in_progress", async () => {
      const res = await apiGet(`/api/tasks/${testTaskId}`, techCookie);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, "in_progress");
    });

    await test("Technician can complete task via status update", async () => {
      const res = await apiPatch(`/api/tasks/${testTaskId}/status`, {
        status: "completed",
      }, techCookie);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, "completed");
    });

    await test("Completed task has actualCompletionDate set", async () => {
      const res = await apiGet(`/api/tasks/${testTaskId}`, techCookie);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, "completed");
      assert.ok(res.data.actualCompletionDate, "actualCompletionDate should be set on completed task");
      const completionDate = new Date(res.data.actualCompletionDate);
      assert.ok(!isNaN(completionDate.getTime()), "actualCompletionDate should be a valid date");
    });

    await test("Completed task retains all data and is accessible", async () => {
      const res = await apiGet(`/api/tasks/${testTaskId}`, techCookie);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, "completed");
      assert.strictEqual(res.data.name, "E2E Completion Test Task");
      assert.strictEqual(res.data.description, "Test task for completion flow validation");
      assert.strictEqual(res.data.assignedToId, techUser.id);
    });

    await test("Can add a note to completed task", async () => {
      const res = await apiPost("/api/task-notes", {
        taskId: testTaskId,
        content: "Post-completion note",
      }, techCookie);
      assert.ok(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}: ${JSON.stringify(res.data)}`);
    });

    await test("Notes on completed task are retrievable", async () => {
      const res = await apiGet(`/api/task-notes/task/${testTaskId}`, techCookie);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      const postNote = res.data.find((n: any) => n.content === "Post-completion note");
      assert.ok(postNote, "Post-completion note should exist");
    });

    await test("Can add parts to completed task", async () => {
      const res = await apiPost("/api/parts", {
        taskId: testTaskId,
        partName: "Post-completion part",
        quantity: "1",
        cost: 5.0,
      }, techCookie);
      assert.ok(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}: ${JSON.stringify(res.data)}`);
    });

    await test("Parts on completed task are retrievable", async () => {
      const res = await apiGet(`/api/parts/task/${testTaskId}`, techCookie);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      const part = res.data.find((p: any) => p.partName === "Post-completion part");
      assert.ok(part, "Post-completion part should exist");
    });

    console.log("\n--- Section 2: Subtask Completion Navigation (Task #34) ---");

    await test("Create parent task and subtask", async () => {
      const parentRes = await apiPost("/api/tasks", {
        name: "E2E Parent Task",
        description: "Parent for subtask nav test",
        urgency: "medium",
        initialDate: new Date().toISOString(),
        assignedToId: techUser.id,
        executorType: "technician",
        status: "in_progress",
      }, adminCookie);
      assert.ok(parentRes.status === 200 || parentRes.status === 201);
      parentTaskId = parentRes.data.id;

      const subRes = await apiPost("/api/tasks", {
        name: "E2E Subtask",
        description: "Subtask for nav test",
        urgency: "medium",
        initialDate: new Date().toISOString(),
        assignedToId: techUser.id,
        executorType: "technician",
        status: "in_progress",
        parentTaskId: parentTaskId,
      }, adminCookie);
      assert.ok(subRes.status === 200 || subRes.status === 201);
      subtaskId = subRes.data.id;
    });

    await test("Subtask has parentTaskId set", async () => {
      const res = await apiGet(`/api/tasks/${subtaskId}`, techCookie);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.parentTaskId, parentTaskId);
    });

    await test("Completing subtask preserves parentTaskId for navigation", async () => {
      const res = await apiPatch(`/api/tasks/${subtaskId}/status`, {
        status: "completed",
      }, techCookie);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, "completed");
      assert.strictEqual(res.data.parentTaskId, parentTaskId);
    });

    await test("Completed subtask has actualCompletionDate", async () => {
      const res = await apiGet(`/api/tasks/${subtaskId}`, techCookie);
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.actualCompletionDate, "Subtask should have actualCompletionDate after completion");
    });

    console.log("\n--- Section 3: Date Filtering (Task #35) ---");

    await test("Tasks API returns tasks with all date fields present", async () => {
      const res = await apiGet(`/api/tasks/${testTaskId}`, adminCookie);
      assert.strictEqual(res.status, 200);
      assert.ok("initialDate" in res.data, "Task should have initialDate field");
      assert.ok("estimatedCompletionDate" in res.data, "Task should have estimatedCompletionDate field");
      assert.ok("actualCompletionDate" in res.data, "Task should have actualCompletionDate field");
    });

    await test("Test task created today has today's initialDate", async () => {
      const res = await apiGet(`/api/tasks/${testTaskId}`, adminCookie);
      assert.strictEqual(res.status, 200);
      const taskDate = new Date(res.data.initialDate);
      const now = new Date();
      assert.strictEqual(taskDate.getUTCFullYear(), now.getUTCFullYear(), "Year should match");
      assert.strictEqual(taskDate.getUTCMonth(), now.getUTCMonth(), "Month should match");
      assert.strictEqual(taskDate.getUTCDate(), now.getUTCDate(), "Day should match");
    });

    await test("Technician sees test tasks in their task list", async () => {
      const res = await apiGet("/api/tasks", techCookie);
      assert.strictEqual(res.status, 200);
      const ourTask = res.data.find((t: any) => t.id === testTaskId);
      assert.ok(ourTask, "Technician should see the test task they were assigned");
    });

    await test("Student can access task list", async () => {
      const res = await apiGet("/api/tasks", studentCookie);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    await test("Date filter logic: test tasks appear when filtering for today", async () => {
      const res = await apiGet("/api/tasks", adminCookie);
      const now = new Date();
      const todayTasks = res.data.filter((t: any) => {
        const dateStr = t.estimatedCompletionDate || t.initialDate;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getUTCFullYear() === now.getUTCFullYear()
          && d.getUTCMonth() === now.getUTCMonth()
          && d.getUTCDate() === now.getUTCDate();
      });
      const ourTestTask = todayTasks.find((t: any) => t.id === testTaskId);
      assert.ok(ourTestTask, "Test task should appear in today's filter results");
    });

    await test("Recently completed test task passes 7-day recency check", async () => {
      const res = await apiGet(`/api/tasks/${testTaskId}`, adminCookie);
      assert.strictEqual(res.data.status, "completed");
      assert.ok(res.data.actualCompletionDate, "Should have actualCompletionDate");
      const completionDate = new Date(res.data.actualCompletionDate);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      assert.ok(completionDate >= sevenDaysAgo, "Test task completed today should be within 7-day window");
    });

    console.log("\n--- Section 4: Upload Labels (Task #36) ---");

    await test("Uploads endpoint returns array for task", async () => {
      const res = await apiGet(`/api/uploads/task/${testTaskId}`, techCookie);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    await test("Uploads endpoint accessible by admin", async () => {
      const res = await apiGet(`/api/uploads/task/${testTaskId}`, adminCookie);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    console.log("\n--- Section 5: Cross-Feature Integration ---");

    await test("Completed task appears in task list with correct status", async () => {
      const res = await apiGet("/api/tasks", techCookie);
      assert.strictEqual(res.status, 200);
      const completedTask = res.data.find((t: any) => t.id === testTaskId);
      assert.ok(completedTask, "Completed task should appear in task list");
      assert.strictEqual(completedTask.status, "completed");
    });

    await test("Task detail API returns all associated data for completed task", async () => {
      const [taskRes, notesRes, uploadsRes] = await Promise.all([
        apiGet(`/api/tasks/${testTaskId}`, techCookie),
        apiGet(`/api/task-notes/task/${testTaskId}`, techCookie),
        apiGet(`/api/uploads/task/${testTaskId}`, techCookie),
      ]);
      assert.strictEqual(taskRes.status, 200);
      assert.strictEqual(notesRes.status, 200);
      assert.strictEqual(uploadsRes.status, 200);
      assert.strictEqual(taskRes.data.status, "completed");
      assert.ok(Array.isArray(notesRes.data), "Notes should be an array");
      assert.ok(notesRes.data.length > 0, "Should have at least one note");
      assert.ok(Array.isArray(uploadsRes.data), "Uploads should be an array");
    });

    await test("Admin can view technician's completed task", async () => {
      const res = await apiGet(`/api/tasks/${testTaskId}`, adminCookie);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, "completed");
      assert.strictEqual(res.data.assignedToId, techUser.id);
    });

    await test("All roles can access task list without errors", async () => {
      const [adminRes, techRes, studentRes] = await Promise.all([
        apiGet("/api/tasks", adminCookie),
        apiGet("/api/tasks", techCookie),
        apiGet("/api/tasks", studentCookie),
      ]);
      assert.strictEqual(adminRes.status, 200);
      assert.strictEqual(techRes.status, 200);
      assert.strictEqual(studentRes.status, 200);
      assert.ok(Array.isArray(adminRes.data));
      assert.ok(Array.isArray(techRes.data));
      assert.ok(Array.isArray(studentRes.data));
    });

    await test("Frontend pages load without server errors", async () => {
      const pages = ["/", "/work", "/login"];
      for (const page of pages) {
        const res = await fetch(`${BASE_URL}${page}`);
        assert.ok(res.status < 500, `Page ${page} should not return 5xx (got ${res.status})`);
      }
    });

  } finally {
    console.log("\n--- Cleanup ---");
    try {
      if (subtaskId) await apiDelete(`/api/tasks/${subtaskId}`, adminCookie);
      if (parentTaskId) await apiDelete(`/api/tasks/${parentTaskId}`, adminCookie);
      if (testTaskId) await apiDelete(`/api/tasks/${testTaskId}`, adminCookie);
      console.log("  Test tasks cleaned up.");
    } catch (e: any) {
      console.error("  Cleanup error (non-fatal):", e.message);
    }
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
