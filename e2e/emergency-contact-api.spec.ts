import assert from "node:assert";
import { api, login, run } from "./api";

await run("Save an emergency contact", async () => {
  const cookie = await login("admin", "123456");
  const name = `E2E Contact ${Date.now()}`;
  const created = await api("POST", "/api/emergency-contacts", cookie, {
    name,
    phone: "3055550100",
  });
  assert.strictEqual(created.status, 201, JSON.stringify(created.data));
  assert.strictEqual(created.data.name, name);
  assert.strictEqual(created.data.phone, "3055550100");

  const list = await api("GET", "/api/emergency-contacts", cookie);
  assert.strictEqual(list.status, 200);
  assert.ok(list.data.some((contact: { id: string; name: string }) => contact.id === created.data.id && contact.name === name));
});
