import { describe, expect, it } from "vitest";
import { queryClient } from "../queryClient";
import { invalidateTaskAfterMutation } from "../taskQueryInvalidation";

describe("invalidateTaskAfterMutation", () => {
  it("refreshes project and property task screens along with the work list", async () => {
    queryClient.setQueryData(["/api/tasks", { stack: "open" }], []);
    queryClient.setQueryData(["/api/projects", "project-1", "tasks"], []);
    queryClient.setQueryData(["/api/projects"], []);
    queryClient.setQueryData(["/api/properties", "property-1", "tasks"], []);
    queryClient.setQueryData(["/api/properties", "property-1"], { id: "property-1" });
    queryClient.setQueryData(["/api/dashboard"], {});

    await invalidateTaskAfterMutation("task-1");

    expect(queryClient.getQueryState(["/api/tasks", { stack: "open" }])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["/api/projects", "project-1", "tasks"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["/api/projects"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["/api/properties", "property-1", "tasks"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["/api/dashboard"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["/api/properties", "property-1"])?.isInvalidated).toBe(false);
  });
});
