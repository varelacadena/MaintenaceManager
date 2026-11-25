import assert from "node:assert";
import { api, login, run } from "./api";

await run("Add and edit a tool", async () => {
  const cookie = await login("admin", "123456");
  const name = `E2E tool ${Date.now()}`;
  const created = await api("POST", "/api/mobile-equipment", cookie, { name, category: "other" });
  assert.strictEqual(created.status, 200, JSON.stringify(created.data));
  assert.strictEqual(created.data.name, name);

  const renamed = `${name} edited`;
  const patched = await api("PATCH", `/api/mobile-equipment/${created.data.id}`, cookie, { name: renamed });
  assert.strictEqual(patched.status, 200, JSON.stringify(patched.data));
  assert.strictEqual(patched.data.name, renamed);

  const list = await api("GET", "/api/mobile-equipment", cookie);
  assert.strictEqual(list.status, 200);
  assert.ok(list.data.some((item: { id: string; name: string }) => item.id === created.data.id && item.name === renamed));
});
