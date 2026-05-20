import { describe, expect, it } from "vitest";
import { changePasswordRequestSchema, USER_PASSWORD_MIN_LENGTH } from "../userValidation";

describe("user validation", () => {
  it("rejects password changes below the configured minimum length", () => {
    const result = changePasswordRequestSchema.safeParse({
      currentPassword: "current-password",
      newPassword: "x".repeat(USER_PASSWORD_MIN_LENGTH - 1),
    });

    expect(result.success).toBe(false);
  });

  it("accepts password changes at the configured minimum length", () => {
    const result = changePasswordRequestSchema.safeParse({
      currentPassword: "current-password",
      newPassword: "x".repeat(USER_PASSWORD_MIN_LENGTH),
    });

    expect(result.success).toBe(true);
  });
});
