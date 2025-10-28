import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Task } from "@shared/schema";

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

export default function Calendar() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
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

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Task Calendar</h1>
          <p className="text-muted-foreground mt-1">
            View and manage scheduled maintenance tasks
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousMonth}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted min-w-[200px] justify-center">
            <CalendarIcon className="w-4 h-4" />
            <span className="font-medium text-sm">{monthYear}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            data-testid="button-next-month"
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

            const dayTasks = getTasksForDay(day);
            const isTodayDate = isToday(day);

            return (
              <div
                key={day}
                className={`min-h-[100px] border rounded-md p-2 ${
                  isTodayDate ? "border-primary border-2" : ""
                }`}
                data-testid={`calendar-day-${day}`}
              >
                <div
                  className={`text-sm font-medium mb-2 ${
                    isTodayDate ? "text-primary" : ""
                  }`}
                >
                  {day}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="text-xs p-1 rounded cursor-pointer hover-elevate bg-muted"
                      data-testid={`task-${task.id}`}
                    >
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-2 h-2 rounded-full ${urgencyColors[task.urgency]}`}
                        />
                        <span className="truncate flex-1">{task.name}</span>
                      </div>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

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
                  <Badge
                    variant="outline"
                    className={statusColors[task.status]}
                  >
                    {task.status.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={urgencyColors[task.urgency]}
                  >
                    {task.urgency}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
