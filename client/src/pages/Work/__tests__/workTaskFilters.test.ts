import { describe, it, expect } from "vitest";
import type { Task } from "@shared/schema";
import { filterStudentWorkTasks, filterTechnicianWorkTasks } from "../helpers";

const baseTask = {
  id: "t1",
  name: "Task",
  description: "",
  urgency: "low" as const,
  initialDate: new Date(),
  status: "not_started" as const,
  taskType: "one_time" as const,
} satisfies Partial<Task>;

describe("filterStudentWorkTasks", () => {
  const userId = "student-1";

  it("includes tasks assigned to the student", () => {
    const tasks = [{ ...baseTask, id: "a", assignedToId: userId }] as Task[];
    expect(filterStudentWorkTasks(tasks, userId)).toHaveLength(1);
  });

  it("includes helper tasks", () => {
    const tasks = [
      { ...baseTask, id: "h", assignedToId: "other", isHelper: true },
    ] as (Task & { isHelper?: boolean })[];
    expect(filterStudentWorkTasks(tasks as Task[], userId)).toHaveLength(1);
  });

  it("includes unclaimed student pool tasks", () => {
    const tasks = [
      { ...baseTask, id: "p", assignedPool: "student_pool", assignedToId: null },
    ] as Task[];
    expect(filterStudentWorkTasks(tasks, userId)).toHaveLength(1);
  });

  it("excludes subtasks", () => {
    const tasks = [
      { ...baseTask, id: "s", assignedToId: userId, parentTaskId: "parent" },
    ] as Task[];
    expect(filterStudentWorkTasks(tasks, userId)).toHaveLength(0);
  });
});

describe("filterTechnicianWorkTasks", () => {
  const userId = "tech-1";

  it("includes tasks assigned to the technician", () => {
    const tasks = [
      { ...baseTask, id: "a", assignedToId: userId },
      { ...baseTask, id: "b", assignedToId: "other" },
      { ...baseTask, id: "c", assignedPool: "technician_pool", assignedToId: null },
    ] as Task[];
    const result = filterTechnicianWorkTasks(tasks, userId);
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });

  it("includes helper tasks", () => {
    const tasks = [
      { ...baseTask, id: "h", assignedToId: "other", isHelper: true },
    ] as (Task & { isHelper?: boolean })[];
    expect(filterTechnicianWorkTasks(tasks as Task[], userId)).toHaveLength(1);
  });

  it("excludes subtasks", () => {
    const tasks = [
      { ...baseTask, id: "s", assignedToId: userId, parentTaskId: "parent" },
    ] as Task[];
    expect(filterTechnicianWorkTasks(tasks, userId)).toHaveLength(0);
  });
});
