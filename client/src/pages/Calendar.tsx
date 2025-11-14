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

function DraggableTask({ task, onClick, assignedUser, area }: { task: Task; onClick: (e: React.MouseEvent) => void; assignedUser?: any; area?: any }) {
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
          className={`group/task text-xs p-1.5 rounded cursor-move transition-all bg-primary/10 border-l-2 ${
            urgencyColors[task.urgency].replace('bg-', 'border-')
          } hover:bg-primary/15 ${
            isDragging ? "opacity-50" : ""
          }`}
          data-testid={`task-${task.id}`}
        >
          <div className="flex items-center gap-1.5">
            <span className="truncate flex-1 font-medium text-xs leading-tight">
              {task.name}
            </span>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="top">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">{task.name}</h4>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`${statusColors[task.status]} text-xs h-5`}>
              {task.status.replace("_", " ")}
            </Badge>
            <Badge variant="outline" className="capitalize text-xs h-5">
              {task.urgency}
            </Badge>
          </div>
          <div className="space-y-1 pt-2 border-t text-xs">
            {area && (
              <p className="text-muted-foreground flex items-center gap-2">
                <span>📍</span>
                <span>{area.name}</span>
              </p>
            )}
            {assignedUser && (
              <p className="text-muted-foreground flex items-center gap-2">
                <span>👤</span>
                <span>{assignedUser.firstName} {assignedUser.lastName}</span>
              </p>
            )}
            {task.location && (
              <p className="text-muted-foreground flex items-center gap-2">
                <span>📌</span>
                <span>{task.location}</span>
              </p>
            )}
          </div>
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
  onDayClick,
  users,
  areas,
}: {
  date: Date;
  day: number;
  tasks: Task[];
  isToday: boolean;
  onTaskClick: (taskId: string) => void;
  onDayClick: (date: Date) => void;
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
      className={`group min-h-[100px] border-r border-b border-border/30 last:border-r-0 p-2 cursor-pointer transition-colors ${
        isToday 
          ? "bg-primary/5" 
          : "hover:bg-muted/30"
      } ${isOver ? "bg-primary/10" : ""}`}
      onClick={() => onDayClick(date)}
      data-testid={`calendar-day-${day}`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
          isToday 
            ? "bg-primary text-primary-foreground" 
            : "text-foreground"
        }`}>
          {day}
        </div>
        {tasks.length > 0 && (
          <div className="text-xs text-muted-foreground font-medium">
            {tasks.length}
          </div>
        )}
      </div>
      <div className="space-y-1">
        {tasks.slice(0, 2).map((task) => {
          const assignedUser = users.find((u) => u.id === task.assignedToId);
          const area = areas.find((a) => a.id === task.areaId);
          return (
            <DraggableTask
              key={task.id}
              task={task}
              onClick={(e) => {
                e.stopPropagation();
                onTaskClick(task.id);
              }}
              assignedUser={assignedUser}
              area={area}
            />
          );
        })}
        {tasks.length > 2 && (
          <div className="text-xs text-muted-foreground px-1.5 py-0.5">
            +{tasks.length - 2} more
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

  const handleCalendarClick = () => {
    // This function can be used to open a date picker dialog if needed
    // For now, it will just go to today
    goToToday();
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
        <div className="border border-border/50 rounded-lg bg-background overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border/50">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-xs font-medium text-center text-muted-foreground py-2.5 border-r border-border/30 last:border-r-0"
              >
                {day.substring(0, 2)}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {monthDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="min-h-[100px] border-r border-b border-border/30 last:border-r-0 bg-muted/5" />;
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
                  onDayClick={(clickedDate) => {
                    setCurrentDate(clickedDate);
                    setView("day");
                  }}
                  users={users}
                  areas={areas}
                />
              );
            })}
          </div>
        </div>
      );
    } else if (view === "week") {
      return (
        <div className="border border-border/50 rounded-lg bg-background overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border/50">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-xs font-medium text-center text-muted-foreground py-2.5 border-r border-border/30 last:border-r-0"
              >
                {day.substring(0, 2)}
              </div>
            ))}
          </div>

          {/* Week grid */}
          <div className="grid grid-cols-7">
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
                  onDayClick={(clickedDate) => {
                    setCurrentDate(clickedDate);
                    setView("day");
                  }}
                  users={users}
                  areas={areas}
                />
              );
            })}
          </div>
        </div>
      );
    } else {
      // Day view
      const dateKey = currentDate.toDateString();
      const dayTasks = tasksByDate.get(dateKey) || [];

      return (
        <Card className="p-6 border-border/50 bg-background">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <h3 className="text-lg font-semibold">
                {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
              </h3>
              <Badge variant="secondary" className="text-xs h-5">
                {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
              </Badge>
            </div>

            {dayTasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/30 mx-auto mb-3 flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">
                  No tasks scheduled
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Drag tasks here or create a new task
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {dayTasks.map((task) => {
                  const assignedUser = users.find((u) => u.id === task.assignedToId);
                  const area = areas.find((a) => a.id === task.areaId);

                  return (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      className="group flex items-start gap-3 p-3 rounded-md bg-background hover:bg-muted/50 cursor-pointer border border-border/30 transition-all"
                      data-testid={`day-task-${task.id}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${urgencyColors[task.urgency]}`} />
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                          {task.name}
                        </h4>
                        
                        {task.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {area && (
                            <span className="flex items-center gap-1">
                              <span>📍</span>
                              <span>{area.name}</span>
                            </span>
                          )}
                          {assignedUser && (
                            <span className="flex items-center gap-1">
                              <span>👤</span>
                              <span>{assignedUser.firstName} {assignedUser.lastName}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={`${statusColors[task.status]} text-xs h-5`}>
                          {task.status.replace("_", " ")}
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
      <div className="space-y-4">
        {/* Clean minimal header */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-page-title">
              Calendar
            </h1>
            
            {isMaintenanceOrAdmin && (
              <Button 
                onClick={() => navigate("/tasks/new")} 
                data-testid="button-new-task"
                variant="ghost"
                size="sm"
                className="text-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New task
              </Button>
            )}
          </div>

          {/* View toggles and navigation */}
          <div className="flex items-center gap-2">
            <ToggleGroup 
              type="single" 
              value={view} 
              onValueChange={(v) => v && setView(v as CalendarView)}
              className="border border-border/50 rounded-md"
            >
              <ToggleGroupItem 
                value="month" 
                aria-label="Month view"
                className="data-[state=on]:bg-muted text-sm px-3 h-8"
              >
                Month
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="week" 
                aria-label="Week view"
                className="data-[state=on]:bg-muted text-sm px-3 h-8"
              >
                Week
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="day" 
                aria-label="Day view"
                className="data-[state=on]:bg-muted text-sm px-3 h-8"
              >
                Day
              </ToggleGroupItem>
            </ToggleGroup>

            <div className="flex items-center gap-1 border border-border/50 rounded-md">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                data-testid="button-prev"
                className="h-8 w-8 hover:bg-muted"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                className="h-8 px-3 text-sm font-medium hover:bg-muted"
                onClick={handleCalendarClick}
                data-testid="button-calendar-display"
              >
                {getDisplayDate()}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                data-testid="button-next"
                className="h-8 w-8 hover:bg-muted"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button 
              onClick={goToToday} 
              data-testid="button-today"
              variant="outline"
              size="sm"
              className="text-sm h-8 border-border/50"
            >
              Today
            </Button>
          </div>
        </div>

        {/* Calendar View */}
        <div className="relative">
          {renderCalendarView()}
        </div>

        {/* Today's Tasks Panel - Only show if there are tasks */}
        {todayTasks.length > 0 && (
          <Card className="p-4 border-border/50 bg-background">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-medium text-sm">Today's Tasks</h3>
              <Badge variant="secondary" className="h-5 text-xs">
                {todayTasks.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className="group flex items-center justify-between p-3 rounded-md bg-background hover:bg-muted/50 cursor-pointer border border-border/30 transition-all"
                  data-testid={`today-task-${task.id}`}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${urgencyColors[task.urgency]}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-0.5 group-hover:text-primary transition-colors truncate">
                        {task.name}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <Badge variant="outline" className={`${statusColors[task.status]} text-xs h-5`}>
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="text-xs p-2.5 rounded-md bg-background shadow-lg border border-border">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${urgencyColors[activeTask.urgency]}`} />
                <span className="truncate font-medium text-sm">{activeTask.name}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}