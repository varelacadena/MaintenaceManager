import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  User,
  AlertTriangle,
  Clock,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { format, isBefore, startOfDay } from "date-fns";

type CalendarView = "month" | "week" | "day";

// ─── Color palette for users ─────────────────────────────────────────────────
const USER_COLOR_PALETTE = [
  { bg: "bg-blue-500/15 dark:bg-blue-500/20", dot: "bg-blue-500" },
  { bg: "bg-emerald-500/15 dark:bg-emerald-500/20", dot: "bg-emerald-500" },
  { bg: "bg-violet-500/15 dark:bg-violet-500/20", dot: "bg-violet-500" },
  { bg: "bg-orange-500/15 dark:bg-orange-500/20", dot: "bg-orange-500" },
  { bg: "bg-rose-500/15 dark:bg-rose-500/20", dot: "bg-rose-500" },
  { bg: "bg-cyan-500/15 dark:bg-cyan-500/20", dot: "bg-cyan-500" },
  { bg: "bg-amber-500/15 dark:bg-amber-500/20", dot: "bg-amber-500" },
  { bg: "bg-teal-500/15 dark:bg-teal-500/20", dot: "bg-teal-500" },
  { bg: "bg-pink-500/15 dark:bg-pink-500/20", dot: "bg-pink-500" },
  { bg: "bg-indigo-500/15 dark:bg-indigo-500/20", dot: "bg-indigo-500" },
];
const NEUTRAL_COLOR = { bg: "bg-muted", dot: "bg-muted-foreground/50" };

function getUserColorIndex(id: string | null | undefined): number {
  if (!id) return -1;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % USER_COLOR_PALETTE.length;
}

function getUserColor(colorIndex: number) {
  if (colorIndex < 0) return NEUTRAL_COLOR;
  return USER_COLOR_PALETTE[colorIndex];
}

// ─── Status / urgency maps ────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  needs_estimate: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  waiting_approval: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
};

const urgencyDotColors = {
  low: "bg-blue-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isOverdue(task: Task): boolean {
  if (!task.estimatedCompletionDate) return false;
  if (task.status === "completed") return false;
  return isBefore(new Date(task.estimatedCompletionDate), startOfDay(new Date()));
}

function getAssigneeInfo(task: Task, users: any[], vendors: any[]): { name: string; colorIndex: number } {
  if (task.assignedToId) {
    const user = users.find((u) => u.id === task.assignedToId);
    if (user) {
      return {
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username,
        colorIndex: getUserColorIndex(user.id),
      };
    }
  }
  if (task.assignedVendorId) {
    const vendor = vendors.find((v) => v.id === task.assignedVendorId);
    if (vendor) return { name: vendor.name, colorIndex: -1 };
  }
  if (task.assignedPool) {
    const label = task.assignedPool === "technician_pool" ? "Technician Pool"
      : task.assignedPool === "student_pool" ? "Student Pool"
      : task.assignedPool;
    return { name: label, colorIndex: -1 };
  }
  return { name: "", colorIndex: -1 };
}

// Build a set of dates a task is "active" — from initialDate through estimatedCompletionDate
// Capped at 60 days to avoid huge renders
function getTaskActiveDates(task: Task): string[] {
  const dueDate = task.estimatedCompletionDate ? new Date(task.estimatedCompletionDate) : null;
  const startDate = task.initialDate ? new Date(task.initialDate) : null;

  if (!startDate && !dueDate) return [];

  const start = startDate ?? dueDate!;
  const end = dueDate ?? startDate!;

  const dates: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(12, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(12, 0, 0, 0);

  let count = 0;
  while (cursor <= endNorm && count < 60) {
    dates.push(cursor.toDateString());
    cursor.setDate(cursor.getDate() + 1);
    count++;
  }
  return dates;
}

// ─── DraggableTask (compact card for month/week) ──────────────────────────────
function DraggableTask({
  task,
  onClick,
  assigneeInfo,
  area,
}: {
  task: Task;
  onClick: (e: React.MouseEvent) => void;
  assigneeInfo: { name: string; colorIndex: number };
  area?: any;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const color = getUserColor(assigneeInfo.colorIndex);
  const overdue = isOverdue(task);

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          onClick={onClick}
          className={`text-xs px-1.5 py-0.5 rounded cursor-move hover-elevate ${color.bg} ${isDragging ? "opacity-50" : ""}`}
          data-testid={`task-${task.id}`}
        >
          <div className="flex items-center gap-1 min-w-0">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${urgencyDotColors[task.urgency]}`} />
            {overdue && <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-red-500" />}
            <span className="truncate">{task.name}</span>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-72" side="top">
        <TaskHoverContent task={task} assigneeInfo={assigneeInfo} area={area} />
      </HoverCardContent>
    </HoverCard>
  );
}

// ─── Hover card content (shared) ─────────────────────────────────────────────
function TaskHoverContent({ task, assigneeInfo, area }: { task: Task; assigneeInfo: { name: string; colorIndex: number }; area?: any }) {
  const overdue = isOverdue(task);
  const color = getUserColor(assigneeInfo.colorIndex);

  return (
    <div className="space-y-2">
      <div>
        <div className="flex items-start gap-1.5">
          {overdue && <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />}
          <h4 className="font-semibold text-sm leading-tight">{task.name}</h4>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className={`text-xs capitalize ${statusColors[task.status] ?? ""}`}>
          {task.status.replaceAll("_", " ")}
        </Badge>
        <Badge variant="outline" className="text-xs capitalize">
          {task.urgency}
        </Badge>
        {overdue && (
          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
            Overdue
          </Badge>
        )}
      </div>
      {assigneeInfo.name && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
          <User className="w-3 h-3 shrink-0" />
          <span>{assigneeInfo.name}</span>
        </div>
      )}
      {area && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" />
          <span>{area.name}</span>
        </div>
      )}
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground pt-1 border-t">
        {task.initialDate && (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3 h-3 shrink-0" />
            <span>Start: {format(new Date(task.initialDate), "MMM d, yyyy")}</span>
          </div>
        )}
        {task.estimatedCompletionDate && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 shrink-0" />
            <span>Due: {format(new Date(task.estimatedCompletionDate), "MMM d, yyyy")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DroppableDay (month / week cell) ────────────────────────────────────────
function DroppableDay({
  date,
  day,
  tasks,
  isToday,
  onTaskClick,
  onDayClick,
  users,
  areas,
  vendors,
  isMobile,
}: {
  date: Date;
  day: number;
  tasks: Task[];
  isToday: boolean;
  onTaskClick: (taskId: string) => void;
  onDayClick: (date: Date) => void;
  users: any[];
  areas: any[];
  vendors: any[];
  isMobile: boolean;
}) {
  const dateKey = date.toDateString();
  const { setNodeRef, isOver } = useDroppable({ id: dateKey, data: { date } });

  if (isMobile) {
    return (
      <div
        ref={setNodeRef}
        onClick={() => onDayClick(date)}
        className={`min-h-[56px] rounded-md border p-1.5 cursor-pointer flex flex-col items-center gap-1 ${
          isToday ? "border-primary border-2" : ""
        } ${isOver ? "bg-primary/5 border-primary" : ""}`}
        data-testid={`calendar-day-${day}`}
      >
        <span className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>{day}</span>
        {tasks.length > 0 && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
            {tasks.length}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] border rounded-md p-1.5 cursor-pointer hover-elevate transition-colors ${
        isToday ? "border-primary border-2" : ""
      } ${isOver ? "bg-primary/5 border-primary" : ""}`}
      onClick={() => onDayClick(date)}
      data-testid={`calendar-day-${day}`}
    >
      <div className={`text-sm font-medium mb-1 ${isToday ? "text-primary" : ""}`}>{day}</div>
      <div className="space-y-0.5">
        {tasks.slice(0, 4).map((task) => {
          const assigneeInfo = getAssigneeInfo(task, users, vendors);
          const area = areas.find((a) => a.id === task.areaId);
          return (
            <DraggableTask
              key={task.id}
              task={task}
              onClick={(e) => { e.stopPropagation(); onTaskClick(task.id); }}
              assigneeInfo={assigneeInfo}
              area={area}
            />
          );
        })}
        {tasks.length > 4 && (
          <div className="text-xs text-muted-foreground px-1">+{tasks.length - 4} more</div>
        )}
      </div>
    </div>
  );
}

// ─── Time grid (day & week views) ────────────────────────────────────────────
const HOUR_START = 6;
const HOUR_END = 22;
const HOUR_HEIGHT = 64; // px per hour

function TimeGrid({
  dates,
  tasks,
  users,
  areas,
  vendors,
  onTaskClick,
}: {
  dates: Date[];
  tasks: Task[];
  users: any[];
  areas: any[];
  vendors: any[];
  onTaskClick: (id: string) => void;
}) {
  const now = new Date();
  const todayKey = now.toDateString();
  const currentHourOffset = ((now.getHours() - HOUR_START) * HOUR_HEIGHT) + (now.getMinutes() / 60) * HOUR_HEIGHT;
  const showTimeLine = dates.some((d) => d.toDateString() === todayKey);

  const allDayTasks = tasks.filter((t) => !t.scheduledStartTime);
  const timedTasks = tasks.filter((t) => !!t.scheduledStartTime);

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  const getTasksForDate = (date: Date, timed: boolean) =>
    (timed ? timedTasks : allDayTasks).filter((t) => {
      const dueDate = t.estimatedCompletionDate ? new Date(t.estimatedCompletionDate) : null;
      const startDate = t.initialDate ? new Date(t.initialDate) : null;
      if (!startDate && !dueDate) return false;
      const start = startDate ?? dueDate!;
      const end = dueDate ?? startDate!;
      const d = new Date(date);
      d.setHours(12, 0, 0, 0);
      const s = new Date(start); s.setHours(12, 0, 0, 0);
      const e = new Date(end); e.setHours(12, 0, 0, 0);
      return d >= s && d <= e;
    });

  function getTaskTopOffset(task: Task): number {
    if (!task.scheduledStartTime) return 0;
    const parts = task.scheduledStartTime.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || "0", 10);
    if (isNaN(h) || isNaN(m)) return 0;
    return ((h - HOUR_START) * HOUR_HEIGHT) + (m / 60) * HOUR_HEIGHT;
  }

  function getTaskHeight(task: Task): number {
    const hours = task.estimatedHours ?? 1;
    return Math.max(hours * HOUR_HEIGHT, 28);
  }

  const isSingleDay = dates.length === 1;

  return (
    <Card className="overflow-hidden">
      {/* All-day row */}
      <div className="flex border-b">
        <div className="w-14 shrink-0 text-xs text-muted-foreground flex items-center justify-end pr-2 py-2 border-r">
          All day
        </div>
        {dates.map((date) => {
          const dayAllDay = getTasksForDate(date, false);
          const isTodayDate = date.toDateString() === todayKey;
          return (
            <div
              key={date.toDateString()}
              className={`flex-1 min-w-0 p-1 space-y-0.5 border-r last:border-r-0 ${isTodayDate ? "bg-primary/5" : ""}`}
            >
              {/* Day header for week view */}
              {!isSingleDay && (
                <div className={`text-xs font-medium text-center mb-1 ${isTodayDate ? "text-primary" : "text-muted-foreground"}`}>
                  {daysOfWeek[date.getDay()]} {date.getDate()}
                </div>
              )}
              {dayAllDay.slice(0, 3).map((task) => {
                const assigneeInfo = getAssigneeInfo(task, users, vendors);
                const area = areas.find((a) => a.id === task.areaId);
                const color = getUserColor(assigneeInfo.colorIndex);
                const overdue = isOverdue(task);
                return (
                  <HoverCard key={task.id} openDelay={300}>
                    <HoverCardTrigger asChild>
                      <div
                        onClick={() => onTaskClick(task.id)}
                        className={`text-xs px-1.5 py-0.5 rounded cursor-pointer hover-elevate truncate ${color.bg}`}
                        data-testid={`allday-task-${task.id}`}
                      >
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${urgencyDotColors[task.urgency]}`} />
                          {overdue && <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-red-500" />}
                          <span className="truncate">{task.name}</span>
                        </div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-72" side="bottom">
                      <TaskHoverContent task={task} assigneeInfo={assigneeInfo} area={area} />
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
              {dayAllDay.length > 3 && (
                <div className="text-xs text-muted-foreground px-1">+{dayAllDay.length - 3} more</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable timed grid */}
      <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
        <div className="flex">
          {/* Time labels */}
          <div className="w-14 shrink-0 border-r">
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                className="flex items-start justify-end pr-2 pt-1"
              >
                <span className="text-xs text-muted-foreground">
                  {h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dates.map((date) => {
            const dayTimed = getTasksForDate(date, true);
            const isTodayDate = date.toDateString() === todayKey;
            return (
              <div
                key={date.toDateString()}
                className={`flex-1 min-w-0 relative border-r last:border-r-0 ${isTodayDate ? "bg-primary/5" : ""}`}
                style={{ height: (HOUR_END - HOUR_START) * HOUR_HEIGHT }}
              >
                {/* Hour grid lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{ top: (h - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    className="absolute inset-x-0 border-t border-border/40"
                  />
                ))}

                {/* Current time line */}
                {isTodayDate && currentHourOffset >= 0 && currentHourOffset <= (HOUR_END - HOUR_START) * HOUR_HEIGHT && (
                  <div
                    className="absolute inset-x-0 z-10 flex items-center"
                    style={{ top: currentHourOffset }}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
                    <div className="flex-1 h-px bg-red-500" />
                  </div>
                )}

                {/* Timed task blocks */}
                {dayTimed.map((task) => {
                  const top = getTaskTopOffset(task);
                  const height = getTaskHeight(task);
                  const assigneeInfo = getAssigneeInfo(task, users, vendors);
                  const area = areas.find((a) => a.id === task.areaId);
                  const color = getUserColor(assigneeInfo.colorIndex);
                  const overdue = isOverdue(task);
                  return (
                    <HoverCard key={task.id} openDelay={300}>
                      <HoverCardTrigger asChild>
                        <div
                          onClick={() => onTaskClick(task.id)}
                          className={`absolute inset-x-0.5 rounded cursor-pointer hover-elevate overflow-hidden p-1 ${color.bg}`}
                          style={{ top, height: Math.max(height, 28) }}
                          data-testid={`timed-task-${task.id}`}
                        >
                          <div className="flex items-start gap-1 min-w-0">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${urgencyDotColors[task.urgency]}`} />
                            <div className="min-w-0">
                              <div className="text-xs font-medium leading-tight truncate flex items-center gap-1">
                                {overdue && <AlertTriangle className="w-2.5 h-2.5 text-red-500 shrink-0" />}
                                {task.name}
                              </div>
                              {task.scheduledStartTime && height > 40 && (
                                <div className="text-xs text-muted-foreground">{task.scheduledStartTime}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-72" side="right">
                        <TaskHoverContent task={task} assigneeInfo={assigneeInfo} area={area} />
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ─── Assignee filter bar ──────────────────────────────────────────────────────
function AssigneeFilter({
  tasks,
  users,
  vendors,
  selectedIds,
  onSelectionChange,
  isMobile,
}: {
  tasks: Task[];
  users: any[];
  vendors: any[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isMobile: boolean;
}) {
  const assignees = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string; colorIndex: number }[] = [];
    for (const task of tasks) {
      if (task.assignedToId && !seen.has(task.assignedToId)) {
        seen.add(task.assignedToId);
        const user = users.find((u) => u.id === task.assignedToId);
        if (user) {
          result.push({
            id: task.assignedToId,
            name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username,
            colorIndex: getUserColorIndex(user.id),
          });
        }
      }
      if (task.assignedVendorId && !seen.has(task.assignedVendorId)) {
        seen.add(task.assignedVendorId);
        const vendor = vendors.find((v) => v.id === task.assignedVendorId);
        if (vendor) result.push({ id: task.assignedVendorId, name: vendor.name, colorIndex: -1 });
      }
    }
    return result;
  }, [tasks, users, vendors]);

  if (assignees.length === 0) return null;

  const toggleId = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (isMobile) {
    return (
      <Select
        value={selectedIds.length === 1 ? selectedIds[0] : "all"}
        onValueChange={(val) => {
          if (val === "all") onSelectionChange([]);
          else onSelectionChange([val]);
        }}
      >
        <SelectTrigger className="w-full" data-testid="select-assignee-filter">
          <SelectValue placeholder="All assignees" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All assignees</SelectItem>
          {assignees.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getUserColor(a.colorIndex).dot}`} />
                {a.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant={selectedIds.length === 0 ? "secondary" : "outline"}
        size="sm"
        onClick={() => onSelectionChange([])}
        data-testid="filter-all"
      >
        All
      </Button>
      {assignees.map((a) => {
        const color = getUserColor(a.colorIndex);
        const isSelected = selectedIds.includes(a.id);
        return (
          <Button
            key={a.id}
            variant={isSelected ? "secondary" : "outline"}
            size="sm"
            onClick={() => toggleId(a.id)}
            className={isSelected ? color.bg : ""}
            data-testid={`filter-user-${a.id}`}
          >
            <div className={`w-2 h-2 rounded-full mr-1.5 ${color.dot}`} />
            {a.name}
          </Button>
        );
      })}
    </div>
  );
}

// ─── Main Calendar component ──────────────────────────────────────────────────
export default function Calendar() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size and set default view
  const [view, setView] = useState<CalendarView>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "day" : "week"
  );

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: areas = [] } = useQuery<any[]>({ queryKey: ["/api/areas"] });
  const { data: vendors = [] } = useQuery<any[]>({ queryKey: ["/api/vendors"] });

  const updateTaskDateMutation = useMutation({
    mutationFn: async ({ taskId, newDate }: { taskId: string; newDate: Date }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, {
        estimatedCompletionDate: newDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task rescheduled", description: "Due date updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update task", variant: "destructive" });
    },
  });

  // Filter tasks by selected user IDs
  const filteredTasks = useMemo(() => {
    if (selectedUserIds.length === 0) return tasks;
    return tasks.filter((t) =>
      (t.assignedToId && selectedUserIds.includes(t.assignedToId)) ||
      (t.assignedVendorId && selectedUserIds.includes(t.assignedVendorId))
    );
  }, [tasks, selectedUserIds]);

  // Build date → tasks map (tasks span their full date range)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of filteredTasks) {
      const dates = getTaskActiveDates(task);
      for (const dateKey of dates) {
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(task);
      }
    }
    return map;
  }, [filteredTasks]);

  // Navigation helpers
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(12, 0, 0, 0);
    return d;
  };

  const weekDays = useMemo(() => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [...Array(firstDay).fill(null)];
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentDate]);

  const today = new Date();

  const goToPrevious = () => {
    if (view === "month") setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    else if (view === "week") { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }
    else { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); }
  };

  const goToNext = () => {
    if (view === "month") setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    else if (view === "week") { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }
    else { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); }
  };

  const goToToday = () => setCurrentDate(new Date());

  const getDisplayDate = () => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const start = getWeekStart(currentDate);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
      }
      return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMM d, yyyy");
  };

  const isTechnicianOrAdmin = user?.role === "admin" || user?.role === "technician";

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(event.active.data.current?.task as Task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || !isTechnicianOrAdmin) return;

    const taskId = active.id as string;
    const newDateKey = over.id as string;
    const newDate = new Date(newDateKey);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const currentKey = task.estimatedCompletionDate
      ? new Date(task.estimatedCompletionDate).toDateString()
      : null;

    if (currentKey !== newDateKey) {
      updateTaskDateMutation.mutate({ taskId, newDate });
    }
  };

  const handleTaskClick = (taskId: string) => {
    if (!activeTask) navigate(`/tasks/${taskId}`);
  };

  const renderCalendarView = () => {
    if (view === "month") {
      return (
        <Card className="p-3 md:p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map((d) => (
              <div key={d} className="text-xs font-medium text-center text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12);
              const dayTasks = tasksByDate.get(date.toDateString()) || [];
              const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
              return (
                <DroppableDay
                  key={day}
                  date={date}
                  day={day}
                  tasks={dayTasks}
                  isToday={isToday}
                  onTaskClick={handleTaskClick}
                  onDayClick={(d) => { setCurrentDate(d); setView("day"); }}
                  users={users}
                  areas={areas}
                  vendors={vendors}
                  isMobile={isMobile}
                />
              );
            })}
          </div>
        </Card>
      );
    }

    if (view === "week") {
      const dayTasksList = weekDays.map((date) => tasksByDate.get(date.toDateString()) || []);
      const allWeekTasks = Array.from(new Set(dayTasksList.flat().map((t) => t.id)))
        .map((id) => tasks.find((t) => t.id === id)!)
        .filter(Boolean);

      return (
        <TimeGrid
          dates={weekDays}
          tasks={allWeekTasks}
          users={users}
          areas={areas}
          vendors={vendors}
          onTaskClick={handleTaskClick}
        />
      );
    }

    // Day view
    const dayTasks = tasksByDate.get(currentDate.toDateString()) || [];
    return (
      <TimeGrid
        dates={[currentDate]}
        tasks={dayTasks}
        users={users}
        areas={areas}
        vendors={vendors}
        onTaskClick={handleTaskClick}
      />
    );
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-3 p-3 md:p-0">

        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">Task Calendar</h1>
              <p className="text-sm text-muted-foreground">
                {isTechnicianOrAdmin ? "Drag tasks to reschedule" : "View scheduled maintenance tasks"}
              </p>
            </div>
            {isTechnicianOrAdmin && !isMobile && (
              <Button onClick={() => navigate("/tasks/new")} data-testid="button-new-task">
                <Plus className="w-4 h-4 mr-1.5" />
                New Task
              </Button>
            )}
          </div>

          {/* Nav + view toggle row */}
          <div className="flex items-center gap-2 flex-wrap">
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as CalendarView)}
              className="shrink-0"
            >
              {!isMobile && <ToggleGroupItem value="month" data-testid="toggle-month">Month</ToggleGroupItem>}
              <ToggleGroupItem value="week" data-testid="toggle-week">Week</ToggleGroupItem>
              <ToggleGroupItem value="day" data-testid="toggle-day">Day</ToggleGroupItem>
            </ToggleGroup>

            <div className="flex items-center gap-1 flex-1 justify-center">
              <Button variant="outline" size="icon" onClick={goToPrevious} data-testid="button-prev">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium px-2 text-center min-w-0 truncate" data-testid="text-date-display">
                {getDisplayDate()}
              </span>
              <Button variant="outline" size="icon" onClick={goToNext} data-testid="button-next">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
              Today
            </Button>

            {isTechnicianOrAdmin && isMobile && (
              <Button size="sm" onClick={() => navigate("/tasks/new")} data-testid="button-new-task-mobile">
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Assignee filter */}
          <AssigneeFilter
            tasks={filteredTasks}
            users={users}
            vendors={vendors}
            selectedIds={selectedUserIds}
            onSelectionChange={setSelectedUserIds}
            isMobile={isMobile}
          />
        </div>

        {/* Calendar view */}
        {renderCalendarView()}

        <DragOverlay>
          {activeTask ? (
            <div className="text-xs p-1.5 rounded bg-muted shadow-lg border flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${urgencyDotColors[activeTask.urgency]}`} />
              <span className="truncate">{activeTask.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
