import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FleetListPagination } from "../FleetListPagination";

describe("FleetListPagination", () => {
  it("renders nothing when total fits in one page", () => {
    const { container } = render(
      <FleetListPagination page={0} pageSize={24} total={10} onPageChange={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows summary and calls onPageChange", () => {
    const onPageChange = vi.fn();

    render(
      <FleetListPagination
        page={1}
        pageSize={20}
        total={55}
        onPageChange={onPageChange}
        itemLabel="reservations"
        testIdPrefix="reservations"
      />,
    );

    expect(screen.getByTestId("reservations-pagination-summary")).toHaveTextContent(
      "Showing 21–40 of 55 reservations",
    );

    fireEvent.click(screen.getByTestId("reservations-pagination-next"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
