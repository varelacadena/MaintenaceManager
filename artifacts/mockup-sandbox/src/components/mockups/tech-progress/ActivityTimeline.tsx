import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity, CheckCircle2, Clock, AlertTriangle, Wrench } from "lucide-react";

const technicians = [
  {
    name: "Mike Rodriguez",
    initials: "MR",
    color: "bg-blue-500",
    completed: 4,
    total: 6,
    currentTask: "HVAC Filter Replacement — Building C",
    lastActivity: "12 min ago",
  },
  {
    name: "Sarah Chen",
    initials: "SC",
    color: "bg-emerald-500",
    completed: 3,
    total: 5,
    currentTask: "Electrical Panel Inspection — Dorm A",
    lastActivity: "5 min ago",
  },
  {
    name: "James Wilson",
    initials: "JW",
    color: "bg-violet-500",
    completed: 5,
    total: 5,
    currentTask: null,
    lastActivity: "32 min ago",
  },
  {
    name: "Alex Thompson",
    initials: "AT",
    color: "bg-amber-500",
    completed: 1,
    total: 4,
    currentTask: "Plumbing Repair — Admin Office",
    lastActivity: "1 hr ago",
    overdue: true,
  },
  {
    name: "Maria Garcia",
    initials: "MG",
    color: "bg-rose-500",
    completed: 2,
    total: 3,
    currentTask: "Fire Extinguisher Check — Library",
    lastActivity: "20 min ago",
  },
];

function StatusIcon({ completed, total, overdue }: { completed: number; total: number; overdue?: boolean }) {
  if (overdue) return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
  if (completed === total) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  return <Wrench className="h-3.5 w-3.5 text-blue-500" />;
}

export function ActivityTimeline() {
  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Today's Activity</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              {technicians.filter((t) => t.completed === t.total).length}/{technicians.length} complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {technicians.map((tech, idx) => (
            <div
              key={tech.name}
              className="flex gap-3 hover-elevate rounded-md p-2 -mx-2 cursor-pointer"
            >
              <div className="flex flex-col items-center gap-1">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className={`${tech.color} text-white text-xs`}>
                    {tech.initials}
                  </AvatarFallback>
                </Avatar>
                {idx < technicians.length - 1 && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium">{tech.name}</span>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon completed={tech.completed} total={tech.total} overdue={tech.overdue} />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {tech.completed}/{tech.total}
                    </span>
                  </div>
                </div>
                {tech.currentTask ? (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {tech.currentTask}
                  </p>
                ) : (
                  <p className="text-xs text-emerald-600 mt-0.5">All tasks completed</p>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{tech.lastActivity}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
