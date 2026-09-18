const EXECUTOR_ALLOWED_KEYS = new Set([
  "status",
  "onHoldReason",
  "name",
  "description",
  "initialDate",
  "estimatedCompletionDate",
  "estimatedHours",
  "assignedToId",
  "assignedPool",
]);

const ALWAYS_STRIP_KEYS = new Set(["createdById", "createdByName"]);

export function sanitizeTaskPatch(
  role: string,
  body: Record<string, unknown>,
  userId: string,
): { ok: true; data: Record<string, unknown> } | { ok: false; status: number; message: string } {
  const source = { ...body };
  for (const key of ALWAYS_STRIP_KEYS) {
    delete source[key];
  }

  if (role === "admin") {
    return { ok: true, data: source };
  }

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    if (!EXECUTOR_ALLOWED_KEYS.has(key)) continue;
    data[key] = value;
  }

  if (data.assignedToId !== undefined && data.assignedToId !== userId && data.assignedToId !== null) {
    return { status: 403, message: "Forbidden: You cannot reassign tasks", ok: false };
  }

  if (data.assignedPool !== undefined && data.assignedPool !== null) {
    return { status: 403, message: "Forbidden: You cannot change the assignment pool", ok: false };
  }

  return { ok: true, data };
}
