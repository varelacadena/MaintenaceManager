import assert from "node:assert";
import { api, login, run } from "./api";

await run("Create, link, and refund a purchase", async () => {
  const cookie = await login("admin", "123456");
  const task = await api("POST", "/api/tasks", cookie, {
    name: `E2E purchase task ${Date.now()}`,
    description: "Task used to link a receipt.",
    urgency: "low",
    executorType: "technician",
    status: "not_started",
    initialDate: new Date().toISOString(),
  });
  assert.ok(task.status === 200 || task.status === 201, JSON.stringify(task.data));

  const created = await api("POST", "/api/purchases", cookie, {
    storeName: "Home Depot",
    description: "Coupling",
    amount: 12.5,
    purchasedOn: "2026-03-01",
    poNumber: `PO-${Date.now()}`,
    receipt: {
      fileName: "receipt.pdf",
      fileType: "application/pdf",
      objectPath: `uploads/e2e-receipt-${Date.now()}.pdf`,
    },
    links: [{ kind: "task", targetId: task.data.id }],
  });
  assert.strictEqual(created.status, 200, JSON.stringify(created.data));
  assert.strictEqual(created.data.storeName, "Home Depot");
  assert.ok(
    (created.data.links ?? []).some((link: { kind: string; targetId: string }) => link.kind === "task" && link.targetId === task.data.id),
    JSON.stringify(created.data.links),
  );

  const refund = await api("POST", `/api/purchases/${created.data.id}/refunds`, cookie, {
    amount: 2.5,
    refundedOn: "2026-03-02",
  });
  assert.strictEqual(refund.status, 200, JSON.stringify(refund.data));
  const refunds = refund.data.refunds ?? [];
  assert.ok(refunds.some((row: { amount: number }) => Number(row.amount) === 2.5));
});
