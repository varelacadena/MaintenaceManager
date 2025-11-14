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
          className={`group/task text-xs p-2 rounded-md cursor-move transition-all duration-200 bg-background border border-border/50 hover:shadow-sm hover:border-primary/30 ${
            isDragging ? "opacity-50 scale-95" : "hover:scale-[1.02]"
          }`}
          data-testid={`task-${task.id}`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${urgencyColors[task.urgency]} shadow-sm`} />
            <span className="truncate flex-1 font-medium group-hover/task:text-primary transition-colors">
              {task.name}
            </span>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 shadow-lg" side="top">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-base mb-1">{task.name}</h4>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
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
          <div className="space-y-1.5 pt-2 border-t">
            {area && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span>📍</span>
                <span>{area.name}</span>
              </p>
            )}
            {assignedUser && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span>👤</span>
                <span>{assignedUser.firstName} {assignedUser.lastName}</span>
              </p>
            )}
            {task.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
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
      className={`group min-h-[120px] border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
        isToday 
          ? "border-primary border-2 bg-primary/5 shadow-sm" 
          : "border-border/50 hover:border-primary/30 hover:shadow-sm"
      } ${isOver ? "bg-primary/10 border-primary shadow-md scale-[1.02]" : "hover:bg-muted/30"}`}
      onClick={() => onDayClick(date)}
      data-testid={`calendar-day-${day}`}
    >
      <div className={`flex items-center justify-between mb-3 ${isToday ? "text-primary" : "text-foreground"}`}>
        <div className={`text-sm font-semibold ${isToday ? "text-base" : ""}`}>
          {day}
        </div>
        {tasks.length > 0 && (
          <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isToday 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
          }`}>
            {tasks.length}
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        {tasks.slice(0, 3).map((task) => {
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
        {tasks.length > 3 && (
          <div className="text-xs text-muted-foreground font-medium px-2 py-1 text-center bg-muted/50 rounded group-hover:bg-muted">
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
        <Card className="p-4 md:p-6 shadow-sm border-border/50 overflow-hidden">
          {/* Day headers with modern styling */}
          <div className="grid grid-cols-7 gap-2 md:gap-3 mb-4">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-xs md:text-sm font-semibold text-center text-muted-foreground uppercase tracking-wider py-2 bg-muted/30 rounded-md"
              >
                {day.substring(0, 3)}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2 md:gap-3">
            {monthDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="min-h-[120px] bg-muted/10 rounded-lg" />;
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
        </Card>
      );
    } else if (view === "week") {
      return (
        <Card className="p-4 md:p-6 shadow-sm border-border/50 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 md:gap-3 mb-4">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-xs md:text-sm font-semibold text-center text-muted-foreground uppercase tracking-wider py-2 bg-muted/30 rounded-md"
              >
                {day.substring(0, 3)}
              </div>
            ))}
          </div>

          {/* Week grid */}
          <div className="grid grid-cols-7 gap-2 md:gap-3">
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
        </Card>
      );
    } else {
      // Day view - Enhanced with timeline feel
      const dateKey = currentDate.toDateString();
      const dayTasks = tasksByDate.get(dateKey) || [];

      return (
        <Card className="p-8 shadow-sm border-border/50 bg-gradient-to-br from-background to-muted/10">
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-1 h-10 bg-primary rounded-full" />
              <h3 className="text-2xl font-bold">
                {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
              </h3>
              <Badge variant="secondary" className="ml-auto">
                {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
              </Badge>
            </div>

            {dayTasks.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                  <CalendarIcon className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground text-lg font-medium">
                  No tasks scheduled for this day
                </p>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  Drag tasks here from other days or create a new task
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {dayTasks.map((task) => {
                  const assignedUser = users.find((u) => u.id === task.assignedToId);
                  const area = areas.find((a) => a.id === task.areaId);

                  return (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      className="group flex items-start gap-4 p-5 rounded-lg bg-background hover-elevate cursor-pointer border border-border/50 transition-all duration-200 hover:shadow-md"
                      data-testid={`day-task-${task.id}`}
                    >
                      <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${urgencyColors[task.urgency]} shadow-sm`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-2">
                          <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">
                            {task.name}
                          </h4>
                        </div>
                        
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          {area && (
                            <span className="flex items-center gap-1.5">
                              <span>📍</span>
                              <span>{area.name}</span>
                            </span>
                          )}
                          {assignedUser && (
                            <span className="flex items-center gap-1.5">
                              <span>👤</span>
                              <span>{assignedUser.firstName} {assignedUser.lastName}</span>
                            </span>
                          )}
                        </div>
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
      <div className="space-y-8">
        {/* Modern Header with gradient accent */}
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight" data-testid="text-page-title">
                Task Calendar
              </h1>
              <p className="text-muted-foreground text-base">
                {isMaintenanceOrAdmin
                  ? "✨ Drag and drop tasks to reschedule them effortlessly"
                  : "📅 View and track your scheduled maintenance tasks"}
              </p>
            </div>
            
            {isMaintenanceOrAdmin && (
              <Button 
                onClick={() => navigate("/tasks/new")} 
                data-testid="button-new-task"
                className="shadow-sm"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Task
              </Button>
            )}
          </div>

          {/* Modern Controls Bar */}
          <Card className="p-4 shadow-sm border-border/50">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <ToggleGroup 
                type="single" 
                value={view} 
                onValueChange={(v) => v && setView(v as CalendarView)}
                className="bg-muted/50 p-1 rounded-lg"
              >
                <ToggleGroupItem 
                  value="month" 
                  aria-label="Month view"
                  className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-6"
                >
                  Month
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="week" 
                  aria-label="Week view"
                  className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-6"
                >
                  Week
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="day" 
                  aria-label="Day view"
                  className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-6"
                >
                  Day
                </ToggleGroupItem>
              </ToggleGroup>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevious}
                    data-testid="button-prev"
                    className="hover:bg-background"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-6 py-2 min-w-[220px] justify-center font-semibold hover:bg-background"
                    onClick={handleCalendarClick}
                    data-testid="button-calendar-display"
                  >
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm">{getDisplayDate()}</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNext}
                    data-testid="button-next"
                    className="hover:bg-background"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>

                <Button 
                  onClick={goToToday} 
                  data-testid="button-today"
                  variant="outline"
                  className="font-medium"
                >
                  Today
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Calendar View */}
        <div className="relative">
          {renderCalendarView()}
        </div>

        {/* Today's Tasks Panel - Only show if there are tasks */}
        {todayTasks.length > 0 && (
          <Card className="p-6 shadow-sm border-border/50 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-primary rounded-full" />
              <h3 className="font-semibold text-xl">Today's Tasks</h3>
              <Badge variant="secondary" className="ml-auto">
                {todayTasks.length} {todayTasks.length === 1 ? 'task' : 'tasks'}
              </Badge>
            </div>
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className="group flex items-center justify-between p-5 rounded-lg bg-background hover-elevate cursor-pointer border border-border/50 transition-all duration-200 hover:shadow-md"
                  data-testid={`today-task-${task.id}`}
                >
                  <div className="flex-1 min-w-0 flex items-start gap-4">
                    <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${urgencyColors[task.urgency]} shadow-sm`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                        {task.name}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Badge variant="outline" className={statusColors[task.status]}>
                      {task.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {task.urgency}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Drag Overlay with enhanced styling */}
        <DragOverlay>
          {activeTask ? (
            <div className="text-xs p-3 rounded-lg bg-background shadow-2xl border-2 border-primary/20 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${urgencyColors[activeTask.urgency]} shadow-sm`}
                />
                <span className="truncate font-medium">{activeTask.name}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}