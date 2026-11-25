import { describe, expect, it } from "vitest";
import { taskStatusLabel, taskStatusLabels } from "../taskStatusLabels";

describe("task status words", () => {
  it("uses one label for waiting approval and ready", () => {
    expect(taskStatusLabels.waiting_approval).toBe("Waiting Approval");
    expect(taskStatusLabels.ready).toBe("Ready");
    expect(taskStatusLabel("waiting_approval")).toBe("Waiting Approval");
    expect(taskStatusLabel("ready")).toBe("Ready");
  });
});
