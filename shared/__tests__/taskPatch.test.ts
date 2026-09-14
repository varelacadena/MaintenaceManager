import { describe, expect, it } from "vitest";
import { sanitizeTaskPatch } from "../taskPatch";

describe("sanitizeTaskPatch", () => {
  it("lets admins set estimate fields", () => {
    const result = sanitizeTaskPatch(
      "admin",
      { requiresEstimate: false, estimateStatus: "approved", status: "completed" },
      "admin-1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.requiresEstimate).toBe(false);
      expect(result.data.estimateStatus).toBe("approved");
    }
  });

  it("strips privileged fields for technicians", () => {
    const result = sanitizeTaskPatch(
      "technician",
      { requiresEstimate: false, estimateStatus: "approved", status: "completed", name: "Fix leak" },
      "tech-1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.requiresEstimate).toBeUndefined();
      expect(result.data.estimateStatus).toBeUndefined();
      expect(result.data.status).toBe("completed");
      expect(result.data.name).toBe("Fix leak");
    }
  });

  it("blocks reassignment to another user", () => {
    const result = sanitizeTaskPatch(
      "technician",
      { assignedToId: "someone-else" },
      "tech-1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("allows self-claim from the pool", () => {
    const result = sanitizeTaskPatch(
      "student",
      { assignedToId: "student-1", assignedPool: null },
      "student-1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.assignedToId).toBe("student-1");
      expect(result.data.assignedPool).toBeNull();
    }
  });
});
