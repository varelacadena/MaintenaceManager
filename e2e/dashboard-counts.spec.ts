import assert from "node:assert";
import { api, login, run } from "./api";

await run("Dashboard count matches its list", async () => {
  const cookie = await login("admin", "123456");
  const dashboard = await api("GET", "/api/dashboard", cookie);
  assert.strictEqual(dashboard.status, 200, JSON.stringify(dashboard.data).slice(0, 200));

  const properties = await api("GET", "/api/properties", cookie);
  assert.strictEqual(properties.status, 200);
  assert.ok(Array.isArray(properties.data));
  assert.strictEqual(dashboard.data.properties.length, properties.data.length);

  const pending = await api("GET", "/api/service-requests?status=pending", cookie);
  const review = await api("GET", "/api/service-requests?status=under_review", cookie);
  assert.strictEqual(pending.status, 200);
  assert.strictEqual(review.status, 200);
  const waiting = pending.data.length + review.data.length;
  assert.strictEqual(dashboard.data.waitingRequestCount, waiting);
  for (const request of dashboard.data.requests) {
    assert.ok(request.status === "pending" || request.status === "under_review");
  }
});
