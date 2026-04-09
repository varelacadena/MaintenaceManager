import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GanttChart } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  Cell, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { Project, Task } from "@shared/schema";
import { format } from "date-fns";

const GANTT_STATUS_COLORS: Record<string, string> = {
  not_started: "#6b7280",
  needs_estimate: "#f59e0b",
  waiting_approval: "#8b5cf6",
  in_progress: "#f43f5e",
  on_hold: "#eab308",
  completed: "#10b981",
  cancelled: "#ef4444",
};

export function ProjectGanttChart({ tasks, project }: { tasks: Task[]; project: Project }) {
  const tasksWithDates = tasks.filter((t) => t.estimatedCompletionDate);
  const tasksWithoutDates = tasks.filter((t) => !t.estimatedCompletionDate);

  const allTimestamps = [
    project.startDate ? new Date(project.startDate).getTime() : null,
    project.targetEndDate ? new Date(project.targetEndDate).getTime() : null,
    ...tasksWithDates.map((t) => new Date(t.estimatedCompletionDate!).getTime()),
    ...tasksWithDates.map((t) =>
      t.scheduledStartTime ? new Date(t.scheduledStartTime).getTime() : null
    ),
  ].filter((v): v is number => v !== null);

  if (tasksWithDates.length === 0 && tasksWithoutDates.length === 0) return null;

  const minDate = allTimestamps.length > 0 ? Math.min(...allTimestamps) : Date.now();
  const maxDate = allTimestamps.length > 0 ? Math.max(...allTimestamps) : Date.now() + 86400000 * 7;
  const range = Math.max(maxDate - minDate, 86400000);

  const ganttData = tasksWithDates.map((task) => {
    const taskStart = task.scheduledStartTime
      ? new Date(task.scheduledStartTime).getTime()
      : minDate;
    const taskEnd = new Date(task.estimatedCompletionDate!).getTime();
    const spacer = taskStart - minDate;
    const duration = Math.max(taskEnd - taskStart, range * 0.015);
    const label = task.name.length > 22 ? task.name.substring(0, 22) + "\u2026" : task.name;
    return { label, fullName: task.name, status: task.status, spacer, duration, taskStart, taskEnd };
  });

  const projectEndMs = project.targetEndDate
    ? new Date(project.targetEndDate).getTime() - minDate
    : null;

  const formatTickDate = (ms: number) => {
    const d = new Date(minDate + ms);
    return format(d, "MMM d");
  };

  const customTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const entry = payload.find((p: any) => p.dataKey === "duration");
    if (!entry) return null;
    const d = entry.payload;
    return (
      <div className="bg-popover border rounded-md shadow-md p-3 text-sm space-y-1">
        <p className="font-semibold">{d.fullName}</p>
        <p className="text-muted-foreground capitalize">{d.status.replace(/_/g, " ")}</p>
        {d.taskStart !== minDate && (
          <p className="text-xs text-muted-foreground">
            Start: {format(new Date(d.taskStart), "MMM d, yyyy")}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Due: {format(new Date(d.taskEnd), "MMM d, yyyy")}
        </p>
      </div>
    );
  };

  return (
    <Card data-testid="card-project-gantt">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <GanttChart className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-lg">Timeline</CardTitle>
        </div>
        {tasksWithDates.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {tasksWithDates.length} scheduled · {tasksWithoutDates.length} unscheduled
          </span>
        )}
      </CardHeader>
      <CardContent>
        {tasksWithDates.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            Add due dates to tasks to see the timeline.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(ganttData.length * 0, 400) }}>
              <ResponsiveContainer width="100%" height={Math.max(ganttData.length * 36 + 40, 120)}>
                <BarChart
                  layout="vertical"
                  data={ganttData}
                  margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  barCategoryGap="25%"
                >
                  <XAxis
                    type="number"
                    domain={[0, range]}
                    tickFormatter={formatTickDate}
                    tick={{ fontSize: 11 }}
                    tickCount={5}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={130}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={customTooltip} cursor={{ fill: "transparent" }} />
                  {projectEndMs !== null && (
                    <ReferenceLine
                      x={projectEndMs}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="4 2"
                      strokeWidth={1.5}
                      label={{ value: "Deadline", position: "top", fontSize: 10, fill: "hsl(var(--destructive))" }}
                    />
                  )}
                  <Bar dataKey="spacer" stackId="g" fill="transparent" isAnimationActive={false} />
                  <Bar dataKey="duration" stackId="g" radius={[3, 3, 3, 3]} isAnimationActive={false}>
                    {ganttData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={GANTT_STATUS_COLORS[entry.status] || "#6b7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {tasksWithoutDates.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Unscheduled
            </p>
            <div className="flex flex-wrap gap-2">
              {tasksWithoutDates.map((task) => (
                <Badge key={task.id} variant="outline" className="text-xs font-normal">
                  {task.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
