import { describe, expect, it } from "vitest";
import { parseFloatInput, parseIntInput } from "../formInputUtils";

describe("formInputUtils", () => {
  describe("parseIntInput", () => {
    it("parses valid integers", () => {
      expect(parseIntInput("42")).toBe(42);
      expect(parseIntInput("0")).toBe(0);
    });

    it("returns undefined for empty input", () => {
      expect(parseIntInput("")).toBeUndefined();
      expect(parseIntInput("   ")).toBeUndefined();
    });

    it("returns undefined for invalid input", () => {
      expect(parseIntInput("abc")).toBeUndefined();
    });
  });

  describe("parseFloatInput", () => {
    it("parses valid decimals", () => {
      expect(parseFloatInput("3.14")).toBe(3.14);
      expect(parseFloatInput("0")).toBe(0);
    });

    it("returns undefined for empty input", () => {
      expect(parseFloatInput("")).toBeUndefined();
    });
  });
});
