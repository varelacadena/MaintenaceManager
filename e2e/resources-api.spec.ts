import assert from "node:assert";
import { api, login, run } from "./api";

await run("Add and open a resource", async () => {
  const cookie = await login("admin", "123456");
  const title = `E2E resource ${Date.now()}`;
  const created = await api("POST", "/api/resources", cookie, {
    title,
    type: "link",
    url: "https://example.com/e2e-resource",
  });
  assert.strictEqual(created.status, 201, JSON.stringify(created.data));
  assert.strictEqual(created.data.title, title);

  const loaded = await api("GET", `/api/resources/${created.data.id}`, cookie);
  assert.strictEqual(loaded.status, 200);
  assert.strictEqual(loaded.data.title, title);
  assert.strictEqual(loaded.data.url, "https://example.com/e2e-resource");
});
