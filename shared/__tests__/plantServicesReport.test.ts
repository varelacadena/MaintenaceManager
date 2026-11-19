import { describe, expect, it } from "vitest";
import {
  attributePurchaseAmounts,
  buildPlantServicesReport,
  formatMoney,
  formatPeriodLabel,
  LABOR_HOURLY_RATE,
} from "../plantServicesReport";
import { costByPropertyChart, tasksByPropertyChart, technicianHoursChart } from "../plantServicesCharts";

const preparedOn = "2026-11-18";

describe("plant services report", () => {
  it("formats a period in one year the way the sample does", () => {
    expect(formatPeriodLabel("2026-10-01", "2026-10-31")).toBe("October 1 – October 31, 2026");
  });

  it("prices technician time at the base rate and treats purchases as parts", () => {
    const report = buildPlantServicesReport({
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      preparedOn,
      tasks: [
        {
          id: "boiler",
          completedOn: "2026-10-21",
          propertyName: "Mansion",
          location: "Boiler Room",
          description: "Annual boiler service",
          priority: "medium",
          status: "completed",
        },
        {
          id: "light",
          completedOn: "2026-10-28",
          propertyName: "Mansion",
          location: "Exterior, Front Entry",
          description: "Replaced exterior security light",
          priority: "low",
          status: "completed",
        },
        {
          id: "student-only",
          completedOn: "2026-10-04",
          propertyName: "Cabin 3",
          location: "Kitchen",
          description: "Student work",
          priority: "low",
          status: "completed",
        },
      ],
      time: [
        { taskId: "boiler", technicianId: "marcus", technicianName: "Marcus Reyes", minutes: 120 },
        { taskId: "boiler", technicianId: "daniel", technicianName: "Daniel Ortiz", minutes: 90 },
        { taskId: "light", technicianId: "luis", technicianName: "Luis Herrera", minutes: 90 },
      ],
      purchases: [
        {
          taskId: "light",
          purchasedOn: "2026-10-28",
          storeName: "Home Depot",
          description: "LED security light",
          amount: 42.5,
        },
      ],
    });

    expect(report.empty).toBe(false);
    expect(report.totals.tasks).toBe(2);
    expect(report.totals.properties).toBe(1);
    expect(report.totals.hours).toBe(5);
    expect(report.totals.laborCost).toBe(5 * LABOR_HOURLY_RATE);
    expect(report.totals.materialsCost).toBe(42.5);
    expect(report.totals.totalCost).toBe(5 * LABOR_HOURLY_RATE + 42.5);
    expect(report.summary).toContain(formatMoney(report.totals.totalCost));
    expect(report.summary).not.toMatch(/contractor/i);
    expect(report.buildings).toHaveLength(1);
    expect(report.buildings[0]?.rows.map((row) => row.performedBy)).toEqual([
      "Marcus Reyes, Daniel Ortiz",
      "Luis Herrera",
    ]);
    expect(report.technicians.map((person) => person.name)).toEqual([
      "Daniel Ortiz",
      "Luis Herrera",
      "Marcus Reyes",
    ]);
    expect(report.technicians.find((person) => person.name === "Marcus Reyes")?.tasksLed).toBe(1);
    expect(report.taskLog[0]?.priority).toBe("Medium");
    expect(report.timeEntries.every((row) => row.hourlyRate === LABOR_HOURLY_RATE)).toBe(true);
    expect(report.purchases).toHaveLength(1);
    expect(report.highlights).toContain("Mansion had the most tasks (2).");
  });

  it("counts every technician with equal hours as a lead", () => {
    const report = buildPlantServicesReport({
      startDate: "",
      endDate: "",
      preparedOn,
      tasks: [
        {
          id: "job",
          completedOn: "2026-10-02",
          propertyName: "Well House",
          location: "Pump Room",
          description: "Replaced the sensor",
          priority: "high",
          status: "completed",
        },
      ],
      time: [
        { taskId: "job", technicianId: "a", technicianName: "Marcus Reyes", minutes: 60 },
        { taskId: "job", technicianId: "b", technicianName: "Daniel Ortiz", minutes: 60 },
      ],
      purchases: [],
    });

    expect(report.technicians.every((person) => person.tasksLed === 1)).toBe(true);
    expect(report.highlights).toContain("Daniel Ortiz and Marcus Reyes logged the most hours");
    expect(report.summary.startsWith("The Plant Services team completed 1 task at 1 property.")).toBe(true);
  });

  it("splits one receipt across the jobs it is tied to", () => {
    const shares = attributePurchaseAmounts(
      [{ id: "po", amount: 10, taskIds: ["a", "b", "c"] }],
      new Set(["a", "b"]),
    );
    expect(shares.map((share) => share.amount)).toEqual([3.34, 3.33]);
    expect(shares.reduce((sum, share) => sum + share.amount, 0)).toBe(6.67);
  });

  it("draws the three charts without a contractor series", () => {
    const hours = technicianHoursChart([{ name: "Luis Herrera", hours: 1.5, tasks: 1 }]);
    const tasks = tasksByPropertyChart([{ name: "Mansion", tasks: 2 }]);
    const cost = costByPropertyChart([{ name: "Mansion", laborCost: 30, materialsCost: 10 }]);
    expect(hours.svg).toContain("Work Spread by Technician");
    expect(hours.svg).toContain("Luis Herrera");
    expect(tasks.svg).toContain("1F7A6B");
    expect(cost.svg).toContain("Materials / parts");
    expect(cost.svg).not.toMatch(/contractor/i);
  });
});
