import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, ChevronRight } from "lucide-react";

const technicians = [
  { name: "Mike Rodriguez", initials: "MR", completed: 4, total: 6, inProgress: 1, color: "bg-blue-500" },
  { name: "Sarah Chen", initials: "SC", completed: 3, total: 5, inProgress: 2, color: "bg-emerald-500" },
  { name: "James Wilson", initials: "JW", completed: 5, total: 5, inProgress: 0, color: "bg-violet-500" },
  { name: "Alex Thompson", initials: "AT", completed: 1, total: 4, inProgress: 1, color: "bg-amber-500" },
  { name: "Maria Garcia", initials: "MG", completed: 2, total: 3, inProgress: 1, color: "bg-rose-500" },
];

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const barColor = pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500";

  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium text-foreground tabular-nums w-10 text-right">
        {completed}/{total}
      </span>
    </div>
  );
}

export function CompactBars() {
  const totalCompleted = technicians.reduce((s, t) => s + t.completed, 0);
  const totalTasks = technicians.reduce((s, t) => s + t.total, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Technician Progress</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              {totalCompleted}/{totalTasks} today
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {technicians.map((tech) => (
            <div
              key={tech.name}
              className="flex items-center gap-3 group cursor-pointer hover-elevate rounded-md p-1.5 -mx-1.5"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={`${tech.color} text-white text-xs`}>
                  {tech.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium truncate">{tech.name}</span>
                  {tech.completed === tech.total && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-[10px] px-1.5 py-0">
                      Done
                    </Badge>
                  )}
                  {tech.inProgress > 0 && tech.completed < tech.total && (
                    <Badge variant="outline" className="text-blue-600 border-blue-200 text-[10px] px-1.5 py-0">
                      Active
                    </Badge>
                  )}
                </div>
                <ProgressBar completed={tech.completed} total={tech.total} />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
