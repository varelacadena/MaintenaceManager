import { describe, expect, it } from "vitest";
import { parsePaginationQuery } from "../routeUtils";

describe("parsePaginationQuery", () => {
  it("returns null when limit and offset are omitted", () => {
    expect(parsePaginationQuery({})).toBeNull();
  });

  it("parses limit and offset with defaults", () => {
    expect(parsePaginationQuery({ limit: "24" })).toEqual({ limit: 24, offset: 0 });
  });

  it("caps limit at 200", () => {
    expect(parsePaginationQuery({ limit: "999", offset: "0" })).toEqual({
      limit: 200,
      offset: 0,
    });
  });

  it("floors invalid offset to zero", () => {
    expect(parsePaginationQuery({ limit: "10", offset: "-5" })).toEqual({
      limit: 10,
      offset: 0,
    });
  });
});
