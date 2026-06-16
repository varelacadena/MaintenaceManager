import { describe, expect, it } from "vitest";
import { getParentRoute, hasPageBackControl } from "../navigation";

describe("getParentRoute", () => {
  it("returns fleet admin destinations for verification and check-in flows", () => {
    expect(getParentRoute("/vehicle-checkin-verify/abc", "admin")).toBe(
      "/vehicles?tab=reservations",
    );
    expect(getParentRoute("/vehicle-checkin/log-1", "admin")).toBe(
      "/vehicles?tab=reservations",
    );
  });

  it("returns my-reservations for technician fleet workflows", () => {
    expect(getParentRoute("/vehicle-checkout/res-1", "technician")).toBe(
      "/my-reservations",
    );
    expect(getParentRoute("/vehicle-checkin/log-1", "technician")).toBe(
      "/my-reservations",
    );
  });

  it("returns list parents for detail routes", () => {
    expect(getParentRoute("/requests/req-1")).toBe("/requests");
    expect(getParentRoute("/tasks/task-1")).toBe("/work");
    expect(getParentRoute("/work/add-job", "technician")).toBe("/work");
    expect(getParentRoute("/vehicles/v-1/edit")).toBe("/vehicles/v-1");
    expect(getParentRoute("/vehicles/v-1")).toBe("/vehicles");
  });

  it("identifies routes that already render their own back control", () => {
    expect(hasPageBackControl("/tasks/task-1", "admin")).toBe(true);
    expect(hasPageBackControl("/work/add-job", "technician")).toBe(true);
    expect(hasPageBackControl("/vehicle-checkin-verify/checkin-1", "admin")).toBe(true);
    expect(hasPageBackControl("/requests/request-1", "staff")).toBe(true);
    expect(hasPageBackControl("/requests/request-1", "admin")).toBe(false);
    expect(hasPageBackControl("/vehicles/vehicle-1", "admin")).toBe(false);
  });
});
