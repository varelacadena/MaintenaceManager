import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, RefreshCw, Hand, Clock, ChevronRight, AlertTriangle } from "lucide-react";

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

export function ConfirmDialog() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
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
          2 jobs available in your pool
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {mockTasks.map((task) => (
          <Card key={task.id} className={task.id === "1" ? "ring-2 ring-primary/30" : "hover-elevate"} data-testid={`task-card-${task.id}`}>
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

      <div className="absolute inset-0 bg-black/50 z-[60] flex items-center justify-center px-6">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Hand className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Claim this job?</h2>
                <p className="text-xs text-muted-foreground">This will assign the task to you</p>
              </div>
            </div>

            <div className="rounded-md border p-3 mb-4">
              <h3 className="font-medium text-sm mb-1">Fix leaking faucet in Room 204</h3>
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-700 border-red-500/20">
                  High
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>Heritage Hall - Room 204</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Once you grab this job, it will be removed from the available pool and assigned to you. You can view it in your task list.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" data-testid="button-cancel-grab">
                Cancel
              </Button>
              <Button variant="default" className="flex-1" data-testid="button-confirm-grab">
                <Hand className="w-4 h-4 mr-2" />
                Confirm
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
