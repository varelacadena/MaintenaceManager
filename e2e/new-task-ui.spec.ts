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
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function test(name: string, fn: () => Promise<void>) {
  return delay(300).then(() => fn())
    .then(() => { passed++; console.log(`  PASS: ${name}`); })
    .catch((err: any) => { failed++; console.error(`  FAIL: ${name}\n    ${err.message || err}`); });
}

async function main() {
  console.log("\n=== New Task Form – Two-Column Layout E2E Tests ===\n");

  const { cookie: adminCookie, user: adminUser } = await login("admin", "123456");
  console.log(`Logged in as admin: ${adminUser.username} (${adminUser.id})\n`);

  const { data: properties } = await apiGet("/api/properties", adminCookie);
  const { data: users } = await apiGet("/api/users", adminCookie);
  const { data: vendors } = await apiGet("/api/vendors", adminCookie);
  const { data: projects } = await apiGet("/api/projects", adminCookie);

  const firstProperty = Array.isArray(properties) && properties.length > 0 ? properties[0] : null;
  const studentUser = Array.isArray(users) ? users.find((u: any) => u.role === "student") : null;
  const techUser = Array.isArray(users) ? users.find((u: any) => u.role === "technician") : null;
  const firstVendor = Array.isArray(vendors) && vendors.length > 0 ? vendors[0] : null;
  const activeProject = Array.isArray(projects) ? projects.find((p: any) => p.status === "in_progress" || p.status === "planning") : null;

  console.log("--- Section 1: Basic Task Creation (One-Time) ---");

  let createdTaskId: string | null = null;

  await test("Create a basic one-time task with all required fields", async () => {
    const now = new Date();
    const startDate = now.toISOString();
    const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await apiPost("/api/tasks", {
      name: "Test Two-Column Layout Task",
      description: "Verify that the new task creation form produces valid tasks",
      urgency: "medium",
      initialDate: startDate,
      estimatedCompletionDate: dueDate,
      taskType: "one_time",
      status: "not_started",
      createdById: adminUser.id,
    }, adminCookie);

    assert.ok(res.status >= 200 && res.status < 300, `Expected 2xx, got ${res.status}: ${JSON.stringify(res.data).substring(0, 200)}`);
    assert.ok(res.data.id, "Task should have an ID");
    assert.strictEqual(res.data.name, "Test Two-Column Layout Task");
    assert.strictEqual(res.data.urgency, "medium");
    assert.strictEqual(res.data.taskType, "one_time");
    createdTaskId = res.data.id;
  });

  await test("Verify created task appears in task list", async () => {
    assert.ok(createdTaskId, "Task ID should exist");
    const res = await apiGet(`/api/tasks/${createdTaskId}`, adminCookie);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.name, "Test Two-Column Layout Task");
    assert.strictEqual(res.data.description, "Verify that the new task creation form produces valid tasks");
  });

  console.log("\n--- Section 2: Priority Levels ---");

  await test("Create task with LOW priority", async () => {
    const now = new Date();
    const res = await apiPost("/api/tasks", {
      name: "Low Priority Task",
      description: "Testing low priority toggle",
      urgency: "low",
      initialDate: now.toISOString(),
      estimatedCompletionDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      taskType: "one_time",
      status: "not_started",
      createdById: adminUser.id,
    }, adminCookie);
    assert.ok(res.status >= 200 && res.status < 300);
    assert.strictEqual(res.data.urgency, "low");
    if (res.data.id) await apiDelete(`/api/tasks/${res.data.id}`, adminCookie);
  });

  await test("Create task with HIGH priority", async () => {
    const now = new Date();
    const res = await apiPost("/api/tasks", {
      name: "High Priority Task",
      description: "Testing high priority toggle",
      urgency: "high",
      initialDate: now.toISOString(),
      estimatedCompletionDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      taskType: "one_time",
      status: "not_started",
      createdById: adminUser.id,
    }, adminCookie);
    assert.ok(res.status >= 200 && res.status < 300);
    assert.strictEqual(res.data.urgency, "high");
    if (res.data.id) await apiDelete(`/api/tasks/${res.data.id}`, adminCookie);
  });

  console.log("\n--- Section 3: Task Types ---");

  await test("Create a recurring task with frequency and interval", async () => {
    const now = new Date();
    const res = await apiPost("/api/tasks", {
      name: "Recurring HVAC Filter Change",
      description: "Monthly filter replacement",
      urgency: "medium",
      initialDate: now.toISOString(),
      estimatedCompletionDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      taskType: "recurring",
      recurringFrequency: "monthly",
      recurringInterval: 1,
      status: "not_started",
      createdById: adminUser.id,
    }, adminCookie);
    assert.ok(res.status >= 200 && res.status < 300);
    assert.strictEqual(res.data.taskType, "recurring");
    assert.strictEqual(res.data.recurringFrequency, "monthly");
    assert.strictEqual(res.data.recurringInterval, 1);
    if (res.data.id) await apiDelete(`/api/tasks/${res.data.id}`, adminCookie);
  });

  await test("Create a reminder task", async () => {
    const now = new Date();
    const res = await apiPost("/api/tasks", {
      name: "Reminder: Annual Fire Inspection",
      description: "Schedule fire inspection",
      urgency: "low",
      initialDate: now.toISOString(),
      estimatedCompletionDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      taskType: "reminder",
      status: "not_started",
      createdById: adminUser.id,
    }, adminCookie);
    assert.ok(res.status >= 200 && res.status < 300);
    assert.strictEqual(res.data.taskType, "reminder");
    if (res.data.id) await apiDelete(`/api/tasks/${res.data.id}`, adminCookie);
  });

  console.log("\n--- Section 4: Assignment Options ---");

  if (techUser) {
    await test("Assign task to technician", async () => {
      const now = new Date();
      const res = await apiPost("/api/tasks", {
        name: "Tech-Assigned Plumbing Repair",
        description: "Fix bathroom leak",
        urgency: "high",
        initialDate: now.toISOString(),
        estimatedCompletionDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        taskType: "one_time",
        assignedToId: techUser.id,
        executorType: "technician",
        assignedPool: "technician_pool",
        status: "not_started",
        createdById: adminUser.id,
      }, adminCookie);
      assert.ok(res.status >= 200 && res.status < 300);
      assert.strictEqual(res.data.assignedToId, techUser.id);
      assert.strictEqual(res.data.executorType, "technician");
      if (res.data.id) await apiDelete(`/api/tasks/${res.data.id}`, adminCookie);
    });
  }

  if (studentUser) {
    await test("Assign task to student with instructions and photo requirement", async () => {
      const now = new Date();
      const res = await apiPost("/api/tasks", {
        name: "Student Lawn Mowing",
        description: "Mow the quad lawn area",
        urgency: "low",
        initialDate: now.toISOString(),
        estimatedCompletionDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        taskType: "one_time",
        assignedToId: studentUser.id,
        executorType: "student",
        assignedPool: "student_pool",
        instructions: "Use the ride-on mower from the equipment shed. Take before and after photos.",
        requiresPhoto: true,
        status: "not_started",
        createdById: adminUser.id,
      }, adminCookie);
      assert.ok(res.status >= 200 && res.status < 300);
      assert.strictEqual(res.data.assignedToId, studentUser.id);
      assert.strictEqual(res.data.executorType, "student");
      assert.strictEqual(res.data.requiresPhoto, true);
      assert.ok(res.data.instructions?.includes("ride-on mower"), "Instructions should be saved");
      if (res.data.id) await apiDelete(`/api/tasks/${res.data.id}`, adminCookie);
    });
  }

  if (firstVendor) {
    await test("Assign task to vendor", async () => {
      const now = new Date();
      const res = await apiPost("/api/tasks", {
        name: "Vendor Elevator Maintenance",
        description: "Annual elevator service by vendor",
        urgency: "medium",
        initialDate: now.toISOString(),
        estimatedCompletionDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        taskType: "one_time",
        assignedVendorId: firstVendor.id,
        contactType: "other",
        contactName: firstVendor.contactPerson || firstVendor.name,
        contactEmail: firstVendor.email || "",
        contactPhone: firstVendor.phoneNumber || "",
        status: "not_started",
        createdById: adminUser.id,
      }, adminCookie);
      assert.ok(res.status >= 200 && res.status < 300);
      assert.strictEqual(res.data.assignedVendorId, firstVendor.id);
      if (res.data.id) await apiDelete(`/api/tasks/${res.data.id}`, adminCookie);
    });
  }

  console.log("\n--- Section 5: Location & Property ---");

  if (firstProperty) {
    await test("Create task with property location", async () => {
      const now = new Date();
      const res = await apiPost("/api/tasks", {
        name: "Property Inspection Task",
        description: "Inspect building exterior",
        urgency: "medium",
        initialDate: now.toISOString(),
        estimatedCompletionDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        taskType: "one_time",
        propertyId: firstProperty.id,
        status: "not_started",
        createdById: adminUser.id,
      }, adminCookie);
      assert.ok(res.status >= 200 && res.status < 300);
      assert.strictEqual(res.data.propertyId, firstProperty.id);
      if (res.data.id) await apiDelete(`/api/tasks/${res.data.id}`, adminCookie);
    });
  }

  console.log("\n--- Section 6: Sub-tasks ---");

  await test("Create task with sub-tasks", async () => {
    const now = new Date();
    const parentRes = await apiPost("/api/tasks", {
      name: "Multi-Step Renovation",
      description: "Complete renovation with multiple steps",
      urgency: "high",
      initialDate: now.toISOString(),
      estimatedCompletionDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      taskType: "one_time",
      status: "not_started",
      createdById: adminUser.id,
    }, adminCookie);
    assert.ok(parentRes.status >= 200 && parentRes.status < 300);
    const parentId = parentRes.data.id;

    const sub1 = await apiPost(`/api/tasks/${parentId}/subtasks`, {
      name: "Remove old flooring",
      description: "Strip existing carpet and padding",
    }, adminCookie);
    assert.ok(sub1.status >= 200 && sub1.status < 300, `Subtask 1 creation failed: ${JSON.stringify(sub1.data).substring(0, 200)}`);

    const sub2 = await apiPost(`/api/tasks/${parentId}/subtasks`, {
      name: "Install new tile",
      description: "Lay ceramic tile in all rooms",
    }, adminCookie);
    assert.ok(sub2.status >= 200 && sub2.status < 300, `Subtask 2 creation failed: ${JSON.stringify(sub2.data).substring(0, 200)}`);

    const taskDetail = await apiGet(`/api/tasks/${parentId}`, adminCookie);
    assert.strictEqual(taskDetail.status, 200);

    if (parentId) await apiDelete(`/api/tasks/${parentId}`, adminCookie);
  });

  console.log("\n--- Section 7: Checklist Templates ---");

  let templateId: string | null = null;

  await test("Create a checklist template", async () => {
    const res = await apiPost("/api/checklist-templates", {
      name: "Safety Inspection Checklist",
      description: "Standard safety inspection items",
      items: [
        { text: "Check fire extinguishers", sortOrder: 0 },
        { text: "Test smoke detectors", sortOrder: 1 },
        { text: "Inspect emergency exits", sortOrder: 2 },
      ],
    }, adminCookie);
    assert.ok(res.status >= 200 && res.status < 300, `Template creation failed (status ${res.status}): ${JSON.stringify(res.data).substring(0, 200)}`);
    assert.ok(res.data.id, "Template should have an ID");
    templateId = res.data.id;
  });

  await test("Retrieve checklist templates", async () => {
    const res = await apiGet("/api/checklist-templates", adminCookie);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data), "Templates should be an array");
    if (templateId) {
      const found = res.data.find((t: any) => t.id === templateId);
      assert.ok(found, "Created template should be in the list");
    }
  });

  console.log("\n--- Section 8: Contact Information ---");

  await test("Create task with staff contact", async () => {
    const staffUser = Array.isArray(users) ? users.find((u: any) => u.role === "staff" || u.role === "admin") : null;
    if (!staffUser) { console.log("    SKIP: no staff/admin user available"); return; }

    const now = new Date();
    const res = await apiPost("/api/tasks", {
      name: "Staff Contact Task",
      description: "Task with staff contact info",
      urgency: "medium",
      initialDate: now.toISOString(),
      estimatedCompletionDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      taskType: "one_time",
      contactType: "staff",
      contactStaffId: staffUser.id,
      status: "not_started",
      createdById: adminUser.id,
    }, adminCookie);
    assert.ok(res.status >= 200 && res.status < 300);
    assert.strictEqual(res.data.contactType, "staff");
    assert.strictEqual(res.data.contactStaffId, staffUser.id);
    if (res.data.id) await apiDelete(`/api/tasks/${res.data.id}`, adminCookie);
  });

  await test("Create task with other contact info", async () => {
    const now = new Date();
    const res = await apiPost("/api/tasks", {
      name: "External Contact Task",
      description: "Task with external contact",
      urgency: "low",
      initialDate: now.toISOString(),
      estimatedCompletionDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      taskType: "one_time",
      contactType: "other",
      contactName: "John Doe",
      contactEmail: "john@example.com",
      contactPhone: "555-1234",
      status: "not_started",
      createdById: adminUser.id,
    }, adminCookie);
    assert.ok(res.status >= 200 && res.status < 300);
    assert.strictEqual(res.data.contactType, "other");
    assert.strictEqual(res.data.contactName, "John Doe");
    assert.strictEqual(res.data.contactEmail, "john@example.com");
    if (res.data.id) await apiDelete(`/api/tasks/${res.data.id}`, adminCookie);
  });

  console.log("\n--- Section 9: Options (Estimate & Photo) ---");

  await test("Create task requiring cost estimate", async () => {
    const now = new Date();
    const res = await apiPost("/api/tasks", {
      name: "Estimate Required Repair",
      description: "Need cost estimate before proceeding",
      urgency: "medium",
      initialDate: now.toISOString(),
      estimatedCompletionDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      taskType: "one_time",
      requiresEstimate: true,
      status: "needs_estimate",
      estimateStatus: "needs_estimate",
      createdById: adminUser.id,
    }, adminCookie);
    assert.ok(res.status >= 200 && res.status < 300);
    assert.strictEqual(res.data.requiresEstimate, true);
    assert.strictEqual(res.data.status, "needs_estimate");
    if (res.data.id) await apiDelete(`/api/tasks/${res.data.id}`, adminCookie);
  });

  console.log("\n--- Section 10: Project Linking ---");

  if (activeProject) {
    await test("Create task linked to a project", async () => {
      const now = new Date();
      const res = await apiPost("/api/tasks", {
        name: "Project-Linked Task",
        description: "This task belongs to a project",
        urgency: "medium",
        initialDate: now.toISOString(),
        estimatedCompletionDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        taskType: "one_time",
        projectId: activeProject.id,
        status: "not_started",
        createdById: adminUser.id,
      }, adminCookie);
      assert.ok(res.status >= 200 && res.status < 300);
      assert.strictEqual(res.data.projectId, activeProject.id);
      if (res.data.id) await apiDelete(`/api/tasks/${res.data.id}`, adminCookie);
    });
  }

  console.log("\n--- Section 11: Student Helpers ---");

  if (techUser && studentUser) {
    await test("Create task with technician assignment and student helpers", async () => {
      const now = new Date();
      const res = await apiPost("/api/tasks", {
        name: "Team Repair Task",
        description: "Technician lead with student helpers",
        urgency: "medium",
        initialDate: now.toISOString(),
        estimatedCompletionDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        taskType: "one_time",
        assignedToId: techUser.id,
        executorType: "technician",
        assignedPool: "technician_pool",
        helperUserIds: [studentUser.id],
        status: "not_started",
        createdById: adminUser.id,
      }, adminCookie);
      assert.ok(res.status >= 200 && res.status < 300);
      assert.strictEqual(res.data.assignedToId, techUser.id);
      if (res.data.id) await apiDelete(`/api/tasks/${res.data.id}`, adminCookie);
    });
  }

  // Cleanup
  if (createdTaskId) {
    await apiDelete(`/api/tasks/${createdTaskId}`, adminCookie);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Test suite error:", err);
  process.exit(1);
});
