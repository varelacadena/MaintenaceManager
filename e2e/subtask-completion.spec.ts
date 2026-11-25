import assert from "node:assert";
import { OPEN_SUBTASKS_MESSAGE } from "@shared/taskCompletion";
import { api, login, run } from "./api";

await run("Parent completion waits for subtasks", async () => {
  const cookie = await login("admin", "123456");
  const parent = await api("POST", "/api/tasks", cookie, {
    name: `E2E parent ${Date.now()}`,
    description: "Parent that still has an open subtask.",
    urgency: "low",
    executorType: "technician",
    status: "in_progress",
    initialDate: new Date().toISOString(),
  });
  assert.ok(parent.status === 200 || parent.status === 201, JSON.stringify(parent.data));

  const subtask = await api("POST", "/api/tasks", cookie, {
    name: `E2E subtask ${Date.now()}`,
    description: "Open subtask.",
    urgency: "low",
    executorType: "technician",
    status: "not_started",
    parentTaskId: parent.data.id,
    initialDate: new Date().toISOString(),
  });
  assert.ok(subtask.status === 200 || subtask.status === 201, JSON.stringify(subtask.data));

  const blocked = await api("PATCH", `/api/tasks/${parent.data.id}/status`, cookie, { status: "completed" });
  assert.strictEqual(blocked.status, 400);
  assert.strictEqual(blocked.data.message, OPEN_SUBTASKS_MESSAGE);

  const finished = await api("PATCH", `/api/tasks/${subtask.data.id}/status`, cookie, { status: "completed" });
  assert.strictEqual(finished.status, 200, JSON.stringify(finished.data));

  const completed = await api("PATCH", `/api/tasks/${parent.data.id}/status`, cookie, { status: "completed" });
  assert.strictEqual(completed.status, 200, JSON.stringify(completed.data));
  assert.strictEqual(completed.data.status, "completed");
});
