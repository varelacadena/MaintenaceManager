import assert from "node:assert";

const port = process.env.PORT || "5000";
const BASE_URL = process.env.BASE_URL || `http://localhost:${port}`;
let passed = 0;
let failed = 0;

async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    redirect: "manual",
  });
  const cookies = res.headers.getSetCookie?.() || [];
  const sessionCookie = cookies.find((c: string) => c.startsWith("connect.sid"));
  if (!sessionCookie) throw new Error(`Login failed for ${username}`);
  return sessionCookie.split(";")[0];
}

async function apiGet(path: string, cookie: string) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { Cookie: cookie } });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err: unknown) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function run() {
  let adminCookie = "";
  let techCookie = "";
  let studentCookie = "";
  let hasStudent = false;
  let otherStudentId: string | undefined;

  console.log(`\n=== Fleet API auth & filtering (${BASE_URL}) ===\n`);

  await test("login admin and technician", async () => {
    adminCookie = await login("admin", "123456");
    techCookie = await login("maintenance", "123456");
    assert.ok(adminCookie && techCookie);
    try {
      studentCookie = await login("student", "123456");
      hasStudent = true;
    } catch {
      console.log("    (no student user — student-scoped tests will be skipped)");
    }
  });

  await test("admin can list all reservations", async () => {
    const { status, data } = await apiGet("/api/vehicle-reservations", adminCookie);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data));
  });

  await test("statuses query filters reservations server-side", async () => {
    const { status, data } = await apiGet(
      "/api/vehicle-reservations?statuses=pending,pending_review",
      adminCookie,
    );
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data));
    for (const r of data) {
      assert.ok(
        r.status === "pending" || r.status === "pending_review",
        `Unexpected status ${r.status}`,
      );
    }
  });

  await test("student checkout logs are scoped to self", async () => {
    if (!hasStudent) return;
    const { status, data } = await apiGet("/api/vehicle-checkout-logs", studentCookie);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data));
    const { data: me } = await apiGet("/api/auth/user", studentCookie);
    for (const log of data) {
      assert.strictEqual(log.userId, me.id, "Student should only see own checkout logs");
    }
  });

  await test("admin sees broader checkout log list than student", async () => {
    if (!hasStudent) return;
    const adminRes = await apiGet("/api/vehicle-checkout-logs", adminCookie);
    const studentRes = await apiGet("/api/vehicle-checkout-logs", studentCookie);
    assert.strictEqual(adminRes.status, 200);
    assert.strictEqual(studentRes.status, 200);
    if (adminRes.data.length > 1) {
      assert.ok(
        adminRes.data.length >= studentRes.data.length,
        "Admin list should be at least as large as student list",
      );
    }
  });

  await test("student cannot pass another userId on reservations list", async () => {
    if (!hasStudent) return;
    const { data: me } = await apiGet("/api/auth/user", studentCookie);
    const { data: users } = await apiGet("/api/users", adminCookie);
    const other = users.find(
      (u: { role: string; id: string }) => u.role === "student" && u.id !== me.id,
    );
    if (!other) {
      console.log("    (skipped - only one student user)");
      return;
    }
    otherStudentId = other.id;
    const { status } = await apiGet(
      `/api/vehicle-reservations?userId=${otherStudentId}`,
      studentCookie,
    );
    assert.strictEqual(status, 403);
  });

  await test("invalid reservation status returns 400", async () => {
    const { status } = await apiGet(
      "/api/vehicle-reservations?status=not_a_real_status",
      adminCookie,
    );
    assert.strictEqual(status, 400);
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
