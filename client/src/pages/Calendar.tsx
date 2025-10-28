import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UrgencyBadge from "@/components/UrgencyBadge";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

//todo: remove mock functionality
const mockEvents = [
  { id: "1", title: "Fix leaking faucet", time: "09:00", urgency: "high" as const, assignee: "JS" },
  { id: "2", title: "HVAC maintenance", time: "10:30", urgency: "low" as const, assignee: "MJ" },
  { id: "3", title: "Light fixture replacement", time: "14:00", urgency: "medium" as const, assignee: "SD" },
  { id: "4", title: "Floor repair", time: "15:30", urgency: "high" as const, assignee: "LB" },
];

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const timeSlots = Array.from({ length: 9 }, (_, i) => `${i + 8}:00`);

export default function Calendar() {
  const [currentWeek, setCurrentWeek] = useState("Oct 28 - Nov 1, 2025");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage scheduled tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" data-testid="button-prev-week">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted">
            <CalendarIcon className="w-4 h-4" />
            <span className="font-medium text-sm">{currentWeek}</span>
          </div>
          <Button variant="outline" size="icon" data-testid="button-next-week">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button data-testid="button-today">Today</Button>
        </div>
      </div>

      <Card className="p-6 overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-6 gap-4 mb-4">
            <div className="text-sm font-medium text-muted-foreground">Time</div>
            {daysOfWeek.map((day) => (
              <div key={day} className="text-sm font-medium text-center">
                {day}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-6 gap-4 min-h-[60px]">
                <div className="text-sm text-muted-foreground font-mono py-2">{time}</div>
                {daysOfWeek.map((day, dayIdx) => (
                  <div key={`${day}-${time}`} className="border rounded-md p-2 hover-elevate">
                    {dayIdx === 0 && time === "9:00" && (
                      <div className="text-xs space-y-1" data-testid="event-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium truncate">{mockEvents[0].title}</span>
                          <UrgencyBadge level={mockEvents[0].urgency} />
                        </div>
                        <Badge variant="outline" className="text-xs">{mockEvents[0].assignee}</Badge>
                      </div>
                    )}
                    {dayIdx === 1 && time === "10:00" && (
                      <div className="text-xs space-y-1" data-testid="event-2">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium truncate">{mockEvents[1].title}</span>
                          <UrgencyBadge level={mockEvents[1].urgency} />
                        </div>
                        <Badge variant="outline" className="text-xs">{mockEvents[1].assignee}</Badge>
                      </div>
                    )}
                    {dayIdx === 2 && time === "14:00" && (
                      <div className="text-xs space-y-1" data-testid="event-3">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium truncate">{mockEvents[2].title}</span>
                          <UrgencyBadge level={mockEvents[2].urgency} />
                        </div>
                        <Badge variant="outline" className="text-xs">{mockEvents[2].assignee}</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-medium mb-4">Today's Tasks</h3>
        <div className="space-y-3">
          {mockEvents.slice(0, 2).map((event) => (
            <div key={event.id} className="flex items-center justify-between p-3 rounded-md bg-muted">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-muted-foreground">{event.time}</span>
                <span className="font-medium">{event.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{event.assignee}</Badge>
                <UrgencyBadge level={event.urgency} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
