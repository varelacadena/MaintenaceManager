import { describe, expect, it } from "vitest";
import type { Task } from "@shared/schema";
import { buildTechWorkPlan, localDayKey } from "../techWorkSchedule";

function task(partial: Partial<Task> & Pick<Task, "id" | "name">): Task {
  return {
    status: "not_started",
    urgency: "medium",
    initialDate: null,
    estimatedCompletionDate: null,
    ...partial,
  } as Task;
}

describe("buildTechWorkPlan", () => {
  const today = new Date(2026, 9, 7, 12, 0, 0, 0);

  it("keeps an unstarted past deadline overdue and puts started work on today", () => {
    const plan = buildTechWorkPlan(
      [
        task({
          id: "boiler",
          name: "Boiler",
          urgency: "high",
          status: "in_progress",
          initialDate: new Date(2026, 9, 6, 12),
          estimatedCompletionDate: new Date(2026, 9, 6, 12),
        }),
        task({
          id: "waiting",
          name: "Waiting on a part",
          status: "on_hold",
          initialDate: new Date(2026, 9, 6, 12),
          estimatedCompletionDate: new Date(2026, 9, 6, 12),
        }),
        task({
          id: "unstarted",
          name: "Unstarted",
          initialDate: new Date(2026, 9, 6, 12),
          estimatedCompletionDate: new Date(2026, 9, 6, 12),
        }),
        task({
          id: "placed",
          name: "Placed late",
          initialDate: new Date(2026, 9, 8, 12),
          estimatedCompletionDate: new Date(2026, 9, 6, 12),
        }),
      ],
      today,
    );

    expect(plan.overdue.map((item) => item.id)).toEqual(["unstarted"]);
    expect(plan.byDay["2026-10-08"].map((item) => item.id)).toEqual(["placed"]);
    expect(plan.byDay[plan.todayKey].map((item) => item.id).sort()).toEqual(["boiler", "waiting"]);
  });

  it("rolls a missed plan day onto today when the deadline has not passed", () => {
    const plan = buildTechWorkPlan(
      [
        task({
          id: "hall",
          name: "Hallway paint",
          urgency: "low",
          initialDate: new Date(2026, 9, 5, 12),
          estimatedCompletionDate: new Date(2026, 9, 9, 12),
        }),
        task({
          id: "field",
          name: "Field job",
          initialDate: new Date(2026, 9, 6, 12),
          estimatedCompletionDate: null,
        }),
      ],
      today,
    );

    expect(plan.overdue).toEqual([]);
    expect(plan.byDay[localDayKey(today)].map((item) => item.id).sort()).toEqual(["field", "hall"]);
  });

  it("gives a day one slot per job, including days past four", () => {
    const fridayJobs = ["a", "b", "c", "d", "e", "f"].map((id, index) =>
      task({
        id,
        name: `Job ${id}`,
        urgency: index === 0 ? "high" : "low",
        initialDate: new Date(2026, 9, 9, 12),
        estimatedCompletionDate: new Date(2026, 9, 9, 12),
      }),
    );
    const plan = buildTechWorkPlan(fridayJobs, today);
    expect(plan.days).toHaveLength(7);
    expect(plan.days[0].key).toBe("2026-10-07");
    expect(plan.days[6].key).toBe("2026-10-13");
    expect(plan.byDay["2026-10-09"]).toHaveLength(6);
    expect(plan.byDay["2026-10-09"][0].id).toBe("a");
  });

  it("puts undated jobs and jobs after the week in their own groups", () => {
    const plan = buildTechWorkPlan(
      [
        task({ id: "shelf", name: "Shelf" }),
        task({
          id: "stairs",
          name: "Stairs",
          initialDate: new Date(2026, 9, 20, 12),
          estimatedCompletionDate: new Date(2026, 9, 20, 12),
        }),
      ],
      today,
    );
    expect(plan.undated.map((item) => item.id)).toEqual(["shelf"]);
    expect(plan.later.map((item) => item.id)).toEqual(["stairs"]);
  });
});
