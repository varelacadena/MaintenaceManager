import { useState } from "react";
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
import type { WorkContext } from "./useWorkAdmin";
import {
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
  "inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-xs text-foreground hover:bg-muted";

function compactDate(value: Date | string | null | undefined): string {
  const date = toCalendarDate(value);
  if (!date) return "No date";
  return format(date, "MMM d");
}

function statusDotClass(status: WorkStatus): string {
  if (status === "completed") return "bg-green-600";
  if (status === "in_progress") return "bg-blue-600";
  return "bg-muted-foreground";
}

function StatusMark({ status, created }: { status: WorkStatus; created: Date | string | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(status)}`} />
      <span>{WORK_STATUS_LABEL[status]}</span>
      <span>· Created {compactDate(created)}</span>
    </span>
  );
}

function ChoiceList({
  value,
  options,
  onPick,
  testId,
}: {
  value: string;
  options: { id: string; label: string; detail?: string }[];
  onPick: (id: string) => void;
  testId: string;
}) {
  const current = options.find((option) => option.id === value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={pill} data-testid={testId}>
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="max-w-[140px] truncate">{current?.label || "None"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
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
}: {
  value: string;
  options: { id: string; label: string }[];
  onPick: (id: string) => void;
  testId: string;
}) {
  const current = options.find((option) => option.id === value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={pill} data-testid={testId}>
          <User className="h-3 w-3 shrink-0" />
          <span className="max-w-[120px] truncate">{current?.label || "Unassigned"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
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
}: {
  value: Date | string | null | undefined;
  overdue?: boolean;
  onPick: (iso: string | null) => void;
  testId: string;
  align?: "start" | "end";
}) {
  const selected = toCalendarDate(value) ?? undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`${pill} ${overdue ? "text-destructive" : ""}`} data-testid={testId}>
          <CalendarIcon className="h-3 w-3 shrink-0" />
          <span>{compactDate(value)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-2">
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

function TaskMoreMenu({ task, technicians }: { task: Task; technicians: AppUser[] }) {
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
        <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm" aria-label="More edits" data-testid={`button-more-${task.id}`}>
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-h-[70vh] overflow-auto space-y-3">
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
          <div className="flex gap-1">
            {(["low", "medium", "high"] as const).map((urgency) => (
              <button
                key={urgency}
                type="button"
                className={`${pill} capitalize ${task.urgency === urgency ? "border-primary" : ""}`}
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
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Start date</span>
            <DateButton
              value={task.initialDate}
              onPick={(iso) => { if (iso) patch.mutate({ initialDate: iso }); }}
              testId={`button-start-${task.id}`}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Completion date</span>
            <DateButton
              value={task.actualCompletionDate}
              onPick={(iso) => patch.mutate({ actualCompletionDate: iso })}
              testId={`button-completed-${task.id}`}
              align="end"
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
  showStatus,
  onProperty,
  onAssignee,
  onDue,
}: {
  task: Task;
  nested?: boolean;
  properties: Property[];
  technicians: AppUser[];
  showStatus: boolean;
  onProperty: (propertyId: string) => void;
  onAssignee: (userId: string) => void;
  onDue: (iso: string | null) => void;
}) {
  const status = toWorkStatus(task.status);
  const overdue = isWorkOverdue(task.estimatedCompletionDate, task.status);
  const propertyOptions = [
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
      className={`border-t border-border py-2 ${nested ? "pl-8 pr-3" : "px-3"} md:grid md:grid-cols-[minmax(220px,1fr)_190px_150px_130px_36px] md:items-center md:gap-3`}
      data-testid={`row-task-${task.id}`}
    >
      <div className="min-w-0">
        <Link href={`/tasks/${task.id}`} className="font-semibold hover:underline" data-testid={`link-task-${task.id}`}>
          {task.name}
        </Link>
        {showStatus && status ? (
          <div className="mt-0.5">
            <StatusMark status={status} created={task.createdAt} />
          </div>
        ) : null}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 md:contents">
        <ChoiceList
          value={task.propertyId || "__none__"}
          options={propertyOptions}
          onPick={onProperty}
          testId={`button-property-${task.id}`}
        />
        <PersonList value={task.assignedToId || "__none__"} options={techOptions} onPick={onAssignee} testId={`button-tech-${task.id}`} />
        <DateButton value={task.estimatedCompletionDate} overdue={overdue} onPick={onDue} testId={`button-due-${task.id}`} align="end" />
        <div className="ml-auto md:ml-0">
          <TaskMoreMenu task={task} technicians={technicians} />
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

  const [statuses, setStatuses] = useState<WorkStatus[]>(["not_started", "in_progress"]);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [techIds, setTechIds] = useState<string[]>(() => (ctx.techFilter ? [ctx.techFilter] : []));
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});

  const patchTask = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/tasks/${taskId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }),
  });

  const patchProject = useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/projects/${projectId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
  });

  const showStatus = statuses.length !== 1;
  const statusDefault = statuses.length === 2 && statuses.includes("not_started") && statuses.includes("in_progress");
  const filterCount = (statusDefault ? 0 : 1) + (overdueOnly ? 1 : 0) + techIds.length + propertyIds.length;

  const taskMatches = (task: Task) =>
    taskVisible({
      status: task.status,
      due: task.estimatedCompletionDate,
      assigneeId: task.assignedToId,
      propertyId: task.propertyId,
      name: task.name,
      statuses,
      overdueOnly,
      techIds,
      propertyIds,
      query: searchQuery,
    });

  const rows = (() => {
    const list = tasks || [];
    const projectRows = (projects || [])
      .map((project) => {
        const children = list.filter((task) => task.projectId === project.id && !task.parentTaskId);
        const matchingChildren = children.filter(
          (task) => taskMatches(task) || (subTasksMap[task.id] || []).some(taskMatches),
        );
        const status = toWorkStatus(project.status);
        const self =
          !!status &&
          (statuses.length === 0 || statuses.includes(status)) &&
          (!overdueOnly || isWorkOverdue(project.targetEndDate, project.status)) &&
          (propertyIds.length === 0 || propertyIds.includes(project.propertyId || "")) &&
          (techIds.length === 0 || matchingChildren.length > 0) &&
          (!searchQuery.trim() || project.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
        if (matchingChildren.length === 0 && !self) return null;
        return {
          kind: "project" as const,
          project,
          children: matchingChildren,
          overdue: isWorkOverdue(project.targetEndDate, project.status),
          due: dueStamp(project.targetEndDate),
          name: project.name,
        };
      })
      .filter((row): row is NonNullable<typeof row> => !!row);

    const standalone = list
      .filter((task) => !task.projectId && !task.parentTaskId && taskMatches(task))
      .map((task) => ({
        kind: "task" as const,
        task,
        overdue: isWorkOverdue(task.estimatedCompletionDate, task.status),
        due: dueStamp(task.estimatedCompletionDate),
        name: task.name,
      }));

    return [...projectRows, ...standalone].sort(compareWorkItems);
  })();

  const propertyOptions = [...properties].sort((a, b) => byName(a.name, b.name));
  const techOptions = [...technicianUsers].sort((a, b) => byName(getUserDisplayName(a), getUserDisplayName(b)));

  function toggleStatus(status: WorkStatus) {
    setStatuses((current) => (current.includes(status) ? current.filter((item) => item !== status) : [...current, status]));
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">Work</h1>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setProjectDialogOpen(true)} data-testid="button-new-project">
            <Plus className="mr-1 h-4 w-4" />
            Project
          </Button>
          <Link href="/tasks/new">
            <Button type="button" className="rounded-full" data-testid="button-create-task">
              <Plus className="mr-1 h-4 w-4" />
              New
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 p-3">
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
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={pill} data-testid="button-filters">
                <Filter className="h-3.5 w-3.5" />
                Filters{filterCount > 0 ? ` · ${filterCount}` : ""}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(40rem,calc(100vw-2rem))] p-3">
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
            </PopoverContent>
          </Popover>
        </div>

        <div className="hidden px-3 pb-2 text-xs text-muted-foreground md:grid md:grid-cols-[minmax(220px,1fr)_190px_150px_130px_36px] md:gap-3">
          <span>Name</span>
          <span>Property</span>
          <span>Technician</span>
          <span>Date</span>
          <span />
        </div>

        {(() => {
          const renderTask = (task: Task, nested = false) => (
            <div key={task.id}>
              <TaskRow
                task={task}
                nested={nested}
                properties={properties}
                technicians={technicianUsers}
                showStatus={showStatus}
                onProperty={(propertyId) => handlePropertyChange(task.id, propertyId)}
                onAssignee={(userId) => handleAssigneeChange(task.id, userId)}
                onDue={(iso) => patchTask.mutate({ taskId: task.id, data: { estimatedCompletionDate: iso } })}
              />
              {(subTasksMap[task.id] || []).filter(taskMatches).map((child) => renderTask(child, true))}
            </div>
          );
          return !tasksError && rows.length === 0 ? (
          <div className="border-t px-3 py-8 text-sm text-muted-foreground" data-testid="work-tasks-empty-search">
            Nothing matches.
          </div>
        ) : (
          rows.map((row) => {
            if (row.kind === "task") {
              return renderTask(row.task);
            }
            const project = row.project;
            const open = !!openProjects[project.id];
            const status = toWorkStatus(project.status);
            return (
              <div key={project.id} className="border-t bg-muted/40" data-testid={`row-project-${project.id}`}>
                <div className="px-3 py-2 md:grid md:grid-cols-[minmax(220px,1fr)_190px_150px_130px_36px] md:items-center md:gap-3">
                  <div className="flex min-w-0 items-start gap-1">
                    <button
                      type="button"
                      className="mt-0.5 rounded-full p-1 hover:bg-muted"
                      aria-expanded={open}
                      aria-label={open ? `Collapse ${project.name}` : `Expand ${project.name}`}
                      onClick={() => setOpenProjects((current) => ({ ...current, [project.id]: !current[project.id] }))}
                      data-testid={`toggle-project-${project.id}`}
                    >
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0">
                      <Link href={`/projects/${project.id}`} className="font-semibold hover:underline">
                        {project.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {row.children.length} job{row.children.length === 1 ? "" : "s"}
                      </p>
                      {showStatus && status ? <StatusMark status={status} created={project.createdAt} /> : null}
                    </div>
                  </div>
                  <div className="mt-1.5 md:mt-0">
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
                    />
                  </div>
                  <span className="hidden md:block" />
                  <DateButton
                    value={project.targetEndDate}
                    overdue={row.overdue}
                    onPick={(iso) => patchProject.mutate({ projectId: project.id, data: { targetEndDate: iso } })}
                    testId={`button-project-date-${project.id}`}
                    align="end"
                  />
                </div>
                {open ? row.children.map((task) => renderTask(task, true)) : null}
              </div>
            );
          })
        );
        })()}
      </div>
    </div>
  );
}
