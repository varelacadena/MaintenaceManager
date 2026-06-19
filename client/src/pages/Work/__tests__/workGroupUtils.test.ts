import { describe, it, expect } from "vitest";
import { taskToUnifiedGroupKey } from "../constants";
import { buildDefaultCollapsedGroups } from "../workGroupPrefs";
import { filterTasksByDate, getTaskScheduleDay } from "../helpers";
import type { Task } from "@shared/schema";

describe("taskToUnifiedGroupKey", () => {
  it("keeps ready in its own column", () => {
    expect(taskToUnifiedGroupKey("ready")).toBe("ready");
  });

  it("maps unknown statuses to not_started", () => {
    expect(taskToUnifiedGroupKey("unknown_status")).toBe("not_started");
  });
});

describe("buildDefaultCollapsedGroups", () => {
  it("expands groups that have items and collapses empty ones", () => {
    const result = buildDefaultCollapsedGroups({
      not_started: 2,
      in_progress: 0,
      ready: 1,
    });
    expect(result.not_started).toBe(false);
    expect(result.in_progress).toBe(true);
    expect(result.ready).toBe(false);
  });
});

describe("filterTasksByDate", () => {
  const base = {
    id: "1",
    name: "T",
    description: "",
    urgency: "low" as const,
    initialDate: new Date(),
    status: "not_started" as const,
    taskType: "one_time" as const,
  };

  it("includes undated active tasks in Today filter", () => {
    const undated = [
      {
        ...base,
        estimatedCompletionDate: null,
        initialDate: null as unknown as Date,
      },
    ] as Task[];
    expect(filterTasksByDate(undated, "today")).toHaveLength(1);
  });

  it("includes overdue active tasks in Today filter", () => {
    const overdue = new Date();
    overdue.setDate(overdue.getDate() - 3);
    const tasks = [{ ...base, initialDate: overdue }] as Task[];
    expect(filterTasksByDate(tasks, "today")).toHaveLength(1);
  });

  it("uses initialDate before estimatedCompletionDate for schedule", () => {
    const initialDate = new Date();
    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 7);
    const task = { ...base, initialDate, estimatedCompletionDate } as Task;
    expect(getTaskScheduleDay(task)?.toDateString()).toBe(initialDate.toDateString());
  });
});
