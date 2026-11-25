import assert from "node:assert";
import { api, login, run } from "./api";

await run("Property create and edit", async () => {
  const cookie = await login("admin", "123456");
  const name = `E2E Building ${Date.now()}`;
  const created = await api("POST", "/api/properties", cookie, {
    name,
    type: "building",
    coordinates: { type: "Point", coordinates: [-80.1, 26.2] },
  });
  assert.strictEqual(created.status, 200, JSON.stringify(created.data));
  assert.strictEqual(created.data.name, name);
  assert.strictEqual(created.data.type, "building");

  const renamed = `${name} edited`;
  const patched = await api("PATCH", `/api/properties/${created.data.id}`, cookie, { name: renamed });
  assert.strictEqual(patched.status, 200, JSON.stringify(patched.data));
  assert.strictEqual(patched.data.name, renamed);

  const loaded = await api("GET", `/api/properties/${created.data.id}`, cookie);
  assert.strictEqual(loaded.status, 200);
  assert.strictEqual(loaded.data.name, renamed);
});
