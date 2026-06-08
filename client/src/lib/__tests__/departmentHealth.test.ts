import { describe, it, expect } from "vitest";
import type { Task } from "@shared/schema";
import {
  buildDepartmentHealthList,
  computeHealthScore,
  scoreToHealthLevel,
  UNASSIGNED_DEPARTMENT_ID,
  matchesDepartmentFilter,
} from "../departmentHealth";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    name: "Test",
    description: "",
    urgency: "low",
    status: "not_started",
    areaId: null,
    subdivisionId: null,
    initialDate: new Date(),
    estimatedCompletionDate: null,
    actualCompletionDate: null,
    assignedToId: null,
    propertyId: null,
    spaceId: null,
    equipmentId: null,
    vehicleId: null,
    requestId: null,
    projectId: null,
    parentTaskId: null,
    createdById: "u1",
    taskType: "one_time",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Task;
}

describe("departmentHealth", () => {
  it("scores higher when overdue and urgent tasks accumulate", () => {
    const stats = { open: 5, overdue: 2, urgent: 1, unassigned: 1, blocked: 0 };
    expect(computeHealthScore(stats)).toBeGreaterThan(computeHealthScore({ open: 5, overdue: 0, urgent: 0, unassigned: 0, blocked: 0 }));
    expect(scoreToHealthLevel(computeHealthScore(stats), stats)).toBe("red");
  });

  it("builds department health sorted by severity", () => {
    const areas = [
      { id: "a1", name: "Grounds" },
      { id: "a2", name: "Auto Shop" },
    ];
    const tasks = [
      makeTask({ id: "t1", areaId: "a1", urgency: "high", status: "on_hold" }),
      makeTask({ id: "t2", areaId: "a2", status: "completed" }),
      makeTask({ id: "t3", areaId: null, assignedToId: null }),
    ];
    const result = buildDepartmentHealthList(tasks, areas);
    expect(result[0].departmentId).toBe("a1");
    expect(result.find((d) => d.departmentId === UNASSIGNED_DEPARTMENT_ID)?.stats.open).toBe(1);
  });

  it("matches department filter including unassigned", () => {
    expect(matchesDepartmentFilter("a1", "a1")).toBe(true);
    expect(matchesDepartmentFilter(null, UNASSIGNED_DEPARTMENT_ID)).toBe(true);
    expect(matchesDepartmentFilter("a1", UNASSIGNED_DEPARTMENT_ID)).toBe(false);
  });
});
