import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { GrowingNoteField } from "../GrowingNoteField";

describe("GrowingNoteField", () => {
  const scrollHeight = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "scrollHeight");

  afterEach(() => {
    cleanup();
    if (scrollHeight) {
      Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", scrollHeight);
    }
  });

  function mockScrollHeight(value: number) {
    Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return value;
      },
    });
  }

  it("grows a short note and leaves it without a scroll hint", () => {
    mockScrollHeight(72);
    render(<GrowingNoteField value="Replaced the float." onChange={() => {}} />);
    expect(screen.queryByTestId("note-overflow-hint")).not.toBeInTheDocument();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).style.height).toBe("72px");
  });

  it("caps a long note and says there is more to scroll", () => {
    mockScrollHeight(800);
    render(<GrowingNoteField value={"Painted the ceiling.\n".repeat(40)} onChange={() => {}} />);
    expect(screen.getByTestId("note-overflow-hint")).toHaveTextContent("Scroll to read the rest of this note");
    const height = parseInt((screen.getByRole("textbox") as HTMLTextAreaElement).style.height, 10);
    expect(height).toBeGreaterThan(72);
    expect(height).toBeLessThanOrEqual(256);
  });
});
