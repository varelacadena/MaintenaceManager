import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Gauge, TrendingUp } from "lucide-react";

const technicians = [
  { name: "Mike R.", initials: "MR", completed: 4, total: 6, color: "text-blue-500", strokeColor: "stroke-blue-500" },
  { name: "Sarah C.", initials: "SC", completed: 3, total: 5, color: "text-emerald-500", strokeColor: "stroke-emerald-500" },
  { name: "James W.", initials: "JW", completed: 5, total: 5, color: "text-violet-500", strokeColor: "stroke-violet-500" },
  { name: "Alex T.", initials: "AT", completed: 1, total: 4, color: "text-amber-500", strokeColor: "stroke-amber-500" },
  { name: "Maria G.", initials: "MG", completed: 2, total: 3, color: "text-rose-500", strokeColor: "stroke-rose-500" },
];

function RadialProgress({ completed, total, strokeColor }: { completed: number; total: number; strokeColor: string }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={radius} fill="none" strokeWidth="4" className="stroke-muted" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold tabular-nums">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

export function RadialGauges() {
  const totalCompleted = technicians.reduce((s, t) => s + t.completed, 0);
  const totalTasks = technicians.reduce((s, t) => s + t.total, 0);
  const overallPct = Math.round((totalCompleted / totalTasks) * 100);

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Team Progress</CardTitle>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-600">{overallPct}%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {technicians.map((tech) => (
              <div
                key={tech.name}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover-elevate cursor-pointer"
              >
                <div className="relative">
                  <RadialProgress completed={tech.completed} total={tech.total} strokeColor={tech.strokeColor} />
                  <Avatar className="h-5 w-5 absolute -bottom-0.5 -right-0.5 border-2 border-background">
                    <AvatarFallback className="text-[8px] bg-muted">{tech.initials}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium leading-tight">{tech.name}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {tech.completed}/{tech.total} tasks
                  </p>
                </div>
                {tech.completed === tech.total && (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-[10px] px-1.5 py-0">
                    Complete
                  </Badge>
                )}
              </div>
            ))}
            <div className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border border-dashed border-muted-foreground/30">
              <span className="text-2xl font-bold">{overallPct}%</span>
              <p className="text-[11px] text-muted-foreground text-center">Team Average</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
