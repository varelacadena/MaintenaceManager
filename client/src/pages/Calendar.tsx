import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import type { ServiceRequest } from "@shared/schema";

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Calendar() {
  const [, navigate] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: requests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests"],
  });

  // Get the current month's days
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    
    // Add empty slots for days before the month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  }, [currentDate]);

  // Group requests by date
  const requestsByDate = useMemo(() => {
    const map = new Map<string, ServiceRequest[]>();
    
    requests.forEach((request) => {
      if (request.requestedDate) {
        const dateKey = new Date(request.requestedDate).toDateString();
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)?.push(request);
      }
    });
    
    return map;
  }, [requests]);

  const getRequestsForDay = (day: number): ServiceRequest[] => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return requestsByDate.get(date.toDateString()) || [];
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "in_progress":
        return "bg-blue-500";
      case "on_hold":
        return "bg-orange-500";
      case "completed":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
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

  // Get today's scheduled requests
  const todayRequests = useMemo(() => {
    const todayKey = today.toDateString();
    return requestsByDate.get(todayKey) || [];
  }, [requestsByDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage scheduled maintenance
          </p>
        </div>
        <div className="flex items-center gap-2">
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

            const dayRequests = getRequestsForDay(day);
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
                  {dayRequests.slice(0, 3).map((request) => (
                    <div
                      key={request.id}
                      onClick={() => navigate(`/requests/${request.id}`)}
                      className="text-xs p-1 rounded cursor-pointer hover-elevate bg-muted"
                      data-testid={`request-${request.id}`}
                    >
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-2 h-2 rounded-full ${getUrgencyColor(
                            request.urgency
                          )}`}
                        />
                        <span className="truncate flex-1">{request.title}</span>
                      </div>
                    </div>
                  ))}
                  {dayRequests.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayRequests.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {todayRequests.length > 0 && (
        <Card className="p-6">
          <h3 className="font-medium mb-4">Today's Scheduled Tasks</h3>
          <div className="space-y-3">
            {todayRequests.map((request) => (
              <div
                key={request.id}
                onClick={() => navigate(`/requests/${request.id}`)}
                className="flex items-center justify-between p-3 rounded-md bg-muted hover-elevate cursor-pointer"
                data-testid={`today-request-${request.id}`}
              >
                <div className="flex-1">
                  <h4 className="font-medium">{request.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {request.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={`${getStatusColor(request.status)} text-white no-default-hover-elevate`}
                  >
                    {request.status.replace("_", " ").toUpperCase()}
                  </Badge>
                  <Badge
                    className={`${getUrgencyColor(request.urgency)} text-white no-default-hover-elevate`}
                  >
                    {request.urgency.toUpperCase()}
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
