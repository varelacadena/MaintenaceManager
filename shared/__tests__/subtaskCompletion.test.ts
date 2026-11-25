import { describe, expect, it } from "vitest";
import { openSubtasksBlockCompletion, OPEN_SUBTASKS_MESSAGE, subtaskStatusPath } from "../taskCompletion";

describe("subtask completion", () => {
  it("blocks a parent while a subtask is still open", () => {
    expect(openSubtasksBlockCompletion([{ status: "completed" }, { status: "in_progress" }])).toBe(OPEN_SUBTASKS_MESSAGE);
    expect(openSubtasksBlockCompletion([])).toBeNull();
    expect(openSubtasksBlockCompletion([{ status: "completed" }])).toBeNull();
  });

  it("sends a subtask status change to the status route", () => {
    expect(subtaskStatusPath("sub-1")).toBe("/api/tasks/sub-1/status");
  });
});
