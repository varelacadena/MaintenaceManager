import assert from "node:assert";
import { api, login, run } from "./api";

await run("Approve a request into a task", async () => {
  const cookie = await login("admin", "123456");
  const created = await api("POST", "/api/service-requests", cookie, {
    title: `E2E request ${Date.now()}`,
    description: "Leak under the sink in the work room.",
    urgency: "medium",
  });
  assert.strictEqual(created.status, 200, JSON.stringify(created.data));
  assert.strictEqual(created.data.status, "pending");

  const task = await api("POST", "/api/tasks", cookie, {
    name: created.data.title,
    description: created.data.description,
    urgency: "medium",
    requestId: created.data.id,
    executorType: "technician",
    status: "not_started",
    initialDate: new Date().toISOString(),
  });
  assert.ok(task.status === 200 || task.status === 201, JSON.stringify(task.data));
  assert.ok(task.data.id, "task id");

  const request = await api("GET", `/api/service-requests/${created.data.id}`, cookie);
  assert.strictEqual(request.status, 200);
  assert.strictEqual(request.data.status, "converted_to_task");

  const loaded = await api("GET", `/api/tasks/${task.data.id}`, cookie);
  assert.strictEqual(loaded.status, 200);
  assert.strictEqual(loaded.data.requestId, created.data.id);
});
