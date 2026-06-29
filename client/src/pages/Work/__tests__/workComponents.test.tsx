import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Task, User } from "@shared/schema";
import { TechnicianWorkView } from "../TechnicianWorkView";
import { WorkStatusGroupHeader } from "../WorkStatusGroupHeader";
import { WorkTasksEmptyState } from "../WorkTasksEmptyState";

describe("WorkStatusGroupHeader", () => {
  it("renders expanded state and calls onToggle when clicked", () => {
    const onToggle = vi.fn();
    render(
      <WorkStatusGroupHeader
        statusKey="in_progress"
        label="In Progress"
        count={4}
        isCollapsed={false}
        isEmpty={false}
        onToggle={onToggle}
      />,
    );

    const button = screen.getByTestId("toggle-group-in_progress");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("disables toggle when group is empty", () => {
    render(
      <WorkStatusGroupHeader
        statusKey="ready"
        label="Ready"
        count={0}
        isCollapsed={true}
        isEmpty={true}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByTestId("toggle-group-ready")).toBeDisabled();
    expect(screen.getByTestId("toggle-group-ready")).toHaveAttribute("aria-expanded", "false");
  });
});

describe("WorkTasksEmptyState", () => {
  it("shows department filter empty state and clears filter", () => {
    const onClearDepartmentFilter = vi.fn();
    render(
      <WorkTasksEmptyState
        hasSearchQuery={false}
        hasDepartmentFilter
        departmentFilterName="Auto Shop"
        onClearSearch={vi.fn()}
        onClearDepartmentFilter={onClearDepartmentFilter}
        onOpenProjectsTab={vi.fn()}
      />,
    );

    expect(screen.getByTestId("work-tasks-empty-department")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("button-clear-department-filter"));
    expect(onClearDepartmentFilter).toHaveBeenCalledTimes(1);
  });

  it("shows tech filter empty state and clears filter", () => {
    const onClearTechFilter = vi.fn();
    render(
      <WorkTasksEmptyState
        hasSearchQuery={false}
        hasTechFilter
        techFilterName="Jane Tech"
        onClearSearch={vi.fn()}
        onClearTechFilter={onClearTechFilter}
        onOpenProjectsTab={vi.fn()}
      />,
    );

    expect(screen.getByTestId("work-tasks-empty-tech")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("button-clear-tech-filter"));
    expect(onClearTechFilter).toHaveBeenCalledTimes(1);
  });

  it("shows search empty state and clears search", () => {
    const onClearSearch = vi.fn();
    render(
      <WorkTasksEmptyState
        hasSearchQuery={true}
        onClearSearch={onClearSearch}
        onOpenProjectsTab={vi.fn()}
      />,
    );

    expect(screen.getByTestId("work-tasks-empty-search")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("button-clear-work-search"));
    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it("shows board empty state with project tab action", () => {
    const onOpenProjectsTab = vi.fn();
    render(
      <WorkTasksEmptyState
        hasSearchQuery={false}
        onClearSearch={vi.fn()}
        onOpenProjectsTab={onOpenProjectsTab}
      />,
    );

    expect(screen.getByTestId("work-tasks-empty")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("button-empty-view-projects"));
    expect(onOpenProjectsTab).toHaveBeenCalledTimes(1);
  });
});

describe("TechnicianWorkView", () => {
  it("opens the guided add job flow from My Tasks", () => {
    const navigate = vi.fn();
    const user = { id: "tech-1", role: "technician" } as User;
    const tasks = [
      {
        id: "task-1",
        name: "Today task",
        description: "Task description",
        urgency: "medium",
        initialDate: new Date(),
        estimatedCompletionDate: new Date(),
        assignedToId: "tech-1",
        status: "not_started",
        taskType: "one_time",
      },
    ] as Task[];

    render(<TechnicianWorkView user={user} tasks={tasks} navigate={navigate} />);

    fireEvent.click(screen.getByTestId("button-add-field-job"));
    expect(navigate).toHaveBeenCalledWith("/work/add-job");
  });
});
