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

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e: any) {
    failed++;
    console.error(`✗ ${name}: ${e.message}`);
  }
}

async function main() {
  console.log("=== Dialog Freeze Bug - API-level regression tests ===\n");

  const { cookie } = await login("admin", "123456");

  await test("Inventory PATCH returns 200 for valid update", async () => {
    const { data: items } = await apiGet("/api/inventory", cookie);
    assert(Array.isArray(items) && items.length > 0, "No inventory items found");
    const item = items[0];
    const result = await apiPatch(`/api/inventory/${item.id}`, {
      name: item.name,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      category: item.category,
      location: item.location || "",
      unit: item.unit || "units",
    }, cookie);
    assert.strictEqual(result.status, 200, `Expected 200 but got ${result.status}: ${JSON.stringify(result.data).substring(0, 200)}`);
  });

  await test("Users GET returns list of users", async () => {
    const { status, data } = await apiGet("/api/users", cookie);
    assert.strictEqual(status, 200);
    assert(Array.isArray(data) && data.length > 0, "No users found");
  });

  await test("Emergency contacts GET returns list", async () => {
    const { status, data } = await apiGet("/api/emergency-contacts", cookie);
    assert.strictEqual(status, 200);
    assert(Array.isArray(data), "Expected array of contacts");
  });

  await test("Projects GET returns list", async () => {
    const { status, data } = await apiGet("/api/projects", cookie);
    assert.strictEqual(status, 200);
    assert(Array.isArray(data), "Expected array of projects");
  });

  await test("Tasks GET returns list", async () => {
    const { status, data } = await apiGet("/api/tasks", cookie);
    assert.strictEqual(status, 200);
    assert(Array.isArray(data), "Expected array of tasks");
  });

  await test("Vehicle reservations GET returns list", async () => {
    const { status, data } = await apiGet("/api/vehicle-reservations", cookie);
    assert.strictEqual(status, 200);
    assert(Array.isArray(data), "Expected array of reservations");
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
