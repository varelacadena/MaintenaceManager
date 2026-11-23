import { describe, expect, it } from "vitest";
import { formatElapsed, formatLoggedMinutes } from "../duration";

describe("formatElapsed", () => {
  it("keeps a clock under one day", () => {
    expect(formatElapsed(0)).toBe("0:00:00");
    expect(formatElapsed(65)).toBe("0:01:05");
    expect(formatElapsed(3661)).toBe("1:01:01");
  });

  it("rolls hours into days at 24 hours", () => {
    expect(formatElapsed(86400)).toBe("1d 0:00:00");
    expect(formatElapsed(90061)).toBe("1d 1:01:01");
    expect(formatElapsed(172800)).toBe("2d 0:00:00");
  });
});

describe("formatLoggedMinutes", () => {
  it("keeps hours and minutes under one day", () => {
    expect(formatLoggedMinutes(0)).toBe("0h 0m");
    expect(formatLoggedMinutes(90)).toBe("1h 30m");
  });

  it("rolls hours into days at 24 hours", () => {
    expect(formatLoggedMinutes(24 * 60)).toBe("1d");
    expect(formatLoggedMinutes(26 * 60 + 15)).toBe("1d 2h 15m");
    expect(formatLoggedMinutes(48 * 60)).toBe("2d");
  });
});
