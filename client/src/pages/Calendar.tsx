
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from "lucide-react";
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

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type CalendarView = "month" | "week" | "day";

const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

const urgencyColors = {
  low: "bg-blue-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

function DraggableTask({ task, onClick, assignedUser, area }: { task: Task; onClick: () => void; assignedUser?: any; area?: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          onClick={onClick}
          className={`text-xs p-1 rounded cursor-move hover-elevate bg-muted ${
            isDragging ? "opacity-50" : ""
          }`}
          data-testid={`task-${task.id}`}
        >
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${urgencyColors[task.urgency]}`} />
            <span className="truncate flex-1">{task.name}</span>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="top">
        <div className="space-y-2">
          <div>
            <h4 className="font-semibold text-sm">{task.name}</h4>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={statusColors[task.status]}>
              {task.status.replace("_", " ")}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {task.urgency}
            </Badge>
          </div>
          {area && (
            <p className="text-xs text-muted-foreground">
              📍 Area: {area.name}
            </p>
          )}
          {assignedUser && (
            <p className="text-xs text-muted-foreground">
              👤 Assigned to: {assignedUser.firstName} {assignedUser.lastName}
            </p>
          )}
          {task.location && (
            <p className="text-xs text-muted-foreground">
              📌 Location: {task.location}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function DroppableDay({
  date,
  day,
  tasks,
  isToday,
  onTaskClick,
  users,
  areas,
}: {
  date: Date;
  day: number;
  tasks: Task[];
  isToday: boolean;
  onTaskClick: (taskId: string) => void;
  users: any[];
  areas: any[];
}) {
  const dateKey = date.toDateString();
  const { setNodeRef, isOver } = useDroppable({
    id: dateKey,
    data: { date },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] border rounded-md p-2 ${
        isToday ? "border-primary border-2" : ""
      } ${isOver ? "bg-primary/5 border-primary" : ""}`}
      data-testid={`calendar-day-${day}`}
    >
      <div className={`text-sm font-medium mb-2 ${isToday ? "text-primary" : ""}`}>
        {day}
      </div>
      <div className="space-y-1">
        {tasks.slice(0, 3).map((task) => {
          const assignedUser = users.find((u) => u.id === task.assignedToId);
          const area = areas.find((a) => a.id === task.areaId);
          return (
            <DraggableTask
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
              assignedUser={assignedUser}
              area={area}
            />
          );
        })}
        {tasks.length > 3 && (
          <div className="text-xs text-muted-foreground">
            +{tasks.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

export default function Calendar() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [view, setView] = useState<CalendarView>("month");

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: areas = [] } = useQuery<any[]>({
    queryKey: ["/api/areas"],
  });

  const updateTaskDateMutation = useMutation({
    mutationFn: async ({ taskId, newDate }: { taskId: string; newDate: Date }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, {
        initialDate: newDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task updated",
        description: "Task date has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task date",
        variant: "destructive",
      });
    },
  });

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [currentDate]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();

    tasks.forEach((task) => {
      if (task.initialDate) {
        const dateKey = new Date(task.initialDate).toDateString();
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)?.push(task);
      }
    });

    return map;
  }, [tasks]);

  const getTasksForDay = (day: number): Task[] => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return tasksByDate.get(date.toDateString()) || [];
  };

  const goToPrevious = () => {
    if (view === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    } else if (view === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 1);
      setCurrentDate(newDate);
    }
  };

  const goToNext = () => {
    if (view === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    } else if (view === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 1);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDisplayDate = () => {
    if (view === "month") {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } else if (view === "week") {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      } else {
        return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${weekStart.getFullYear()}`;
      }
    } else {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const weekDays = useMemo(() => {
    const start = getWeekStart(currentDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const todayTasks = useMemo(() => {
    const todayKey = today.toDateString();
    return tasksByDate.get(todayKey) || [];
  }, [tasksByDate]);

  const isMaintenanceOrAdmin = user?.role === "admin" || user?.role === "maintenance";

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task;
    setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !isMaintenanceOrAdmin) return;

    const taskId = active.id as string;
    const newDateKey = over.id as string;
    const newDate = new Date(newDateKey);

    // Get the task's current date
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const currentDateKey = new Date(task.initialDate).toDateString();

    // Only update if the date changed
    if (currentDateKey !== newDateKey) {
      updateTaskDateMutation.mutate({ taskId, newDate });
    }
  };

  const handleTaskClick = (taskId: string) => {
    if (!activeTask) {
      navigate(`/tasks/${taskId}`);
    }
  };

  const renderCalendarView = () => {
    if (view === "month") {
      return (
        <Card className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-sm font-medium text-center text-muted-foreground py-2"
              >
                {day.substring(0, 3)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="min-h-[100px]" />;
              }

              const date = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day
              );
              const dayTasks = getTasksForDay(day);
              const isTodayDate = isToday(day);

              return (
                <DroppableDay
                  key={day}
                  date={date}
                  day={day}
                  tasks={dayTasks}
                  isToday={isTodayDate}
                  onTaskClick={handleTaskClick}
                  users={users}
                  areas={areas}
                />
              );
            })}
          </div>
        </Card>
      );
    } else if (view === "week") {
      return (
        <Card className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-sm font-medium text-center text-muted-foreground py-2"
              >
                {day.substring(0, 3)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((date) => {
              const dateKey = date.toDateString();
              const dayTasks = tasksByDate.get(dateKey) || [];
              const isTodayDate = date.toDateString() === today.toDateString();

              return (
                <DroppableDay
                  key={dateKey}
                  date={date}
                  day={date.getDate()}
                  tasks={dayTasks}
                  isToday={isTodayDate}
                  onTaskClick={handleTaskClick}
                  users={users}
                  areas={areas}
                />
              );
            })}
          </div>
        </Card>
      );
    } else {
      // Day view
      const dateKey = currentDate.toDateString();
      const dayTasks = tasksByDate.get(dateKey) || [];

      return (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
            </h3>
            
            {dayTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No tasks scheduled for this day
              </p>
            ) : (
              <div className="space-y-3">
                {dayTasks.map((task) => {
                  const assignedUser = users.find((u) => u.id === task.assignedToId);
                  const area = areas.find((a) => a.id === task.areaId);
                  
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      className="flex items-center justify-between p-4 rounded-md bg-muted hover-elevate cursor-pointer"
                      data-testid={`day-task-${task.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${urgencyColors[task.urgency]}`} />
                          <h4 className="font-medium">{task.name}</h4>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {task.description}
                          </p>
                        )}
                        {area && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📍 {area.name}
                          </p>
                        )}
                        {assignedUser && (
                          <p className="text-xs text-muted-foreground">
                            👤 {assignedUser.firstName} {assignedUser.lastName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={statusColors[task.status]}>
                          {task.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {task.urgency}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      );
    }
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Task Calendar
            </h1>
            <p className="text-muted-foreground mt-1">
              {isMaintenanceOrAdmin
                ? "Drag tasks to reschedule them"
                : "View scheduled maintenance tasks"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as CalendarView)}>
              <ToggleGroupItem value="month" aria-label="Month view">
                Month
              </ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Week view">
                Week
              </ToggleGroupItem>
              <ToggleGroupItem value="day" aria-label="Day view">
                Day
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              data-testid="button-prev"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted min-w-[200px] justify-center">
              <CalendarIcon className="w-4 h-4" />
              <span className="font-medium text-sm">{getDisplayDate()}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              data-testid="button-next"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button onClick={goToToday} data-testid="button-today">
              Today
            </Button>
            {isMaintenanceOrAdmin && (
              <Button onClick={() => navigate("/tasks/new")} data-testid="button-new-task">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            )}
          </div>
        </div>

        {renderCalendarView()}

        {todayTasks.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Today's Tasks</h3>
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className="flex items-center justify-between p-4 rounded-md bg-muted hover-elevate cursor-pointer"
                  data-testid={`today-task-${task.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{task.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {task.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={statusColors[task.status]}>
                      {task.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className={urgencyColors[task.urgency]}>
                      {task.urgency}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <DragOverlay>
          {activeTask ? (
            <div className="text-xs p-1 rounded bg-muted shadow-lg border">
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${urgencyColors[activeTask.urgency]}`}
                />
                <span className="truncate">{activeTask.name}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
