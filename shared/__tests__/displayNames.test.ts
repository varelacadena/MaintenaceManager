import { describe, expect, it } from "vitest";
import {
  formatUserDisplayName,
  resolveUserDisplayName,
  resolveEntityDisplayName,
} from "../displayNames";

describe("displayNames", () => {
  it("formats full name when available", () => {
    expect(
      formatUserDisplayName({ firstName: "Jane", lastName: "Doe", username: "jdoe" }),
    ).toBe("Jane Doe");
  });

  it("falls back to username", () => {
    expect(formatUserDisplayName({ username: "jdoe" })).toBe("jdoe");
  });

  it("prefers live user over snapshot", () => {
    expect(
      resolveUserDisplayName({
        userId: "u1",
        snapshotName: "Old Name",
        users: [{ id: "u1", firstName: "Jane", lastName: "Doe", username: "jdoe" }],
      }),
    ).toBe("Jane Doe");
  });

  it("uses snapshot when user is gone", () => {
    expect(
      resolveUserDisplayName({
        userId: "u1",
        snapshotName: "John Smith",
        users: [],
      }),
    ).toBe("John Smith");
  });

  it("resolves deleted property from snapshot", () => {
    expect(
      resolveEntityDisplayName({
        entityId: null,
        snapshotName: "Smith Hall",
      }),
    ).toBe("Smith Hall");
  });
});
