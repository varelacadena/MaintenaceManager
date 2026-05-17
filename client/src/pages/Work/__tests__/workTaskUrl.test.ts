import { describe, it, expect } from "vitest";
import { buildWorkPath, getTaskIdFromWorkSearch } from "../workTaskUrl";

describe("workTaskUrl", () => {
  it("reads task id from search", () => {
    expect(getTaskIdFromWorkSearch("?task=abc-123")).toBe("abc-123");
    expect(getTaskIdFromWorkSearch("")).toBeNull();
  });

  it("builds work path with task param", () => {
    expect(buildWorkPath("t1", "")).toBe("/work?task=t1");
    expect(buildWorkPath(null, "?task=t1")).toBe("/work");
    expect(buildWorkPath("t2", "?tab=projects")).toContain("task=t2");
  });

  it("clears task param when taskId is null", () => {
    expect(buildWorkPath(null, "?task=old&foo=bar")).toBe("/work?foo=bar");
  });
});
