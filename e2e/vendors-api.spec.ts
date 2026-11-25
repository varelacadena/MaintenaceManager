import assert from "node:assert";
import { api, login, run } from "./api";

await run("Create and edit a vendor", async () => {
  const cookie = await login("admin", "123456");
  const name = `E2E Vendor ${Date.now()}`;
  const created = await api("POST", "/api/vendors", cookie, { name });
  assert.strictEqual(created.status, 200, JSON.stringify(created.data));
  assert.strictEqual(created.data.name, name);

  const renamed = `${name} edited`;
  const patched = await api("PATCH", `/api/vendors/${created.data.id}`, cookie, { name: renamed });
  assert.strictEqual(patched.status, 200, JSON.stringify(patched.data));
  assert.strictEqual(patched.data.name, renamed);

  const loaded = await api("GET", `/api/vendors/${created.data.id}`, cookie);
  assert.strictEqual(loaded.status, 200);
  assert.strictEqual(loaded.data.name, renamed);
});
