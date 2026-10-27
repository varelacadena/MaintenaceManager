import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, ChevronRight, Filter, MapPin, MoreHorizontal, Plus, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { dateInputValueToTaskTimestamp, toCalendarDate } from "@/lib/taskCalendarDates";
import { getUserDisplayName } from "@/utils/taskUtils";
import type { Project, Property, Task, User as AppUser } from "@shared/schema";
import { WorkTaskComposer } from "./WorkTaskComposer";
import type { WorkContext } from "./useWorkAdmin";
import { loadWorkListView, saveWorkListView } from "./workListPrefs";
import { WorkStatusGroupHeader, workStatusGroupPanelId } from "./WorkStatusGroupHeader";
import {
  WORK_STACK_LINE,
  WORK_STACK_MARK,
  WORK_STATUS_LABEL,
  byName,
  compareWorkItems,
  dueStamp,
  isWorkOverdue,
  taskVisible,
  toWorkStatus,
  type WorkStatus,
} from "./workListModel";

const pill =
  "inline-flex h-8 max-w-full min-w-0 items-center gap-1 rounded-full border border-border bg-muted/50 px-2 text-[11px] font-normal leading-none text-muted-foreground hover:bg-muted sm:h-7 sm:px-2.5";

const raisedCard =
  "rounded-[10px] border-t border-l border-border/80 border-r border-b-2 border-r-foreground/15 border-b-foreground/25 bg-background";

const rowGrid =
  "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_minmax(0,9rem)_7.5rem_2.25rem] lg:items-center lg:gap-x-3";

const STACKS: WorkStatus[] = ["not_started", "in_progress", "completed"];

function compactDate(value: Date | string | null | undefined): string {
  const date = toCalendarDate(value);
  if (!date) return "No date";
  return format(date, "MMM d");
}

function statusDotClass(status: WorkStatus): string {
  return WORK_STACK_MARK[status];
}

function ChoiceList({
  value,
  options,
  onPick,
  testId,
  fill = false,
}: {
  value: string;
  options: { id: string; label: string; detail?: string }[];
  onPick: (id: string) => void;
  testId: string;
  fill?: boolean;
}) {
  const current = options.find((option) => option.id === value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`${pill} ${fill ? "w-full justify-start" : ""}`} data-testid={testId}>
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">{current?.label || "None"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={12} className="w-[min(16rem,calc(100vw-2rem))] p-1">
        <div className="max-h-64 overflow-auto">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => onPick(option.id)}
            >
              <span>{option.label}</span>
              {option.detail ? <span className="text-xs text-muted-foreground">{option.detail}</span> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PersonList({
  value,
  options,
  onPick,
  testId,
  fill = false,
}: {
  value: string;
  options: { id: string; label: string }[];
  onPick: (id: string) => void;
  testId: string;
  fill?: boolean;
}) {
  const current = options.find((option) => option.id === value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`${pill} ${fill ? "w-full justify-start" : ""}`} data-testid={testId}>
          <User className="h-3 w-3 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">{current?.label || "Unassigned"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={12} className="w-[min(13rem,calc(100vw-2rem))] p-1">
        <div className="max-h-64 overflow-auto">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => onPick(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DateButton({
  value,
  overdue,
  onPick,
  testId,
  align = "start",
  fill = false,
}: {
  value: Date | string | null | undefined;
  overdue?: boolean;
  onPick: (iso: string | null) => void;
  testId: string;
  align?: "start" | "end";
  fill?: boolean;
}) {
  const selected = toCalendarDate(value) ?? undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`${pill} ${fill ? "w-full justify-start" : ""} ${overdue ? "border-destructive/50 bg-destructive/10 text-destructive" : ""}`} data-testid={testId}>
          <CalendarIcon className="h-3 w-3 shrink-0" />
          <span className="min-w-0 truncate">{compactDate(value)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} collisionPadding={12} className="w-auto p-2">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onPick(date ? dateInputValueToTaskTimestamp(format(date, "yyyy-MM-dd")) : null)}
        />
        <button type="button" className="mt-1 w-full text-xs text-muted-foreground" onClick={() => onPick(null)}>
          No date
        </button>
      </PopoverContent>
    </Popover>
  );
}

function TaskMoreMenu({ task, technicians, fill = false }: { task: Task; technicians: AppUser[]; fill?: boolean }) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const { data: helpers = [] } = useQuery<{ userId: string }[]>({
    queryKey: ["/api/tasks", task.id, "helpers"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${task.id}/helpers`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const extraTechnicians = technicians
    .filter((user) => user.id !== task.assignedToId)
    .sort((a, b) => byName(getUserDisplayName(a), getUserDisplayName(b)));
  const helperIds = helpers.map((helper) => helper.userId);

  const patch = useMutation({
    mutationFn: async (data: Record<string, unknown>) => apiRequest("PATCH", `/api/tasks/${task.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const addChild = useMutation({
    mutationFn: async (name: string) =>
      apiRequest("POST", "/api/tasks", {
        name,
        description: name,
        urgency: task.urgency || "medium",
        initialDate: new Date().toISOString(),
        propertyId: task.propertyId,
        assignedToId: task.assignedToId,
        parentTaskId: task.id,
        projectId: task.projectId,
        status: "not_started",
      }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`inline-flex items-center justify-center rounded-full border border-border bg-background text-muted-foreground ${fill ? "h-8 w-full lg:h-7 lg:w-7" : "h-7 w-7"}`} aria-label="More edits" data-testid={`button-more-${task.id}`}>
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={12} className="max-h-[min(24rem,calc(100dvh-2rem))] w-[min(20rem,calc(100vw-2rem))] space-y-3 overflow-auto">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Title</span>
          <Input
            defaultValue={task.name}
            onBlur={(event) => {
              const name = event.target.value.trim();
              if (name && name !== task.name) patch.mutate({ name });
            }}
          />
        </label>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Priority</span>
          <div className="grid grid-cols-3 gap-1">
            {(["low", "medium", "high"] as const).map((urgency) => (
              <button
                key={urgency}
                type="button"
                className={`${pill} w-full justify-center capitalize ${task.urgency === urgency ? "border-primary" : ""}`}
                onClick={() => patch.mutate({ urgency })}
              >
                {urgency}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Additional technicians</span>
          {extraTechnicians.map((tech) => {
            const checked = helperIds.includes(tech.id);
            return (
              <label key={tech.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) => {
                    const ids = next ? [...helperIds, tech.id] : helperIds.filter((id) => id !== tech.id);
                    patch.mutate({ helperUserIds: ids });
                  }}
                />
                {getUserDisplayName(tech)}
              </label>
            );
          })}
        </div>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Start date</span>
            <DateButton
              value={task.initialDate}
              onPick={(iso) => { if (iso) patch.mutate({ initialDate: iso }); }}
              testId={`button-start-${task.id}`}
              fill
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Completion date</span>
            <DateButton
              value={task.actualCompletionDate}
              onPick={(iso) => patch.mutate({ actualCompletionDate: iso })}
              testId={`button-completed-${task.id}`}
              align="end"
              fill
            />
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Estimated hours</span>
          <Input
            defaultValue={task.estimatedHours ?? ""}
            onBlur={(event) => {
              const raw = event.target.value.trim();
              patch.mutate({ estimatedHours: raw === "" ? null : Number(raw) });
            }}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Description</span>
          <Textarea
            defaultValue={task.description}
            rows={2}
            onBlur={(event) => {
              if (event.target.value !== task.description) patch.mutate({ description: event.target.value });
            }}
          />
        </label>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Subtasks</span>
          <div className="flex gap-2">
            <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="New subtask" />
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              disabled={!draft.trim() || addChild.isPending}
              onClick={() => addChild.mutate(draft.trim())}
            >
              Add
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TaskRow({
  task,
  nested,
  properties,
  technicians,
  selecting,
  checked,
  onToggle,
  onProperty,
  onAssignee,
  onDue,
}: {
  task: Task;
  nested?: boolean;
  properties: Property[];
  technicians: AppUser[];
  selecting: boolean;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  onProperty: (propertyId: string) => void;
  onAssignee: (userId: string) => void;
  onDue: (iso: string | null) => void;
}) {
  const overdue = isWorkOverdue(task.estimatedCompletionDate, task.status);
  const multiPropertyIds = !task.propertyId && task.propertyIds?.length ? task.propertyIds : [];
  const multiLabel = multiPropertyIds.length
    ? `${properties.find((property) => property.id === multiPropertyIds[0])?.name || "Property"}${multiPropertyIds.length > 1 ? ` +${multiPropertyIds.length - 1}` : ""}`
    : "";
  const propertyOptions = [
    ...(multiLabel ? [{ id: "__multi__", label: multiLabel }] : []),
    { id: "__none__", label: "No property" },
    ...[...properties].sort((a, b) => byName(a.name, b.name)).map((property) => ({
      id: property.id,
      label: property.name,
      detail: property.address || undefined,
    })),
  ];
  const techOptions = [
    { id: "__none__", label: "Unassigned" },
    ...[...technicians].sort((a, b) => byName(getUserDisplayName(a), getUserDisplayName(b))).map((tech) => ({
      id: tech.id,
      label: getUserDisplayName(tech),
    })),
  ];

  return (
    <div
      className={`${raisedCard} px-3 py-2.5 ${nested ? "ml-3 mt-2 sm:ml-5" : ""} ${checked ? "bg-muted" : ""} lg:py-2 ${rowGrid}`}
      data-testid={`row-task-${task.id}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        {selecting ? (
          <Checkbox
            checked={checked}
            onCheckedChange={(next) => onToggle(next === true)}
            aria-label={`Select ${task.name}`}
            className="mt-0.5 h-6 w-6 shrink-0"
            data-testid={`check-task-${task.id}`}
          />
        ) : null}
        <Link href={`/tasks/${task.id}`} className="block min-w-0 break-words font-serif text-base font-medium leading-snug hover:underline" data-testid={`link-task-${task.id}`}>
          {task.name}
        </Link>
      </div>
      <div className="mt-2 grid w-full min-w-0 grid-cols-2 gap-1.5 border-t border-border/70 pt-2 lg:mt-0 lg:contents lg:border-0 lg:pt-0">
        <ChoiceList
          value={task.propertyId || (multiLabel ? "__multi__" : "__none__")}
          options={propertyOptions}
          onPick={onProperty}
          testId={`button-property-${task.id}`}
          fill
        />
        <PersonList value={task.assignedToId || "__none__"} options={techOptions} onPick={onAssignee} testId={`button-tech-${task.id}`} fill />
        <DateButton value={task.estimatedCompletionDate} overdue={overdue} onPick={onDue} testId={`button-due-${task.id}`} align="end" fill />
        <div className="min-w-0 lg:justify-self-end">
          <TaskMoreMenu task={task} technicians={technicians} fill />
        </div>
      </div>
    </div>
  );
}

export function AdminWorkList({ ctx }: { ctx: WorkContext }) {
  const {
    searchQuery,
    setSearchQuery,
    tasks,
    projects,
    properties = [],
    technicianUsers,
    subTasksMap,
    handlePropertyChange,
    handleAssigneeChange,
    setProjectDialogOpen,
    tasksError,
  } = ctx;

  const [remembered] = useState(() => loadWorkListView());
  const [statuses, setStatuses] = useState<WorkStatus[]>(remembered?.statuses ?? STACKS);
  const [collapsedStacks, setCollapsedStacks] = useState<Record<WorkStatus, boolean>>(remembered?.collapsedStacks ?? {
    not_started: false,
    in_progress: false,
    completed: true,
  });
  const [overdueOnly, setOverdueOnly] = useState(remembered?.overdueOnly ?? false);
  const [techIds, setTechIds] = useState<string[]>(remembered?.techIds ?? (ctx.techFilter ? [ctx.techFilter] : []));
  const [propertyIds, setPropertyIds] = useState<string[]>(remembered?.propertyIds ?? []);
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>(remembered?.openProjects ?? {});
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const [filtersPlace, setFiltersPlace] = useState<{ top: number; right: number; wide: boolean; maxHeight: number } | null>(null);

  useEffect(() => {
    saveWorkListView({ statuses, collapsedStacks, overdueOnly, techIds, propertyIds, openProjects });
  }, [statuses, collapsedStacks, overdueOnly, techIds, propertyIds, openProjects]);

  useEffect(() => {
    if (!filtersOpen) return;
    const place = () => {
      const rect = filtersButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const wide = window.innerWidth >= 1024;
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const openUp = wide && below < 280 && above > below;
      const maxHeight = Math.min(window.innerHeight * 0.7, Math.max(160, openUp ? above : below));
      setFiltersPlace({
        top: openUp ? Math.max(12, rect.top - 8 - maxHeight) : rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
        wide,
        maxHeight,
      });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("keydown", onKey);
    };
  }, [filtersOpen]);

  const patchTask = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/tasks/${taskId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }),
  });

  const deleteTasks = useMutation({
    mutationFn: async (ids: string[]) => {
      const list = tasks || [];
      const pending = new Set(ids);
      while (pending.size > 0) {
        const leaves = [...pending].filter((id) => !list.some((task) => task.parentTaskId === id && pending.has(task.id)));
        const batch = leaves.length > 0 ? leaves : [...pending];
        for (const id of batch) {
          await apiRequest("DELETE", `/api/tasks/${id}`);
          pending.delete(id);
        }
      }
    },
    onSuccess: () => {
      setSelected([]);
      setSelecting(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const patchProject = useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/projects/${projectId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
  });

  const statusDefault = STACKS.every((status) => statuses.includes(status));
  const filterCount = (statusDefault ? 0 : 1) + (overdueOnly ? 1 : 0) + techIds.length + propertyIds.length;

  const taskInStack = (task: Task, stack: WorkStatus) =>
    toWorkStatus(task.status) === stack &&
    taskVisible({
      status: task.status,
      due: task.estimatedCompletionDate,
      assigneeId: task.assignedToId,
      propertyId: task.propertyId,
      taskPropertyIds: task.propertyIds,
      name: task.name,
      statuses: [stack],
      overdueOnly,
      techIds,
      propertyIds,
      query: searchQuery,
    });

  const stacks = STACKS.filter((stack) => statuses.includes(stack)).map((stack) => {
    const list = tasks || [];
    const inStack = (task: Task) => taskInStack(task, stack);

    const projectRows = (projects || []).flatMap((project) => {
      const matching = list.filter((task) => task.projectId === project.id && inStack(task));
      const matchingIds = new Set(matching.map((task) => task.id));
      const children = matching.filter((task) => !task.parentTaskId || !matchingIds.has(task.parentTaskId));
      const query = searchQuery.trim().toLowerCase();
      const self =
        children.length === 0 &&
        toWorkStatus(project.status) === stack &&
        (!overdueOnly || isWorkOverdue(project.targetEndDate, project.status)) &&
        (propertyIds.length === 0 || propertyIds.includes(project.propertyId || "")) &&
        techIds.length === 0 &&
        (!query || project.name.toLowerCase().includes(query));
      if (children.length === 0 && !self) return [];
      return [{
        kind: "project" as const,
        project,
        children,
        jobCount: matching.length,
        overdue: isWorkOverdue(project.targetEndDate, project.status),
        due: dueStamp(project.targetEndDate),
        name: project.name,
      }];
    });

    const loose = list.filter((task) => !task.projectId && inStack(task));
    const looseIds = new Set(loose.map((task) => task.id));
    const standalone = loose
      .filter((task) => !task.parentTaskId || !looseIds.has(task.parentTaskId))
      .map((task) => ({
        kind: "task" as const,
        task,
        overdue: isWorkOverdue(task.estimatedCompletionDate, task.status),
        due: dueStamp(task.estimatedCompletionDate),
        name: task.name,
      }));

    const rows = [...projectRows, ...standalone].sort(compareWorkItems);
    const emptyProjects = projectRows.filter((row) => row.children.length === 0).length;
    return { stack, rows, count: list.filter(inStack).length + emptyProjects };
  });
  const visibleJobs = stacks.reduce((sum, stack) => sum + stack.count, 0);

  const propertyOptions = [...properties].sort((a, b) => byName(a.name, b.name));
  const techOptions = [...technicianUsers].sort((a, b) => byName(getUserDisplayName(a), getUserDisplayName(b)));

  function branchTasks(task: Task, stack: WorkStatus): Task[] {
    const children = (subTasksMap[task.id] || []).filter((child) => taskInStack(child, stack));
    return [task, ...children.flatMap((child) => branchTasks(child, stack))];
  }

  function toggleTask(id: string, checked: boolean) {
    setSelected((current) => {
      if (checked) return current.includes(id) ? current : [...current, id];
      return current.filter((item) => item !== id);
    });
  }

  function toggleMany(ids: string[], checked: boolean) {
    setSelected((current) => {
      const rest = current.filter((id) => !ids.includes(id));
      return checked ? [...rest, ...ids] : rest;
    });
  }

  function toggleStatus(status: WorkStatus) {
    setStatuses((current) => (current.includes(status) ? current.filter((item) => item !== status) : [...current, status]));
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 p-3 sm:p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold md:text-2xl" data-testid="text-page-title">Work</h1>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 min-h-8 rounded-full px-3 text-xs sm:h-9 sm:min-h-9 sm:px-4 sm:text-sm" onClick={() => setProjectDialogOpen(true)} data-testid="button-new-project">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Project
          </Button>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border bg-card">
        <WorkTaskComposer />
        <div className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search tasks and projects"
              className="rounded-full pl-9"
              data-testid="input-search-work"
            />
          </div>
          <button
            ref={filtersButtonRef}
            type="button"
            className={`${pill} max-w-[40vw] shrink-0 sm:max-w-none`}
            aria-expanded={filtersOpen}
            data-testid="button-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Filter className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Filters{filterCount > 0 ? ` · ${filterCount}` : ""}</span>
          </button>
          {filtersOpen && filtersPlace
            ? createPortal(
                <>
                  <div className="fixed inset-0 z-[140]" onMouseDown={() => setFiltersOpen(false)} />
                  <div
                    role="dialog"
                    aria-label="Filters"
                    onMouseDown={(event) => event.stopPropagation()}
                    style={
                      filtersPlace.wide
                        ? {
                            top: filtersPlace.top,
                            right: filtersPlace.right,
                            width: "min(40rem, calc(100vw - 2rem))",
                            maxHeight: filtersPlace.maxHeight,
                          }
                        : undefined
                    }
                    className={
                      filtersPlace.wide
                        ? "fixed z-[150] overflow-auto rounded-md border bg-popover p-3 text-popover-foreground shadow-md"
                        : "fixed inset-x-3 bottom-3 z-[150] max-h-[min(70dvh,calc(100dvh-1.5rem))] overflow-auto rounded-md border bg-popover p-3 text-popover-foreground shadow-md"
                    }
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Status</p>
                        {(["not_started", "in_progress", "completed"] as const).map((status) => (
                          <label key={status} className="flex items-center gap-2 text-sm">
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(status)}`} />
                            <Checkbox checked={statuses.includes(status)} onCheckedChange={() => toggleStatus(status)} />
                            {WORK_STATUS_LABEL[status]}
                          </label>
                        ))}
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={overdueOnly} onCheckedChange={(checked) => setOverdueOnly(!!checked)} />
                          Overdue
                        </label>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Technician</p>
                        {techOptions.map((tech) => (
                          <label key={tech.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={techIds.includes(tech.id)}
                              onCheckedChange={() =>
                                setTechIds((current) =>
                                  current.includes(tech.id) ? current.filter((id) => id !== tech.id) : [...current, tech.id],
                                )
                              }
                            />
                            {getUserDisplayName(tech)}
                          </label>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Property</p>
                        {propertyOptions.map((property) => (
                          <label key={property.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={propertyIds.includes(property.id)}
                              onCheckedChange={() =>
                                setPropertyIds((current) =>
                                  current.includes(property.id)
                                    ? current.filter((id) => id !== property.id)
                                    : [...current, property.id],
                                )
                              }
                            />
                            {property.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </>,
                document.body,
              )
            : null}
          <button
            type="button"
            className={`${pill} shrink-0 ${selecting ? "border-primary text-foreground" : ""}`}
            aria-pressed={selecting}
            data-testid="button-select-tasks"
            onClick={() => {
              setSelecting((current) => !current);
              setSelected([]);
            }}
          >
            {selecting ? "Cancel" : "Select"}
          </button>
        </div>
        {selecting ? (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3">
            <span className="text-xs text-muted-foreground" data-testid="text-selected-count">{selected.length} selected</span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-8 rounded-full px-3 text-xs"
              disabled={selected.length === 0 || deleteTasks.isPending}
              data-testid="button-delete-tasks"
              onClick={() => {
                const count = selected.length;
                if (!window.confirm(`Delete ${count} task${count === 1 ? "" : "s"}?`)) return;
                deleteTasks.mutate(selected);
              }}
            >
              {deleteTasks.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        ) : null}

        {!tasksError && visibleJobs === 0 ? (
          <div className="border-t px-3 py-8 text-sm text-muted-foreground" data-testid="work-tasks-empty-search">
            Nothing matches.
          </div>
        ) : null}

        {stacks.filter(({ count }) => count > 0 || (!searchQuery.trim() && !overdueOnly && techIds.length === 0 && propertyIds.length === 0)).map(({ stack, rows, count }) => {
          const collapsed = collapsedStacks[stack] || count === 0;
          const renderTask = (task: Task, nested = false) => (
            <div key={task.id}>
              <TaskRow
                task={task}
                nested={nested}
                properties={properties}
                technicians={technicianUsers}
                selecting={selecting}
                checked={selected.includes(task.id)}
                onToggle={(checked) => toggleTask(task.id, checked)}
                onProperty={(propertyId) => {
                  if (propertyId === "__multi__") return;
                  handlePropertyChange(task.id, propertyId);
                }}
                onAssignee={(userId) => handleAssigneeChange(task.id, userId)}
                onDue={(iso) => patchTask.mutate({ taskId: task.id, data: { estimatedCompletionDate: iso } })}
              />
              {(subTasksMap[task.id] || []).filter((child) => taskInStack(child, stack)).map((child) => renderTask(child, true))}
            </div>
          );
          return (
            <section key={stack} className="bg-muted/30" data-testid={`group-${stack}`}>
              <div className={`sticky top-0 z-10 border-t border-b-2 bg-muted/60 ${WORK_STACK_LINE[stack]}`}>
                <WorkStatusGroupHeader
                  statusKey={stack}
                  label={WORK_STATUS_LABEL[stack]}
                  count={count}
                  isCollapsed={collapsed}
                  isEmpty={count === 0}
                  markerClassName={WORK_STACK_MARK[stack]}
                  onToggle={() => setCollapsedStacks((current) => ({ ...current, [stack]: !current[stack] }))}
                />
              </div>
              {!collapsed ? (
                <div id={workStatusGroupPanelId(stack)} className="space-y-2 px-2 py-2">
                  {rows.map((row) => {
                    if (row.kind === "task") return renderTask(row.task);
                    const project = row.project;
                    const openKey = `${stack}:${project.id}`;
                    const open = !!openProjects[openKey];
                    const projectTaskIds = row.children.flatMap((task) => branchTasks(task, stack).map((item) => item.id));
                    const projectChecked = projectTaskIds.length > 0 && projectTaskIds.every((id) => selected.includes(id));
                    return (
                      <div key={project.id} data-testid={`row-project-${project.id}`}>
                        <div className={`${raisedCard} bg-muted px-3 py-2.5 lg:py-2 ${rowGrid}`}>
                          <div className="flex min-w-0 items-start gap-1">
                            {selecting && projectTaskIds.length > 0 ? (
                              <Checkbox
                                checked={projectChecked}
                                onCheckedChange={(next) => toggleMany(projectTaskIds, next === true)}
                                aria-label={`Select jobs in ${project.name}`}
                                className="mt-0.5 h-6 w-6 shrink-0"
                                data-testid={`check-project-${project.id}`}
                              />
                            ) : null}
                            <button
                              type="button"
                              className="mt-0.5 shrink-0 rounded-full p-1 hover:bg-background"
                              aria-expanded={open}
                              aria-label={open ? `Collapse ${project.name}` : `Expand ${project.name}`}
                              onClick={() => setOpenProjects((current) => ({ ...current, [openKey]: !current[openKey] }))}
                              data-testid={`toggle-project-${project.id}`}
                            >
                              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                            <div className="min-w-0">
                              <Link href={`/projects/${project.id}`} className="block break-words font-serif text-base font-medium leading-snug hover:underline">
                                {project.name}
                              </Link>
                              <p className="text-xs font-normal text-muted-foreground">
                                {row.jobCount} job{row.jobCount === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 grid w-full min-w-0 grid-cols-2 gap-1.5 border-t border-border/70 pt-2 lg:mt-0 lg:contents lg:border-0 lg:pt-0">
                            <ChoiceList
                              value={project.propertyId || "__none__"}
                              options={[
                                { id: "__none__", label: "No property" },
                                ...propertyOptions.map((property) => ({
                                  id: property.id,
                                  label: property.name,
                                  detail: property.address || undefined,
                                })),
                              ]}
                              onPick={(propertyId) =>
                                patchProject.mutate({
                                  projectId: project.id,
                                  data: { propertyId: propertyId === "__none__" ? null : propertyId },
                                })
                              }
                              testId={`button-project-property-${project.id}`}
                              fill
                            />
                            <span className="hidden lg:block" />
                            <DateButton
                              value={project.targetEndDate}
                              overdue={row.overdue}
                              onPick={(iso) => patchProject.mutate({ projectId: project.id, data: { targetEndDate: iso } })}
                              testId={`button-project-date-${project.id}`}
                              align="end"
                              fill
                            />
                          </div>
                        </div>
                        {open ? <div className="mt-2 space-y-2">{row.children.map((task) => renderTask(task, true))}</div> : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
