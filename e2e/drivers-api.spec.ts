import assert from "node:assert";
import { api, login, run } from "./api";

await run("Activate a driver", async () => {
  const cookie = await login("admin", "123456");
  const stamp = Date.now();
  const created = await api("POST", "/api/approved-drivers", cookie, {
    firstName: "E2E",
    lastName: `Driver${stamp}`,
    email: `e2e.driver.${stamp}@example.com`,
    status: "inactive",
  });
  assert.strictEqual(created.status, 200, JSON.stringify(created.data));
  assert.strictEqual(created.data.status, "inactive");

  const approved = await api("PATCH", `/api/approved-drivers/${created.data.id}`, cookie, { status: "active" });
  assert.strictEqual(approved.status, 200, JSON.stringify(approved.data));
  assert.strictEqual(approved.data.status, "active");

  const loaded = await api("GET", `/api/approved-drivers/${created.data.id}`, cookie);
  assert.strictEqual(loaded.status, 200);
  assert.strictEqual(loaded.data.status, "active");
});
