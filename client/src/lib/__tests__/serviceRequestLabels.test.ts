import { describe, expect, it } from "vitest";
import { getServiceRequestReporter } from "../serviceRequestLabels";

describe("getServiceRequestReporter", () => {
  it("uses the linked user when present", () => {
    const reporter = getServiceRequestReporter(
      { requesterName: "Old Name", requesterEmail: "old@example.com", requesterPhone: "111" },
      { firstName: "Jane", lastName: "Doe", email: "jane@example.com", phoneNumber: "555-0100", role: "staff" },
    );
    expect(reporter).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "555-0100",
      role: "staff",
      isGuest: false,
    });
  });

  it("falls back to public request contact fields", () => {
    const reporter = getServiceRequestReporter({
      requesterId: null,
      requesterName: "Alex Rivera",
      requesterPhone: "555-0199",
    });
    expect(reporter).toEqual({
      name: "Alex Rivera",
      email: null,
      phone: "555-0199",
      role: null,
      isGuest: true,
    });
  });
});
