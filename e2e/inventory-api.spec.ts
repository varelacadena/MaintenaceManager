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

async function api(
  method: string,
  path: string,
  cookie: string,
  body?: unknown,
) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const apiGet = (path: string, cookie: string) => api("GET", path, cookie);
const apiPost = (path: string, cookie: string, body: unknown) => api("POST", path, cookie, body);
const apiDelete = (path: string, cookie: string) => api("DELETE", path, cookie);

/** Inventory list responses are always paginated envelopes. */
function listItems(data: { items?: unknown[] }): unknown[] {
  return data.items ?? [];
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
  let staffCookie = "";
  let hasStudent = false;
  let hasStaff = false;

  console.log(`\n=== Inventory API roles & routes (${BASE_URL}) ===\n`);

  await test("login roles", async () => {
    adminCookie = await login("admin", "123456");
    techCookie = await login("maintenance", "123456");
    assert.ok(adminCookie && techCookie);
    try {
      studentCookie = await login("student", "123456");
      hasStudent = true;
    } catch {
      try {
        studentCookie = await login("Sebastian", "123456");
        hasStudent = true;
      } catch {
        console.log("    (no student user — student tests skipped)");
      }
    }
    try {
      staffCookie = await login("staff", "123456");
      hasStaff = true;
    } catch {
      try {
        staffCookie = await login("Norberto", "norberto123");
        hasStaff = true;
      } catch {
        console.log("    (no staff user — staff tests skipped)");
      }
    }
  });

  await test("admin and technician can list inventory (paginated envelope)", async () => {
    const adminRes = await apiGet("/api/inventory?page=0&pageSize=10", adminCookie);
    const techRes = await apiGet("/api/inventory?page=0&pageSize=10", techCookie);
    assert.strictEqual(adminRes.status, 200);
    assert.strictEqual(techRes.status, 200);
    assert.ok(Array.isArray(listItems(adminRes.data)));
    assert.ok(Array.isArray(listItems(techRes.data)));
    assert.ok(typeof adminRes.data.total === "number");
  });

  await test("inventory list without page still returns paginated envelope", async () => {
    const { status, data } = await apiGet("/api/inventory", adminCookie);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.items));
    assert.ok(typeof data.total === "number");
    assert.strictEqual(data.page, 0);
  });

  await test("student can read inventory (task part search)", async () => {
    if (!hasStudent) return;
    const { status, data } = await apiGet("/api/inventory?page=0&pageSize=10", studentCookie);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(listItems(data)));
  });

  await test("staff cannot list inventory", async () => {
    if (!hasStaff) return;
    const { status } = await apiGet("/api/inventory", staffCookie);
    assert.strictEqual(status, 403);
  });

  await test("technician can create item; student cannot", async () => {
    const unique = `API test item ${Date.now()}`;
    const techRes = await apiPost("/api/inventory", techCookie, {
      name: unique,
      category: "general",
      trackingMode: "counted",
      quantity: "1",
      unit: "ea",
      minQuantity: "0",
    });
    assert.strictEqual(techRes.status, 200);
    assert.strictEqual(techRes.data.name, unique);

    if (hasStudent) {
      const studentRes = await apiPost("/api/inventory", studentCookie, {
        name: `${unique} student`,
        category: "general",
        trackingMode: "counted",
          quantity: "1",
        });
      assert.strictEqual(studentRes.status, 403);
    }

    await apiDelete(`/api/inventory/${techRes.data.id}`, adminCookie);
  });

  await test("parts-usage returns array for valid item", async () => {
    const { data: list } = await apiGet("/api/inventory?page=0&pageSize=5", adminCookie);
    const items = listItems(list);
    assert.ok(items.length > 0, "Need at least one inventory item");
    const item = items[0] as { id: string };
    const { status, data } = await apiGet(`/api/inventory/${item.id}/parts-usage`, adminCookie);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data));
  });

  await test("admin can import CSV rows; technician cannot import", async () => {
    const unique = `Import test ${Date.now()}`;
    const importRes = await apiPost("/api/inventory/import", adminCookie, {
      items: [
        {
          name: unique,
          category: "general",
          trackingMode: "counted",
          quantity: "2",
          unit: "ea",
          minQuantity: "0",
        },
      ],
    });
    assert.strictEqual(importRes.status, 200);
    assert.strictEqual(importRes.data.created, 1);

    const techImport = await apiPost("/api/inventory/import", techCookie, {
      items: [{ name: `${unique} tech`, category: "general", trackingMode: "counted", quantity: "1" }],
    });
    assert.strictEqual(techImport.status, 403);

    const { data: list } = await apiGet("/api/inventory?page=0&pageSize=500&q=" + encodeURIComponent(unique), adminCookie);
    const created = listItems(list).find((i: { name: string }) => i.name === unique) as { id: string } | undefined;
    assert.ok(created, "Imported item should appear in list");
    await apiDelete(`/api/inventory/${created.id}`, adminCookie);
  });

  await test("non-admin inventory list omits cost", async () => {
    const { data: list } = await apiGet("/api/inventory?page=0&pageSize=50", techCookie);
    const items = listItems(list);
    assert.ok(items.length > 0, "Need inventory items");
    const withCostField = items.find((i: { cost?: string | null }) => i.cost != null && i.cost !== "");
    assert.strictEqual(withCostField, undefined, "Technician should not receive cost on list");
    const adminRes = await apiGet("/api/inventory?page=0&pageSize=10", adminCookie);
    assert.ok(Array.isArray(listItems(adminRes.data)));
  });

  await test("task parts list redacts cost for technician", async () => {
    const { data: list } = await apiGet("/api/inventory?page=0&pageSize=1", adminCookie);
    const items = listItems(list) as { id: string }[];
    assert.ok(items.length > 0, "Need inventory item");
    const item = items[0];
    const tasksRes = await apiGet("/api/tasks", adminCookie);
    const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
    const task = tasks.find((t: { status?: string }) => t.status === "in_progress" || t.status === "open") as { id: string } | undefined;
    if (!task) {
      console.log("    (no open task — parts cost test skipped)");
      return;
    }
    await apiPost("/api/parts", adminCookie, {
      taskId: task.id,
      inventoryItemId: item.id,
      partName: "Cost redaction test",
      quantity: "1",
      cost: 0,
    });
    const adminParts = await apiGet(`/api/parts/task/${task.id}`, adminCookie);
    const techParts = await apiGet(`/api/parts/task/${task.id}`, techCookie);
    assert.strictEqual(adminParts.status, 200);
    assert.strictEqual(techParts.status, 200);
    const adminPart = (adminParts.data as { partName: string; cost: number }[]).find(
      (p) => p.partName === "Cost redaction test",
    );
    const techPart = (techParts.data as { partName: string; cost: number }[]).find(
      (p) => p.partName === "Cost redaction test",
    );
    assert.ok(adminPart, "Part should exist");
    assert.ok(techPart, "Technician should see part");
    if (adminPart && adminPart.cost > 0) {
      assert.strictEqual(techPart?.cost, 0, "Technician should not see part line cost");
    }
  });

  await test("paginated inventory list returns envelope", async () => {
    const { status, data } = await apiGet("/api/inventory?page=0&pageSize=10&sort=name-asc", adminCookie);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.items));
    assert.ok(typeof data.total === "number");
    assert.strictEqual(data.page, 0);
    assert.strictEqual(data.pageSize, 10);
  });

  await test("inventory summary endpoint", async () => {
    const { status, data } = await apiGet("/api/inventory/summary", adminCookie);
    assert.strictEqual(status, 200);
    assert.ok(typeof data.total === "number");
    assert.ok(typeof data.lowStockCount === "number");
    assert.ok(data.categoryCounts && typeof data.categoryCounts === "object");
  });

  await test("inventory export returns CSV", async () => {
    const res = await fetch(`${BASE_URL}/api/inventory/export?sort=name-asc`, {
      headers: { Cookie: adminCookie },
    });
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("name,category"), "CSV header expected");
    assert.ok(text.length > 0);
  });

  await test("parts-usage omits cost for technician", async () => {
    const { data: list } = await apiGet("/api/inventory?page=0&pageSize=1", adminCookie);
    const item = list.items?.[0];
    assert.ok(item?.id, "Need an inventory item");
    const adminUsage = await apiGet(`/api/inventory/${item.id}/parts-usage`, adminCookie);
    const techUsage = await apiGet(`/api/inventory/${item.id}/parts-usage`, techCookie);
    assert.strictEqual(adminUsage.status, 200);
    assert.strictEqual(techUsage.status, 200);
    if (adminUsage.data.length > 0 && adminUsage.data[0].cost > 0) {
      assert.strictEqual(techUsage.data[0]?.cost, 0);
    }
  });

  await test("inventory analytics is admin-only", async () => {
    const adminRes = await apiGet("/api/analytics/inventory", adminCookie);
    assert.strictEqual(adminRes.status, 200);
    assert.ok(typeof adminRes.data.totalItems === "number");

    const techRes = await apiGet("/api/analytics/inventory", techCookie);
    assert.strictEqual(techRes.status, 403);

    if (hasStudent) {
      const studentRes = await apiGet("/api/analytics/inventory", studentCookie);
      assert.strictEqual(studentRes.status, 403);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
