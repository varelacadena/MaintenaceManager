import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
    localStorage.clear();
  });

  function renderTech(ui: ReactElement) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  }

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

    renderTech(<TechnicianWorkView user={user} tasks={tasks} navigate={navigate} />);

    fireEvent.click(screen.getByTestId("button-add-field-job"));
    expect(navigate).toHaveBeenCalledWith("/work/add-job");
  });

  it("keeps the list or week choice after remounting", () => {
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

    const { unmount } = renderTech(<TechnicianWorkView user={user} tasks={tasks} navigate={navigate} />);
    fireEvent.click(screen.getByTestId("button-view-week"));
    expect(screen.getByTestId("button-view-week")).toHaveAttribute("aria-pressed", "true");

    unmount();
    renderTech(<TechnicianWorkView user={user} tasks={tasks} navigate={navigate} />);
    expect(screen.getByTestId("button-view-week")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("button-view-list")).toHaveAttribute("aria-pressed", "false");
  });

  it("draws one week dot per job on that day", () => {
    const navigate = vi.fn();
    const user = { id: "tech-1", role: "technician" } as User;
    const friday = new Date();
    friday.setDate(friday.getDate() + 2);
    friday.setHours(12, 0, 0, 0);
    const tasks = ["a", "b", "c", "d", "e", "f"].map((id) => ({
      id,
      name: `Job ${id}`,
      description: "Task description",
      urgency: "medium",
      initialDate: friday,
      estimatedCompletionDate: friday,
      assignedToId: "tech-1",
      status: "not_started",
      taskType: "one_time",
    })) as Task[];

    renderTech(<TechnicianWorkView user={user} tasks={tasks} navigate={navigate} />);
    fireEvent.click(screen.getByTestId("button-view-week"));

    const year = friday.getFullYear();
    const month = String(friday.getMonth() + 1).padStart(2, "0");
    const day = String(friday.getDate()).padStart(2, "0");
    const meter = screen.getByTestId(`tech-week-meter-${year}-${month}-${day}`);
    expect(meter.children).toHaveLength(6);
    expect(screen.getByTestId(`tech-week-count-${year}-${month}-${day}`)).toHaveTextContent("6");
  });

  it("opens a work day from Reschedule without opening the task", () => {
    const navigate = vi.fn();
    const user = { id: "tech-1", role: "technician" } as User;
    const past = new Date();
    past.setDate(past.getDate() - 4);
    past.setHours(12, 0, 0, 0);
    const tasks = [
      {
        id: "late-1",
        name: "Boiler leak",
        description: "Task description",
        urgency: "high",
        initialDate: past,
        estimatedCompletionDate: past,
        assignedToId: "tech-1",
        status: "not_started",
        taskType: "one_time",
      },
    ] as Task[];

    renderTech(<TechnicianWorkView user={user} tasks={tasks} navigate={navigate} />);

    expect(screen.queryByTestId("place-days-late-1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("button-reschedule-late-1"));
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByTestId("place-days-late-1").children).toHaveLength(7);

    fireEvent.click(screen.getByTestId("tech-task-card-late-1"));
    expect(navigate).toHaveBeenCalledWith("/tasks/late-1");
  });
});
