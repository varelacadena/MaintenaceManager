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

async function run() {
  console.log("\n=== Task Upload API E2E ===\n");

  const cookie = await login("maintenance", "123456");
  const headers = { Cookie: cookie, "Content-Type": "application/json" };

  const tasksRes = await fetch(`${BASE_URL}/api/tasks`, { headers });
  assert.strictEqual(tasksRes.status, 200);
  const tasks = await tasksRes.json();
  const task = tasks.find((t: { status: string }) => t.status !== "completed") || tasks[0];
  assert.ok(task, "Need at least one task");

  const signRes = await fetch(`${BASE_URL}/api/objects/upload`, { method: "POST", headers });
  assert.strictEqual(signRes.status, 200);
  const sign = await signRes.json();
  assert.ok(sign.uploadURL, "uploadURL required");
  assert.ok(sign.objectPath, "objectPath required");

  const putRes = await fetch(sign.uploadURL, {
    method: "PUT",
    body: new TextEncoder().encode("task upload e2e"),
    headers: { "Content-Type": "text/plain" },
  });
  assert.ok(putRes.ok, `Storage PUT failed: ${putRes.status}`);

  const regRes = await fetch(`${BASE_URL}/api/uploads`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      taskId: task.id,
      fileName: "e2e-task-upload.txt",
      fileType: "text/plain",
      objectUrl: sign.uploadURL.split("?")[0],
      objectPath: sign.objectPath,
      label: "e2e-task-upload.txt",
    }),
  });
  const regText = await regRes.text();
  assert.strictEqual(regRes.status, 200, regText);
  const reg = JSON.parse(regText);
  assert.ok(reg.id, "upload id required");
  assert.strictEqual(reg.objectPath, sign.objectPath);

  const listRes = await fetch(`${BASE_URL}/api/uploads/task/${task.id}`, { headers });
  assert.strictEqual(listRes.status, 200);
  const list = await listRes.json();
  assert.ok(list.some((u: { id: string }) => u.id === reg.id), "upload should appear on task");

  const dlRes = await fetch(`${BASE_URL}/api/uploads/${reg.id}/download`, { headers });
  assert.strictEqual(dlRes.status, 200);
  const dl = await dlRes.json();
  assert.ok(dl.downloadUrl, "download URL required");

  console.log(`  ✓ Technician task upload flow (${task.id})`);
  console.log("\n=== Results: 1 passed ===\n");
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
