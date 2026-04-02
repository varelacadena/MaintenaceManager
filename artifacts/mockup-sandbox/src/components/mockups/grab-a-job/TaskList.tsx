import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, RefreshCw, Hand, Clock, ChevronRight } from "lucide-react";

const mockTasks = [
  {
    id: "1",
    name: "Fix leaking faucet in Room 204",
    description: "The bathroom faucet in dormitory Room 204 has been dripping steadily. Needs washer replacement or cartridge swap.",
    urgency: "high" as const,
    status: "ready" as const,
    location: "Heritage Hall - Room 204",
    executorType: "technician",
    createdAt: "Mar 28, 2026",
    taskType: "One Time",
  },
  {
    id: "2",
    name: "Replace hallway light ballast",
    description: "Fluorescent light in second floor hallway of Science Building is flickering. Likely ballast failure.",
    urgency: "medium" as const,
    status: "not_started" as const,
    location: "Science Building - 2nd Floor",
    executorType: "technician",
    createdAt: "Mar 30, 2026",
    taskType: "One Time",
  },
  {
    id: "3",
    name: "Unclog drain in men's restroom",
    description: "Slow drain in the first-floor men's restroom sink. Standing water after a few seconds of running.",
    urgency: "high" as const,
    status: "ready" as const,
    location: "Student Union - 1st Floor",
    executorType: "technician",
    createdAt: "Apr 1, 2026",
    taskType: "One Time",
  },
  {
    id: "4",
    name: "Touch up paint — lobby walls",
    description: "Scuff marks and minor damage on lobby walls near the main entrance. Matching paint is in storage room B.",
    urgency: "low" as const,
    status: "not_started" as const,
    location: "Admin Building - Lobby",
    executorType: "technician",
    createdAt: "Mar 25, 2026",
    taskType: "One Time",
  },
];

const urgencyStyles: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  high: "bg-red-500/10 text-red-700 border-red-500/20",
};

const statusStyles: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 border-gray-500/20",
  ready: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
};

const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  ready: "Ready",
};

export function TaskList() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Hand className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Grab a Job</h1>
          </div>
          <Button variant="ghost" size="icon" data-testid="button-refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {mockTasks.length} jobs available in your pool
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {mockTasks.map((task) => (
          <Card key={task.id} className="hover-elevate" data-testid={`task-card-${task.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm leading-snug flex-1">{task.name}</h3>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              </div>

              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${urgencyStyles[task.urgency]}`}>
                  {task.urgency === "high" ? "High" : task.urgency === "medium" ? "Medium" : "Low"}
                </Badge>
                <Badge variant="outline" className={`text-xs ${statusStyles[task.status]}`}>
                  {statusLabels[task.status]}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {task.description}
              </p>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{task.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Submitted {task.createdAt}</span>
                </div>
              </div>

              <Button
                className="w-full"
                variant="default"
                data-testid={`button-grab-${task.id}`}
              >
                <Hand className="w-4 h-4 mr-2" />
                Grab This Job
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
